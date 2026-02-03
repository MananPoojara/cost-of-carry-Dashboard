@echo off
echo Connecting to PostgreSQL database...
echo.

REM Check if container is running
docker ps --filter "name=cost-of-carry-postgres" --format "{{.Names}}" | findstr "cost-of-carry-postgres" >nul
if %errorlevel% neq 0 (
    echo Error: PostgreSQL container is not running
    echo Please run start-postgres.bat first
    pause
    exit /b 1
)

echo Opening PostgreSQL shell...
echo Type \q to quit
echo.

docker exec -it cost-of-carry-postgres psql -U postgres -d cost_of_carry_db