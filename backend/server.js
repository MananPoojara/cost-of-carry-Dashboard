/**
 * NIFTY Synthetic Dashboard - Production Server
 * Integrates all critical production components for real trading environment
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Import production-grade services
const ATMStrikeManager = require('./src/services/ATMStrikeManager');
const ExpiryManager = require('./src/services/ExpiryManager');
const OptimizedDataStorage = require('./src/services/OptimizedDataStorage');
const SpreadAnalyzer = require('./src/services/SpreadAnalyzer');
const ConnectionManager = require('./src/services/ConnectionManager');
const ZerodhaService = require('./src/services/ZerodhaService');

class NiftySyntheticServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        // Core services
        this.dbService = null;
        this.zerodhaService = null;
        this.atmStrikeManager = null;
        this.expiryManager = null;
        this.dataStorage = null;
        this.spreadAnalyzer = null;
        this.connectionManager = null;

        // Server state
        this.isInitialized = false;
        this.connectedClients = 0;
        
        // Performance optimization - cached aggregated data
        this.cachedAggregatedData = null;
        this.lastAggregationTime = 0;
        this.aggregationCacheTimeout = 5 * 60 * 1000; // 5 minutes cache

        this.setupMiddleware();
        this.setupRoutes();
        this.setupSocketHandlers();
    }

    /**
     * Setup Express middleware
     */
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static('public'));

        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    /**
     * Setup API routes
     */
    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            const zerodhaStatus = this.zerodhaService?.getStatus();
            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                services: {
                    database: this.dbService?.isConnected || false,
                    zerodhaService: !!this.zerodhaService,
                    atmStrikeManager: !!this.atmStrikeManager,
                    expiryManager: !!this.expiryManager,
                    dataStorage: !!this.dataStorage,
                    connectionManager: this.connectionManager?.isHealthy() || false
                },
                zerodhaStatus: zerodhaStatus,
                connectedClients: this.connectedClients,
                dataMode: 'ZERODHA_API'
            });
        });

        // Current ATM strike endpoint
        this.app.get('/api/atm-strike', (req, res) => {
            const currentStrike = this.atmStrikeManager?.getCurrentATMStrike();
            res.json({
                atmStrike: currentStrike,
                timestamp: new Date().toISOString()
            });
        });

        // Current expiries endpoint
        this.app.get('/api/expiries', (req, res) => {
            const expiries = this.expiryManager?.getCurrentExpiries();
            res.json({
                expiries: expiries,
                timestamp: new Date().toISOString()
            });
        });

        // Spread analysis endpoint
        this.app.get('/api/spread-analysis', (req, res) => {
            const analysis = this.spreadAnalyzer?.getCurrentAnalysis();
            res.json({
                analysis: analysis,
                timestamp: new Date().toISOString()
            });
        });

        // Historical data endpoint
        this.app.get('/api/historical', async (req, res) => {
            try {
                const { startDate, endDate, limit = 1000 } = req.query;
                const data = await this.dbService.getHistoricalComputedData(startDate, endDate, limit);
                res.json({
                    data: data,
                    count: data.length
                });
            } catch (error) {
                console.error('Error fetching historical data:', error);
                res.status(500).json({ error: 'Failed to fetch historical data' });
            }
        });

        // Zerodha market data endpoint
        this.app.get('/api/market-data/:ticker', async (req, res) => {
            try {
                const { ticker } = req.params;
                const { startDate, endDate, limit = 1000 } = req.query;

                const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
                const end = endDate || new Date().toISOString();

                const data = await this.zerodhaService.getMarketData(ticker, start, end, limit);

                res.json({
                    ticker,
                    data,
                    count: data.length,
                    startDate: start,
                    endDate: end
                });
            } catch (error) {
                console.error('Error fetching market data:', error);
                res.status(500).json({ error: 'Failed to fetch market data' });
            }
        });

        // Available tickers endpoint
        this.app.get('/api/tickers', async (req, res) => {
            try {
                const { exchange } = req.query;
                const tickers = await this.zerodhaService.getAvailableTickers(exchange);

                res.json({
                    tickers,
                    count: tickers.length,
                    exchange: exchange || 'all'
                });
            } catch (error) {
                console.error('Error fetching tickers:', error);
                res.status(500).json({ error: 'Failed to fetch tickers' });
            }
        });

        // Connection stats endpoint
        this.app.get('/api/connection-stats', (req, res) => {
            const stats = this.connectionManager?.getConnectionStats();
            res.json({
                stats: stats,
                timestamp: new Date().toISOString()
            });
        });

        // Force reconnection endpoint (for debugging)
        this.app.post('/api/force-reconnect', (req, res) => {
            this.connectionManager?.forceReconnect();
            res.json({
                message: 'Reconnection triggered',
                timestamp: new Date().toISOString()
            });
        });

        // Manual cache refresh endpoint
        this.app.post('/api/refresh-cache', async (req, res) => {
            try {
                console.log('🔄 Manual cache refresh requested');
                this.cachedAggregatedData = null; // Clear cache
                const freshData = await this.getCachedAggregatedData(); // Generate new cache
                res.json({
                    message: 'Cache refreshed successfully',
                    dataPoints: freshData.length,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Cache refresh error:', error);
                res.status(500).json({ error: 'Failed to refresh cache' });
            }
        });
    }

    /**
     * Setup Socket.IO handlers
     */
    setupSocketHandlers() {
        this.io.on('connection', async (socket) => {
            this.connectedClients++;
            console.log(`\n${'='.repeat(60)}`);
            console.log(`✅ NEW CLIENT CONNECTED`);
            console.log(`   Socket ID: ${socket.id}`);
            console.log(`   Total clients: ${this.connectedClients}`);
            console.log(`   Server initialized: ${this.isInitialized}`);
            console.log(`${'='.repeat(60)}\n`);

            // Send current status and appropriate data based on market hours to new client
            if (this.isInitialized) {
                try {
                    const now = new Date();
                    const zerodhaMarketStatus = this.zerodhaService?.getMarketStatus();
                    const isMarketOpen = zerodhaMarketStatus?.isOpen || false;
                    const isAfterMarketHours = !isMarketOpen;
                    
                    let formattedHistory = [];
                    let latestPoint = null;
                    
                    if (isMarketOpen) {
                        // During market hours: get recent live data (last 5 minutes for more responsive data)
                        const recentData = await this.dbService.getLatestComputedData(30);
                        formattedHistory = recentData
                            .filter(d => {
                                // Only include data from today during market hours
                                const dataTime = new Date(d.calculation_timestamp);
                                return dataTime.toDateString() === now.toDateString();
                            })
                            .map(d => ({
                                spot: parseFloat(d.spot_price),
                                weeklySynthetic: parseFloat(d.weekly_synthetic_future),
                                monthlySynthetic: parseFloat(d.monthly_synthetic_future),
                                weeklyCarry: parseFloat(d.weekly_cost_of_carry),
                                monthlyCarry: parseFloat(d.monthly_cost_of_carry),
                                calendarSpread: parseFloat(d.calendar_spread),
                                timestamp: d.calculation_timestamp,
                                atmStrike: parseFloat(d.atm_strike)
                            })).reverse();
                        
                        console.log(`📊 Market is OPEN - sending ${formattedHistory.length} recent data points for immediate visualization`);
                    } else if (isAfterMarketHours) {
                        // After market hours: get cached aggregated data for performance
                        const aggregatedData = await this.getCachedAggregatedData();
                        
                        formattedHistory = aggregatedData.map(d => ({
                            spot: parseFloat(d.spot_price),
                            weeklySynthetic: parseFloat(d.weekly_synthetic_future),
                            monthlySynthetic: parseFloat(d.monthly_synthetic_future),
                            weeklyCarry: parseFloat(d.weekly_cost_of_carry),
                            monthlyCarry: parseFloat(d.monthly_cost_of_carry),
                            calendarSpread: parseFloat(d.calendar_spread),
                            timestamp: d.calculation_timestamp,
                            atmStrike: parseFloat(d.atm_strike)
                        }));
                        
                        console.log(`📊 Market is CLOSED - sending ${formattedHistory.length} CACHED aggregated data points`);
                    }
                    
                    // Send special 'historyData' event if we have data
                    if (formattedHistory.length > 0) {
                        socket.emit('historyData', formattedHistory);
                    } else {
                        console.log('⚠️ No computed data available in database - waiting for real market data');
                    }

                    // Also send current state if available
                    if (formattedHistory.length > 0) {
                        latestPoint = formattedHistory[formattedHistory.length - 1];
                    }
                    
                    // Send current live data if market is open and we have a connection to Zerodha
                    const zerodhaStatus = this.zerodhaService?.getStatus();
                    if (isMarketOpen && zerodhaStatus?.isConnected) {
                        // Send the most current live data with real-time flag
                        const currentData = {
                            atmStrike: this.atmStrikeManager?.getCurrentATMStrike(),
                            expiries: this.expiryManager?.getCurrentExpiries(),
                            connectionStatus: this.connectionManager?.getStatus(),
                            marketStatus: isMarketOpen ? 'OPEN' : 'CLOSED',
                            isMarketClosed: !isMarketOpen,
                            dataRange: {
                                startDate: now.toISOString().split('T')[0],
                                endDate: now.toISOString().split('T')[0]
                            },
                            timestamp: new Date().toISOString(),
                            // Mark as real-time for the frontend to distinguish
                            isRealTime: true
                        };
                        console.log(`📤 Sending live market data during market hours`);
                        socket.emit('marketData', currentData);
                    } else if (latestPoint) {
                        // Send the latest historical data point when market is closed
                        const historicalData = {
                            ...latestPoint,
                            atmStrike: this.atmStrikeManager?.getCurrentATMStrike(),
                            expiries: this.expiryManager?.getCurrentExpiries(),
                            connectionStatus: this.connectionManager?.getStatus(),
                            marketStatus: isMarketOpen ? 'OPEN' : 'CLOSED',
                            isMarketClosed: !isMarketOpen,
                            dataRange: {
                                startDate: now.toISOString().split('T')[0],
                                endDate: now.toISOString().split('T')[0]
                            },
                            timestamp: new Date().toISOString(),
                            // Mark as historical for the frontend
                            isRealTime: false
                        };
                        console.log(`📤 Sending historical market data after market hours`);
                        socket.emit('marketData', historicalData);
                    }
                } catch (error) {
                    console.error('Error sending initial data to client:', error);
                }
            }

            socket.on('disconnect', () => {
                this.connectedClients--;
                console.log(`Client disconnected. Total clients: ${this.connectedClients}`);
            });

            // Handle client requests
            socket.on('requestCurrentData', () => {
                const currentData = {
                    atmStrike: this.atmStrikeManager?.getCurrentATMStrike(),
                    expiries: this.expiryManager?.getCurrentExpiries(),
                    connectionStatus: this.connectionManager?.getStatus(),
                    spreadAnalysis: this.spreadAnalyzer?.getCurrentAnalysis(),
                    timestamp: new Date().toISOString()
                };
                socket.emit('currentData', currentData);
            });
        });
    }

    /**
     * Initialize database connection
     */
    async initializeDatabase() {
        const DatabaseService = require('./src/services/DatabaseService');
        this.dbService = new DatabaseService();
        return await this.dbService.initialize();
    }

    /**
     * Create database indexes for performance
     */
    async createDatabaseIndexes() {
        try {
            // Computed data indexes
            await this.db.collection('computed_data').createIndex({ timestamp: 1 });
            await this.db.collection('computed_data').createIndex({ timestamp: -1 });

            // Strike changes indexes
            await this.db.collection('strike_changes').createIndex({ timestamp: 1 });

            // Expiry changes indexes
            await this.db.collection('expiry_changes').createIndex({ timestamp: 1 });

            // TTL index for data retention (optional - keep 1 year)
            await this.db.collection('computed_data').createIndex(
                { timestamp: 1 },
                { expireAfterSeconds: 31536000 } // 1 year
            );

            console.log('Database indexes created');
        } catch (error) {
            console.error('Error creating database indexes:', error);
        }
    }

    /**
     * Initialize all production services
     */
    async initializeServices() {
        try {
            // Initialize Zerodha Service
            this.zerodhaService = new ZerodhaService(this.dbService);
            const zerodhaInitialized = await this.zerodhaService.initialize();
            
            if (zerodhaInitialized) {
                console.log('Zerodha Service initialized and connected');
            } else {
                console.log('Zerodha Service initialization failed - check pyScript/kite-curl-request.txt');
            }

            // Initialize Spread Analyzer
            this.spreadAnalyzer = new SpreadAnalyzer();
            console.log('Spread Analyzer initialized');

            // Initialize ATM Strike Manager with Zerodha service
            this.atmStrikeManager = new ATMStrikeManager(this.zerodhaService, this.dbService);
            console.log('ATM Strike Manager initialized');

            // Initialize Expiry Manager with Zerodha service
            this.expiryManager = new ExpiryManager(this.zerodhaService, this.dbService);
            this.expiryManager.startExpiryMonitoring();
            console.log('Expiry Manager initialized');

            // Initialize Optimized Data Storage
            this.dataStorage = new OptimizedDataStorage(this.dbService, this.io);
            this.dataStorage.initialize(this.atmStrikeManager, this.spreadAnalyzer);
            console.log('Optimized Data Storage initialized');

            // Initialize Connection Manager
            this.connectionManager = new ConnectionManager(this.io);
            this.connectionManager.initialize(this.zerodhaService, this.atmStrikeManager, this.dataStorage);
            console.log('Connection Manager initialized');

            // Set initial expiries
            const nextWeekly = new Date();
            nextWeekly.setDate(nextWeekly.getDate() + 7);
            const nextMonthly = new Date();
            nextMonthly.setMonth(nextMonthly.getMonth() + 1);

            this.expiryManager.setExpiries(nextWeekly, nextMonthly);

            // Initialize ATM strike with a more realistic default (will be updated by NIFTY_SPOT tick)
            await this.atmStrikeManager.initialize(25000);

            // Connect Zerodha data to storage
            if (zerodhaInitialized) {
                this.zerodhaService.onData((tickData) => {
                    // Store in database
                    this.dbService.storeMarketData(tickData);
                    // Process for real-time calculations
                    this.dataStorage.processTick(tickData);
                });
                console.log('Zerodha data pipeline connected');
            }

            this.isInitialized = true;
            console.log('All services initialized successfully');

        } catch (error) {
            console.error('Error initializing services:', error);
            throw error;
        }
    }

    /**
     * Start the server (removed mock data simulation - only real data from Zerodha)
     */

    /**
     * Start the server
     */
    async start() {
        try {
            console.log('Starting NIFTY Synthetic Dashboard Server...');

            // Initialize database
            const dbConnected = await this.initializeDatabase();
            if (!dbConnected) {
                throw new Error('Database initialization failed');
            }

            // Initialize all services
            await this.initializeServices();

            // Start server with only real data
            const zerodhaStatus = this.zerodhaService?.getStatus();
            if (zerodhaStatus?.isConnected) {
                console.log('Zerodha connected, using real market data');
            } else {
                console.log('Zerodha not connected - waiting for real data connection');
            }

            // Start server
            const port = process.env.PORT || 3001;
            this.server.listen(port, '0.0.0.0', () => {
                console.log(`Server running on port ${port}`);
                console.log(`Dashboard: http://localhost:${port}`);
                console.log(`WebSocket: ws://localhost:${port}`);
                console.log(`Network Access: http://${require('os').networkInterfaces()['eth0']?.[0]?.address || 'YOUR_SERVER_IP'}:${port}`);
                console.log(`Database: ${process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5433/cost_of_carry_db'}`);
                console.log('All systems operational');
            });

        } catch (error) {
            console.error('Server startup failed:', error);
            process.exit(1);
        }
    }

    /**
     * Get cached or fresh aggregated data for better performance
     * @returns {Array} Aggregated data points
     */
    async getCachedAggregatedData() {
        const now = Date.now();
        
        // Return cached data if still valid (5 minutes cache)
        if (this.cachedAggregatedData && (now - this.lastAggregationTime) < this.aggregationCacheTimeout) {
            console.log(`📊 Using cached aggregated data (${this.cachedAggregatedData.length} points)`);
            return this.cachedAggregatedData;
        }
        
        // Fetch fresh data and aggregate
        console.log('📈 Generating fresh aggregated data...');
        const allHistoricalData = await this.dbService.getHistoricalComputedData(null, null, 50000);
        const aggregatedData = this.aggregateDataForChart(allHistoricalData);
        
        // Cache the results
        this.cachedAggregatedData = aggregatedData;
        this.lastAggregationTime = now;
        
        console.log(`📊 Fresh aggregation complete: ${aggregatedData.length} points cached`);
        return aggregatedData;
    }

    /**
     * Aggregate data for better chart visualization
     */
    aggregateDataForChart(rawData) {
        if (!rawData || rawData.length === 0) return [];
        
        // Sort by timestamp
        const sortedData = rawData.sort((a, b) => 
            new Date(a.calculation_timestamp) - new Date(b.calculation_timestamp)
        );
        
        // Determine optimal number of points (aim for 500-1000 points for good visualization)
        const targetPoints = 800;
        const totalPoints = sortedData.length;
        const bucketSize = Math.max(1, Math.floor(totalPoints / targetPoints));
        
        console.log(`📈 Aggregating ${totalPoints} data points into buckets of ${bucketSize} (target: ${targetPoints} points)`);
        
        const aggregated = [];
        
        for (let i = 0; i < totalPoints; i += bucketSize) {
            const bucket = sortedData.slice(i, i + bucketSize);
            if (bucket.length === 0) continue;
            
            // Calculate averages for the bucket
            const avgSpot = bucket.reduce((sum, d) => sum + parseFloat(d.spot_price || 0), 0) / bucket.length;
            const avgWeeklySynthetic = bucket.reduce((sum, d) => sum + parseFloat(d.weekly_synthetic_future || 0), 0) / bucket.length;
            const avgMonthlySynthetic = bucket.reduce((sum, d) => sum + parseFloat(d.monthly_synthetic_future || 0), 0) / bucket.length;
            const avgWeeklyCarry = bucket.reduce((sum, d) => sum + parseFloat(d.weekly_cost_of_carry || 0), 0) / bucket.length;
            const avgMonthlyCarry = bucket.reduce((sum, d) => sum + parseFloat(d.monthly_cost_of_carry || 0), 0) / bucket.length;
            const avgCalendarSpread = bucket.reduce((sum, d) => sum + parseFloat(d.calendar_spread || 0), 0) / bucket.length;
            const avgAtmStrike = bucket.reduce((sum, d) => sum + parseFloat(d.atm_strike || 0), 0) / bucket.length;
            
            // Use the timestamp from the first item in the bucket
            const timestamp = bucket[0].calculation_timestamp;
            
            aggregated.push({
                spot_price: avgSpot,
                weekly_synthetic_future: avgWeeklySynthetic,
                monthly_synthetic_future: avgMonthlySynthetic,
                weekly_cost_of_carry: avgWeeklyCarry,
                monthly_cost_of_carry: avgMonthlyCarry,
                calendar_spread: avgCalendarSpread,
                atm_strike: avgAtmStrike,
                calculation_timestamp: timestamp
            });
        }
        
        console.log(`📊 Aggregated data: ${aggregated.length} points (reduced from ${totalPoints})`);
        return aggregated;
    }
    async shutdown() {
        console.log('Shutting down server...');

        try {
            // Stop expiry monitoring
            this.expiryManager?.stopExpiryMonitoring();

            // Stop data storage
            this.dataStorage?.stopStorage();

            // Close database connection
            await this.dbService?.close();

            // Close server
            this.server.close(() => {
                console.log('Server shutdown complete');
                process.exit(0);
            });

        } catch (error) {
            console.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received');
    server.shutdown();
});

process.on('SIGINT', () => {
    console.log('SIGINT received');
    server.shutdown();
});

// Start server
const server = new NiftySyntheticServer();
server.start();