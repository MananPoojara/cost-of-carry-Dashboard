/**
 * Cost of Carry Dashboard - Production Server
 * Updated to use Zerodha API and PostgreSQL database
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

// Import services
const ATMStrikeManager = require('./src/services/ATMStrikeManager');
const ExpiryManager = require('./src/services/ExpiryManager');
const OptimizedDataStorage = require('./src/services/OptimizedDataStorage');
const SpreadAnalyzer = require('./src/services/SpreadAnalyzer');
const ConnectionManager = require('./src/services/ConnectionManager');
const ZerodhaService = require('./src/services/ZerodhaService');
const DatabaseService = require('./src/services/DatabaseService');
const marketHoursManager = require('./src/services/MarketHoursManager');

class CostOfCarryServer {
    constructor() {
        this.app = express();
        this.server = http.createServer(this.app);
        this.io = socketIo(this.server, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
                methods: ["GET", "POST"]
            }
        });

        // Core services
        this.db = null;
        this.zerodhaService = null;
        this.databaseService = null;
        this.atmStrikeManager = null;
        this.expiryManager = null;
        this.dataStorage = null;
        this.spreadAnalyzer = null;
        this.connectionManager = null;

        // Server state
        this.isInitialized = false;
        this.connectedClients = 0;

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
        this.app.get('/health', async (req, res) => {
            const zerodhaStatus = this.zerodhaService?.getStatus();
            const dbStats = await this.databaseService?.getStatistics();

            res.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                services: {
                    database: this.databaseService?.isConnected || false,
                    zerodhaService: zerodhaStatus?.isConnected || false,
                    atmStrikeManager: !!this.atmStrikeManager,
                    expiryManager: !!this.expiryManager,
                    dataStorage: !!this.dataStorage,
                    connectionManager: this.connectionManager?.isHealthy() || false
                },
                zerodhaStatus: zerodhaStatus,
                databaseStats: dbStats,
                connectedClients: this.connectedClients,
                dataMode: zerodhaStatus?.isConnected ? 'LIVE' : 'MOCK'
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

                const data = await this.databaseService.getHistoricalComputedData(
                    startDate ? new Date(startDate) : null,
                    endDate ? new Date(endDate) : null,
                    parseInt(limit)
                );

                res.json({
                    data: data,
                    count: data.length,
                    query: { startDate, endDate, limit }
                });
            } catch (error) {
                console.error('Error fetching historical data:', error);
                res.status(500).json({ error: 'Failed to fetch historical data' });
            }
        });

        // Database statistics endpoint
        this.app.get('/api/database-stats', async (req, res) => {
            try {
                const stats = await this.databaseService?.getStatistics();
                res.json({
                    stats: stats,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                console.error('Error fetching database stats:', error);
                res.status(500).json({ error: 'Failed to fetch database statistics' });
            }
        });

        // Connection stats endpoint
        this.app.get('/api/connection-stats', (req, res) => {
            const zerodhaStats = this.zerodhaService?.getStatus();
            const dbStats = this.databaseService?.getStatus();

            res.json({
                zerodha: zerodhaStats,
                database: dbStats,
                timestamp: new Date().toISOString()
            });
        });

        // Force reconnection endpoint (for debugging)
        this.app.post('/api/force-reconnect', async (req, res) => {
            try {
                if (this.zerodhaService) {
                    this.zerodhaService.disconnect();
                    await this.zerodhaService.initialize();
                }
                res.json({
                    message: 'Reconnection triggered',
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    error: 'Reconnection failed',
                    message: error.message
                });
            }
        });

        // Test Zerodha connection endpoint
        this.app.post('/api/test-zerodha', async (req, res) => {
            try {
                const testResults = await this.zerodhaService?.testConnectionDetailed();
                res.json({
                    testResults: testResults,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    error: 'Test failed',
                    message: error.message
                });
            }
        });

        // Clean old data endpoint
        this.app.post('/api/clean-data', async (req, res) => {
            try {
                const { daysToKeep = 30 } = req.body;
                const results = await this.databaseService?.cleanOldData(daysToKeep);
                res.json({
                    results: results,
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    error: 'Cleanup failed',
                    message: error.message
                });
            }
        });
    }

    /**
     * Setup Socket.IO handlers
     */
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            this.connectedClients++;
            console.log(`Client connected. Total clients: ${this.connectedClients}`);

            // Send current status and latest data to new client
            if (this.isInitialized) {
                // Fetch latest computed data from DB to show immediately (even if market closed)
                this.databaseService.getLatestComputedData(1).then(latestData => {
                    let initialData = {
                        atmStrike: this.atmStrikeManager?.getCurrentATMStrike(),
                        expiries: this.expiryManager?.getCurrentExpiries(),
                        connectionStatus: this.zerodhaService?.getStatus(),
                        timestamp: new Date().toISOString(),
                        marketStatus: marketHoursManager.getMarketStatus().status,
                        marketDescription: marketHoursManager.getMarketStatus().description
                    };

                    if (latestData && latestData.length > 0) {
                        const d = latestData[0];
                        initialData = {
                            ...initialData,
                            spot: d.spot_price,
                            weeklySynthetic: d.weekly_synthetic_future,
                            monthlySynthetic: d.monthly_synthetic_future,
                            weeklyCarry: d.weekly_cost_of_carry,
                            monthlyCarry: d.monthly_cost_of_carry,
                            calendarSpread: d.calendar_spread,
                            weeklyPremium: d.weekly_call_premium,
                            monthlyPremium: d.monthly_put_premium,
                            spreadZScore: d.spread_z_score, // Assuming field name mapping
                            isHistorical: true // Flag to indicate this is not a live tick but last state
                        };
                    }

                    socket.emit('marketData', initialData);
                });
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
                    connectionStatus: this.zerodhaService?.getStatus(),
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
        try {
            console.log('Initializing PostgreSQL database...');

            this.databaseService = new DatabaseService();
            const dbConnected = await this.databaseService.initialize();

            if (dbConnected) {
                console.log('PostgreSQL database connected successfully');
                return true;
            } else {
                console.log('PostgreSQL database connection failed');
                return false;
            }
        } catch (error) {
            console.error('Database initialization failed:', error);
            return false;
        }
    }

    /**
     * Initialize all production services
     */
    async initializeServices() {
        try {
            // Initialize Zerodha Service first
            this.zerodhaService = new ZerodhaService();
            const zerodhaConnected = await this.zerodhaService.initialize();
            console.log(`Zerodha Service initialized (${zerodhaConnected ? 'LIVE' : 'MOCK'} mode)`);

            // Initialize Spread Analyzer
            this.spreadAnalyzer = new SpreadAnalyzer();
            console.log('Spread Analyzer initialized');

            // Initialize ATM Strike Manager with Zerodha service
            this.atmStrikeManager = new ATMStrikeManager(this.zerodhaService, this.databaseService);
            console.log('ATM Strike Manager initialized');

            // Initialize Expiry Manager with Zerodha service
            this.expiryManager = new ExpiryManager(this.zerodhaService, this.databaseService);
            this.expiryManager.startExpiryMonitoring();
            console.log('Expiry Manager initialized');

            // Initialize Optimized Data Storage with database
            this.dataStorage = new OptimizedDataStorage(this.databaseService, this.io);
            this.dataStorage.initialize(this.atmStrikeManager, this.spreadAnalyzer);
            console.log('Optimized Data Storage initialized');

            // Initialize Connection Manager with Zerodha WebSocket
            this.connectionManager = new ConnectionManager(this.io);
            this.connectionManager.initialize(this.zerodhaService, this.atmStrikeManager);
            console.log('Connection Manager initialized');

            // Set initial expiries (in production, fetch from Zerodha)
            const nextWeekly = new Date();
            nextWeekly.setDate(nextWeekly.getDate() + 7);
            const nextMonthly = new Date();
            nextMonthly.setMonth(nextMonthly.getMonth() + 1);

            this.expiryManager.setExpiries(nextWeekly, nextMonthly);

            // Initialize ATM strike with current spot price
            await this.atmStrikeManager.initialize(21400);

            // Connect Zerodha data to storage
            if (zerodhaConnected) {
                this.zerodhaService.onData((tickData) => {
                    // Store in database
                    this.databaseService.storeMarketData(tickData);
                    // Process for real-time calculations
                    this.dataStorage.processTick(tickData);
                });
                console.log('Zerodha data pipeline connected');

                // Subscribe to required instruments
                const instruments = ['NIFTY_SPOT', 'WEEKLY_CALL', 'WEEKLY_PUT', 'MONTHLY_CALL', 'MONTHLY_PUT'];
                await this.zerodhaService.subscribe(instruments);
                console.log('Subscribed to market data instruments');
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
            console.log('Starting Cost of Carry Dashboard Server...');

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
                console.log('✅ Zerodha connected, using real market data');
            } else {
                console.log('⚠️  Zerodha not connected - waiting for real data connection');
            }

            // Start server
            const port = process.env.PORT || 3001;
            this.server.listen(port, () => {
                console.log(`Server running on port ${port}`);
                console.log(`Dashboard: http://localhost:${port}`);
                console.log(`WebSocket: ws://localhost:${port}`);
                console.log(`Database: PostgreSQL on ${this.databaseService.config.host}:${this.databaseService.config.port}`);
                console.log('All systems operational');
            });

        } catch (error) {
            console.error('Server startup failed:', error);
            process.exit(1);
        }
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('Shutting down server...');

        try {
            // Stop expiry monitoring
            this.expiryManager?.stopExpiryMonitoring();

            // Stop data storage
            this.dataStorage?.stopStorage();

            // Disconnect Zerodha
            this.zerodhaService?.disconnect();

            // Close database connection
            await this.databaseService?.close();

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
const server = new CostOfCarryServer();
server.start();