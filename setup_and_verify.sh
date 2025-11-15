#!/bin/bash

# Setup and verify database schemas

set -e

echo "🚀 Setting up Docker containers and verifying database schemas..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if containers are running
POSTGRES_RUNNING=$(docker ps --filter "name=postgres" --format "{{.Names}}" | grep -c postgres || echo "0")

if [ "$POSTGRES_RUNNING" -eq 0 ]; then
    echo "📦 Starting Docker containers..."
    
    # Try to start with docker compose
    if command -v docker-compose &> /dev/null; then
        docker-compose up -d
    elif command -v docker &> /dev/null && docker compose version &> /dev/null; then
        docker compose up -d
    else
        echo "❌ Docker Compose not found. Please install Docker Compose."
        exit 1
    fi
    
    echo "⏳ Waiting for PostgreSQL to be ready..."
    sleep 10
    
    # Wait for postgres to be healthy
    MAX_ATTEMPTS=30
    ATTEMPT=0
    while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
        if docker exec postgres pg_isready -U admin -d edth_ctrl_sea_db > /dev/null 2>&1; then
            echo "✅ PostgreSQL is ready!"
            break
        fi
        ATTEMPT=$((ATTEMPT + 1))
        echo "   Waiting... ($ATTEMPT/$MAX_ATTEMPTS)"
        sleep 2
    done
    
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        echo "❌ PostgreSQL failed to start in time"
        exit 1
    fi
else
    echo "✅ PostgreSQL container is already running"
fi

echo ""
echo "📋 Initializing database schemas..."

# Initialize AIS schema
echo "  - Initializing AIS schema..."
bun -e "
import { initSchema, closeDb } from './data_sources/ais/db/db.ts';
(async () => {
  try {
    await initSchema();
    console.log('    ✅ AIS schema initialized');
  } catch (error) {
    console.error('    ❌ AIS schema initialization failed:', error);
    process.exit(1);
  } finally {
    await closeDb();
  }
})();
" || echo "    ⚠️  AIS schema initialization had issues"

# Initialize Infrastructure schema
echo "  - Initializing Infrastructure schema..."
bun -e "
import { initSchema, closeDb } from './data_sources/infrastructure/db/db.ts';
(async () => {
  try {
    await initSchema();
    console.log('    ✅ Infrastructure schema initialized');
  } catch (error) {
    console.error('    ❌ Infrastructure schema initialization failed:', error);
    process.exit(1);
  } finally {
    await closeDb();
  }
})();
" || echo "    ⚠️  Infrastructure schema initialization had issues"

echo ""
echo "🔍 Verifying schemas..."
bun run verify_schemas.ts

echo ""
echo "✅ Setup and verification complete!"
