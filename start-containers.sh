#!/bin/bash

echo "Starting NIFTY Synthetic Dashboard with Docker Compose..."

# Check if Docker is installed
if ! [ -x "$(command -v docker)" ]; then
  echo "Docker is not installed. Please install Docker first."
  exit 1
fi

# Check if Docker Compose is installed
if ! [ -x "$(command -v docker-compose)" ]; then
  echo "Docker Compose is not installed. Trying 'docker compose' (Docker Desktop v2.0.0.0+)..."
  if ! [ -x "$(command -v docker compose)" ]; then
    echo "Neither 'docker-compose' nor 'docker compose' is available. Please install Docker Compose."
    exit 1
  fi
fi

echo "Docker and Docker Compose are available."

# Build and start the containers
echo "Building and starting containers..."
if command -v docker-compose &> /dev/null; then
  docker-compose up --build -d
else
  docker compose up --build -d
fi

# Wait for containers to start
echo "Waiting for containers to start..."
sleep 10

# Show running containers
echo "Running containers:"
if command -v docker-compose &> /dev/null; then
  docker-compose ps
else
  docker compose ps
fi

echo ""
echo "NIFTY Synthetic Dashboard is now running!"
echo ""
echo "Frontend: http://localhost:3003"
echo "Backend API/WebSocket: http://localhost:3004"
echo "PostgreSQL: localhost:5433 (cost_of_carry_db)"
echo ""
echo "Access the dashboard from any device on your network:"
echo "   - Frontend: http://$(hostname -I | awk '{print $1}'):3003"
echo "   - Backend API: http://$(hostname -I | awk '{print $1}'):3004"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"