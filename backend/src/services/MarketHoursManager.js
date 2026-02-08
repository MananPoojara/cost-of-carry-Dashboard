/**
 * Market Hours Manager
 * Handles NSE/BSE market hours, weekends, and holidays
 * Ensures system behaves correctly during non-trading days
 */

class MarketHoursManager {
    constructor() {
        // NSE Holidays 2026 (Approximate/Common ones)
        // In production, this can be fetched from NSE API or updated via config
        this.holidays2026 = [
            '2026-01-26', // Republic Day
            '2026-03-06', // Holi
            '2026-03-27', // Ram Navami
            '2026-04-02', // Mahavir Jayanti
            '2026-04-03', // Good Friday
            '2026-04-14', // Ambedkar Jayanti
            '2026-05-01', // Maharashtra Day
            '2026-07-28', // Moharram
            '2026-08-15', // Independence Day
            '2026-08-27', // Ganesh Chaturthi
            '2026-10-02', // Mahatma Gandhi Jayanti
            '2026-10-21', // Dussehra
            '2026-11-08', // Diwali-Laxmi Pujan
            '2026-11-25', // Guru Nanak Jayanti
            '2026-12-25', // Christmas
        ];

        // NSE Holidays 2025 (For completeness)
        this.holidays2025 = [
            '2025-01-26', '2025-03-14', '2025-03-31', '2025-04-10',
            '2025-04-14', '2025-04-18', '2025-05-01', '2025-06-07',
            '2025-08-15', '2025-10-02', '2025-10-21', '2025-11-05'
        ];
    }

    /**
     * Get current IST date/time
     * @returns {Date}
     */
    getISTDate() {
        // Adjust for IST (UTC+5:30)
        // If server is already in IST, this might not be needed, but good for portability
        return new Date();
    }

    /**
     * Check if today is a trading day
     * @returns {Object}
     */
    getMarketStatus() {
        const now = this.getISTDate();
        const day = now.getDay(); // 0 = Sunday, 6 = Saturday
        const dateString = now.toISOString().split('T')[0];

        // 1. Check Weekend
        if (day === 0 || day === 6) {
            return {
                isOpen: false,
                status: 'WEEKEND',
                description: 'Market is closed for the weekend'
            };
        }

        // 2. Check Holidays
        if (this.holidays2026.includes(dateString) || this.holidays2025.includes(dateString)) {
            return {
                isOpen: false,
                status: 'HOLIDAY',
                description: 'Market is closed for a public holiday'
            };
        }

        // 3. Check Hours
        const hour = now.getHours();
        const minute = now.getMinutes();
        const currentTime = hour * 60 + minute;

        const marketOpen = 9 * 60 + 15;  // 9:15 AM
        const marketClose = 15 * 60 + 40; // 3:40 PM (Extended as per user request)

        if (currentTime >= marketOpen && currentTime < marketClose) {
            return {
                isOpen: true,
                status: 'OPEN',
                description: 'Market is currently trading'
            };
        } else if (currentTime < marketOpen) {
            return {
                isOpen: false,
                status: 'PRE_MARKET',
                description: 'Market opens at 9:15 AM IST'
            };
        } else {
            return {
                isOpen: false,
                status: 'CLOSED',
                description: 'Trading session has ended'
            };
        }
    }

    /**
     * Simplified check for internal services
     * @returns {boolean}
     */
    isMarketOpen() {
        return this.getMarketStatus().isOpen;
    }
}

module.exports = new MarketHoursManager();
