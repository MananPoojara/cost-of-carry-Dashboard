#!/usr/bin/env node

/**
 * Zerodha Data Fetcher Script
 * Standalone script to fetch and store Zerodha data
 * Usage: node fetchZerodhaData.js [exchange]
 */

require('dotenv').config();
const { Pool } = require('pg');
const ZerodhaService = require('../services/ZerodhaService');

class ZerodhaDataFetcher {
    constructor() {
        // Database connection
        this.db = new Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://seasonality:seasonality123@localhost:5432/seasonality',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        this.zerodhaService = new ZerodhaService(this.db);
        this.exchanges = ['NSE', 'NFO', 'BSE', 'BFO', 'CDS', 'MCX'];
    }

    /**
     * Initialize the fetcher
     */
    async initialize() {
        try {
            console.log('🚀 Initializing Zerodha Data Fetcher...');

            // Test database connection
            const client = await this.db.connect();
            await client.query('SELECT NOW()');
            client.release();
            console.log('✅ Database connected');

            // Load connection constants
            const loaded = await this.zerodhaService.loadConnectionConstants();
            if (!loaded) {
                throw new Error('Failed to load connection constants');
            }

            console.log('✅ Zerodha Data Fetcher initialized');
            return true;
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            return false;
        }
    }

    /**
     * Update instrument master for all exchanges
     */
    async updateInstrumentMaster() {
        console.log('📊 Updating instrument master...');

        try {
            const tickersByExchange = await this.zerodhaService.updateTickersToExchangeFile();

            console.log('\n📋 Summary:');
            for (const [exchange, tickers] of Object.entries(tickersByExchange)) {
                console.log(`   ${exchange}: ${tickers.length} instruments`);
            }

            return tickersByExchange;
        } catch (error) {
            console.error('❌ Error updating instrument master:', error);
            throw error;
        }
    }

    /**
     * Download data for specific exchange
     */
    async downloadExchangeData(exchange) {
        if (!this.exchanges.includes(exchange)) {
            throw new Error(`Invalid exchange: ${exchange}. Valid exchanges: ${this.exchanges.join(', ')}`);
        }

        console.log(`\n🔄 Downloading data for ${exchange}...`);
        await this.zerodhaService.downloadExchangeData(exchange);
    }

    /**
     * Download data for all exchanges
     */
    async downloadAllData() {
        console.log('\n🔄 Downloading data for all exchanges...');

        for (const exchange of this.exchanges) {
            try {
                await this.downloadExchangeData(exchange);
                console.log(`✅ Completed ${exchange}`);
            } catch (error) {
                console.error(`❌ Error downloading ${exchange}:`, error.message);
            }
        }
    }

    /**
     * Show statistics
     */
    async showStatistics() {
        try {
            console.log('\n📊 Database Statistics:');

            // Instruments count
            const instrumentsResult = await this.db.query(`
                SELECT exchange, COUNT(*) as count 
                FROM instruments 
                GROUP BY exchange 
                ORDER BY exchange
            `);

            console.log('\n📋 Instruments:');
            instrumentsResult.rows.forEach(row => {
                console.log(`   ${row.exchange}: ${row.count} instruments`);
            });

            // Market data count
            const dataResult = await this.db.query(`
                SELECT exchange, COUNT(*) as count, 
                       MIN(datetime) as earliest, 
                       MAX(datetime) as latest
                FROM market_data 
                GROUP BY exchange 
                ORDER BY exchange
            `);

            console.log('\n📈 Market Data:');
            dataResult.rows.forEach(row => {
                const earliest = new Date(row.earliest).toISOString().split('T')[0];
                const latest = new Date(row.latest).toISOString().split('T')[0];
                console.log(`   ${row.exchange}: ${row.count} records (${earliest} to ${latest})`);
            });

            // Recent activity
            const recentResult = await this.db.query(`
                SELECT ticker, MAX(datetime) as last_update
                FROM market_data 
                GROUP BY ticker 
                ORDER BY last_update DESC 
                LIMIT 10
            `);

            console.log('\n🕒 Recent Updates:');
            recentResult.rows.forEach(row => {
                const lastUpdate = new Date(row.last_update).toISOString().replace('T', ' ').split('.')[0];
                console.log(`   ${row.ticker}: ${lastUpdate}`);
            });

        } catch (error) {
            console.error('❌ Error showing statistics:', error);
        }
    }

    /**
     * Interactive menu
     */
    async showMenu() {
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

        console.log('\n' + '='.repeat(50));
        console.log('🚀 Zerodha Data Fetcher');
        console.log('='.repeat(50));
        console.log('1. Update instrument master');
        console.log('2. Download NSE data');
        console.log('3. Download NFO data');
        console.log('4. Download BSE data');
        console.log('5. Download BFO data');
        console.log('6. Download CDS data');
        console.log('7. Download MCX data');
        console.log('8. Download all exchanges');
        console.log('9. Show statistics');
        console.log('0. Exit');
        console.log('='.repeat(50));

        const choice = await question('Enter your choice (0-9): ');
        rl.close();

        switch (choice) {
            case '1':
                await this.updateInstrumentMaster();
                break;
            case '2':
                await this.downloadExchangeData('NSE');
                break;
            case '3':
                await this.downloadExchangeData('NFO');
                break;
            case '4':
                await this.downloadExchangeData('BSE');
                break;
            case '5':
                await this.downloadExchangeData('BFO');
                break;
            case '6':
                await this.downloadExchangeData('CDS');
                break;
            case '7':
                await this.downloadExchangeData('MCX');
                break;
            case '8':
                await this.downloadAllData();
                break;
            case '9':
                await this.showStatistics();
                break;
            case '0':
                console.log('👋 Goodbye!');
                return;
            default:
                console.log('❌ Invalid choice');
        }

        // Show menu again
        setTimeout(() => this.showMenu(), 2000);
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            await this.db.end();
            console.log('✅ Database connection closed');
        } catch (error) {
            console.error('❌ Error during cleanup:', error);
        }
    }
}

// Main execution
async function main() {
    const fetcher = new ZerodhaDataFetcher();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n🛑 Shutting down...');
        await fetcher.cleanup();
        process.exit(0);
    });

    try {
        const initialized = await fetcher.initialize();
        if (!initialized) {
            process.exit(1);
        }

        // Check command line arguments
        const args = process.argv.slice(2);

        if (args.length === 0) {
            // Interactive mode
            await fetcher.showMenu();
        } else {
            const command = args[0].toLowerCase();

            switch (command) {
                case 'update':
                    await fetcher.updateInstrumentMaster();
                    break;
                case 'stats':
                    await fetcher.showStatistics();
                    break;
                case 'all':
                    await fetcher.updateInstrumentMaster();
                    await fetcher.downloadAllData();
                    break;
                default:
                    if (fetcher.exchanges.includes(command.toUpperCase())) {
                        await fetcher.downloadExchangeData(command.toUpperCase());
                    } else {
                        console.log('❌ Invalid command');
                        console.log('Usage: node fetchZerodhaData.js [update|stats|all|nse|nfo|bse|bfo|cds|mcx]');
                    }
            }
        }

    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    } finally {
        await fetcher.cleanup();
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = ZerodhaDataFetcher;