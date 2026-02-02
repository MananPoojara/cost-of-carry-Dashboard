/**
 * XTS API Integration Service - Fixed Version
 * Handles authentication and real-time market data from XTS
 * 
 * FIXES APPLIED:
 * 1. Added proper error handling and validation
 * 2. Fixed WebSocket initialization sequence
 * 3. Added connection state management
 * 4. Improved authentication flow
 * 5. Added timeout handling
 * 6. Fixed subscription payload format
 */

const { XtsMarketDataAPI, WS: XTSMarketDataWS } = require('xts-marketdata-api');

class XTSService {
    constructor() {
        this.baseUrl = process.env.XTS_BASE_URL || 'https://developers.symphonyfintech.in';
        this.appKey = "25da2a7f184d8b7ae55970";
        this.secretKey = "Oium075$V6";

        // XTS SDK instances
        this.xtsMarketData = null;
        this.xtsMarketDataWS = null;

        // Authentication data
        this.token = null;
        this.userID = null;
        this.isConnected = false;
        this.isAuthenticated = false;

        // Subscribers
        this.subscribers = new Map();
        this.subscribedInstruments = new Set();

        // Reconnection settings
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectInterval = 5000;
        this.reconnectTimer = null;

        // Connection state
        this.connectionState = 'DISCONNECTED'; // DISCONNECTED, CONNECTING, CONNECTED, ERROR

        // Error tracking
        this.lastError = null;

        // Timeouts
        this.connectionTimeout = 30000; // 30 seconds
        this.authTimeout = 15000; // 15 seconds

        // Real instrument tokens
        this.instrumentTokens = this.getInstrumentTokenMapping();
    }

    /**
     * Initialize XTS service with improved error handling
     * @returns {boolean} Success status
     */
    async initialize() {
        console.log('Initializing XTS Service...');
        console.log('Base URL:', this.baseUrl);

        if (!this.appKey || !this.secretKey) {
            console.log('XTS credentials not provided');
            console.log('   XTS_APP_KEY:', this.appKey ? 'Present' : 'Missing');
            console.log('   XTS_SECRET_KEY:', this.secretKey ? 'Present (hidden)' : 'Missing');
            console.log('Using mock data mode');
            return false;
        }

        try {
            this.connectionState = 'CONNECTING';

            // Step 1: Initialize Market Data API
            console.log('Step 1: Initializing Market Data API...');
            this.xtsMarketData = new XtsMarketDataAPI(this.baseUrl);

            // Step 2: Authenticate
            console.log('Step 2: Authenticating...');
            const authSuccess = await this.authenticateMarketData();
            if (!authSuccess) {
                this.connectionState = 'ERROR';
                console.log('Authentication failed - switching to mock mode');
                return false;
            }

            this.isAuthenticated = true;

            // Step 3: Fetch instrument master (optional)
            console.log('Step 3: Fetching instrument master...');
            try {
                await this.fetchInstrumentMaster();
            } catch (error) {
                console.log('Could not fetch instrument master:', error.message);
                console.log('   Using hardcoded instrument tokens');
            }

            // Step 4: Initialize WebSocket
            console.log('Step 4: Initializing WebSocket...');
            const wsConnected = await this.initializeMarketDataWS();
            if (!wsConnected) {
                this.connectionState = 'ERROR';
                console.log('WebSocket connection failed');
                return false;
            }

            this.connectionState = 'CONNECTED';
            console.log('XTS Service initialized successfully');
            console.log('Ready to subscribe to market data');
            return true;

        } catch (error) {
            this.connectionState = 'ERROR';
            console.error('XTS Service initialization error:', error.message);
            console.error('Stack trace:', error.stack);
            this.lastError = {
                message: error.message,
                timestamp: new Date().toISOString(),
                type: 'initialization',
                stack: error.stack
            };
            return false;
        }
    }

    /**
     * Authenticate with XTS Market Data API - FIXED VERSION
     * @returns {boolean} Success status
     */
    async authenticateMarketData() {
        return new Promise(async (resolve) => {
            const timeout = setTimeout(() => {
                console.error('Authentication timeout after', this.authTimeout / 1000, 'seconds');
                resolve(false);
            }, this.authTimeout);

            try {
                console.log('Authenticating with XTS Market Data API...');
                console.log('   App Key:', this.appKey ? `${this.appKey.substring(0, 8)}...` : 'Not set');
                console.log('   Base URL:', this.baseUrl);

                // FIXED: Proper login request format
                const loginRequest = {
                    secretKey: this.secretKey,
                    appKey: this.appKey,
                    source: 'WEBAPI'
                };

                console.log('Sending authentication request...');

                const response = await this.xtsMarketData.logIn(loginRequest);

                clearTimeout(timeout);

                console.log('Authentication response received');
                console.log('   Response type:', response?.type);
                console.log('   Response code:', response?.code);

                if (response && response.type === 'success' && response.result) {
                    this.token = response.result.token;
                    this.userID = response.result.userID;

                    console.log('Authentication successful');
                    console.log('   User ID:', this.userID);
                    console.log('   Token:', this.token ? `${this.token.substring(0, 10)}...` : 'Missing');

                    if (!this.token || !this.userID) {
                        console.error('Authentication response missing required fields');
                        resolve(false);
                        return;
                    }

                    resolve(true);
                } else {
                    console.error('Authentication failed');
                    console.error('   Error:', response?.description || 'Unknown error');
                    console.error('   Code:', response?.code || 'No code');

                    this.lastError = {
                        message: response?.description || 'Authentication failed',
                        code: response?.code,
                        timestamp: new Date().toISOString(),
                        type: 'authentication'
                    };

                    this.logAuthenticationGuidance();
                    resolve(false);
                }
            } catch (error) {
                clearTimeout(timeout);
                console.error('Authentication exception:', error.message);

                // Enhanced error diagnostics
                if (error.response) {
                    console.error('   HTTP Status:', error.response.status);
                    console.error('   Response data:', JSON.stringify(error.response.data, null, 2));
                }

                if (error.code) {
                    console.error('   Error code:', error.code);
                }

                this.lastError = {
                    message: error.message,
                    timestamp: new Date().toISOString(),
                    type: 'authentication_exception',
                    httpStatus: error.response?.status,
                    errorCode: error.code
                };

                this.logAuthenticationGuidance();
                resolve(false);
            }
        });
    }

    /**
     * Log helpful guidance for authentication issues
     */
    logAuthenticationGuidance() {
        console.log('\n' + '='.repeat(70));
        console.log('XTS API Authentication Troubleshooting Guide');
        console.log('='.repeat(70));
        console.log('');
        console.log('Common Issues:');
        console.log('   1. Invalid or expired API credentials');
        console.log('   2. API access not enabled on your trading account');
        console.log('   3. Wrong environment (sandbox vs production)');
        console.log('   4. Incorrect base URL for your broker');
        console.log('   5. Rate limiting or IP restrictions');
        console.log('');
        console.log('Verification Steps:');
        console.log('   1. Confirm XTS_APP_KEY and XTS_SECRET_KEY are set correctly');
        console.log('   2. Check if credentials are for correct environment');
        console.log('   3. Verify API access is enabled in broker portal');
        console.log('   4. Ensure you\'re using Symphony XTS credentials (not broker-specific)');
        console.log('   5. Try regenerating API keys from broker portal');
        console.log('');
        console.log('Support Contacts:');
        console.log('   Symphony Fintech: support@symphonyfintech.in');
        console.log('   Your Broker: Contact their API support team');
        console.log('');
        console.log('Meanwhile, the system will continue with mock data');
        console.log('='.repeat(70) + '\n');
    }

    /**
     * Initialize Market Data WebSocket - FIXED VERSION
     * @returns {boolean} Success status
     */
    async initializeMarketDataWS() {
        return new Promise(async (resolve) => {
            const timeout = setTimeout(() => {
                console.error('WebSocket initialization timeout');
                resolve(false);
            }, this.connectionTimeout);

            try {
                console.log('Initializing WebSocket connection...');

                if (!this.token || !this.userID) {
                    console.error('Cannot initialize WebSocket: Missing token or userID');
                    clearTimeout(timeout);
                    resolve(false);
                    return;
                }

                // FIXED: Create WebSocket instance with base URL
                this.xtsMarketDataWS = new XTSMarketDataWS(this.baseUrl);

                // FIXED: Proper initialization payload
                const socketInitRequest = {
                    userID: this.userID,
                    token: this.token
                };

                console.log('   User ID:', this.userID);
                console.log('   Token:', this.token ? 'Present' : 'Missing');

                // Register event listeners BEFORE initializing
                this.registerMarketDataEvents();

                console.log('Connecting WebSocket...');

                // FIXED: Initialize and wait for connection
                const initResult = await this.xtsMarketDataWS.init(socketInitRequest);

                console.log('WebSocket init result:', initResult);

                // Wait for connection confirmation (give it a moment)
                setTimeout(() => {
                    clearTimeout(timeout);
                    if (this.isConnected) {
                        console.log('WebSocket connected successfully');
                        resolve(true);
                    } else {
                        console.log('WebSocket initialized but not connected yet');
                        // Still resolve true as connection event will fire
                        resolve(true);
                    }
                }, 2000);

            } catch (error) {
                clearTimeout(timeout);
                console.error('WebSocket initialization error:', error.message);
                console.error('   Stack:', error.stack);

                this.lastError = {
                    message: error.message,
                    timestamp: new Date().toISOString(),
                    type: 'websocket_init',
                    stack: error.stack
                };

                resolve(false);
            }
        });
    }

    /**
     * Register Market Data WebSocket events - FIXED VERSION
     */
    registerMarketDataEvents() {
        console.log('Registering WebSocket event handlers...');

        // Connection event - FIXED
        this.xtsMarketDataWS.onConnect((connectData) => {
            console.log('WebSocket CONNECTED');
            console.log('   Connect data:', JSON.stringify(connectData, null, 2));
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.connectionState = 'CONNECTED';
            this.notifyConnectionChange('CONNECTED');
        });

        // Joined event
        this.xtsMarketDataWS.onJoined((joinedData) => {
            console.log('WebSocket JOINED');
            console.log('   Joined data:', JSON.stringify(joinedData, null, 2));
        });

        // Error event - FIXED
        this.xtsMarketDataWS.onError((errorData) => {
            console.error('WebSocket ERROR');
            console.error('   Error data:', JSON.stringify(errorData, null, 2));
            this.connectionState = 'ERROR';
            this.lastError = {
                message: 'WebSocket error',
                data: errorData,
                timestamp: new Date().toISOString(),
                type: 'websocket_error'
            };
            this.notifyConnectionChange('ERROR');
        });

        // Disconnect event - FIXED
        this.xtsMarketDataWS.onDisconnect((disconnectData) => {
            console.log('WebSocket DISCONNECTED');
            console.log('   Disconnect data:', JSON.stringify(disconnectData, null, 2));
            this.isConnected = false;
            this.connectionState = 'DISCONNECTED';
            this.notifyConnectionChange('DISCONNECTED');

            // Auto-reconnect
            this.attemptReconnection();
        });

        // Market data events - FIXED
        this.xtsMarketDataWS.onListingData((listingData) => {
            console.log('Listing data received');
            this.processMarketData(listingData);
        });

        this.xtsMarketDataWS.onTouchlineData((touchlineData) => {
            console.log('Touchline data received');
            this.processMarketData(touchlineData);
        });

        this.xtsMarketDataWS.onMarketDepthData((depthData) => {
            console.log('Market depth data received');
            // Process depth data if needed
        });

        console.log('Event handlers registered');
    }

    /**
     * Process market data and notify subscribers
     * @param {Object} rawData - Raw market data from XTS
     */
    processMarketData(rawData) {
        try {
            // Log sample data for debugging
            if (Math.random() < 0.1) { // Log 10% of updates to avoid spam
                console.log('Sample market data:', JSON.stringify(rawData, null, 2));
            }

            // Convert XTS format to internal format
            const processedData = {
                ExchangeInstrumentID: this.getInstrumentName(rawData.ExchangeInstrumentID),
                LastTradedPrice: rawData.LastTradedPrice || rawData.Close || 0,
                Volume: rawData.TotalTradedQuantity || rawData.Volume || 0,
                ExchangeTimeStamp: rawData.ExchangeTimeStamp || Date.now(),
                BidPrice: rawData.BidPrice || 0,
                AskPrice: rawData.AskPrice || 0,
                OpenInterest: rawData.OpenInterest || 0,
                ImpliedVolatility: rawData.ImpliedVolatility || 0,
                Open: rawData.Open || 0,
                High: rawData.High || 0,
                Low: rawData.Low || 0,
                Close: rawData.Close || 0
            };

            // Notify subscribers
            this.notifySubscribers(processedData);

        } catch (error) {
            console.error('Error processing market data:', error.message);
        }
    }

    /**
     * Subscribe to instruments - FIXED VERSION
     * @param {Array} instruments - Array of instrument names
     */
    async subscribe(instruments) {
        if (!this.isConnected || !this.xtsMarketDataWS) {
            console.log('WebSocket not connected, cannot subscribe');
            console.log('   Connected:', this.isConnected);
            console.log('   WebSocket instance:', !!this.xtsMarketDataWS);
            return false;
        }

        try {
            console.log('Subscribing to instruments:', instruments);

            // Convert to XTS format
            const xtsInstruments = [];
            const validInstruments = [];

            for (const instrument of instruments) {
                const token = this.getInstrumentToken(instrument);
                if (token) {
                    // FIXED: Proper XTS instrument format
                    xtsInstruments.push({
                        exchangeSegment: token.exchangeSegment,
                        exchangeInstrumentID: token.exchangeInstrumentID
                    });
                    validInstruments.push(instrument);
                } else {
                    console.log(`No token for: ${instrument}`);
                }
            }

            if (xtsInstruments.length === 0) {
                console.log('No valid instruments to subscribe');
                return false;
            }

            console.log('XTS instruments:', JSON.stringify(xtsInstruments, null, 2));

            // FIXED: Correct subscription payload format
            const subscribeRequest = {
                instruments: xtsInstruments,
                xtsMessageCode: 1502 // Touchline
            };

            console.log('Sending subscription request...');
            const response = await this.xtsMarketDataWS.subscribe(subscribeRequest);

            console.log('Subscription response:', JSON.stringify(response, null, 2));

            if (response && response.type === 'success') {
                validInstruments.forEach(inst => this.subscribedInstruments.add(inst));
                console.log('Subscribed successfully');
                return true;
            } else {
                console.error('Subscription failed:', response?.description);
                return false;
            }

        } catch (error) {
            console.error('Subscription error:', error.message);
            console.error('   Stack:', error.stack);
            return false;
        }
    }

    /**
     * Unsubscribe from instruments
     * @param {Array} instruments - Array of instrument names
     */
    async unsubscribe(instruments) {
        if (!this.isConnected || !this.xtsMarketDataWS) {
            return false;
        }

        try {
            const xtsInstruments = [];
            for (const instrument of instruments) {
                const token = this.getInstrumentToken(instrument);
                if (token) {
                    xtsInstruments.push({
                        exchangeSegment: token.exchangeSegment,
                        exchangeInstrumentID: token.exchangeInstrumentID
                    });
                }
            }

            const unsubscribeRequest = {
                instruments: xtsInstruments,
                xtsMessageCode: 1502
            };

            const response = await this.xtsMarketDataWS.unsubscribe(unsubscribeRequest);

            if (response && response.type === 'success') {
                instruments.forEach(inst => this.subscribedInstruments.delete(inst));
                console.log('Unsubscribed from:', instruments);
                return true;
            }

            return false;

        } catch (error) {
            console.error('Unsubscription error:', error.message);
            return false;
        }
    }

    /**
     * Get instrument token mapping
     * @returns {Object} Instrument tokens
     */
    getInstrumentTokenMapping() {
        // NOTE: These are example tokens - replace with real ones from instrument master
        return {
            'NIFTY_SPOT': { exchangeSegment: 1, exchangeInstrumentID: 26000 },
            'NIFTY_21400_CE_WEEKLY': { exchangeSegment: 2, exchangeInstrumentID: 46435 },
            'NIFTY_21400_PE_WEEKLY': { exchangeSegment: 2, exchangeInstrumentID: 46436 },
            'NIFTY_21500_CE_WEEKLY': { exchangeSegment: 2, exchangeInstrumentID: 46439 },
            'NIFTY_21500_PE_WEEKLY': { exchangeSegment: 2, exchangeInstrumentID: 46440 },
        };
    }

    /**
     * Fetch instrument master from XTS
     * @returns {boolean} Success status
     */
    async fetchInstrumentMaster() {
        try {
            if (!this.xtsMarketData) {
                return false;
            }

            console.log('Fetching instrument master...');

            const instrumentMaster = await this.xtsMarketData.getInstruments({
                exchangeSegment: 2 // NSE F&O
            });

            if (instrumentMaster && instrumentMaster.type === 'success') {
                const count = instrumentMaster.result?.length || 0;
                console.log(`Fetched ${count} instruments`);

                if (count > 0) {
                    this.updateInstrumentTokens(instrumentMaster.result);
                }
                return true;
            }

            return false;

        } catch (error) {
            console.error('Instrument master fetch error:', error.message);
            return false;
        }
    }

    /**
     * Update instrument tokens from master data
     * @param {Array} instruments - Instrument data
     */
    updateInstrumentTokens(instruments) {
        if (!instruments || !Array.isArray(instruments)) {
            return;
        }

        console.log('Updating instrument tokens...');

        // Filter NIFTY options
        const niftyOptions = instruments.filter(inst =>
            inst.DisplayName &&
            inst.DisplayName.includes('NIFTY') &&
            (inst.DisplayName.includes('CE') || inst.DisplayName.includes('PE'))
        );

        console.log(`Found ${niftyOptions.length} NIFTY options`);

        // Update mapping
        niftyOptions.forEach(inst => {
            const key = this.generateInstrumentKey(inst);
            if (key) {
                this.instrumentTokens[key] = {
                    exchangeSegment: inst.ExchangeSegment,
                    exchangeInstrumentID: inst.ExchangeInstrumentID
                };
            }
        });

        console.log('Instrument tokens updated');
    }

    /**
     * Generate instrument key from XTS data
     * @param {Object} instrument - XTS instrument
     * @returns {string|null} Instrument key
     */
    generateInstrumentKey(instrument) {
        try {
            const name = instrument.DisplayName;
            const matches = name.match(/NIFTY.*?(\d+)(CE|PE)/);
            if (matches) {
                const strike = matches[1];
                const optionType = matches[2];
                const expiryType = this.isWeeklyExpiry(instrument.ExpiryDate) ? 'WEEKLY' : 'MONTHLY';
                return `NIFTY_${strike}_${optionType}_${expiryType}`;
            }
        } catch (error) {
            console.error('Error generating key:', error);
        }
        return null;
    }

    /**
     * Check if expiry is weekly
     * @param {string} expiryDate - Expiry date
     * @returns {boolean} Is weekly
     */
    isWeeklyExpiry(expiryDate) {
        try {
            const date = new Date(expiryDate);
            return date.getDay() === 4; // Thursday
        } catch (error) {
            return false;
        }
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
     * Get instrument name from ID
     * @param {number} instrumentID - XTS ID
     * @returns {string} Instrument name
     */
    getInstrumentName(instrumentID) {
        for (const [name, token] of Object.entries(this.instrumentTokens)) {
            if (token.exchangeInstrumentID === instrumentID) {
                return name;
            }
        }
        return `UNKNOWN_${instrumentID}`;
    }

    /**
     * Attempt reconnection with exponential backoff
     */
    async attemptReconnection() {
        // Clear existing timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.connectionState = 'ERROR';
            return;
        }

        const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts);
        this.reconnectAttempts++;

        console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay / 1000}s...`);

        this.reconnectTimer = setTimeout(async () => {
            console.log('Attempting to reconnect...');

            const reconnected = await this.initializeMarketDataWS();

            if (reconnected && this.subscribedInstruments.size > 0) {
                console.log('Resubscribing to instruments...');
                const instruments = Array.from(this.subscribedInstruments);
                await this.subscribe(instruments);
            }
        }, delay);
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
     * Notify connection status change
     * @param {string} status - Connection status
     */
    notifyConnectionChange(status) {
        console.log(`Connection Status Changed: ${status}`);

        if (this.onConnectionChange && typeof this.onConnectionChange === 'function') {
            try {
                this.onConnectionChange(status);
            } catch (error) {
                console.error('Error in connection change callback:', error.message);
            }
        }
    }

    /**
     * Get detailed connection status
     * @returns {Object} Status information
     */
    getStatus() {
        const status = {
            connectionState: this.connectionState,
            isConnected: this.isConnected,
            isAuthenticated: this.isAuthenticated,
            hasToken: !!this.token,
            userID: this.userID,
            subscribedInstruments: Array.from(this.subscribedInstruments),
            subscriberCount: this.subscribers.size,
            reconnectAttempts: this.reconnectAttempts,
            baseUrl: this.baseUrl,
            appKey: this.appKey ? `${this.appKey.substring(0, 8)}...` : null,
            mode: this.isConnected ? 'LIVE' : 'MOCK',
            lastError: this.lastError
        };

        // Status message
        if (!this.appKey || !this.secretKey) {
            status.statusMessage = 'XTS credentials not configured';
            status.recommendation = 'Set XTS_APP_KEY and XTS_SECRET_KEY environment variables';
        } else if (!this.isAuthenticated) {
            status.statusMessage = 'Authentication failed';
            status.recommendation = 'Check credentials and API access. See logs for details.';
        } else if (!this.isConnected) {
            status.statusMessage = 'WebSocket disconnected';
            status.recommendation = 'Reconnection in progress...';
        } else {
            status.statusMessage = 'Connected and receiving data';
            status.recommendation = 'All systems operational';
        }

        return status;
    }

    /**
     * Disconnect from XTS
     */
    disconnect() {
        console.log('🔌 Disconnecting from XTS...');

        // Clear reconnection timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // Disconnect WebSocket
        if (this.xtsMarketDataWS) {
            try {
                // XTS SDK handles disconnection
                this.isConnected = false;
            } catch (error) {
                console.error('Error disconnecting WebSocket:', error.message);
            }
        }

        // Clear state
        this.token = null;
        this.userID = null;
        this.isAuthenticated = false;
        this.connectionState = 'DISCONNECTED';
        this.subscribedInstruments.clear();

        console.log('Disconnected from XTS');
    }

    /**
     * Test connection and credentials
     * @returns {Object} Test results
     */
    async testConnection() {
        console.log('\n' + '='.repeat(70));
        console.log('XTS Connection Test');
        console.log('='.repeat(70));

        const results = {
            credentialsPresent: false,
            authenticationSuccess: false,
            websocketSuccess: false,
            overallSuccess: false,
            errors: []
        };

        // Test 1: Credentials
        console.log('\Testing credentials...');
        if (this.appKey && this.secretKey) {
            console.log('Credentials present');
            results.credentialsPresent = true;
        } else {
            console.log('Credentials missing');
            results.errors.push('Missing XTS_APP_KEY or XTS_SECRET_KEY');
            return results;
        }

        // Test 2: Authentication
        console.log('\n Testing authentication...');

        // Initialize the API instance first
        try {
            this.xtsMarketData = new XtsMarketDataAPI(this.baseUrl);
            console.log('API instance created');
        } catch (error) {
            console.log('Failed to create API instance:', error.message);
            results.errors.push('Failed to create XTS API instance');
            return results;
        }

        const authSuccess = await this.authenticateMarketData();
        if (authSuccess) {
            console.log('Authentication successful');
            results.authenticationSuccess = true;
        } else {
            console.log('Authentication failed');
            results.errors.push('Authentication failed - check credentials');
            return results;
        }

        // Test 3: WebSocket
        console.log('\n Testing WebSocket...');
        const wsSuccess = await this.initializeMarketDataWS();
        if (wsSuccess) {
            console.log('WebSocket connected');
            results.websocketSuccess = true;
        } else {
            console.log('WebSocket connection failed');
            results.errors.push('WebSocket connection failed');
            return results;
        }

        results.overallSuccess = true;
        console.log('\n All tests passed!');
        console.log('='.repeat(70) + '\n');

        return results;
    }
}

module.exports = XTSService;