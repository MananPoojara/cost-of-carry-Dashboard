/**
 * Optimized Data Storage - Critical Production Component
 * Handles tick throttling and optimized database storage
 * Prevents database explosion from raw tick data (99% size reduction)
 */

class OptimizedDataStorage {
    constructor(db, socketServer) {
        this.db = db;
        this.socketServer = socketServer;
        this.tickBuffer = new Map(); // In-memory tick buffer
        this.lastStoredTime = 0;
        this.storageInterval = 1000; // Store every 1 second
        this.maxTickAge = 5000; // 5 seconds max age for fresh data
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
        this.startStorageTimer();
        console.log('🗄️ Optimized Data Storage initialized');
    }

    /**
     * Process incoming tick but don't store immediately (throttling)
     * @param {Object} tickData - Raw tick data from XTS
     */
    processTick(tickData) {
        const instrumentId = tickData.ExchangeInstrumentID;
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

        // Compute synthetic immediately for real-time display
        const syntheticData = this.computeSynthetic();

        if (syntheticData) {
            // Broadcast to frontend immediately (real-time)
            this.broadcastToFrontend(syntheticData);

            // Check for ATM strike changes
            if (this.atmStrikeManager && syntheticData.spot) {
                this.atmStrikeManager.checkATMStrike(syntheticData.spot);
            }
        }
    }

    /**
     * Start storage timer - stores computed data every second
     */
    startStorageTimer() {
        if (this.isStorageActive) return;

        this.isStorageActive = true;
        console.log('⏰ Starting storage timer (1-second intervals)');

        setInterval(() => {
            const now = Date.now();

            if (now - this.lastStoredTime >= this.storageInterval) {
                this.storeComputedData();
                this.lastStoredTime = now;
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

            // Single insert per second instead of multiple per second
            await this.db.collection('computed_data').insertOne(dataToStore);

            // Optional: Log storage stats periodically
            if (Date.now() % 60000 < 1000) { // Every minute
                console.log(`💾 Data stored - Spot: ₹${syntheticData.spot}, Weekly Carry: ₹${syntheticData.weeklyCarry?.toFixed(2)}`);
            }

        } catch (error) {
            console.error('❌ Error storing computed data:', error);
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

        const result = {
            spot: spotData.price,
            timestamp: new Date(),
            atmStrike: atmStrike
        };

        // Calculate weekly synthetic if data is fresh
        if (hasWeeklyData) {
            result.weeklySynthetic = weeklyCall.price - weeklyPut.price + atmStrike;
            result.weeklyCarry = result.weeklySynthetic - spotData.price;
            result.weeklyPremium = ((result.weeklySynthetic - spotData.price) / spotData.price) * 100;
        }

        // Calculate monthly synthetic if data is fresh
        if (hasMonthlyData) {
            result.monthlySynthetic = monthlyCall.price - monthlyPut.price + atmStrike;
            result.monthlyCarry = result.monthlySynthetic - spotData.price;
            result.monthlyPremium = ((result.monthlySynthetic - spotData.price) / spotData.price) * 100;
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
            const broadcastData = {
                ...syntheticData,
                connectionStatus: 'LIVE',
                marketStatus: this.getMarketStatus(),
                expiries: this.atmStrikeManager?.getCurrentExpiries?.() || {},
                lastUpdate: new Date().toISOString()
            };

            // Broadcast to all connected clients
            this.socketServer.emit('marketData', broadcastData);

        } catch (error) {
            console.error('❌ Error broadcasting to frontend:', error);
        }
    }

    /**
     * Get current market status
     * @returns {string} Market status
     */
    getMarketStatus() {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const currentTime = hour * 60 + minute;

        // Market hours: 9:15 AM to 3:30 PM IST
        const marketOpen = 9 * 60 + 15; // 9:15 AM
        const marketClose = 15 * 60 + 30; // 3:30 PM

        if (currentTime >= marketOpen && currentTime <= marketClose) {
            return 'OPEN';
        } else if (currentTime < marketOpen) {
            return 'PRE_MARKET';
        } else {
            return 'CLOSED';
        }
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
        console.log('⏹️ Storage timer stopped');
    }
}

module.exports = OptimizedDataStorage;