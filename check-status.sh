#!/bin/bash

echo "================================"
echo "NIFTY Synthetic Dashboard Status"
echo "================================"
echo ""

# Check Backend (Port 3003)
echo "Backend Status (Port 3003):"
if lsof -i :3003 > /dev/null 2>&1; then
    echo "✅ Backend is RUNNING on port 3003"
else
    echo "❌ Backend is NOT running"
    echo "   Start with: cd backend && node server.js"
fi
echo ""

# Check Frontend (Port 3000)
echo "Frontend Status (Port 3000):"
if lsof -i :3000 > /dev/null 2>&1; then
    echo "✅ Frontend is RUNNING on port 3000"
    echo "   Open: http://localhost:3000"
else
    echo "❌ Frontend is NOT running"
    echo "   Start with: npm run dev"
fi
echo ""

# Check PostgreSQL
echo "PostgreSQL Status (Port 5433):"
if docker ps | grep -q cost-of-carry-postgres; then
    echo "✅ PostgreSQL is RUNNING"
    ROWS=$(docker exec -i cost-of-carry-postgres psql -U postgres -d cost_of_carry_db -t -c "SELECT count(*) FROM computed_data;" 2>/dev/null | tr -d ' ')
    echo "   Data rows: $ROWS"
else
    echo "❌ PostgreSQL is NOT running"
    echo "   Start with: ./start-postgres.sh"
fi
echo ""

echo "================================"
echo "Console Debugging:"
echo "================================"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Press F12 to open DevTools"
echo "3. Go to Console tab"
echo "4. Look for these logs:"
echo "   ✅ Connected to WebSocket server"
echo "   📈 History data received: XXX points"
echo "   📊 Market data received"
echo ""
echo "If you see 'chartData is EMPTY', the data"
echo "is not being passed correctly from hooks to charts."
echo "================================"
