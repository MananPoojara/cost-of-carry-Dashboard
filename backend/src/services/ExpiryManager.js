/**
 * Expiry Manager - Critical Production Component
 * Handles automatic expiry rollover for weekly and monthly contracts
 * Prevents dashboard from showing zero values on expiry days
 */

class ExpiryManager {
    constructor(zerodhaService, db) {
        this.zerodhaService = zerodhaService;
        this.db = db;
        this.weeklyExpiry = null;
        this.monthlyExpiry = null;
        this.checkInterval = 60000; // Check every minute
        this.intervalId = null;
        this.subscribers = [];
    }

    /**
     * Start monitoring expiries
     */
    startExpiryMonitoring() {
        console.log('Starting expiry monitoring...');

        this.intervalId = setInterval(() => {
            this.checkExpiries();
        }, this.checkInterval);

        // Also check immediately
        this.checkExpiries();
    }

    /**
     * Stop monitoring expiries
     */
    stopExpiryMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('Stopped expiry monitoring');
        }
    }

    /**
     * Check if current expiries have expired and switch to next
     */
    async checkExpiries() {
        const now = new Date();
        const marketCloseTime = this.getMarketCloseTime(now);

        try {
            // Check weekly expiry
            if (this.weeklyExpiry && now > marketCloseTime && this.isExpiryDay(this.weeklyExpiry, now)) {
                console.log('Weekly expiry detected, switching to next week...');
                await this.switchToNextWeeklyExpiry();
            }

            // Check monthly expiry  
            if (this.monthlyExpiry && now > marketCloseTime && this.isExpiryDay(this.monthlyExpiry, now)) {
                console.log('Monthly expiry detected, switching to next month...');
                await this.switchToNextMonthlyExpiry();
            }
        } catch (error) {
            console.error('Error checking expiries:', error);
        }
    }

    /**
     * Switch to next weekly expiry contracts
     */
    async switchToNextWeeklyExpiry() {
        try {
            // Fetch next weekly expiry from instrument master
            const nextWeeklyExpiry = await this.fetchNextWeeklyExpiry();

            if (nextWeeklyExpiry) {
                // Unsubscribe current weekly options
                await this.unsubscribeWeeklyOptions();

                // Update expiry date
                const oldExpiry = this.weeklyExpiry;
                this.weeklyExpiry = nextWeeklyExpiry.expiryDate;

                // Subscribe to new weekly options
                await this.subscribeWeeklyOptions(nextWeeklyExpiry.instruments);

                // Log expiry switch
                await this.logExpirySwitch('WEEKLY', oldExpiry, nextWeeklyExpiry);

                // Notify subscribers
                this.notifyExpiryChange('WEEKLY', oldExpiry, nextWeeklyExpiry.expiryDate);

                console.log(`Weekly expiry switched: ${oldExpiry?.toDateString()} → ${nextWeeklyExpiry.expiryDate.toDateString()}`);
            }
        } catch (error) {
            console.error('Error switching weekly expiry:', error);
        }
    }

    /**
     * Switch to next monthly expiry contracts
     */
    async switchToNextMonthlyExpiry() {
        try {
            // Fetch next monthly expiry from instrument master
            const nextMonthlyExpiry = await this.fetchNextMonthlyExpiry();

            if (nextMonthlyExpiry) {
                // Unsubscribe current monthly options
                await this.unsubscribeMonthlyOptions();

                // Update expiry date
                const oldExpiry = this.monthlyExpiry;
                this.monthlyExpiry = nextMonthlyExpiry.expiryDate;

                // Subscribe to new monthly options
                await this.subscribeMonthlyOptions(nextMonthlyExpiry.instruments);

                // Log expiry switch
                await this.logExpirySwitch('MONTHLY', oldExpiry, nextMonthlyExpiry);

                // Notify subscribers
                this.notifyExpiryChange('MONTHLY', oldExpiry, nextMonthlyExpiry.expiryDate);

                console.log(`Monthly expiry switched: ${oldExpiry?.toDateString()} → ${nextMonthlyExpiry.expiryDate.toDateString()}`);
            }
        } catch (error) {
            console.error('Error switching monthly expiry:', error);
        }
    }

    /**
     * Get market close time (3:30 PM IST)
     * @param {Date} date - Current date
     * @returns {Date} Market close time
     */
    getMarketCloseTime(date) {
        const marketClose = new Date(date);
        marketClose.setHours(15, 30, 0, 0); // 3:30 PM
        return marketClose;
    }

    /**
     * Check if given date is expiry day
     * @param {Date} expiryDate - Expiry date to check
     * @param {Date} currentDate - Current date
     * @returns {boolean} True if current date is expiry day
     */
    isExpiryDay(expiryDate, currentDate = new Date()) {
        if (!expiryDate) return false;
        return currentDate.toDateString() === expiryDate.toDateString();
    }

    /**
     * Fetch next weekly expiry contracts
     * @returns {Object} Next weekly expiry data
     */
    async fetchNextWeeklyExpiry() {
        try {
            // Find next Thursday (weekly expiry day)
            const nextThursday = this.getNextThursday();

            // In production, fetch from XTS instrument master
            // For now, return mock data structure
            return {
                expiryDate: nextThursday,
                instruments: await this.getWeeklyInstruments(nextThursday)
            };
        } catch (error) {
            console.error('Error fetching next weekly expiry:', error);
            return null;
        }
    }

    /**
     * Fetch next monthly expiry contracts
     * @returns {Object} Next monthly expiry data
     */
    async fetchNextMonthlyExpiry() {
        try {
            // Find next last Thursday of month (monthly expiry day)
            const nextMonthlyExpiry = this.getNextMonthlyExpiry();

            // In production, fetch from XTS instrument master
            // For now, return mock data structure
            return {
                expiryDate: nextMonthlyExpiry,
                instruments: await this.getMonthlyInstruments(nextMonthlyExpiry)
            };
        } catch (error) {
            console.error('Error fetching next monthly expiry:', error);
            return null;
        }
    }

    /**
     * Get next Thursday date
     * @returns {Date} Next Thursday
     */
    getNextThursday() {
        const today = new Date();
        const daysUntilThursday = (4 - today.getDay() + 7) % 7 || 7; // Thursday = 4
        const nextThursday = new Date(today);
        nextThursday.setDate(today.getDate() + daysUntilThursday);
        nextThursday.setHours(15, 30, 0, 0); // Set to market close time
        return nextThursday;
    }

    /**
     * Get next monthly expiry (last Thursday of next month)
     * @returns {Date} Next monthly expiry
     */
    getNextMonthlyExpiry() {
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

        // Find last Thursday of next month
        const lastDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0);
        const lastThursday = new Date(lastDay);

        // Go back to find last Thursday
        while (lastThursday.getDay() !== 4) { // Thursday = 4
            lastThursday.setDate(lastThursday.getDate() - 1);
        }

        lastThursday.setHours(15, 30, 0, 0); // Set to market close time
        return lastThursday;
    }

    /**
     * Get weekly instrument tokens (mock implementation)
     * @param {Date} expiryDate - Expiry date
     * @returns {Array} Array of instrument tokens
     */
    async getWeeklyInstruments(expiryDate) {
        // In production, fetch actual instrument tokens from XTS
        return [
            'NIFTY_WEEKLY_CE_TOKEN',
            'NIFTY_WEEKLY_PE_TOKEN'
        ];
    }

    /**
     * Get monthly instrument tokens (mock implementation)
     * @param {Date} expiryDate - Expiry date
     * @returns {Array} Array of instrument tokens
     */
    async getMonthlyInstruments(expiryDate) {
        // In production, fetch actual instrument tokens from XTS
        return [
            'NIFTY_MONTHLY_CE_TOKEN',
            'NIFTY_MONTHLY_PE_TOKEN'
        ];
    }

    /**
     * Unsubscribe from current weekly options
     */
    async unsubscribeWeeklyOptions() {
        // Implementation depends on current subscriptions
        console.log('Unsubscribing from current weekly options');
    }

    /**
     * Unsubscribe from current monthly options
     */
    async unsubscribeMonthlyOptions() {
        // Implementation depends on current subscriptions
        console.log('Unsubscribing from current monthly options');
    }

    /**
     * Subscribe to new weekly options
     * @param {Array} instruments - Array of instrument tokens
     */
    async subscribeWeeklyOptions(instruments) {
        console.log('Subscribing to new weekly options:', instruments);
        // Implementation depends on XTS service
    }

    /**
     * Subscribe to new monthly options
     * @param {Array} instruments - Array of instrument tokens
     */
    async subscribeMonthlyOptions(instruments) {
        console.log('Subscribing to new monthly options:', instruments);
        // Implementation depends on XTS service
    }

    /**
     * Log expiry switch event
     * @param {string} type - 'WEEKLY' or 'MONTHLY'
     * @param {Date} oldExpiry - Previous expiry date
     * @param {Object} newExpiryData - New expiry data
     */
    async logExpirySwitch(type, oldExpiry, newExpiryData) {
        try {
            await this.db.logExpiryChange(type, oldExpiry, newExpiryData.expiryDate, 'Auto rollover');
            console.log(`${type} expiry switch logged to database`);
        } catch (error) {
            console.error(`Error logging ${type} expiry switch:`, error);
        }
    }

    /**
     * Notify subscribers about expiry change
     * @param {string} type - 'WEEKLY' or 'MONTHLY'
     * @param {Date} oldExpiry - Previous expiry date
     * @param {Date} newExpiry - New expiry date
     */
    notifyExpiryChange(type, oldExpiry, newExpiry) {
        const changeEvent = {
            type: 'EXPIRY_CHANGE',
            contractType: type,
            oldExpiry,
            newExpiry,
            timestamp: new Date()
        };

        this.subscribers.forEach(callback => {
            try {
                callback(changeEvent);
            } catch (error) {
                console.error('Error notifying expiry change subscriber:', error);
            }
        });
    }

    /**
     * Subscribe to expiry change events
     * @param {Function} callback - Callback function
     * @returns {string} Subscription ID
     */
    subscribe(callback) {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        this.subscribers.push({ id, callback });
        return id;
    }

    /**
     * Set expiry dates (for initialization)
     * @param {Date} weeklyExpiry - Weekly expiry date
     * @param {Date} monthlyExpiry - Monthly expiry date
     */
    setExpiries(weeklyExpiry, monthlyExpiry) {
        this.weeklyExpiry = weeklyExpiry;
        this.monthlyExpiry = monthlyExpiry;
        console.log(`Expiries set - Weekly: ${weeklyExpiry?.toDateString()}, Monthly: ${monthlyExpiry?.toDateString()}`);
    }

    /**
     * Get current expiry dates
     * @returns {Object} Current expiry dates
     */
    getCurrentExpiries() {
        return {
            weekly: this.weeklyExpiry,
            monthly: this.monthlyExpiry
        };
    }
}

module.exports = ExpiryManager;