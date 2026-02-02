/**
 * ATM Strike Manager - Critical Production Component
 * Handles automatic ATM strike switching when spot price moves
 * Prevents synthetic price calculation errors in real trading
 */

class ATMStrikeManager {
    constructor(xtsService, db) {
        this.xtsService = xtsService;
        this.db = db;
        this.currentATMStrike = null;
        this.strikeThreshold = 25; // Half of strike interval (50/2)
        this.subscribers = [];
        this.strikeInterval = 50; // NIFTY strike interval
    }

    /**
     * Monitor spot price and update ATM strike when needed
     * @param {number} spotPrice - Current NIFTY spot price
     */
    async checkATMStrike(spotPrice) {
        const newATMStrike = this.calculateATMStrike(spotPrice);

        if (newATMStrike !== this.currentATMStrike) {
            console.log(`🔄 ATM Strike changed: ${this.currentATMStrike} → ${newATMStrike} (Spot: ${spotPrice})`);

            // Unsubscribe old options
            if (this.currentATMStrike) {
                await this.unsubscribeOldOptions(this.currentATMStrike);
            }

            // Subscribe to new ATM options
            await this.subscribeNewOptions(newATMStrike);

            // Update current strike
            const oldStrike = this.currentATMStrike;
            this.currentATMStrike = newATMStrike;

            // Log strike change event
            await this.logStrikeChange(oldStrike, newATMStrike, spotPrice);

            // Notify subscribers
            this.notifyStrikeChange(newATMStrike, oldStrike);
        }
    }

    /**
     * Calculate ATM strike based on spot price
     * @param {number} spotPrice - Current spot price
     * @returns {number} ATM strike price
     */
    calculateATMStrike(spotPrice) {
        // Round to nearest 50 (NIFTY strike interval)
        return Math.round(spotPrice / this.strikeInterval) * this.strikeInterval;
    }

    /**
     * Check if spot has moved significantly from current ATM
     * @param {number} spotPrice - Current spot price
     * @returns {boolean} True if strike should change
     */
    shouldChangeStrike(spotPrice) {
        if (!this.currentATMStrike) return true;

        const distance = Math.abs(spotPrice - this.currentATMStrike);
        return distance > this.strikeThreshold;
    }

    /**
     * Unsubscribe from old ATM options
     * @param {number} oldStrike - Previous ATM strike
     */
    async unsubscribeOldOptions(oldStrike) {
        const oldInstruments = [
            `NIFTY_${oldStrike}_CE_WEEKLY`,
            `NIFTY_${oldStrike}_PE_WEEKLY`,
            `NIFTY_${oldStrike}_CE_MONTHLY`,
            `NIFTY_${oldStrike}_PE_MONTHLY`
        ];

        console.log(`📤 Unsubscribing from old options: ${oldInstruments.join(', ')}`);

        try {
            await this.xtsService.unsubscribe(oldInstruments);
        } catch (error) {
            console.error('Error unsubscribing old options:', error);
        }
    }

    /**
     * Subscribe to new ATM options
     * @param {number} newStrike - New ATM strike
     */
    async subscribeNewOptions(newStrike) {
        const newInstruments = [
            `NIFTY_${newStrike}_CE_WEEKLY`,
            `NIFTY_${newStrike}_PE_WEEKLY`,
            `NIFTY_${newStrike}_CE_MONTHLY`,
            `NIFTY_${newStrike}_PE_MONTHLY`
        ];

        console.log(`📥 Subscribing to new options: ${newInstruments.join(', ')}`);

        try {
            await this.xtsService.subscribe(newInstruments);
        } catch (error) {
            console.error('Error subscribing to new options:', error);
        }
    }

    /**
     * Log strike change event for audit trail
     * @param {number} oldStrike - Previous strike
     * @param {number} newStrike - New strike
     * @param {number} spotPrice - Current spot price
     */
    async logStrikeChange(oldStrike, newStrike, spotPrice) {
        const logEntry = {
            timestamp: new Date(),
            event: 'ATM_STRIKE_CHANGE',
            oldStrike: oldStrike,
            newStrike: newStrike,
            spotPrice: spotPrice,
            reason: 'SPOT_MOVEMENT',
            threshold: this.strikeThreshold,
            distance: Math.abs(spotPrice - (oldStrike || newStrike))
        };

        try {
            // Store in database for audit
            await this.db.collection('strike_changes').insertOne(logEntry);
            console.log('Strike change logged to database');
        } catch (error) {
            console.error('Error logging strike change:', error);
        }
    }

    /**
     * Notify all subscribers about strike change
     * @param {number} newStrike - New ATM strike
     * @param {number} oldStrike - Previous ATM strike
     */
    notifyStrikeChange(newStrike, oldStrike) {
        const changeEvent = {
            type: 'ATM_STRIKE_CHANGE',
            newStrike,
            oldStrike,
            timestamp: new Date()
        };

        this.subscribers.forEach(callback => {
            try {
                callback(changeEvent);
            } catch (error) {
                console.error('Error notifying strike change subscriber:', error);
            }
        });
    }

    /**
     * Subscribe to strike change events
     * @param {Function} callback - Callback function
     * @returns {string} Subscription ID
     */
    subscribe(callback) {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        this.subscribers.push({ id, callback });
        return id;
    }

    /**
     * Unsubscribe from strike change events
     * @param {string} id - Subscription ID
     */
    unsubscribe(id) {
        this.subscribers = this.subscribers.filter(sub => sub.id !== id);
    }

    /**
     * Get current ATM strike
     * @returns {number|null} Current ATM strike
     */
    getCurrentATMStrike() {
        return this.currentATMStrike;
    }

    /**
     * Initialize ATM strike based on current spot price
     * @param {number} spotPrice - Current spot price
     */
    async initialize(spotPrice) {
        console.log(`Initializing ATM Strike Manager with spot price: ${spotPrice}`);
        await this.checkATMStrike(spotPrice);
    }
}

module.exports = ATMStrikeManager;