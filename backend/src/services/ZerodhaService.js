/**
 * Zerodha API Integration Service
 * Replaces XTS API with reverse-engineered Zerodha data fetching
 * Based on the Python implementation in pyScript/
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class ZerodhaService {
    constructor() {
        // Connection constants from curl request
        this.kiteDomain = null;
        this.requestConnectionList = [];
        this.headerParams = {};

        // Authentication data
        this.isConnected = false;
        this.isAuthenticated = false;

        // Subscribers for data updates
        this.subscribers = new Map();
        this.subscribedInstruments = new Set();

        // Instrument token mapping (from Python script)
        this.instrumentTokens = this.getInstrumentTokenMapping();

        // Data fetching intervals
        this.fetchInterval = null;
        this.fetchIntervalMs = 1000; // 1 second like Python script

        // Error tracking
        this.lastError = null;
        this.connectionState = 'DISCONNECTED';

        // Request settings
        this.maxRetries = 5;
        this.retryDelay = 1000;
    }

    /**
     * Initialize Zerodha service
     * @returns {boolean} Success status
     */
    async initialize() {
        console.log('Initializing Zerodha Service...');

        try {
            // Step 1: Load connection constants from curl file
            const constantsLoaded = await this.loadKiteConnectionConstants();
            if (!constantsLoaded) {
                console.log('Failed to load Zerodha connection constants');
                console.log('Make sure pyScript/kite-curl-request.txt exists and is valid');
                return false;
            }

            // Step 2: Test connection
            const connectionTest = await this.testConnection();
            if (!connectionTest) {
                console.log('Zerodha connection test failed');
                console.log('Check if the curl request in kite-curl-request.txt is still valid');
                return false;
            }

            this.isConnected = true;
            this.isAuthenticated = true;
            this.connectionState = 'CONNECTED';

            console.log('✅ Zerodha Service initialized successfully');
            return true;

        } catch (error) {
            console.error('❌ Zerodha Service initialization error:', error.message);
            this.lastError = {
                message: error.message,
                timestamp: new Date().toISOString(),
                type: 'initialization'
            };
            return false;
        }
    }

    /**
     * Load Kite connection constants from curl request file
     * Converts Python implementation to Node.js
     * @returns {boolean} Success status
     */
    async loadKiteConnectionConstants() {
        try {
            const curlFilePath = path.join(process.cwd(), 'pyScript', 'kite-curl-request.txt');
            const curlContent = await fs.readFile(curlFilePath, 'utf8');

            // Parse curl command (simplified version of Python's shlex.split)
            const lines = curlContent.split('\n').map(line => line.trim()).filter(line => line);
            const curlCommand = lines.join(' ');

            // Extract URL
            const urlMatch = curlCommand.match(/curl\\s+'([^']+)'/);
            if (!urlMatch) {
                console.error('Could not extract URL from curl command');
                return false;
            }

            const requestUrl = urlMatch[1];
            console.log('Extracted URL:', requestUrl);

            // Extract headers
            const headerMatches = curlCommand.matchAll(/-H\\s+'([^']+)'/g);
            const headers = {};

            for (const match of headerMatches) {
                const headerLine = match[1];
                const colonIndex = headerLine.indexOf(':');
                if (colonIndex > 0) {
                    const key = headerLine.substring(0, colonIndex).trim();
                    const value = headerLine.substring(colonIndex + 1).trim();
                    headers[key] = value;
                }
            }

            // Parse URL components
            const urlParts = requestUrl.split('//');
            if (urlParts.length !== 2) {
                console.error('Invalid URL format');
                return false;
            }

            const [protocol, rest] = urlParts;
            const [domain, ...pathParts] = rest.split('/');

            this.kiteDomain = domain;
            this.requestConnectionList = ['', ...pathParts];
            this.headerParams = headers;

            console.log('✅ Connection constants loaded:');
            console.log('   Domain:', this.kiteDomain);
            console.log('   Headers count:', Object.keys(headers).length);

            return true;

        } catch (error) {
            console.error('Error loading connection constants:', error.message);
            return false;
        }
    }

    /**
     * Test connection to Zerodha API
     * @returns {boolean} Success status
     */
    async testConnection() {
        try {
            console.log('Testing Zerodha connection...');

            // Build test URL (use NIFTY spot for testing)
            const testUrl = `https://${this.kiteDomain}${this.requestConnectionList.join('/')}`;

            console.log('Test URL:', testUrl);

            const response = await axios.get(testUrl, {
                headers: this.headerParams,
                timeout: 10000
            });

            if (response.status === 200 && response.data) {
                console.log('✅ Connection test successful');
                console.log('   Response status:', response.status);
                console.log('   Data received:', !!response.data);
                return true;
            }

            console.log('❌ Connection test failed - invalid response');
            return false;

        } catch (error) {
            console.error('❌ Connection test failed:', error.message);
            if (error.response) {
                console.error('   Status:', error.response.status);
                console.error('   Status text:', error.response.statusText);
            }
            return false;
        }
    }

    /**
     * Fetch data for specific instrument
     * @param {string} instrumentToken - Instrument token
     * @param {Date} fromDate - Start date
     * @param {Date} toDate - End date
     * @returns {Array} Market data array
     */
    async fetchInstrumentData(instrumentToken, fromDate, toDate) {
        try {
            // Build URL similar to Python implementation
            const baseUrl = `https://${this.kiteDomain}`;
            const pathParts = [...this.requestConnectionList];

            // Replace instrument token in path (similar to Python logic)
            const instrumentIndex = pathParts.findIndex(part => /^\\d+$/.test(part));
            if (instrumentIndex >= 0) {
                pathParts[instrumentIndex] = instrumentToken;
            }

            const fromDateStr = fromDate.toISOString().split('T')[0];
            const toDateStr = toDate.toISOString().split('T')[0];

            const url = `${baseUrl}${pathParts.join('/')}&from=${fromDateStr}&to=${toDateStr}`;

            console.log(`Fetching data for ${instrumentToken}: ${fromDateStr} to ${toDateStr}`);

            const response = await axios.get(url, {
                headers: this.headerParams,
                timeout: 30000
            });

            if (response.data && response.data.data && response.data.data.candles) {
                const candles = response.data.data.candles;
                console.log(`   Received ${candles.length} candles`);

                // Convert to standard format
                return candles.map(candle => ({
                    DateTime: candle[0],
                    Open: candle[1],
                    High: candle[2],
                    Low: candle[3],
                    Close: candle[4],
                    Volume: candle[5],
                    OpenInterest: candle[6] || 0
                }));
            }

            return [];

        } catch (error) {
            console.error(`Error fetching data for ${instrumentToken}:`, error.message);
            return [];
        }
    }

    /**
     * Start real-time data fetching
     * @param {Array} instruments - Array of instrument names to subscribe to
     */
    async subscribe(instruments) {
        if (!this.isConnected) {
            console.log('Not connected to Zerodha, cannot subscribe');
            return false;
        }

        console.log('Subscribing to instruments:', instruments);

        // Add to subscribed instruments
        instruments.forEach(inst => this.subscribedInstruments.add(inst));

        // Start fetching interval if not already running
        if (!this.fetchInterval) {
            this.startRealTimeDataFetch();
        }

        return true;
    }

    /**
     * Start real-time data fetching interval
     */
    startRealTimeDataFetch() {
        console.log('Starting real-time data fetch...');

        this.fetchInterval = setInterval(async () => {
            try {
                await this.fetchCurrentMarketData();
            } catch (error) {
                console.error('Error in real-time data fetch:', error.message);
            }
        }, this.fetchIntervalMs);

        console.log(`✅ Real-time data fetch started (${this.fetchIntervalMs}ms interval)`);
    }

    /**
     * Fetch current market data for subscribed instruments
     */
    async fetchCurrentMarketData() {
        if (this.subscribedInstruments.size === 0) {
            return;
        }

        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60000); // 1 minute ago

        for (const instrumentName of this.subscribedInstruments) {
            try {
                const token = this.getInstrumentToken(instrumentName);
                if (!token) continue;

                const data = await this.fetchInstrumentData(
                    token.exchangeInstrumentID.toString(),
                    oneMinuteAgo,
                    now
                );

                if (data.length > 0) {
                    // Get latest candle
                    const latestCandle = data[data.length - 1];

                    // Convert to XTS-like format for compatibility
                    const processedData = {
                        ExchangeInstrumentID: instrumentName,
                        LastTradedPrice: latestCandle.Close,
                        Volume: latestCandle.Volume,
                        ExchangeTimeStamp: new Date(latestCandle.DateTime).getTime(),
                        BidPrice: latestCandle.Close - 0.05, // Approximate
                        AskPrice: latestCandle.Close + 0.05, // Approximate
                        OpenInterest: latestCandle.OpenInterest,
                        Open: latestCandle.Open,
                        High: latestCandle.High,
                        Low: latestCandle.Low,
                        Close: latestCandle.Close
                    };

                    // Notify subscribers
                    this.notifySubscribers(processedData);
                }

            } catch (error) {
                console.error(`Error fetching data for ${instrumentName}:`, error.message);
            }
        }
    }

    /**
     * Get instrument token mapping (from Python script)
     * @returns {Object} Instrument tokens
     */
    getInstrumentTokenMapping() {
        // These should be updated with real tokens from Zerodha instruments API
        return {
            'NIFTY_SPOT': { exchangeSegment: 1, exchangeInstrumentID: 256265 },
            'NIFTY_21400_CE_WEEKLY': { exchangeSegment: 2, exchangeInstrumentID: 46435 },
            'NIFTY_21400_PE_WEEKLY': { exchangeSegment: 2, exchangeInstrumentID: 46436 },
            'NIFTY_21500_CE_WEEKLY': { exchangeSegment: 2, exchangeInstrumentID: 46439 },
            'NIFTY_21500_PE_WEEKLY': { exchangeSegment: 2, exchangeInstrumentID: 46440 },
            'WEEKLY_CALL': { exchangeSegment: 2, exchangeInstrumentID: 46435 },
            'WEEKLY_PUT': { exchangeSegment: 2, exchangeInstrumentID: 46436 },
            'MONTHLY_CALL': { exchangeSegment: 2, exchangeInstrumentID: 46439 },
            'MONTHLY_PUT': { exchangeSegment: 2, exchangeInstrumentID: 46440 }
        };
    }

    /**
     * Get instrument token
     * @param {string} instrumentName - Instrument name
     * @returns {Object|null} Token
     */
    getInstrumentToken(instrumentName) {
        return this.instrumentTokens[instrumentName] || null;
    }

    /**
     * Subscribe to data updates
     * @param {Function} callback - Callback function
     * @returns {string} Subscription ID
     */
    onData(callback) {
        const id = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        this.subscribers.set(id, callback);
        console.log(`Added data subscriber: ${id}`);
        return id;
    }

    /**
     * Unsubscribe from data updates
     * @param {string} id - Subscription ID
     */
    offData(id) {
        const removed = this.subscribers.delete(id);
        if (removed) {
            console.log(`Removed data subscriber: ${id}`);
        }
    }

    /**
     * Notify all subscribers of new data
     * @param {Object} data - Market data
     */
    notifySubscribers(data) {
        const count = this.subscribers.size;
        if (count > 0) {
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
     * Unsubscribe from instruments
     * @param {Array} instruments - Array of instrument names
     */
    async unsubscribe(instruments) {
        instruments.forEach(inst => this.subscribedInstruments.delete(inst));

        // Stop interval if no more subscriptions
        if (this.subscribedInstruments.size === 0 && this.fetchInterval) {
            clearInterval(this.fetchInterval);
            this.fetchInterval = null;
            console.log('Stopped real-time data fetch - no subscriptions');
        }

        return true;
    }

    /**
     * Get detailed connection status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            connectionState: this.connectionState,
            isConnected: this.isConnected,
            isAuthenticated: this.isAuthenticated,
            subscribedInstruments: Array.from(this.subscribedInstruments),
            subscriberCount: this.subscribers.size,
            kiteDomain: this.kiteDomain,
            mode: this.isConnected ? 'LIVE' : 'MOCK',
            lastError: this.lastError,
            statusMessage: this.isConnected ? 'Connected to Zerodha' : 'Disconnected',
            recommendation: this.isConnected ? 'Receiving market data' : 'Check kite-curl-request.txt file'
        };
    }

    /**
     * Disconnect from Zerodha
     */
    disconnect() {
        console.log('🔌 Disconnecting from Zerodha...');

        // Stop data fetching
        if (this.fetchInterval) {
            clearInterval(this.fetchInterval);
            this.fetchInterval = null;
        }

        // Clear state
        this.isConnected = false;
        this.isAuthenticated = false;
        this.connectionState = 'DISCONNECTED';
        this.subscribedInstruments.clear();

        console.log('Disconnected from Zerodha');
    }

    /**
     * Test connection and provide diagnostics
     * @returns {Object} Test results
     */
    async testConnectionDetailed() {
        console.log('\n' + '='.repeat(70));
        console.log('Zerodha Connection Test');
        console.log('='.repeat(70));

        const results = {
            curlFileExists: false,
            curlFileParsed: false,
            connectionSuccess: false,
            overallSuccess: false,
            errors: []
        };

        // Test 1: Check curl file
        console.log('\n1. Testing curl file...');
        try {
            const curlFilePath = path.join(process.cwd(), 'pyScript', 'kite-curl-request.txt');
            await fs.access(curlFilePath);
            console.log('✅ Curl file exists');
            results.curlFileExists = true;
        } catch (error) {
            console.log('❌ Curl file missing');
            results.errors.push('kite-curl-request.txt file not found in pyScript folder');
            return results;
        }

        // Test 2: Parse curl file
        console.log('\n2. Testing curl file parsing...');
        const parsed = await this.loadKiteConnectionConstants();
        if (parsed) {
            console.log('✅ Curl file parsed successfully');
            results.curlFileParsed = true;
        } else {
            console.log('❌ Failed to parse curl file');
            results.errors.push('Could not parse curl request file');
            return results;
        }

        // Test 3: Test connection
        console.log('\n3. Testing API connection...');
        const connected = await this.testConnection();
        if (connected) {
            console.log('✅ API connection successful');
            results.connectionSuccess = true;
        } else {
            console.log('❌ API connection failed');
            results.errors.push('API connection failed - check if curl request is still valid');
            return results;
        }

        results.overallSuccess = true;
        console.log('\n✅ All tests passed!');
        console.log('='.repeat(70) + '\n');

        return results;
    }
}

module.exports = ZerodhaService;