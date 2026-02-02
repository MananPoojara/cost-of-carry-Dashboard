/**
 * Connection Manager - Critical Production Component
 * Handles WebSocket connection states and auto-reconnection
 * Provides real-time status updates to frontend
 */

class ConnectionManager {
    constructor(socketServer) {
        this.socketServer = socketServer;
        this.status = 'DISCONNECTED';
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 10;
        this.reconnectInterval = 5000; // 5 seconds base interval
        this.subscribers = [];
        this.xtsWebSocket = null;
        this.atmStrikeManager = null;
        this.lastConnectionTime = null;
        this.connectionStats = {
            totalConnections: 0,
            totalDisconnections: 0,
            totalReconnectAttempts: 0,
            longestUptime: 0,
            currentUptimeStart: null
        };
    }

    /**
     * Initialize connection manager with dependencies
     * @param {Object} xtsWebSocket - XTS WebSocket service
     * @param {Object} atmStrikeManager - ATM Strike Manager
     */
    initialize(xtsWebSocket, atmStrikeManager) {
        this.xtsWebSocket = xtsWebSocket;
        this.atmStrikeManager = atmStrikeManager;
        this.setupConnectionHandlers();
        console.log('Connection Manager initialized');
    }

    /**
     * Setup WebSocket connection event handlers
     */
    setupConnectionHandlers() {
        if (!this.xtsWebSocket) {
            console.error('XTS WebSocket not provided to Connection Manager');
            return;
        }

        // Check if this is an XTS service (has different method names)
        if (typeof this.xtsWebSocket.onData === 'function') {
            // This is our XTS service, not a raw WebSocket
            console.log('Setting up XTS service event handlers');

            // Subscribe to XTS service status changes
            this.xtsWebSocket.onConnectionChange = (status) => {
                switch (status) {
                    case 'CONNECTED':
                        this.handleConnect();
                        break;
                    case 'DISCONNECTED':
                        this.handleDisconnect('XTS disconnected');
                        break;
                    case 'ERROR':
                        this.handleError(new Error('XTS connection error'));
                        break;
                }
            };

            // Monitor XTS connection status
            this.monitorXTSConnection();

        } else {
            // This is a regular WebSocket
            this.xtsWebSocket.on('connect', () => {
                this.handleConnect();
            });

            this.xtsWebSocket.on('disconnect', (reason) => {
                this.handleDisconnect(reason);
            });

            this.xtsWebSocket.on('reconnecting', (attemptNumber) => {
                this.handleReconnecting(attemptNumber);
            });

            this.xtsWebSocket.on('error', (error) => {
                this.handleError(error);
            });
        }

        console.log('Connection event handlers setup complete');
    }

    /**
     * Monitor XTS connection status periodically
     */
    monitorXTSConnection() {
        setInterval(() => {
            if (this.xtsWebSocket && typeof this.xtsWebSocket.getStatus === 'function') {
                const xtsStatus = this.xtsWebSocket.getStatus();
                const newStatus = xtsStatus.isConnected ? 'LIVE' : 'DISCONNECTED';

                if (newStatus !== this.status) {
                    if (newStatus === 'LIVE') {
                        this.handleConnect();
                    } else {
                        this.handleDisconnect('XTS connection lost');
                    }
                }
            }
        }, 2000); // Check every 2 seconds
    }

    /**
     * Handle successful connection
     */
    handleConnect() {
        const now = new Date();
        this.status = 'LIVE';
        this.reconnectAttempts = 0;
        this.lastConnectionTime = now;
        this.connectionStats.totalConnections++;
        this.connectionStats.currentUptimeStart = now;

        console.log('WebSocket connected successfully');

        // Notify status change
        this.notifyStatusChange();

        // Resubscribe to all instruments after reconnection
        this.resubscribeAllInstruments();

        // Broadcast connection status to frontend
        this.broadcastConnectionStatus();
    }

    /**
     * Handle disconnection
     * @param {string} reason - Disconnection reason
     */
    handleDisconnect(reason) {
        const now = new Date();
        this.status = 'DISCONNECTED';
        this.connectionStats.totalDisconnections++;

        // Calculate uptime if we were connected
        if (this.connectionStats.currentUptimeStart) {
            const uptime = now - this.connectionStats.currentUptimeStart;
            if (uptime > this.connectionStats.longestUptime) {
                this.connectionStats.longestUptime = uptime;
            }
            this.connectionStats.currentUptimeStart = null;
        }

        console.log(`WebSocket disconnected: ${reason}`);

        // Notify status change
        this.notifyStatusChange();

        // Start reconnection process
        this.startReconnection();

        // Broadcast connection status to frontend
        this.broadcastConnectionStatus();
    }

    /**
     * Handle reconnection attempts
     * @param {number} attemptNumber - Current attempt number
     */
    handleReconnecting(attemptNumber) {
        this.status = 'RECONNECTING';
        this.reconnectAttempts = attemptNumber;
        this.connectionStats.totalReconnectAttempts++;

        console.log(`Reconnecting... Attempt ${attemptNumber}/${this.maxReconnectAttempts}`);

        // Notify status change
        this.notifyStatusChange();

        // Broadcast connection status to frontend
        this.broadcastConnectionStatus();
    }

    /**
     * Handle connection errors
     * @param {Error} error - Connection error
     */
    handleError(error) {
        console.error('WebSocket error:', error.message);

        // Log error details for debugging
        const errorLog = {
            timestamp: new Date(),
            error: error.message,
            stack: error.stack,
            status: this.status,
            reconnectAttempts: this.reconnectAttempts
        };

        // Notify error to subscribers
        this.notifyError(errorLog);
    }

    /**
     * Start auto-reconnection with exponential backoff
     */
    startReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.status = 'FAILED';
            console.error(`Max reconnection attempts (${this.maxReconnectAttempts}) reached. Connection failed.`);
            this.notifyStatusChange();
            this.broadcastConnectionStatus();
            return;
        }

        // Calculate backoff delay (exponential backoff)
        const backoffDelay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts);
        const maxDelay = 60000; // Max 1 minute delay
        const delay = Math.min(backoffDelay, maxDelay);

        console.log(`Reconnecting in ${delay / 1000} seconds...`);

        setTimeout(() => {
            if (this.status === 'DISCONNECTED' || this.status === 'FAILED') {
                this.reconnectAttempts++;
                this.xtsWebSocket?.connect();
            }
        }, delay);
    }

    /**
     * Resubscribe to all instruments after reconnection
     */
    async resubscribeAllInstruments() {
        if (!this.atmStrikeManager) {
            console.warn('ATM Strike Manager not available for resubscription');
            return;
        }

        const currentATMStrike = this.atmStrikeManager.getCurrentATMStrike();

        if (currentATMStrike) {
            const instruments = [
                'NIFTY_SPOT',
                `NIFTY_${currentATMStrike}_CE_WEEKLY`,
                `NIFTY_${currentATMStrike}_PE_WEEKLY`,
                `NIFTY_${currentATMStrike}_CE_MONTHLY`,
                `NIFTY_${currentATMStrike}_PE_MONTHLY`
            ];

            console.log('Resubscribing to instruments:', instruments);

            try {
                // Resubscribe through XTS service
                await this.xtsWebSocket.subscribe(instruments);
                console.log('Resubscription successful');
            } catch (error) {
                console.error('Error during resubscription:', error);
            }
        } else {
            console.warn('No ATM strike available for resubscription');
        }
    }

    /**
     * Get status display configuration for frontend
     * @returns {Object} Status display configuration
     */
    getStatusDisplay() {
        const statusConfig = {
            'LIVE': {
                color: 'green',
                text: 'LIVE',
                bgColor: 'bg-green-600',
                textColor: 'text-green-400'
            },
            'RECONNECTING': {
                color: 'yellow',
                text: 'RECONNECTING',
                bgColor: 'bg-yellow-600',
                textColor: 'text-yellow-400'
            },
            'DISCONNECTED': {
                color: 'red',
                text: 'DISCONNECTED',
                bgColor: 'bg-red-600',
                textColor: 'text-red-400'
            },
            'FAILED': {
                color: 'red',
                text: 'FAILED',
                bgColor: 'bg-red-800',
                textColor: 'text-red-400'
            }
        };

        return statusConfig[this.status] || statusConfig['DISCONNECTED'];
    }

    /**
     * Notify all subscribers about status change
     */
    notifyStatusChange() {
        const statusInfo = {
            status: this.status,
            display: this.getStatusDisplay(),
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            lastConnectionTime: this.lastConnectionTime,
            timestamp: new Date()
        };

        this.subscribers.forEach(subscriber => {
            try {
                subscriber.callback(statusInfo);
            } catch (error) {
                console.error('Error notifying status change subscriber:', error);
            }
        });
    }

    /**
     * Notify subscribers about errors
     * @param {Object} errorLog - Error information
     */
    notifyError(errorLog) {
        this.subscribers.forEach(subscriber => {
            try {
                if (subscriber.callback.onError) {
                    subscriber.callback.onError(errorLog);
                }
            } catch (error) {
                console.error('Error notifying error subscriber:', error);
            }
        });
    }

    /**
     * Broadcast connection status to frontend
     */
    broadcastConnectionStatus() {
        if (!this.socketServer) return;

        const statusData = {
            connectionStatus: this.status,
            display: this.getStatusDisplay(),
            reconnectAttempts: this.reconnectAttempts,
            maxReconnectAttempts: this.maxReconnectAttempts,
            stats: this.getConnectionStats(),
            timestamp: new Date().toISOString()
        };

        try {
            this.socketServer.emit('connectionStatus', statusData);
        } catch (error) {
            console.error('Error broadcasting connection status:', error);
        }
    }

    /**
     * Subscribe to connection events
     * @param {Function} callback - Callback function
     * @returns {string} Subscription ID
     */
    subscribe(callback) {
        const id = Date.now().toString() + Math.random().toString(36).substring(2, 11);
        this.subscribers.push({ id, callback });
        return id;
    }

    /**
     * Unsubscribe from connection events
     * @param {string} id - Subscription ID
     */
    unsubscribe(id) {
        this.subscribers = this.subscribers.filter(sub => sub.id !== id);
    }

    /**
     * Get connection statistics
     * @returns {Object} Connection statistics
     */
    getConnectionStats() {
        const now = new Date();
        let currentUptime = 0;

        if (this.connectionStats.currentUptimeStart) {
            currentUptime = now - this.connectionStats.currentUptimeStart;
        }

        return {
            ...this.connectionStats,
            currentUptime: currentUptime,
            currentUptimeFormatted: this.formatDuration(currentUptime),
            longestUptimeFormatted: this.formatDuration(this.connectionStats.longestUptime),
            status: this.status,
            lastConnectionTime: this.lastConnectionTime
        };
    }

    /**
     * Format duration in human-readable format
     * @param {number} milliseconds - Duration in milliseconds
     * @returns {string} Formatted duration
     */
    formatDuration(milliseconds) {
        if (milliseconds === 0) return '0s';

        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Force reconnection (manual trigger)
     */
    forceReconnect() {
        console.log('Force reconnection triggered');
        this.reconnectAttempts = 0;
        this.status = 'RECONNECTING';
        this.notifyStatusChange();
        this.xtsWebSocket?.disconnect();
        setTimeout(() => {
            this.xtsWebSocket?.connect();
        }, 1000);
    }

    /**
     * Get current connection status
     * @returns {string} Current status
     */
    getStatus() {
        return this.status;
    }

    /**
     * Check if connection is healthy
     * @returns {boolean} True if connection is healthy
     */
    isHealthy() {
        return this.status === 'LIVE';
    }
}

module.exports = ConnectionManager;