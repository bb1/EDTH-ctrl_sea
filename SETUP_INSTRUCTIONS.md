# Database Setup and Verification Instructions

## Issue Detected

The PostgreSQL data directory contains data from an older PostgreSQL version, which is incompatible with PostgreSQL 18. The container is restarting due to this version mismatch.

## Solutions

### Option 1: Clear Existing Data (Recommended for Development)

If you don't need the existing data:

```bash
# Stop containers
docker compose down

# Remove the old data directory
rm -rf data/postgres/*

# Start containers fresh
docker compose up -d

# Wait for PostgreSQL to be ready (about 10-15 seconds)
sleep 15

# Initialize schemas
bun run -e "import { initSchema, closeDb } from './data_sources/infrastructure/db/db.ts'; (async () => { await initSchema(); await closeDb(); })();"
bun run -e "import { initSchema, closeDb } from './data_sources/ais/db/db.ts'; (async () => { await initSchema(); await closeDb(); })();"

# Verify schemas
bun run verify_schemas.ts
```

### Option 2: Use Compatible PostgreSQL Version

Update `docker-compose.yaml` to use PostgreSQL 15 or 16 (compatible with your existing data):

```yaml
services:
  postgres:
    image: postgis/postgis:15-3.4  # or 16-3.5
    platform: linux/amd64
    # ... rest of config
```

Then:
```bash
docker compose up -d
```

### Option 3: Migrate Data (For Production)

If you need to keep existing data, you'll need to migrate it using `pg_upgrade`. This is more complex and requires both old and new PostgreSQL versions.

## Verification Script

Once the database is running, use the verification script:

```bash
bun run verify_schemas.ts
```

This will check:
- ✅ Infrastructure tables (`infrastructure`, `infrastructure_segments`, `submarine_cable_line_segments`)
- ✅ Infrastructure view (`infrastructure_summary`)
- ✅ AIS tables (`ais_messages`, `position_reports`, `data_link_management_messages`)
- ✅ AIS view (`recent_position_reports`)
- ✅ Column information
- ✅ Record counts

## Manual Verification

You can also verify manually using `psql`:

```bash
# Connect to database
docker exec -it postgres psql -U admin -d edth_ctrl_sea_db

# Check tables
\dt

# Check infrastructure tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%infrastructure%' OR table_name LIKE '%ais%';

# Check views
\dv

# Exit
\q
```

## Current Status

- ✅ Docker Compose file updated with `platform: linux/amd64` for ARM64 compatibility
- ✅ Verification script created (`verify_schemas.ts`)
- ⚠️ PostgreSQL version mismatch needs to be resolved

## Next Steps

1. Choose one of the solutions above
2. Start the containers
3. Initialize the schemas
4. Run verification script
5. Import data if needed (`bun run import:cables`)

