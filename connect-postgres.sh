#!/bin/bash
echo "Connecting to PostgreSQL database..."
echo

# Check if container is running
if [ -z "$(docker ps -q -f name=cost-of-carry-postgres)" ]; then
    echo "Error: PostgreSQL container is not running"
    echo "Please run ./start-postgres.sh first"
    exit 1
fi

echo "Opening PostgreSQL shell..."
echo "Type \q to quit"
echo

docker exec -it cost-of-carry-postgres psql -U postgres -d cost_of_carry_db