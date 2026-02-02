@echo off
echo Starting NIFTY Synthetic Dashboard...
echo.

echo Starting MongoDB (if not already running)...
start "MongoDB" cmd /k "mongod --dbpath data\db"
timeout /t 3 /nobreak > nul

echo Starting Backend Server...
start "Backend" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak > nul

echo Starting Frontend Server...
start "Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo NIFTY Synthetic Dashboard Started!
echo ========================================
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3001
echo Health:   http://localhost:3001/health
echo ========================================
echo.
echo Press any key to exit...
pause > nul