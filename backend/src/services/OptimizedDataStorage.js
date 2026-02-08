const marketHoursManager = require('./MarketHoursManager');

class OptimizedDataStorage {
    constructor(db, socketServer) {
        this.db = db;
        this.socketServer = socketServer;
        this.tickBuffer = new Map(); // In-memory tick buffer
        this.lastStoredTime = 0;
        this.storageInterval = 500; // Store every 500ms for more frequent updates
        this.maxTickAge = 120000; // 2 minutes max age for simulated candle data
        this.atmStrikeManager = null;
        this.spreadAnalyzer = null;
        this.isStorageActive = false;
    }

    /**
     * Initialize storage with dependencies
     * @param {Object} atmStrikeManager - ATM Strike Manager instance
     * @param {Object} spreadAnalyzer - Spread Analyzer instance
     */
    initialize(atmStrikeManager, spreadAnalyzer) {
        this.atmStrikeManager = atmStrikeManager;
        this.spreadAnalyzer = spreadAnalyzer;
        this.instrumentMap = new Map(); // Map real IDs to internal IDs (WEEKLY_CALL, etc)
        this.startStorageTimer();
        console.log('Optimized Data Storage initialized');
    }

    /**
     * Set instrument mapping
     * @param {string} realId - Real exchange instrument ID (e.g. NIFTY_25000_CE_WEEKLY)
     * @param {string} internalId - Internal ID (e.g. WEEKLY_CALL)
     */
    setInstrumentMapping(realId, internalId) {
        this.instrumentMap.set(realId, internalId);
        console.log(`Mapping instrument ${realId} to ${internalId}`);
    }

    /**
     * Process incoming tick but don't store immediately (throttling)
     * @param {Object} tickData - Raw tick data from XTS
     */
    processTick(tickData) {
        let instrumentId = tickData.ExchangeInstrumentID;

        // Apply mapping if exists
        if (this.instrumentMap.has(instrumentId)) {
            instrumentId = this.instrumentMap.get(instrumentId);
        }

        const timestamp = Date.now();

        // Update in-memory buffer with latest tick
        this.tickBuffer.set(instrumentId, {
            price: tickData.LastTradedPrice,
            volume: tickData.Volume,
            timestamp: timestamp,
            bid: tickData.BidPrice,
            ask: tickData.AskPrice,
            openInterest: tickData.OpenInterest,
            impliedVolatility: tickData.ImpliedVolatility,
            rawData: tickData // Keep for debugging if needed
        });

        // SPECIAL CASE: If this is a spot tick, update ATM strike manager immediately
        // This breaks the circular dependency where ATM strike won't update without synthetic data
        if (instrumentId === 'NIFTY_SPOT' && this.atmStrikeManager) {
            this.atmStrikeManager.checkATMStrike(tickData.LastTradedPrice);
        }

        // Compute synthetic immediately for real-time display and storage
        const syntheticData = this.computeSynthetic();

        if (syntheticData) {
            // Check for ATM strike changes
            if (this.atmStrikeManager && syntheticData.spot) {
                this.atmStrikeManager.checkATMStrike(syntheticData.spot);
            }

            // Log legs every 10 seconds
            if (Date.now() % 10000 < 500) {
                const weeklyCall = this.tickBuffer.get('WEEKLY_CALL');
                const weeklyPut = this.tickBuffer.get('WEEKLY_PUT');
                console.log(`[DataStorage] Spot: ${syntheticData.spot}, WKL_C: ${weeklyCall?.price}, WKL_P: ${weeklyPut?.price}, Strike: ${syntheticData.atmStrike}`);
            }
        }
    }

    /**
     * Start storage timer - stores computed data every second
     */
    startStorageTimer() {
        if (this.isStorageActive) return;

        this.isStorageActive = true;
        console.log('Starting storage timer (1-second intervals)');

        setInterval(() => {
            const now = Date.now();

            if (now - this.lastStoredTime >= this.storageInterval) {
                this.storeComputedData();
                this.lastStoredTime = now;
            }

            // Also clear stale data periodically to prevent memory buildup
            if (now % 30000 < 100) { // Every 30 seconds
                this.clearStaleData();
            }
        }, 100); // Check every 100ms for precision
    }

    /**
     * Store only essential computed data (not raw option data)
     * This achieves 99% reduction in database size
     */
    async storeComputedData() {
        const syntheticData = this.computeSynthetic();

        if (!syntheticData) {
            return; // Skip storage if no valid synthetic data
        }

        try {
            // Store ONLY computed values - much smaller footprint
            const dataToStore = {
                timestamp: new Date(),
                spot: syntheticData.spot,
                weeklySynthetic: syntheticData.weeklySynthetic,
                monthlySynthetic: syntheticData.monthlySynthetic,
                weeklyCarry: syntheticData.weeklyCarry,
                monthlyCarry: syntheticData.monthlyCarry,
                calendarSpread: syntheticData.calendarSpread,
                weeklyPremium: syntheticData.weeklyPremium,
                monthlyPremium: syntheticData.monthlyPremium,
                atmStrike: this.atmStrikeManager?.getCurrentATMStrike() || null,

                // Add Z-Score analysis if available
                spreadZScore: syntheticData.spreadZScore || null,

                // Market metadata
                marketStatus: this.getMarketStatus(),
                dataQuality: this.assessDataQuality()
            };

            // Broadcast to frontend - throttled by storageInterval (e.g. 500ms or 1s)
            this.broadcastToFrontend(syntheticData);

            // Single insert per second instead of multiple per second
            await this.db.storeComputedData(dataToStore);

            // Optional: Log storage stats periodically
            if (Date.now() % 60000 < 1000) { // Every minute
                console.log(`Data stored - Spot: ₹${syntheticData.spot}, Weekly Carry: ₹${syntheticData.weeklyCarry?.toFixed(2)}`);
            }

        } catch (error) {
            console.error('Error storing computed data:', error);
        }
    }

    /**
     * Compute synthetic only when both call and put prices are fresh
     * Prevents noise spikes from stale data
     */
    computeSynthetic() {
        const spotData = this.tickBuffer.get('NIFTY_SPOT');
        const weeklyCall = this.tickBuffer.get('WEEKLY_CALL');
        const weeklyPut = this.tickBuffer.get('WEEKLY_PUT');
        const monthlyCall = this.tickBuffer.get('MONTHLY_CALL');
        const monthlyPut = this.tickBuffer.get('MONTHLY_PUT');

        // Check if we have spot data
        if (!spotData || !this.isFreshData(spotData)) {
            return null;
        }

        // Check if we have fresh data for both weekly legs
        const hasWeeklyData = this.hasFreshPrices(weeklyCall, weeklyPut);
        const hasMonthlyData = this.hasFreshPrices(monthlyCall, monthlyPut);

        if (!hasWeeklyData && !hasMonthlyData) {
            return null; // Don't compute with stale data
        }

        const atmStrike = this.atmStrikeManager?.getCurrentATMStrike();
        if (!atmStrike) {
            return null; // Need ATM strike for calculations
        }

        const expiries = this.atmStrikeManager?.zerodhaService?.expiryManager?.getCurrentExpiries() || {};
        const weeklyDays = this.atmStrikeManager?.zerodhaService?.expiryManager?.getDaysToExpiry(expiries.weekly);
        const monthlyDays = this.atmStrikeManager?.zerodhaService?.expiryManager?.getDaysToExpiry(expiries.monthly);

        const result = {
            spot: spotData.price,
            timestamp: new Date(),
            atmStrike: atmStrike
        };

        // Calculate weekly synthetic if data is fresh
        if (hasWeeklyData) {
            result.weeklySynthetic = weeklyCall.price - weeklyPut.price + atmStrike;
            result.weeklyCarry = result.weeklySynthetic - spotData.price;
            // Annualized Carry = (Carry / Spot) * (365 / Days) * 100
            if (weeklyDays) {
                result.weeklyPremium = (result.weeklyCarry / spotData.price) * (365 / weeklyDays) * 100;
            } else {
                result.weeklyPremium = ((result.weeklySynthetic - spotData.price) / spotData.price) * 100;
            }
        }

        // Calculate monthly synthetic if data is fresh
        if (hasMonthlyData) {
            result.monthlySynthetic = monthlyCall.price - monthlyPut.price + atmStrike;
            result.monthlyCarry = result.monthlySynthetic - spotData.price;
            // Annualized Carry
            if (monthlyDays) {
                result.monthlyPremium = (result.monthlyCarry / spotData.price) * (365 / monthlyDays) * 100;
            } else {
                result.monthlyPremium = ((result.monthlySynthetic - spotData.price) / spotData.price) * 100;
            }
        }

        // Calculate calendar spread if both are available
        if (result.weeklySynthetic && result.monthlySynthetic) {
            result.calendarSpread = result.monthlySynthetic - result.weeklySynthetic;

            // Calculate Z-Score for calendar spread
            if (this.spreadAnalyzer) {
                result.spreadZScore = this.spreadAnalyzer.calculateZScore(result.calendarSpread);
            }
        }

        return result;
    }

    /**
     * Check if both call and put have recent prices (within maxTickAge)
     * @param {Object} callData - Call option data
     * @param {Object} putData - Put option data
     * @returns {boolean} True if both prices are fresh
     */
    hasFreshPrices(callData, putData) {
        if (!callData || !putData) return false;

        return this.isFreshData(callData) && this.isFreshData(putData);
    }

    /**
     * Check if data is fresh (within maxTickAge)
     * @param {Object} data - Tick data
     * @returns {boolean} True if data is fresh
     */
    isFreshData(data) {
        if (!data || !data.timestamp) return false;

        const now = Date.now();
        return (now - data.timestamp) < this.maxTickAge;
    }

    /**
     * Broadcast computed data to frontend via WebSocket
     * @param {Object} syntheticData - Computed synthetic data
     */
    broadcastToFrontend(syntheticData) {
        if (!this.socketServer) return;

        try {
            // Add connection status and market info
            const marketStatus = this.getMarketStatus();
            const isMarketOpen = marketStatus === 'OPEN';
            let finalData = { ...syntheticData };

            // Get data range for market status display
            const now = new Date();
            const dataRange = {
                startDate: now.toISOString().split('T')[0], // Today's date
                endDate: now.toISOString().split('T')[0]
            };

            const marketStatusInfo = marketHoursManager.getMarketStatus();

            const broadcastData = {
                ...finalData,
                timestamp: syntheticData.timestamp instanceof Date ? syntheticData.timestamp.toISOString() : syntheticData.timestamp,
                connectionStatus: 'LIVE',
                marketStatus: marketStatusInfo.status,
                marketDescription: marketStatusInfo.description,
                isMarketClosed: !marketStatusInfo.isOpen,
                dataRange: dataRange,
                expiries: this.atmStrikeManager?.getCurrentExpiries?.() || {},
                lastUpdate: new Date().toISOString(),
                // Add flag to indicate this is real-time data
                isRealTime: true
            };

            // Broadcast to all connected clients
            this.socketServer.emit('marketData', broadcastData);

            // Log more frequently for better visibility (every 5 seconds instead of 10)
            if (Date.now() % 5000 < 100) {
                console.log(`[Broadcast] Market: ${marketStatus} | Spot: ${broadcastData.spot}, Weekly Synth: ${broadcastData.weeklySynthetic}, ATM Strike: ${broadcastData.atmStrike}`);
            }

        } catch (error) {
            console.error('Error broadcasting to frontend:', error);
        }
    }

    /**
     * Get current market status based on Indian market hours
     * @returns {string} Market status
     */
    getMarketStatus() {
        return marketHoursManager.getMarketStatus().status;
    }

    /**
     * Assess data quality based on freshness and completeness
     * @returns {string} Data quality assessment
     */
    assessDataQuality() {
        const spotData = this.tickBuffer.get('NIFTY_SPOT');
        const weeklyCall = this.tickBuffer.get('WEEKLY_CALL');
        const weeklyPut = this.tickBuffer.get('WEEKLY_PUT');
        const monthlyCall = this.tickBuffer.get('MONTHLY_CALL');
        const monthlyPut = this.tickBuffer.get('MONTHLY_PUT');

        let freshCount = 0;
        let totalCount = 5;

        if (this.isFreshData(spotData)) freshCount++;
        if (this.isFreshData(weeklyCall)) freshCount++;
        if (this.isFreshData(weeklyPut)) freshCount++;
        if (this.isFreshData(monthlyCall)) freshCount++;
        if (this.isFreshData(monthlyPut)) freshCount++;

        const qualityRatio = freshCount / totalCount;

        if (qualityRatio >= 0.8) return 'EXCELLENT';
        if (qualityRatio >= 0.6) return 'GOOD';
        if (qualityRatio >= 0.4) return 'FAIR';
        return 'POOR';
    }

    /**
     * Get storage statistics
     * @returns {Object} Storage statistics
     */
    getStorageStats() {
        return {
            tickBufferSize: this.tickBuffer.size,
            lastStoredTime: new Date(this.lastStoredTime),
            storageInterval: this.storageInterval,
            maxTickAge: this.maxTickAge,
            isStorageActive: this.isStorageActive
        };
    }

    /**
     * Clear old data from tick buffer (memory management)
     */
    clearStaleData() {
        const now = Date.now();
        const staleThreshold = this.maxTickAge * 2; // Double the max age

        for (const [key, data] of this.tickBuffer.entries()) {
            if (now - data.timestamp > staleThreshold) {
                this.tickBuffer.delete(key);
            }
        }
    }

    /**
     * Stop storage timer
     */
    stopStorage() {
        this.isStorageActive = false;
        console.log('Storage timer stopped');
    }
}

module.exports = OptimizedDataStorage;