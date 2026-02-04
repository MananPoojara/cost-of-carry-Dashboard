#!/bin/bash

echo "🚀 Starting NIFTY Synthetic Dashboard..."
echo ""

# Kill existing processes
echo "Stopping existing servers..."
pkill -f "node server.js" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 2

# Start Backend
echo "Starting Backend (Port 3003)..."
cd /home/server/Downloads/cost-of-carry-Dashboard/backend
nohup node server.js > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"
sleep 3

# Check backend started
if lsof -i :3003 > /dev/null 2>&1; then
    echo "✅ Backend started successfully"
else
    echo "❌ Backend failed to start. Check /tmp/backend.log"
    tail -20 /tmp/backend.log
    exit 1
fi

# Start Frontend
echo ""
echo "Starting Frontend (Port 3000)..."
cd /home/server/Downloads/cost-of-carry-Dashboard
nohup npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"
sleep 5

# Check frontend started
if lsof -i :3000 > /dev/null 2>&1; then
    echo "✅ Frontend started successfully"
else
    echo "❌ Frontend failed to start. Check /tmp/frontend.log"
    tail -20 /tmp/frontend.log
    exit 1
fi

echo ""
echo "================================"
echo "✅ Dashboard is LIVE!"
echo "================================"
echo "Backend:  http://localhost:3003"
echo "Frontend: http://localhost:3000"
echo ""
echo "Logs:"
echo "  Backend:  tail -f /tmp/backend.log"
echo "  Frontend: tail -f /tmp/frontend.log"
echo "================================"
