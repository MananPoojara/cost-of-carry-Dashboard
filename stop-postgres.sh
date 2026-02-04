#!/bin/bash
echo "Stopping PostgreSQL for Cost-of-Carry Dashboard..."
echo

# Detect the best docker compose command
if docker compose version > /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif docker-compose version > /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "Error: Neither 'docker compose' nor 'docker-compose' is working."
    exit 1
fi

$COMPOSE_CMD -f docker-compose.postgres.yml down

echo
echo "PostgreSQL stopped successfully."
echo "Data is preserved in Docker volume 'postgres_data'"
echo