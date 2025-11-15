# Database Verification Guide

## ✅ Current Status

- **PostgreSQL**: Running and healthy (PostgreSQL 16)
- **Martin**: Running (tile server)
- **Containers**: Both containers are up

## Verification Steps

### 1. Initialize Schemas

Run these commands to initialize both database schemas:

```bash
# Initialize Infrastructure schema
bun data_sources/infrastructure/db/import.ts --schema-only
# Or use the initSchema function directly:
bun -e "import { initSchema, closeDb } from './data_sources/infrastructure/db/db.ts'; (async () => { await initSchema(); await closeDb(); })();"

# Initialize AIS schema  
bun -e "import { initSchema, closeDb } from './data_sources/ais/db/db.ts'; (async () => { await initSchema(); await closeDb(); })();"
```

### 2. Verify Schemas

Run the verification script:

```bash
bun run verify_schemas.ts
```

Or manually verify using psql:

```bash
# Connect to database
docker exec -it postgres psql -U admin -d edth_ctrl_sea_db

# Check all tables
\dt

# Check infrastructure tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%infrastructure%' OR table_name LIKE '%ais%' OR table_name LIKE '%submarine%');

# Check views
\dv

# Check infrastructure table structure
\d infrastructure

# Check infrastructure_segments table structure
\d infrastructure_segments

# Check submarine_cable_line_segments table structure
\d submarine_cable_line_segments

# Check ais_messages table structure
\d ais_messages

# Exit
\q
```

### 3. Expected Tables

**Infrastructure Schema:**
- ✅ `infrastructure` - Main cable metadata table
- ✅ `infrastructure_segments` - Cable segments table
- ✅ `submarine_cable_line_segments` - Individual line segments
- ✅ `infrastructure_summary` - View with segment counts

**AIS Schema:**
- ✅ `ais_messages` - Main AIS messages table
- ✅ `position_reports` - Position report data
- ✅ `data_link_management_messages` - DLM messages
- ✅ `recent_position_reports` - View for recent reports

### 4. Import Data (Optional)

Once schemas are verified, you can import cable data:

```bash
bun run import:cables
```

This will:
- Initialize schemas (if not already done)
- Import all cables from the JSON file
- Create line segments for each cable

## Quick Verification Commands

```bash
# Check if tables exist
docker exec postgres psql -U admin -d edth_ctrl_sea_db -c "\dt"

# Count tables
docker exec postgres psql -U admin -d edth_ctrl_sea_db -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# List infrastructure tables
docker exec postgres psql -U admin -d edth_ctrl_sea_db -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%infrastructure%';"

# List AIS tables
docker exec postgres psql -U admin -d edth_ctrl_sea_db -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND (table_name LIKE '%ais%' OR table_name LIKE '%position%');"
```

## Troubleshooting

If schemas don't initialize:
1. Check PostgreSQL logs: `docker compose logs postgres`
2. Verify connection: `docker exec postgres pg_isready -U admin`
3. Check database exists: `docker exec postgres psql -U admin -l`

## Next Steps

After verification:
1. ✅ Schemas are created correctly
2. Import cable data: `bun run import:cables`
3. Verify data: `bun run show:line-segments-example`

