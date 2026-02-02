# NIFTY Synthetic Analysis Dashboard

A production-grade real-time trading dashboard for NIFTY synthetic options analysis with advanced features like ATM strike auto-switching, expiry auto-rollover, and Z-Score analysis.

## 🚀 Features

### Production-Grade Components
- **ATM Strike Auto-Switching**: Automatically switches to new ATM strike when spot moves ±25 points
- **Weekly Expiry Auto-Rollover**: Seamlessly switches to next weekly contracts on expiry day
- **Tick Throttling**: Optimized data storage (99% database size reduction)
- **Stale Price Protection**: Prevents noise spikes from mixed fresh/stale data
- **WebSocket Auto-Reconnection**: Handles network interruptions gracefully

### Advanced Analytics
- **Spread Z-Score Analysis**: Shows how extreme current spreads are vs historical data
- **Real-time Synthetic Calculations**: Live put-call parity calculations
- **Calendar Spread Analysis**: Monthly vs Weekly synthetic spread tracking
- **Premium Percentage Tracking**: Synthetic premium as % of spot price

### Real-time Charts
1. **Spot vs Synthetic Weekly**: Compare NIFTY spot with synthetic weekly prices
2. **Cost of Carry**: Bar chart with Z-Score based coloring
3. **Calendar Spread**: Monthly vs Weekly synthetic analysis
4. **Premium Analysis**: Premium percentages over time

## 🏗️ Architecture

```
Frontend (Next.js 14)     Backend (Node.js)           Database (MongoDB)
├── Real-time Charts  ←→  ├── ATM Strike Manager   ←→  ├── Computed Data
├── WebSocket Client      ├── Expiry Manager           ├── Strike Changes
├── Status Display        ├── Data Storage             ├── Expiry Changes
└── Market Analysis       ├── Spread Analyzer          └── Historical Data
                          ├── Connection Manager
                          └── XTS Integration
```

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB 6+
- XTS API credentials (for production)

## 🛠️ Installation

### 1. Clone and Setup
```bash
git clone <repository-url>
cd nifty-synthetic-dashboard
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
```

### 3. Frontend Setup
```bash
cd ..
npm install
cp .env.local.example .env.local
# Edit .env.local with your configuration
```

### 4. Database Setup
```bash
# Start MongoDB
mongod

# Database and indexes will be created automatically
```

## 🚀 Running the Application

### Development Mode

1. **Start Backend** (Terminal 1):
```bash
cd backend
npm run dev
```

2. **Start Frontend** (Terminal 2):
```bash
npm run dev
```

3. **Access Dashboard**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

### Production Mode

1. **Build Frontend**:
```bash
npm run build
```

2. **Start Services**:
```bash
# Backend
cd backend
npm start

# Frontend
npm start
```

## 🔧 Configuration

### Backend Environment (.env)
```env
# Server
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/nifty-synthetic

# XTS API (Production)
XTS_APP_KEY=your_xts_app_key
XTS_SECRET_KEY=your_xts_secret_key
XTS_BASE_URL=https://developers.symphonyfintech.in
XTS_WS_URL=wss://ws.symphonyfintech.in

# Trading Configuration
STRIKE_INTERVAL=50
STRIKE_THRESHOLD=25
STORAGE_INTERVAL=1000
MAX_TICK_AGE=5000
```

### Frontend Environment (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_WS_URL=ws://localhost:3001
NEXT_PUBLIC_ENV=development
```

## 📊 API Endpoints

### Health & Status
- `GET /health` - System health check
- `GET /api/connection-stats` - Connection statistics
- `POST /api/force-reconnect` - Force WebSocket reconnection

### Market Data
- `GET /api/atm-strike` - Current ATM strike
- `GET /api/expiries` - Current expiry dates
- `GET /api/spread-analysis` - Current spread Z-Score analysis

### Historical Data
- `GET /api/historical?startDate=2024-01-01&endDate=2024-01-31&limit=1000`

## 🔌 WebSocket Events

### Client → Server
- `requestCurrentData` - Request current market data

### Server → Client
- `marketData` - Real-time market updates
- `connectionStatus` - Connection status changes
- `currentData` - Current data snapshot

## 🧪 Testing Scenarios

### 1. ATM Strike Change Test
```bash
# Simulate spot movement from 21425 to 21475
# Expected: Auto-switch from 21400 to 21450 strike
# Verify: Synthetic prices remain accurate
```

### 2. Expiry Day Test
```bash
# Simulate Thursday 3:35 PM (post-expiry)
# Expected: Auto-switch to next weekly contracts
# Verify: No data gaps or zero values
```

### 3. Network Disconnection Test
```bash
# Simulate 30-second network outage
# Expected: Auto-reconnection with resubscription
# Verify: No data loss, immediate recovery
```

### 4. High Volume Test
```bash
# Simulate 10 ticks per second for 1 hour
# Expected: Smooth operation, 1-second storage
# Verify: Database doesn't explode, UI responsive
```

## 📈 Database Optimization

### Storage Efficiency
- **Raw tick storage**: ~125GB per year (❌ Will crash)
- **Optimized storage**: ~1.25GB per year (✅ Production ready)
- **Reduction**: 99% smaller database size

### Indexes Created
```javascript
// Performance indexes
db.computed_data.createIndex({ timestamp: 1 })
db.computed_data.createIndex({ timestamp: -1 })
db.strike_changes.createIndex({ timestamp: 1 })
db.expiry_changes.createIndex({ timestamp: 1 })

// TTL index (1 year retention)
db.computed_data.createIndex({ timestamp: 1 }, { expireAfterSeconds: 31536000 })
```

## 🐳 Docker Deployment

### Docker Compose
```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - MONGODB_URI=mongodb://mongodb:27017/nifty-synthetic
    depends_on:
      - mongodb
      
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:3001/api
    depends_on:
      - backend

volumes:
  mongodb_data:
```

### Run with Docker
```bash
docker-compose up -d
```

## 🔍 Monitoring & Alerts

### Key Metrics
- WebSocket connection status
- Data processing latency  
- Database query performance
- Chart rendering performance

### Alert Thresholds
- Cost of carry > ±50 points
- Calendar spread > ±20 points
- WebSocket disconnection > 30 seconds
- Database query time > 1 second

## 🛡️ Production Checklist

### Must-Have Features ✅
- [x] ATM Strike Auto-Switching
- [x] Weekly Expiry Auto-Rollover  
- [x] Tick Throttling (1-second storage)
- [x] Stale Price Protection
- [x] WebSocket Reconnection Logic
- [x] Connection Status Display
- [x] Spread Z-Score Analysis
- [x] Strike Change Logging

### Performance Optimizations ✅
- [x] In-Memory Tick Buffering
- [x] Computed-Only Storage
- [x] Proper Database Indexing
- [x] Memory Leak Prevention

### Trader Experience ✅
- [x] Real-Time Status Indicators
- [x] Current ATM Strike Display
- [x] Expiry Date Display
- [x] Extreme Spread Alerts

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section below

## 🔧 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if backend is running on port 3001
   - Verify CORS settings in backend
   - Check firewall settings

2. **Database Connection Error**
   - Ensure MongoDB is running
   - Check MONGODB_URI in .env
   - Verify database permissions

3. **Charts Not Updating**
   - Check WebSocket connection status
   - Verify data is being received in browser console
   - Check for JavaScript errors

4. **High Memory Usage**
   - Reduce MAX_CHART_POINTS in configuration
   - Check for memory leaks in browser dev tools
   - Restart services if needed

### Performance Tips

1. **Database Performance**
   - Ensure proper indexes are created
   - Monitor query execution times
   - Consider data archival for old data

2. **Frontend Performance**
   - Limit chart data points (default: 100)
   - Use React DevTools to check for unnecessary re-renders
   - Monitor WebSocket message frequency

3. **Backend Performance**
   - Monitor tick processing latency
   - Check memory usage of tick buffer
   - Optimize synthetic calculations if needed

---

**Built with ❤️ for Indian trading markets**