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
                origin: process.env.FRONTEND_URL || "http://localhost:3000",
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
    }

    /**
     * Setup Socket.IO handlers
     */
    setupSocketHandlers() {
        this.io.on('connection', (socket) => {
            this.connectedClients++;
            console.log(`Client connected. Total clients: ${this.connectedClients}`);

            // Send current status to new client
            if (this.isInitialized) {
                socket.emit('marketData', {
                    atmStrike: this.atmStrikeManager?.getCurrentATMStrike(),
                    expiries: this.expiryManager?.getCurrentExpiries(),
                    connectionStatus: this.connectionManager?.getStatus(),
                    timestamp: new Date().toISOString()
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
            this.connectionManager.initialize(this.zerodhaService, this.atmStrikeManager);
            console.log('Connection Manager initialized');

            // Set initial expiries
            const nextWeekly = new Date();
            nextWeekly.setDate(nextWeekly.getDate() + 7);
            const nextMonthly = new Date();
            nextMonthly.setMonth(nextMonthly.getMonth() + 1);

            this.expiryManager.setExpiries(nextWeekly, nextMonthly);

            // Initialize ATM strike with current spot price
            await this.atmStrikeManager.initialize(21400);

            this.isInitialized = true;
            console.log('All services initialized successfully');

        } catch (error) {
            console.error('Error initializing services:', error);
            throw error;
        }
    }

    /**
     * Start mock data simulation (for development/testing)
     */
    startMockDataSimulation() {
        console.log('Starting mock data simulation...');

        let spotPrice = 21400;
        let weeklyCallPrice = 150;
        let weeklyPutPrice = 120;
        let monthlyCallPrice = 280;
        let monthlyPutPrice = 245;

        setInterval(() => {
            // Simulate price movements
            spotPrice += (Math.random() - 0.5) * 10;
            weeklyCallPrice += (Math.random() - 0.5) * 5;
            weeklyPutPrice += (Math.random() - 0.5) * 5;
            monthlyCallPrice += (Math.random() - 0.5) * 8;
            monthlyPutPrice += (Math.random() - 0.5) * 8;

            // Simulate multiple tick data for all instruments
            const mockTicks = [
                // Spot data
                {
                    ExchangeInstrumentID: 'NIFTY_SPOT',
                    LastTradedPrice: spotPrice,
                    Volume: Math.floor(Math.random() * 100000),
                    ExchangeTimeStamp: Date.now(),
                    BidPrice: spotPrice - 0.5,
                    AskPrice: spotPrice + 0.5
                },
                // Weekly Call
                {
                    ExchangeInstrumentID: 'WEEKLY_CALL',
                    LastTradedPrice: weeklyCallPrice,
                    Volume: Math.floor(Math.random() * 50000),
                    ExchangeTimeStamp: Date.now(),
                    BidPrice: weeklyCallPrice - 0.25,
                    AskPrice: weeklyCallPrice + 0.25,
                    OpenInterest: 125000,
                    ImpliedVolatility: 18.5
                },
                // Weekly Put
                {
                    ExchangeInstrumentID: 'WEEKLY_PUT',
                    LastTradedPrice: weeklyPutPrice,
                    Volume: Math.floor(Math.random() * 45000),
                    ExchangeTimeStamp: Date.now(),
                    BidPrice: weeklyPutPrice - 0.25,
                    AskPrice: weeklyPutPrice + 0.25,
                    OpenInterest: 110000,
                    ImpliedVolatility: 19.2
                },
                // Monthly Call
                {
                    ExchangeInstrumentID: 'MONTHLY_CALL',
                    LastTradedPrice: monthlyCallPrice,
                    Volume: Math.floor(Math.random() * 30000),
                    ExchangeTimeStamp: Date.now(),
                    BidPrice: monthlyCallPrice - 0.5,
                    AskPrice: monthlyCallPrice + 0.5,
                    OpenInterest: 85000,
                    ImpliedVolatility: 16.8
                },
                // Monthly Put
                {
                    ExchangeInstrumentID: 'MONTHLY_PUT',
                    LastTradedPrice: monthlyPutPrice,
                    Volume: Math.floor(Math.random() * 28000),
                    ExchangeTimeStamp: Date.now(),
                    BidPrice: monthlyPutPrice - 0.5,
                    AskPrice: monthlyPutPrice + 0.5,
                    OpenInterest: 80000,
                    ImpliedVolatility: 17.1
                }
            ];

            // Process all ticks through data storage
            mockTicks.forEach(tickData => {
                this.dataStorage?.processTick(tickData);
            });

        }, 1000); // Every second

        console.log('Mock data simulation started');
    }

    /**
     * Start the server
     */
    async start() {
        try {
            console.log('🚀 Starting NIFTY Synthetic Dashboard Server...');

            // Initialize database
            const dbConnected = await this.initializeDatabase();
            if (!dbConnected) {
                throw new Error('Database initialization failed');
            }

            // Initialize all services
            await this.initializeServices();

            // Start mock data simulation if Zerodha is not connected
            const zerodhaStatus = this.zerodhaService?.getStatus();
            if (process.env.NODE_ENV !== 'production' && !zerodhaStatus?.isConnected) {
                console.log('⚠️ Zerodha not connected, starting mock data simulation...');
                this.startMockDataSimulation();
            } else if (zerodhaStatus?.isConnected) {
                console.log('✅ Zerodha connected, using real market data');
            }

            // Start server
            const port = process.env.PORT || 3001;
            this.server.listen(port, () => {
                console.log(`🌟 Server running on port ${port}`);
                console.log(`📊 Dashboard: http://localhost:${port}`);
                console.log(`🔌 WebSocket: ws://localhost:${port}`);
                console.log(`💾 Database: ${process.env.DATABASE_URL || 'postgresql://postgres:postgres123@localhost:5433/cost_of_carry_db'}`);
                console.log('✅ All systems operational');
            });

        } catch (error) {
            console.error('❌ Server startup failed:', error);
            process.exit(1);
        }
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('🛑 Shutting down server...');

        try {
            // Stop expiry monitoring
            this.expiryManager?.stopExpiryMonitoring();

            // Stop data storage
            this.dataStorage?.stopStorage();

            // Close database connection
            await this.dbService?.close();

            // Close server
            this.server.close(() => {
                console.log('✅ Server shutdown complete');
                process.exit(0);
            });

        } catch (error) {
            console.error('❌ Error during shutdown:', error);
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