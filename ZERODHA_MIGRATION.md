# Zerodha Migration Guide

This guide explains how to migrate from XTS API to Zerodha API for the Cost-of-Carry Dashboard.

## Overview

We've successfully converted the Python-based Zerodha data extraction to Node.js and integrated it with PostgreSQL database storage. The frontend remains unchanged and will continue to display charts with the new data source.

## What Changed

### ✅ Completed Changes

1. **Data Source**: XTS API → Zerodha API (reverse-engineered)
2. **Database**: MongoDB → PostgreSQL
3. **Data Storage**: In-memory processing → Database persistence
4. **Language**: Python data fetching → Node.js integration

### 🔄 Migration Steps

#### 1. Database Setup

```bash
# Start PostgreSQL
start-postgres.bat

# Verify connection
postgres-connect.bat
```

#### 2. Update Backend Dependencies

```bash
cd backend
npm install
```

#### 3. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings (optional - defaults work)
```

#### 4. Prepare Zerodha Connection

The system uses the curl request from your Python implementation:

```bash
# Make sure this file exists and is valid:
pyScript/kite-curl-request.txt
```

#### 5. Start the Updated Server

```bash
# Option 1: Use the new server
cd backend
node server-updated.js

# Option 2: Replace the old server (recommended)
# Backup current server
mv server.js server-xts-backup.js
# Use new server
mv server-updated.js server.js
# Start normally
npm start
```

#### 6. Start Frontend

```bash
# Frontend remains unchanged
npm run dev
```

## Architecture Changes

### Before (XTS)
```
XTS API → Backend Processing → WebSocket → Frontend Charts
```

### After (Zerodha + PostgreSQL)
```
Zerodha API → Database Storage → Backend Processing → WebSocket → Frontend Charts
                     ↓
              Historical Data Storage
```

## New Features

### 1. Database Persistence
- All market data stored in PostgreSQL
- Historical data analysis capabilities
- Data retention and cleanup

### 2. Enhanced API Endpoints

```bash
# Health check with database stats
GET /health

# Historical data
GET /api/historical?startDate=2024-01-01&endDate=2024-01-31&limit=1000

# Database statistics
GET /api/database-stats

# Connection status
GET /api/connection-stats

# Test Zerodha connection
POST /api/test-zerodha

# Clean old data
POST /api/clean-data
```

### 3. Improved Monitoring

- Database connection status
- Zerodha API connection status
- Data fetch logging
- Strike and expiry change tracking

## File Structure

### New Files
```
backend/
├── src/services/
│   ├── ZerodhaService.js      # Replaces XTSService.js
│   └── DatabaseService.js     # PostgreSQL operations
├── server-updated.js          # Updated server with PostgreSQL
└── .env.example              # Environment configuration

# Database setup
docker-compose.postgres.yml    # PostgreSQL container
init-scripts/
└── 01-create-tables.sql      # Database schema
start-postgres.bat            # Easy startup
stop-postgres.bat             # Easy shutdown
postgres-connect.bat          # Database shell
```

### Modified Files
```
backend/package.json          # Added PostgreSQL dependency
```

## Data Flow

### 1. Real-time Data
```
Zerodha API → ZerodhaService → DatabaseService (store) → OptimizedDataStorage (process) → WebSocket → Frontend
```

### 2. Historical Data
```
Database → API Endpoint → Frontend (for historical analysis)
```

## Configuration

### Database Connection
```javascript
// Automatic from environment variables
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cost_of_carry_db
DB_USER=postgres
DB_PASSWORD=postgres123
```

### Zerodha Connection
```bash
# Uses existing curl request file
pyScript/kite-curl-request.txt
```

## Testing

### 1. Test Database Connection
```bash
# Check if PostgreSQL is running
docker ps

# Connect to database
postgres-connect.bat

# Check tables
\dt
```

### 2. Test Zerodha Connection
```bash
# Via API endpoint
curl -X POST http://localhost:3001/api/test-zerodha

# Check server logs for connection status
```

### 3. Test Frontend
```bash
# Open dashboard
http://localhost:3000

# Check browser console for WebSocket connection
# Charts should display data (real or mock)
```

## Troubleshooting

### Database Issues
```bash
# Check if PostgreSQL is running
docker ps --filter "name=cost-of-carry-postgres"

# Restart PostgreSQL
stop-postgres.bat
start-postgres.bat

# Check logs
docker-compose -f docker-compose.postgres.yml logs -f
```

### Zerodha Connection Issues
```bash
# Check curl file exists
ls pyScript/kite-curl-request.txt

# Test connection via API
curl -X POST http://localhost:3001/api/test-zerodha

# Update curl request if expired
# Copy new curl request from browser network tab to kite-curl-request.txt
```

### Frontend Issues
```bash
# Check WebSocket connection
# Browser console should show: "Connected to WebSocket server"

# Check API endpoints
curl http://localhost:3001/health
```

## Performance Considerations

### Database Optimization
- Indexes created for common queries
- Automatic data cleanup (configurable retention)
- Connection pooling for concurrent access

### Memory Usage
- Data stored in database, not memory
- Configurable tick data retention
- Efficient real-time processing

## Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

### Database Stats
```bash
curl http://localhost:3001/api/database-stats
```

### Connection Status
```bash
curl http://localhost:3001/api/connection-stats
```

## Next Steps

1. **Test the migration** with your Zerodha curl request
2. **Verify data flow** from Zerodha → Database → Frontend
3. **Monitor performance** and adjust configuration as needed
4. **Set up data retention** policies for production use

## Rollback Plan

If you need to rollback to XTS:

```bash
cd backend
# Restore XTS server
mv server.js server-zerodha.js
mv server-xts-backup.js server.js

# Use MongoDB instead of PostgreSQL
# Update environment variables accordingly
```

## Support

The system now supports both live Zerodha data and mock data simulation. If Zerodha connection fails, it automatically falls back to mock data so the frontend continues to work.

All existing frontend functionality remains unchanged - charts will display the same way with the new data source.