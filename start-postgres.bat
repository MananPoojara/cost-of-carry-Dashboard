@echo off
echo Starting PostgreSQL for Cost-of-Carry Dashboard...
echo.

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Docker is not running or not installed
    echo Please start Docker Desktop and try again
    pause
    exit /b 1
)

REM Start PostgreSQL container
echo Starting PostgreSQL container...
docker-compose -f docker-compose.postgres.yml up -d

REM Wait a moment for container to start
timeout /t 5 /nobreak >nul

REM Check if container is running
docker ps --filter "name=cost-of-carry-postgres" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo.
echo PostgreSQL is starting up...
echo.
echo Connection Details:
echo   Host: localhost
echo   Port: 5432
echo   Database: cost_of_carry_db
echo   Username: postgres
echo   Password: postgres123
echo.
echo Connection String: postgresql://postgres:postgres123@localhost:5432/cost_of_carry_db
echo.
echo To stop PostgreSQL: docker-compose -f docker-compose.postgres.yml down
echo To view logs: docker-compose -f docker-compose.postgres.yml logs -f
echo.
pause