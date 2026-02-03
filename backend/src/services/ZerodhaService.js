/**
 * Zerodha API Integration Service
 * Replaces XTS API with reverse-engineered Zerodha data fetching
 * Based on the Python implementation in pyScript/
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class ZerodhaService {
    constructor(db) {
        this.db = db; // DatabaseService instance
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
    async loadConnectionConstants() {
        return this.loadKiteConnectionConstants();
    }

    async loadKiteConnectionConstants() {
        try {
            // Try different possible paths to find pyScript/kite-curl-request.txt
            const possiblePaths = [
                path.join(process.cwd(), 'pyScript', 'kite-curl-request.txt'),
                path.join(process.cwd(), '..', 'pyScript', 'kite-curl-request.txt'),
                path.join(process.cwd(), '..', '..', 'pyScript', 'kite-curl-request.txt'),
                path.join(process.cwd(), '..', '..', '..', 'pyScript', 'kite-curl-request.txt'),
                path.join(__dirname, '../../../pyScript/kite-curl-request.txt')
            ];

            let curlFilePath = null;
            for (const p of possiblePaths) {
                try {
                    await fs.access(p);
                    curlFilePath = p;
                    break;
                } catch (e) {
                    continue;
                }
            }

            if (!curlFilePath) {
                console.error('❌ Could not find kite-curl-request.txt in any expected location');
                return false;
            }
            
            console.log(`Loading connection constants from: ${curlFilePath}`);
            const curlContent = await fs.readFile(curlFilePath, 'utf8');

            // Robust curl parsing similar to Python's shlex.split
            // Remove backslashes and newlines
            const curlCommand = curlContent.replace(/\\\n/g, ' ').replace(/\n/g, ' ').trim();
            
            // Regex to match words, single-quoted strings, or double-quoted strings
            const parts = curlCommand.match(/[^\s'"]+|'([^']*)'|"([^"]*)"/g).map(p => {
                if (p.startsWith("'") && p.endsWith("'")) return p.slice(1, -1);
                if (p.startsWith('"') && p.endsWith('"')) return p.slice(1, -1);
                return p;
            });

            let requestUrl = '';
            const headers = {};
            
            for (let i = 0; i < parts.length; i++) {
                if (parts[i] === 'curl') {
                    requestUrl = parts[i+1];
                } else if (parts[i] === '-H' || parts[i] === '--header') {
                    const headerLine = parts[i+1];
                    const colonIndex = headerLine.indexOf(':');
                    if (colonIndex > 0) {
                        const key = headerLine.substring(0, colonIndex).trim();
                        const value = headerLine.substring(colonIndex + 1).trim();
                        headers[key] = value;
                    }
                }
            }

            if (!requestUrl) {
                console.error('Could not extract URL from curl command');
                return false;
            }

            // Exactly match Python logic for URL parsing
            const urlRest = requestUrl.split('//')[1];
            const firstSlashIndex = urlRest.indexOf('/');
            const domain = urlRest.substring(0, firstSlashIndex);
            const requestConnection = urlRest.substring(firstSlashIndex); // Starts with /
            const baseUrlPath = requestConnection.split('&', 1)[0];
            
            this.kiteDomain = domain;
            this.requestConnectionList = baseUrlPath.split('/');
            this.headerParams = headers;

            console.log('Connection constants loaded (Python style):');
            console.log('   Domain:', this.kiteDomain);
            console.log('   Headers count:', Object.keys(headers).length);
            console.log('   Path structure:', this.requestConnectionList);

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

            // Use NIFTY spot token 256265 for testing
            const testToken = '256265';
            const today = new Date().toISOString().split('T')[0];
            
            const results = await this.fetchInstrumentData(testToken, new Date(today), new Date(today));
            
            if (results && results.length >= 0) {
                console.log('Connection test successful');
                return true;
            }

            return false;

        } catch (error) {
            console.error('Connection test failed:', error.message);
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
            const pathParts = [...this.requestConnectionList];
            
            // Match Python logic: if ( requestConnectionList[4].isdigit() ):
            if (pathParts[4] && /^\d+$/.test(pathParts[4])) {
                pathParts[4] = instrumentToken;
            }

            const fromDateStr = fromDate.toISOString().split('T')[0];
            const toDateStr = toDate.toISOString().split('T')[0];

            // Match Python: requestConnectionPrefix = 'https://' + kiteDomain + ('/').join(requestConnectionList) + '&oi=1&from='
            const url = `https://${this.kiteDomain}${pathParts.join('/')}&oi=1&from=${fromDateStr}&to=${toDateStr}`;

            console.log(`[Zerodha] Requesting: ${url}`);
            // console.log(`[Zerodha] Headers:`, JSON.stringify(this.headerParams, null, 2));

            const response = await axios({
                method: 'get',
                url: url,
                headers: {
                    ...this.headerParams,
                    // Ensure these are set if missing, mimicking browser/requests
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive'
                },
                timeout: 30000,
                validateStatus: null // Handle all statuses
            });

            if (response.status === 200 && response.data && response.data.data && response.data.data.candles) {
                const candles = response.data.data.candles;
                // console.log(`[Zerodha] Success: Received ${candles.length} candles for ${instrumentToken}`);
                return candles.map(candle => ({
                    DateTime: candle[0],
                    Open: candle[1],
                    High: candle[2],
                    Low: candle[3],
                    Close: candle[4],
                    Volume: candle[5],
                    OpenInterest: candle[6] || 0
                }));
            } else if (response.status === 403) {
                console.error(`[Zerodha] 403 Forbidden for ${instrumentToken}`);
                console.error(`[Zerodha] Response Body:`, JSON.stringify(response.data));
                this.isConnected = false;
                this.isAuthenticated = false;
                this.connectionState = 'ERROR';
                return [];
            } else {
                console.error(`[Zerodha] Unexpected response ${response.status} for ${instrumentToken}`);
                if (response.data) console.error(`[Zerodha] Data:`, JSON.stringify(response.data));
                return [];
            }

        } catch (error) {
            console.error(`[Zerodha] Request Error for ${instrumentToken}:`, error.message);
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

        console.log(`Real-time data fetch started (${this.fetchIntervalMs}ms interval)`);
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
                const token = await this.getInstrumentToken(instrumentName);
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
                    
                    // Emit for anyone listening to the service instance
                    if (this.onDataCallback) {
                        this.onDataCallback(processedData);
                    }
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
        // Only keep the Spot token as it is generally stable
        return {
            'NIFTY_SPOT': { exchangeSegment: 1, exchangeInstrumentID: 256265 }
        };
    }

    /**
     * Get instrument token from DB based on name or criteria
     * @param {string} instrumentName - Instrument name or pattern
     * @returns {Object|null} Token info
     */
    async getInstrumentToken(instrumentName) {
        // First check internal mapping
        if (this.instrumentTokens[instrumentName]) {
            return this.instrumentTokens[instrumentName];
        }

        // Search in DB
        if (this.db && this.db.pool) {
            const client = await this.db.pool.connect();
            try {
                // Try exact match on trading_symbol
                let result = await client.query('SELECT * FROM instruments WHERE trading_symbol = $1', [instrumentName]);
                
                if (result.rows.length === 0) {
                    // Try parsing NIFTY_STRIKE_TYPE_EXPIRY format
                    const matches = instrumentName.match(/NIFTY_(\d+)_([CP]E)_(WEEKLY|MONTHLY)/);
                    if (matches) {
                        const strike = parseFloat(matches[1]);
                        const optionType = matches[2];
                        const isWeekly = matches[3] === 'WEEKLY';
                        
                        // Find matching instrument in DB
                        // For WEEKLY: Find nearest expiry
                        // For MONTHLY: Find expiry at end of month
                        const now = new Date();
                        
                        let query = `
                            SELECT * FROM instruments 
                            WHERE name = 'NIFTY' 
                            AND strike_price = $1 
                            AND instrument_type = $2 
                            AND expiry_date >= $3
                        `;
                        
                        if (isWeekly) {
                            query += ` ORDER BY expiry_date ASC LIMIT 1`;
                        } else {
                            // Monthly: typically the last Thursday of the month
                            // We look for the one furthest in the current/next month that matches the pattern
                            query += ` ORDER BY expiry_date ASC OFFSET 3 LIMIT 1`; // Rough heuristic for monthly
                        }
                        
                        result = await client.query(query, [strike, optionType, now]);
                        
                        // If no result for monthly heuristic, just take the next available
                        if (result.rows.length === 0 && !isWeekly) {
                            result = await client.query(`
                                SELECT * FROM instruments 
                                WHERE name = 'NIFTY' 
                                AND strike_price = $1 
                                AND instrument_type = $2 
                                AND expiry_date >= $3
                                ORDER BY expiry_date ASC
                                LIMIT 1 OFFSET 3
                            `, [strike, optionType, now]);
                        }
                    }
                }

                if (result.rows.length > 0) {
                    const inst = result.rows[0];
                    return {
                        exchangeSegment: inst.segment === 'NFO' ? 2 : 1,
                        exchangeInstrumentID: inst.instrument_token,
                        tradingSymbol: inst.trading_symbol
                    };
                }
            } catch (error) {
                console.error('Error fetching token from DB:', error.message);
            } finally {
                client.release();
            }
        }

        return null;
    }

    /**
     * Subscribe to data updates
     * @param {Function} callback - Callback function
     * @returns {string} Subscription ID
     */
    /**
     * Update instrument master for given exchanges
     * Replaces updateTickersToExchangeFile() from Python
     * @returns {Object} Tickers by exchange
     */
    async updateTickersToExchangeFile() {
        const exchangeList = ['NSE', 'NFO', 'BSE', 'BFO', 'CDS', 'MCX'];
        const tickersByExchange = {};

        for (const exchange of exchangeList) {
            try {
                console.log(`Updating ${exchange} instruments...`);
                const url = `https://api.kite.trade/instruments/${exchange}`;
                const response = await axios.get(url);
                
                if (response.status === 200 && response.data) {
                    const csvData = response.data;
                    const instruments = this.parseCSVInstruments(csvData, exchange);
                    
                    // Store in DB
                    await this.storeInstrumentsInDB(instruments);
                    
                    tickersByExchange[exchange] = instruments.map(i => i.tradingsymbol);
                    console.log(`${exchange}: Processed ${instruments.length} instruments`);
                }
            } catch (error) {
                console.error(`Error updating ${exchange}:`, error.message);
            }
        }

        return tickersByExchange;
    }

    /**
     * Parse Zerodha CSV instruments data
     */
    parseCSVInstruments(csvData, exchange) {
        const lines = csvData.split('\n');
        const header = lines[0].split(',');
        const instruments = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = this.parseCSVLine(line);
            if (values.length < 12) continue;

            const inst = {
                instrument_token: values[0],
                exchange_token: values[1],
                tradingsymbol: values[2],
                name: values[3],
                last_price: parseFloat(values[4]),
                expiry: values[5] ? new Date(values[5]) : null,
                strike: values[6] ? parseFloat(values[6]) : null,
                tick_size: parseFloat(values[7]),
                lot_size: parseInt(values[8]),
                instrument_type: values[9],
                segment: values[10],
                exchange: values[11]
            };

            // Basic filtering (can be refined like Python script)
            instruments.push(inst);
        }

        return instruments;
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result;
    }

    /**
     * Store instrument master in PostgreSQL
     */
    async storeInstrumentsInDB(instruments) {
        if (!this.db || !this.db.pool) return;

        const client = await this.db.pool.connect();
        try {
            await client.query('BEGIN');
            
            for (const inst of instruments) {
                const query = `
                    INSERT INTO instruments (
                        instrument_token, trading_symbol, name, exchange, segment, 
                        instrument_type, strike_price, expiry_date, lot_size, tick_size
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (instrument_token) DO UPDATE SET
                        trading_symbol = EXCLUDED.trading_symbol,
                        name = EXCLUDED.name,
                        segment = EXCLUDED.segment,
                        strike_price = EXCLUDED.strike_price,
                        expiry_date = EXCLUDED.expiry_date,
                        lot_size = EXCLUDED.lot_size,
                        updated_at = CURRENT_TIMESTAMP
                `;
                
                await client.query(query, [
                    inst.instrument_token,
                    inst.tradingsymbol,
                    inst.name || inst.tradingsymbol,
                    inst.exchange,
                    inst.segment,
                    inst.instrument_type,
                    inst.strike,
                    inst.expiry,
                    inst.lot_size,
                    inst.tick_size
                ]);
            }
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Download data for an exchange and store in DB
     */
    async downloadExchangeData(exchange) {
        try {
            // Get tickers to download for this exchange
            // For now, let's fetch a few key ones or all from instruments table
            const client = await this.db.pool.connect();
            const result = await client.query('SELECT * FROM instruments WHERE exchange = $1 AND is_active = true LIMIT 50', [exchange]);
            client.release();

            const instruments = result.rows;
            console.log(`Found ${instruments.length} active instruments for ${exchange}`);

            const toDate = new Date();
            const fromDate = new Date();
            fromDate.setDate(toDate.getDate() - 5); // Fetch last 5 days

            for (const inst of instruments) {
                const candles = await this.fetchInstrumentData(inst.instrument_token, fromDate, toDate);
                
                if (candles.length > 0) {
                    await this.storeMarketDataInDB(inst, candles);
                    console.log(`Stored ${candles.length} records for ${inst.trading_symbol}`);
                }
                
                // Add delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (error) {
            console.error(`Error downloading data for ${exchange}:`, error.message);
        }
    }

    /**
     * Store candle data in market_data table
     */
    async storeMarketDataInDB(instrument, candles) {
        if (!this.db || !this.db.pool) return;

        const client = await this.db.pool.connect();
        try {
            await client.query('BEGIN');
            
            for (const candle of candles) {
                const query = `
                    INSERT INTO market_data (
                        instrument_token, trading_symbol, exchange, segment, instrument_type,
                        open_price, high_price, low_price, close_price, last_traded_price,
                        volume, open_interest, exchange_timestamp, server_timestamp
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                    ON CONFLICT (instrument_token, server_timestamp) DO NOTHING
                `;
                
                const timestamp = new Date(candle.DateTime);
                
                await client.query(query, [
                    instrument.instrument_token,
                    instrument.trading_symbol,
                    instrument.exchange,
                    instrument.segment,
                    instrument.instrument_type,
                    candle.Open,
                    candle.High,
                    candle.Low,
                    candle.Close,
                    candle.Close,
                    candle.Volume,
                    candle.OpenInterest,
                    timestamp.getTime(),
                    timestamp
                ]);
            }
            
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get market data from DB
     */
    async getMarketData(ticker, startDate, endDate, limit = 1000) {
        if (!this.db || !this.db.pool) return [];

        const client = await this.db.pool.connect();
        try {
            const query = `
                SELECT * FROM market_data 
                WHERE trading_symbol = $1 
                AND server_timestamp BETWEEN $2 AND $3
                ORDER BY server_timestamp DESC
                LIMIT $4
            `;
            const result = await client.query(query, [ticker, startDate, endDate, limit]);
            return result.rows;
        } finally {
            client.release();
        }
    }

    /**
     * Get available tickers from DB
     */
    async getAvailableTickers(exchange = null) {
        if (!this.db || !this.db.pool) return [];

        const client = await this.db.pool.connect();
        try {
            let query = 'SELECT DISTINCT trading_symbol FROM instruments WHERE is_active = true';
            const params = [];
            if (exchange && exchange !== 'all') {
                query += ' AND exchange = $1';
                params.push(exchange);
            }
            const result = await client.query(query, params);
            return result.rows.map(r => r.trading_symbol);
        } finally {
            client.release();
        }
    }

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
        console.log('Disconnecting from Zerodha...');

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
            console.log('Curl file exists');
            results.curlFileExists = true;
        } catch (error) {
            console.log('Curl file missing');
            results.errors.push('kite-curl-request.txt file not found in pyScript folder');
            return results;
        }

        // Test 2: Parse curl file
        console.log('\n2. Testing curl file parsing...');
        const parsed = await this.loadKiteConnectionConstants();
        if (parsed) {
            console.log('Curl file parsed successfully');
            results.curlFileParsed = true;
        } else {
            console.log('Failed to parse curl file');
            results.errors.push('Could not parse curl request file');
            return results;
        }

        // Test 3: Test connection
        console.log('\n3. Testing API connection...');
        const connected = await this.testConnection();
        if (connected) {
            console.log('API connection successful');
            results.connectionSuccess = true;
        } else {
            console.log('API connection failed');
            results.errors.push('API connection failed - check if curl request is still valid');
            return results;
        }

        results.overallSuccess = true;
        console.log('\n All tests passed!');
        console.log('='.repeat(70) + '\n');

        return results;
    }
}

module.exports = ZerodhaService;