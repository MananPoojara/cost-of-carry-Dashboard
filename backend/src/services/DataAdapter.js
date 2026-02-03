/**
 * Data Adapter Service
 * Converts Zerodha database data to dashboard format
 * Provides real-time data simulation from stored data
 */

class DataAdapter {
    constructor(db, zerodhaService) {
        this.db = db;
        this.zerodhaService = zerodhaService;
        this.subscribers = new Map();
        this.isSimulating = false;
        this.simulationInterval = null;

        // Current market state
        this.currentPrices = {
            spot: 21400,
            weeklyCall: 150,
            weeklyPut: 120,
            monthlyCall: 280,
            monthlyPut: 245
        };
    }

    /**
     * Start real-time data simulation using latest database data
     */
    startRealTimeSimulation() {
        if (this.isSimulating) {
            return;
        }

        console.log('🎭 Starting real-time data simulation from database...');
        this.isSimulating = true;

        this.simulationInterval = setInterval(async () => {
            try {
                await this.fetchLatestDataAndSimulate();
            } catch (error) {
                console.error('Error in data simulation:', error);
            }
        }, 2000); // Every 2 seconds

        console.log('✅ Real-time simulation started');
    }

    /**
     * Stop real-time data simulation
     */
    stopRealTimeSimulation() {
        if (this.simulationInterval) {
            clearInterval(this.simulationInterval);
            this.simulationInterval = null;
        }
        this.isSimulating = false;
        console.log('🛑 Real-time simulation stopped');
    }

    /**
     * Fetch latest data from database and simulate tick updates
     */
    async fetchLatestDataAndSimulate() {
        try {
            // Get latest NIFTY spot price
            const spotResult = await this.db.query(`
                SELECT close, volume, datetime
                FROM market_data 
                WHERE ticker LIKE 'NIFTY%' 
                AND segment = 'STOCKS'
                ORDER BY datetime DESC 
                LIMIT 1
            `);

            if (spotResult.rows.length > 0) {
                const spotData = spotResult.rows[0];
                this.currentPrices.spot = parseFloat(spotData.close);
            }

            // Get latest option prices (simulate ATM options)
            const atmStrike = Math.round(this.currentPrices.spot / 50) * 50;

            // Weekly options
            const weeklyOptions = await this.db.query(`
                SELECT ticker, close, volume, open_interest, datetime
                FROM market_data 
                WHERE ticker LIKE 'NIFTY${atmStrike}%'
                AND segment LIKE '%OPTION%'
                AND expiry >= CURRENT_DATE
                AND expiry <= CURRENT_DATE + INTERVAL '7 days'
                ORDER BY datetime DESC 
                LIMIT 10
            `);

            // Monthly options
            const monthlyOptions = await this.db.query(`
                SELECT ticker, close, volume, open_interest, datetime
                FROM market_data 
                WHERE ticker LIKE 'NIFTY${atmStrike}%'
                AND segment LIKE '%OPTION%'
                AND expiry > CURRENT_DATE + INTERVAL '7 days'
                AND expiry <= CURRENT_DATE + INTERVAL '35 days'
                ORDER BY datetime DESC 
                LIMIT 10
            `);

            // Update current prices with some simulation
            this.simulateMarketMovement();

            // Create tick data in XTS format for compatibility
            const tickData = this.createSimulatedTicks(weeklyOptions.rows, monthlyOptions.rows);

            // Notify subscribers
            this.notifySubscribers(tickData);

        } catch (error) {
            console.error('Error fetching latest data:', error);
        }
    }

    /**
     * Simulate realistic market movement
     */
    simulateMarketMovement() {
        // Add small random movements to simulate live market
        const spotChange = (Math.random() - 0.5) * 5; // ±2.5 points
        this.currentPrices.spot += spotChange;

        // Options prices move with spot and time decay
        const optionVolatility = 0.02;
        this.currentPrices.weeklyCall += (Math.random() - 0.5) * this.currentPrices.weeklyCall * optionVolatility;
        this.currentPrices.weeklyPut += (Math.random() - 0.5) * this.currentPrices.weeklyPut * optionVolatility;
        this.currentPrices.monthlyCall += (Math.random() - 0.5) * this.currentPrices.monthlyCall * optionVolatility;
        this.currentPrices.monthlyPut += (Math.random() - 0.5) * this.currentPrices.monthlyPut * optionVolatility;

        // Ensure prices don't go negative
        Object.keys(this.currentPrices).forEach(key => {
            if (this.currentPrices[key] < 0) {
                this.currentPrices[key] = Math.abs(this.currentPrices[key]);
            }
        });
    }

    /**
     * Create simulated tick data in XTS format
     */
    createSimulatedTicks(weeklyOptions, monthlyOptions) {
        const ticks = [];

        // Spot tick
        ticks.push({
            ExchangeInstrumentID: 'NIFTY_SPOT',
            LastTradedPrice: this.currentPrices.spot,
            Volume: Math.floor(Math.random() * 100000),
            ExchangeTimeStamp: Date.now(),
            BidPrice: this.currentPrices.spot - 0.5,
            AskPrice: this.currentPrices.spot + 0.5,
            Open: this.currentPrices.spot - (Math.random() - 0.5) * 10,
            High: this.currentPrices.spot + Math.random() * 5,
            Low: this.currentPrices.spot - Math.random() * 5,
            Close: this.currentPrices.spot
        });

        // Weekly options ticks
        if (weeklyOptions.length > 0) {
            const callOption = weeklyOptions.find(opt => opt.ticker.includes('CE'));
            const putOption = weeklyOptions.find(opt => opt.ticker.includes('PE'));

            if (callOption) {
                ticks.push({
                    ExchangeInstrumentID: 'WEEKLY_CALL',
                    LastTradedPrice: this.currentPrices.weeklyCall,
                    Volume: Math.floor(Math.random() * 50000),
                    ExchangeTimeStamp: Date.now(),
                    BidPrice: this.currentPrices.weeklyCall - 0.25,
                    AskPrice: this.currentPrices.weeklyCall + 0.25,
                    OpenInterest: 125000,
                    ImpliedVolatility: 18.5 + (Math.random() - 0.5) * 2
                });
            }

            if (putOption) {
                ticks.push({
                    ExchangeInstrumentID: 'WEEKLY_PUT',
                    LastTradedPrice: this.currentPrices.weeklyPut,
                    Volume: Math.floor(Math.random() * 45000),
                    ExchangeTimeStamp: Date.now(),
                    BidPrice: this.currentPrices.weeklyPut - 0.25,
                    AskPrice: this.currentPrices.weeklyPut + 0.25,
                    OpenInterest: 110000,
                    ImpliedVolatility: 19.2 + (Math.random() - 0.5) * 2
                });
            }
        }

        // Monthly options ticks
        if (monthlyOptions.length > 0) {
            const callOption = monthlyOptions.find(opt => opt.ticker.includes('CE'));
            const putOption = monthlyOptions.find(opt => opt.ticker.includes('PE'));

            if (callOption) {
                ticks.push({
                    ExchangeInstrumentID: 'MONTHLY_CALL',
                    LastTradedPrice: this.currentPrices.monthlyCall,
                    Volume: Math.floor(Math.random() * 30000),
                    ExchangeTimeStamp: Date.now(),
                    BidPrice: this.currentPrices.monthlyCall - 0.5,
                    AskPrice: this.currentPrices.monthlyCall + 0.5,
                    OpenInterest: 85000,
                    ImpliedVolatility: 16.8 + (Math.random() - 0.5) * 2
                });
            }

            if (putOption) {
                ticks.push({
                    ExchangeInstrumentID: 'MONTHLY_PUT',
                    LastTradedPrice: this.currentPrices.monthlyPut,
                    Volume: Math.floor(Math.random() * 28000),
                    ExchangeTimeStamp: Date.now(),
                    BidPrice: this.currentPrices.monthlyPut - 0.5,
                    AskPrice: this.currentPrices.monthlyPut + 0.5,
                    OpenInterest: 80000,
                    ImpliedVolatility: 17.1 + (Math.random() - 0.5) * 2
                });
            }
        }

        return ticks;
    }

    /**
     * Get historical data for charts
     */
    async getHistoricalData(ticker, startDate, endDate, interval = '1m') {
        try {
            const query = `
                SELECT 
                    datetime,
                    open,
                    high,
                    low,
                    close,
                    volume,
                    open_interest
                FROM market_data 
                WHERE ticker = $1 
                AND datetime >= $2 
                AND datetime <= $3
                ORDER BY datetime ASC
            `;

            const result = await this.db.query(query, [ticker, startDate, endDate]);

            return result.rows.map(row => ({
                timestamp: row.datetime,
                open: parseFloat(row.open),
                high: parseFloat(row.high),
                low: parseFloat(row.low),
                close: parseFloat(row.close),
                volume: parseInt(row.volume),
                openInterest: parseInt(row.open_interest)
            }));

        } catch (error) {
            console.error('Error fetching historical data:', error);
            return [];
        }
    }

    /**
     * Get cost of carry data
     */
    async getCostOfCarryData(spotTicker, futureTicker, startDate, endDate) {
        try {
            const query = `
                SELECT 
                    s.datetime,
                    s.close as spot_price,
                    f.close as future_price,
                    f.expiry_date,
                    (f.close - s.close) as premium,
                    ((f.close - s.close) / s.close * 100) as premium_percentage
                FROM market_data s
                JOIN market_data f ON DATE(s.datetime) = DATE(f.datetime)
                WHERE s.ticker = $1 
                AND f.ticker = $2
                AND s.datetime >= $3 
                AND s.datetime <= $4
                ORDER BY s.datetime ASC
            `;

            const result = await this.db.query(query, [spotTicker, futureTicker, startDate, endDate]);

            return result.rows.map(row => ({
                timestamp: row.datetime,
                spotPrice: parseFloat(row.spot_price),
                futurePrice: parseFloat(row.future_price),
                expiryDate: row.expiry_date,
                premium: parseFloat(row.premium),
                premiumPercentage: parseFloat(row.premium_percentage),
                daysToExpiry: this.calculateDaysToExpiry(row.expiry_date)
            }));

        } catch (error) {
            console.error('Error fetching cost of carry data:', error);
            return [];
        }
    }

    /**
     * Calculate days to expiry
     */
    calculateDaysToExpiry(expiryDate) {
        if (!expiryDate) return 0;

        const expiry = new Date(expiryDate);
        const today = new Date();
        const diffTime = expiry - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return Math.max(0, diffDays);
    }

    /**
     * Subscribe to real-time data
     */
    onData(callback) {
        const id = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        this.subscribers.set(id, callback);
        console.log(`Added data subscriber: ${id}`);
        return id;
    }

    /**
     * Unsubscribe from real-time data
     */
    offData(id) {
        const removed = this.subscribers.delete(id);
        if (removed) {
            console.log(`Removed data subscriber: ${id}`);
        }
    }

    /**
     * Notify all subscribers
     */
    notifySubscribers(data) {
        if (this.subscribers.size > 0) {
            this.subscribers.forEach((callback, id) => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error notifying subscriber ${id}:`, error.message);
                }
            });
        }
    }

    /**
     * Get current market status
     */
    getCurrentMarketStatus() {
        return {
            isOpen: this.isMarketOpen(),
            currentPrices: this.currentPrices,
            lastUpdate: new Date().toISOString(),
            dataSource: 'ZERODHA_DATABASE',
            simulationActive: this.isSimulating
        };
    }

    /**
     * Check if market is open (simplified)
     */
    isMarketOpen() {
        const now = new Date();
        const day = now.getDay(); // 0 = Sunday, 6 = Saturday
        const hour = now.getHours();
        const minute = now.getMinutes();
        const timeInMinutes = hour * 60 + minute;

        // Market closed on weekends
        if (day === 0 || day === 6) {
            return false;
        }

        // Market hours: 9:15 AM to 3:30 PM (IST)
        const marketOpen = 9 * 60 + 15; // 9:15 AM
        const marketClose = 15 * 60 + 30; // 3:30 PM

        return timeInMinutes >= marketOpen && timeInMinutes <= marketClose;
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            service: 'DataAdapter',
            status: 'active',
            simulationActive: this.isSimulating,
            subscriberCount: this.subscribers.size,
            marketOpen: this.isMarketOpen(),
            currentPrices: this.currentPrices,
            dataSource: 'ZERODHA_DATABASE'
        };
    }
}

module.exports = DataAdapter;