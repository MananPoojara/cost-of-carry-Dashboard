/**
 * Database Service for Cost of Carry Dashboard
 * Handles PostgreSQL operations for market data storage
 */

const { Pool } = require('pg');

class DatabaseService {
    constructor() {
        this.pool = null;
        this.isConnected = false;

        // Database configuration
        this.config = {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            database: process.env.DB_NAME || 'cost_of_carry_db',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'postgres123',
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        };
    }

    /**
     * Initialize database connection
     * @returns {boolean} Success status
     */
    async initialize() {
        try {
            console.log('Initializing Database Service...');
            console.log('Database config:', {
                host: this.config.host,
                port: this.config.port,
                database: this.config.database,
                user: this.config.user
            });

            this.pool = new Pool(this.config);

            // Test connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();

            this.isConnected = true;
            console.log('✅ Database connected successfully');

            // Create tables if they don't exist
            await this.ensureTablesExist();

            return true;

        } catch (error) {
            console.error('❌ Database connection failed:', error.message);
            this.isConnected = false;
            return false;
        }
    }

    /**
     * Ensure all required tables exist
     */
    async ensureTablesExist() {
        try {
            const client = await this.pool.connect();

            // Check if tables exist
            const result = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('market_data', 'computed_data', 'instruments')
            `);

            const existingTables = result.rows.map(row => row.table_name);
            console.log('Existing tables:', existingTables);

            // Add missing columns if they don't exist
            if (existingTables.includes('computed_data')) {
                await client.query(`
                    DO $$ 
                    BEGIN 
                        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='computed_data' AND COLUMN_NAME='spread_z_score') THEN
                            ALTER TABLE computed_data ADD COLUMN spread_z_score DOUBLE PRECISION;
                        END IF;
                    END $$;
                `);
            }

            client.release();

        } catch (error) {
            console.error('Error checking tables:', error.message);
        }
    }

    /**
     * Store market data tick
     * @param {Object} tickData - Market data tick
     * @returns {boolean} Success status
     */
    async storeMarketData(tickData) {
        if (!this.isConnected) {
            console.error('Database not connected');
            return false;
        }

        try {
            const client = await this.pool.connect();

            const query = `
                INSERT INTO market_data (
                    instrument_token, trading_symbol, exchange, segment, instrument_type,
                    strike_price, option_type, expiry_date,
                    open_price, high_price, low_price, close_price, last_traded_price,
                    volume, open_interest, bid_price, ask_price, bid_quantity, ask_quantity,
                    exchange_timestamp, server_timestamp
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
                )
                ON CONFLICT (instrument_token, server_timestamp) 
                DO UPDATE SET
                    last_traded_price = EXCLUDED.last_traded_price,
                    volume = EXCLUDED.volume,
                    open_interest = EXCLUDED.open_interest,
                    bid_price = EXCLUDED.bid_price,
                    ask_price = EXCLUDED.ask_price,
                    updated_at = CURRENT_TIMESTAMP
            `;

            const values = [
                tickData.instrumentToken || tickData.ExchangeInstrumentID,
                tickData.tradingSymbol || tickData.ExchangeInstrumentID,
                tickData.exchange || 'NSE',
                tickData.segment || 'INDICES',
                tickData.instrumentType || 'INDEX',
                tickData.strikePrice || null,
                tickData.optionType || null,
                tickData.expiryDate || null,
                tickData.Open || tickData.open || null,
                tickData.High || tickData.high || null,
                tickData.Low || tickData.low || null,
                tickData.Close || tickData.close || tickData.LastTradedPrice,
                tickData.LastTradedPrice || tickData.close,
                tickData.Volume || tickData.volume || 0,
                tickData.OpenInterest || tickData.openInterest || 0,
                tickData.BidPrice || tickData.bidPrice || null,
                tickData.AskPrice || tickData.askPrice || null,
                tickData.BidQuantity || tickData.bidQuantity || 0,
                tickData.AskQuantity || tickData.askQuantity || 0,
                tickData.ExchangeTimeStamp || Date.now(),
                new Date()
            ];

            await client.query(query, values);
            client.release();

            return true;

        } catch (error) {
            console.error('Error storing market data:', error.message);
            return false;
        }
    }

    /**
     * Store computed data (cost of carry calculations)
     * @param {Object} computedData - Computed analysis data
     * @returns {boolean} Success status
     */
    async storeComputedData(computedData) {
        if (!this.isConnected) {
            console.error('Database not connected');
            return false;
        }

        try {
            const client = await this.pool.connect();

            const query = `
                INSERT INTO computed_data (
                    spot_price, atm_strike,
                    weekly_call_price, weekly_put_price, weekly_call_iv, weekly_put_iv, weekly_expiry,
                    monthly_call_price, monthly_put_price, monthly_call_iv, monthly_put_iv, monthly_expiry,
                    weekly_synthetic_future, monthly_synthetic_future,
                    weekly_cost_of_carry, monthly_cost_of_carry, calendar_spread,
                    weekly_call_premium, weekly_put_premium, monthly_call_premium, monthly_put_premium,
                    calculation_timestamp, market_timestamp, spread_z_score
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
                )
            `;

            const values = [
                computedData.spot || computedData.spotPrice,
                computedData.atmStrike,
                computedData.weeklyCallPrice,
                computedData.weeklyPutPrice,
                computedData.weeklyCallIV,
                computedData.weeklyPutIV,
                computedData.weeklyExpiry,
                computedData.monthlyCallPrice,
                computedData.monthlyPutPrice,
                computedData.monthlyCallIV,
                computedData.monthlyPutIV,
                computedData.monthlyExpiry,
                computedData.weeklySynthetic || computedData.weeklySyntheticFuture,
                computedData.monthlySynthetic || computedData.monthlySyntheticFuture,
                computedData.weeklyCarry || computedData.weeklyCostOfCarry,
                computedData.monthlyCarry || computedData.monthlyCostOfCarry,
                computedData.calendarSpread,
                computedData.weeklyCallPremium,
                computedData.weeklyPutPremium,
                computedData.monthlyCallPremium,
                computedData.monthlyPutPremium,
                new Date(),
                computedData.marketTimestamp || Date.now(),
                computedData.spreadZScore?.zScore || (typeof computedData.spreadZScore === 'number' ? computedData.spreadZScore : null)
            ];

            await client.query(query, values);
            client.release();

            return true;

        } catch (error) {
            console.error('Error storing computed data:', error.message);
            return false;
        }
    }

    /**
     * Get latest market data for instruments
     * @param {Array} instrumentTokens - Array of instrument tokens
     * @returns {Array} Latest market data
     */
    async getLatestMarketData(instrumentTokens = []) {
        if (!this.isConnected) {
            return [];
        }

        try {
            const client = await this.pool.connect();

            let query = `
                SELECT DISTINCT ON (instrument_token) 
                    * 
                FROM market_data 
            `;

            let values = [];

            if (instrumentTokens.length > 0) {
                query += ` WHERE instrument_token = ANY($1)`;
                values.push(instrumentTokens);
            }

            query += ` ORDER BY instrument_token, server_timestamp DESC`;

            const result = await client.query(query, values);
            client.release();

            return result.rows;

        } catch (error) {
            console.error('Error getting latest market data:', error.message);
            return [];
        }
    }

    /**
     * Get historical computed data
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @param {number} limit - Maximum records to return
     * @returns {Array} Historical computed data
     */
    async getHistoricalComputedData(startDate = null, endDate = null, limit = 1000) {
        if (!this.isConnected) {
            return [];
        }

        try {
            const client = await this.pool.connect();

            let query = `
                SELECT * FROM computed_data 
            `;

            const conditions = [];
            const values = [];
            let paramCount = 0;

            if (startDate) {
                paramCount++;
                conditions.push(`calculation_timestamp >= $${paramCount}`);
                values.push(startDate);
            }

            if (endDate) {
                paramCount++;
                conditions.push(`calculation_timestamp <= $${paramCount}`);
                values.push(endDate);
            }

            if (conditions.length > 0) {
                query += ` WHERE ${conditions.join(' AND ')}`;
            }

            query += ` ORDER BY calculation_timestamp DESC`;

            if (limit) {
                paramCount++;
                query += ` LIMIT $${paramCount}`;
                values.push(limit);
            }

            const result = await client.query(query, values);
            client.release();

            return result.rows;

        } catch (error) {
            console.error('Error getting historical computed data:', error.message);
            return [];
        }
    }

    /**
     * Log strike change
     * @param {number} oldStrike - Previous ATM strike
     * @param {number} newStrike - New ATM strike
     * @param {number} spotPrice - Current spot price
     * @param {string} reason - Reason for change
     */
    async logStrikeChange(oldStrike, newStrike, spotPrice, reason = 'Auto adjustment') {
        if (!this.isConnected) return;

        try {
            const client = await this.pool.connect();

            const query = `
                INSERT INTO strike_changes (old_strike, new_strike, spot_price, change_reason)
                VALUES ($1, $2, $3, $4)
            `;

            await client.query(query, [oldStrike, newStrike, spotPrice, reason]);
            client.release();

            console.log(`Strike change logged: ${oldStrike} → ${newStrike} (Spot: ${spotPrice})`);

        } catch (error) {
            console.error('Error logging strike change:', error.message);
        }
    }

    /**
     * Log expiry change
     * @param {string} expiryType - 'WEEKLY' or 'MONTHLY'
     * @param {Date} oldExpiry - Previous expiry date
     * @param {Date} newExpiry - New expiry date
     * @param {string} reason - Reason for change
     */
    async logExpiryChange(expiryType, oldExpiry, newExpiry, reason = 'Auto rollover') {
        if (!this.isConnected) return;

        try {
            const client = await this.pool.connect();

            const query = `
                INSERT INTO expiry_changes (expiry_type, old_expiry, new_expiry, change_reason)
                VALUES ($1, $2, $3, $4)
            `;

            await client.query(query, [expiryType, oldExpiry, newExpiry, reason]);
            client.release();

            console.log(`${expiryType} expiry change logged: ${oldExpiry} → ${newExpiry}`);

        } catch (error) {
            console.error('Error logging expiry change:', error.message);
        }
    }

    /**
     * Log data fetch operation
     * @param {string} exchange - Exchange name
     * @param {string} tradingSymbol - Trading symbol
     * @param {Date} fetchDate - Date of fetch
     * @param {Date} fromDate - Data from date
     * @param {Date} toDate - Data to date
     * @param {number} recordsCount - Number of records fetched
     * @param {string} status - 'SUCCESS', 'FAILED', 'PARTIAL'
     * @param {string} errorMessage - Error message if any
     */
    async logDataFetch(exchange, tradingSymbol, fetchDate, fromDate, toDate, recordsCount = 0, status = 'SUCCESS', errorMessage = null) {
        if (!this.isConnected) return;

        try {
            const client = await this.pool.connect();

            const query = `
                INSERT INTO data_fetch_logs (
                    exchange, trading_symbol, fetch_date, from_date, to_date, 
                    records_count, status, error_message
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;

            await client.query(query, [
                exchange, tradingSymbol, fetchDate, fromDate, toDate,
                recordsCount, status, errorMessage
            ]);
            client.release();

        } catch (error) {
            console.error('Error logging data fetch:', error.message);
        }
    }

    /**
     * Get latest computed data for real-time dashboard
     * @param {number} limit - Maximum records to return
     * @returns {Array} Latest computed data with data quality validation
     */
    async getLatestComputedData(limit = 50) {
        if (!this.isConnected) {
            console.error('❌ Database not connected - cannot fetch computed data');
            return [];
        }

        try {
            const client = await this.pool.connect();

            const query = `
                SELECT *,
                    EXTRACT(EPOCH FROM (NOW() - calculation_timestamp)) as age_seconds
                FROM computed_data 
                WHERE EXTRACT(EPOCH FROM (NOW() - calculation_timestamp)) < 86400  -- Last 24 hours
                ORDER BY calculation_timestamp DESC
                LIMIT $1
            `;

            const result = await client.query(query, [limit]);
            client.release();

            // Validate data quality
            const validData = result.rows.filter(row => {
                const hasValidSpot = row.spot_price && row.spot_price > 0;
                const hasValidSynthetic = (row.weekly_synthetic_future || row.monthly_synthetic_future) > 0;
                return hasValidSpot && hasValidSynthetic;
            });

            if (validData.length === 0) {
                console.warn('⚠️  No valid computed data found in database');
            } else {
                const avgAge = validData.reduce((sum, row) => sum + parseFloat(row.age_seconds), 0) / validData.length;
                console.log(`✅ Retrieved ${validData.length} valid computed data points (avg age: ${avgAge.toFixed(1)}s)`);
            }

            return validData;

        } catch (error) {
            console.error('❌ Error getting latest computed data:', error.message);
            return [];
        }
    }

    /**
     * Get database statistics
        if (!this.isConnected) {
            return { error: 'Database not connected' };
        }

        try {
            const client = await this.pool.connect();

            // Get table row counts
            const stats = {};

            const tables = ['market_data', 'computed_data', 'instruments', 'strike_changes', 'expiry_changes', 'data_fetch_logs'];

            for (const table of tables) {
                try {
                    const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
                    stats[table] = parseInt(result.rows[0].count);
                } catch (error) {
                    stats[table] = 0;
                }
            }

            // Get latest computed data timestamp
            try {
                const result = await client.query(`
                    SELECT calculation_timestamp 
                    FROM computed_data 
                    ORDER BY calculation_timestamp DESC 
                    LIMIT 1
                `);
                stats.latest_computation = result.rows[0]?.calculation_timestamp || null;
            } catch (error) {
                stats.latest_computation = null;
            }

            // Get database size
            try {
                const result = await client.query(`
                    SELECT pg_size_pretty(pg_database_size(current_database())) as size
                `);
                stats.database_size = result.rows[0]?.size || 'Unknown';
            } catch (error) {
                stats.database_size = 'Unknown';
            }

            client.release();

            return stats;

        } catch (error) {
            console.error('Error getting database statistics:', error.message);
            return { error: error.message };
        }
    }

    /**
     * Clean old data (optional maintenance)
     * @param {number} daysToKeep - Number of days to keep
     * @returns {Object} Cleanup results
     */
    async cleanOldData(daysToKeep = 30) {
        if (!this.isConnected) {
            return { error: 'Database not connected' };
        }

        try {
            const client = await this.pool.connect();

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const results = {};

            // Clean market_data
            const marketDataResult = await client.query(`
                DELETE FROM market_data 
                WHERE server_timestamp < $1
            `, [cutoffDate]);
            results.market_data_deleted = marketDataResult.rowCount;

            // Clean computed_data
            const computedDataResult = await client.query(`
                DELETE FROM computed_data 
                WHERE calculation_timestamp < $1
            `, [cutoffDate]);
            results.computed_data_deleted = computedDataResult.rowCount;

            client.release();

            console.log(`Cleaned old data: ${results.market_data_deleted} market_data, ${results.computed_data_deleted} computed_data`);

            return results;

        } catch (error) {
            console.error('Error cleaning old data:', error.message);
            return { error: error.message };
        }
    }

    /**
     * Close database connection
     */
    async close() {
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            console.log('Database connection closed');
        }
    }

    /**
     * Get connection status
     * @returns {Object} Connection status
     */
    getStatus() {
        return {
            isConnected: this.isConnected,
            config: {
                host: this.config.host,
                port: this.config.port,
                database: this.config.database,
                user: this.config.user
            },
            poolInfo: this.pool ? {
                totalCount: this.pool.totalCount,
                idleCount: this.pool.idleCount,
                waitingCount: this.pool.waitingCount
            } : null
        };
    }
}

module.exports = DatabaseService;