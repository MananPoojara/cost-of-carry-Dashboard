#!/bin/bash
echo "Starting PostgreSQL for Cost-of-Carry Dashboard..."
echo

# Check if Docker is running
if ! docker version > /dev/null 2>&1; then
    echo "Error: Docker is not running or not installed"
    echo "Please start Docker and try again"
    exit 1
fi

# Detect the best docker compose command
if docker compose version > /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
elif docker-compose version > /dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "Error: Neither 'docker compose' nor 'docker-compose' is working."
    echo "If you see 'http+docker' error, please run: pip install 'requests<2.32.0'"
    echo "Or install the modern plugin: sudo apt-get install docker-compose-plugin"
    exit 1
fi

# Start PostgreSQL container
echo "Starting PostgreSQL container using $COMPOSE_CMD..."
$COMPOSE_CMD -f docker-compose.postgres.yml up -d

# Wait a moment for container to start
sleep 5

# Check if container is running
docker ps --filter "name=cost-of-carry-postgres" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo
echo "PostgreSQL is starting up..."
echo
echo "Connection Details:"
echo "  Host: localhost"
echo "  Port: 5433"
echo "  Database: cost_of_carry_db"
echo "  Username: postgres"
echo "  Password: postgres123"
echo
echo "Connection String: postgresql://postgres:postgres123@localhost:5433/cost_of_carry_db"
echo
echo "To stop PostgreSQL: $COMPOSE_CMD -f docker-compose.postgres.yml down"
echo "To view logs: $COMPOSE_CMD -f docker-compose.postgres.yml logs -f"
echo