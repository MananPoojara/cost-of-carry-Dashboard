@echo off
echo Stopping PostgreSQL for Cost-of-Carry Dashboard...
echo.

docker-compose -f docker-compose.postgres.yml down

echo.
echo PostgreSQL stopped successfully.
echo Data is preserved in Docker volume 'postgres_data'
echo.
pause