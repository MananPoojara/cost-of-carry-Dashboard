#!/usr/bin/env node

/**
 * Zerodha Migration Setup Script
 * Helps migrate from XTS to Zerodha API integration
 */

const fs = require('fs').promises;
const path = require('path');

class ZerodhaMigrationSetup {
    constructor() {
        this.steps = [
            'checkFiles',
            'updateEnvFile',
            'installDependencies',
            'setupDatabase',
            'copyKiteCurlFile',
            'testConnection'
        ];
    }

    async run() {
        console.log('🚀 Starting Zerodha Migration Setup...\n');

        for (const step of this.steps) {
            try {
                console.log(`📋 Step: ${step}`);
                await this[step]();
                console.log('✅ Completed\n');
            } catch (error) {
                console.error(`❌ Error in ${step}:`, error.message);
                console.log('');
            }
        }

        console.log('🎉 Migration setup completed!');
        this.showNextSteps();
    }

    async checkFiles() {
        const requiredFiles = [
            'backend/src/services/ZerodhaService.js',
            'backend/src/scripts/fetchZerodhaData.js',
            'backend/src/services/DataAdapter.js',
            'pyScript/kite-curl-request.txt'
        ];

        for (const file of requiredFiles) {
            try {
                await fs.access(file);
                console.log(`   ✅ ${file} exists`);
            } catch (error) {
                console.log(`   ❌ ${file} missing`);
            }
        }
    }

    async updateEnvFile() {
        const envPath = 'backend/.env';
        const envExamplePath = 'backend/.env.example';

        try {
            // Check if .env exists
            let envContent = '';
            try {
                envContent = await fs.readFile(envPath, 'utf8');
            } catch (error) {
                // Create from example if exists
                try {
                    envContent = await fs.readFile(envExamplePath, 'utf8');
                } catch (error) {
                    envContent = '';
                }
            }

            // Add PostgreSQL configuration
            const postgresConfig = `
# PostgreSQL Database (from Docker)
DATABASE_URL=postgresql://seasonality:seasonality123@localhost:5432/seasonality

# Zerodha Configuration
ZERODHA_DATA_PATH=./zerodha-data/

# Server Configuration
PORT=3001
NODE_ENV=development
`;

            // Remove XTS configuration if present
            envContent = envContent.replace(/# XTS.*?\n\n/gs, '');
            envContent = envContent.replace(/XTS_.*?\n/g, '');

            // Add new configuration
            if (!envContent.includes('DATABASE_URL')) {
                envContent += postgresConfig;
            }

            await fs.writeFile(envPath, envContent);
            console.log('   ✅ Updated .env file');

        } catch (error) {
            console.log('   ⚠️ Could not update .env file:', error.message);
        }
    }

    async installDependencies() {
        const { spawn } = require('child_process');

        return new Promise((resolve, reject) => {
            console.log('   📦 Installing PostgreSQL dependencies...');

            const npm = spawn('npm', ['install', 'pg'], {
                cwd: 'backend',
                stdio: 'pipe'
            });

            npm.on('close', (code) => {
                if (code === 0) {
                    console.log('   ✅ Dependencies installed');
                    resolve();
                } else {
                    reject(new Error(`npm install failed with code ${code}`));
                }
            });

            npm.on('error', (error) => {
                reject(error);
            });
        });
    }

    async setupDatabase() {
        console.log('   🗄️ Database setup instructions:');
        console.log('   1. Ensure Docker is running');
        console.log('   2. Your PostgreSQL container should be accessible at localhost:5432');
        console.log('   3. Database tables will be created automatically on first run');
        console.log('   4. TimescaleDB extension will be used if available');
    }

    async copyKiteCurlFile() {
        const sourcePath = 'pyScript/kite-curl-request.txt';

        try {
            const content = await fs.readFile(sourcePath, 'utf8');
            console.log('   ✅ Kite curl request file found');
            console.log('   📝 Make sure this file contains your valid Zerodha session data');
        } catch (error) {
            console.log('   ❌ Kite curl request file not found');
            console.log('   📝 You need to create pyScript/kite-curl-request.txt with your Zerodha curl request');
        }
    }

    async testConnection() {
        console.log('   🔍 Connection test will be performed on first run');
        console.log('   📊 Use: npm run fetch-data stats to check database status');
    }

    showNextSteps() {
        console.log('\n' + '='.repeat(60));
        console.log('🎯 NEXT STEPS');
        console.log('='.repeat(60));
        console.log('');
        console.log('1. Update your Zerodha session data:');
        console.log('   - Login to Kite web platform');
        console.log('   - Open browser developer tools');
        console.log('   - Copy a market data request as cURL');
        console.log('   - Update pyScript/kite-curl-request.txt');
        console.log('');
        console.log('2. Start your Docker services:');
        console.log('   docker-compose up -d postgres');
        console.log('');
        console.log('3. Test the data fetcher:');
        console.log('   cd backend');
        console.log('   npm run fetch-data stats');
        console.log('');
        console.log('4. Fetch initial data:');
        console.log('   npm run fetch-data update  # Update instrument master');
        console.log('   npm run fetch-data nse     # Fetch NSE data');
        console.log('   npm run fetch-data nfo     # Fetch NFO data');
        console.log('');
        console.log('5. Start the backend server:');
        console.log('   npm run dev');
        console.log('');
        console.log('6. Test the API endpoints:');
        console.log('   http://localhost:3001/health');
        console.log('   http://localhost:3001/api/tickers');
        console.log('');
        console.log('⚠️  IMPORTANT NOTES:');
        console.log('   - Zerodha session expires daily');
        console.log('   - Update curl request file daily');
        console.log('   - Respect rate limits (1 request/second)');
        console.log('   - Data is stored in PostgreSQL database');
        console.log('');
        console.log('📚 For help: Check the README or ask questions');
        console.log('='.repeat(60));
    }
}

// Run setup
const setup = new ZerodhaMigrationSetup();
setup.run().catch(console.error);