# Submarine Internet Cables Database Schema Documentation

## Overview

This database schema stores information about underwater internet cable infrastructure. The schema is designed to efficiently store and query submarine cable metadata, geographic paths, and representative locations for mapping and analysis purposes.

## Database Structure

The schema consists of **1 main table** that stores all submarine cable information:

### `infrastructure` - Cable Infrastructure Data
**Originally named:** `submarine_cables`

**Purpose:** Central table that stores all submarine internet cable information including metadata, geographic paths, and representative locations.

**Key Fields:**
- `id` - Unique auto-incrementing identifier for each cable record
- `cable_id` - Unique cable identifier from the source data (e.g., "fastnet", "asia-united-gateway-east-aug-east")
- `name` - Human-readable cable name (e.g., "Fastnet", "Asia United Gateway East (AUG East)")
- `color` - Hex color code for visualization (e.g., "#939597", "#cf3a26")
- `feature_id` - Unique feature identifier from the GeoJSON source (e.g., "fastnet-0")
- `representative_longitude` / `representative_latitude` - Single point coordinates representing the cable location
- `path_coordinates` - Full cable path stored as JSONB (PostgreSQL native format)
  - Structure: `[[[[lon, lat], [lon, lat], ...]], [[[lon, lat], ...]]]`
  - MultiLineString format: array of line strings, each containing coordinate pairs
- `created_at` - Timestamp when the record was inserted
- `updated_at` - Timestamp when the record was last updated

**Use Case:** 
- Complete archive of submarine cable infrastructure
- Geographic mapping and visualization
- Spatial queries and analysis
- Cable route planning and monitoring

---

## Data Structure Details

### Path Coordinates Format

The `path_coordinates` field stores the full geographic path of each cable in JSONB format. The structure follows GeoJSON MultiLineString specification:

```json
[
  [
    [-75.089, 38.321],  // [longitude, latitude] - start point
    [-74.159, 38.989],  // intermediate point
    [-71.208, 40.384],  // intermediate point
    ...
    [-8.963, 51.557]    // end point
  ],
  [
    // Additional line segments if cable has multiple disconnected paths
  ]
]
```

**Why JSONB?**
- Native PostgreSQL support for efficient JSON queries
- Flexible storage for variable-length coordinate arrays
- GIN index support for fast spatial queries
- No need for PostGIS extension (works with standard PostgreSQL)

### Representative Point

The `representative_longitude` and `representative_latitude` fields store a single point from the cable's path. This is useful for:
- Quick geographic searches without parsing JSON
- Map markers and simplified visualizations
- Bounding box queries
- Approximate location lookups

---

## Performance Optimizations

### Indexes

The schema includes indexes on commonly queried fields for fast lookups:

**Primary Indexes:**
- `cable_id` (UNIQUE) - Fast lookup by cable identifier
- `name` - Search by cable name
- `feature_id` - Lookup by feature identifier
- `representative_latitude, representative_longitude` - Geographic searches
- `created_at` - Time-based queries

**JSONB Index:**
- `path_coordinates` (GIN index) - Efficient queries on the JSONB path data
  - Enables fast searches within coordinate arrays
  - Supports JSON path queries and containment checks

### View: `infrastructure_summary`
**Originally named:** `submarine_cables_summary`

A pre-built view that provides simplified cable information:

**Fields:**
- `id` - Database record ID
- `cable_id` - Unique cable identifier
- `name` - Cable name
- `color` - Visualization color
- `feature_id` - Feature identifier
- `representative_longitude` / `representative_latitude` - Location point
- `path_segment_count` - Number of path segments (line strings)
- `created_at` - Creation timestamp

**Usage Example:**
```sql
SELECT * FROM infrastructure_summary;
-- Shows all cables with simplified information, sorted by name
```

---

## Data Flow

### How Data Gets Stored

1. **GeoJSON file is read** from `internet_cables_coordinates.json`
2. **Schema is initialized** (if not already exists)
3. **Each feature is processed:**
   - Extract metadata (id, name, color, feature_id)
   - Extract representative point coordinates
   - Store full path coordinates as JSONB
   - Insert or update record in `infrastructure` table (originally `submarine_cables`)

**Note:** The import script (`import.ts`) handles the data transformation from GeoJSON to database records. On conflict (duplicate `cable_id`), records are updated rather than creating duplicates.

---

## Common Query Patterns

### Find a cable by ID
```sql
SELECT * FROM infrastructure 
WHERE cable_id = 'fastnet';
```

### Search cables by name
```sql
SELECT * FROM infrastructure 
WHERE name ILIKE '%asia%'
ORDER BY name;
```

### Find cables in a geographic area (using representative point)
```sql
SELECT * FROM infrastructure 
WHERE representative_latitude BETWEEN 40.0 AND 50.0
  AND representative_longitude BETWEEN -75.0 AND -50.0
ORDER BY name;
```

### Get cable summary information
```sql
SELECT * FROM infrastructure_summary
WHERE path_segment_count > 1;
-- Find cables with multiple path segments
```

### Query path coordinates (JSONB)
```sql
-- Get the first coordinate of the first path segment
SELECT 
  name,
  path_coordinates->0->0->0 as first_longitude,
  path_coordinates->0->0->1 as first_latitude
FROM submarine_cables
WHERE cable_id = 'fastnet';
```

### Count total cables
```sql
SELECT COUNT(*) as total_cables FROM infrastructure;
```

---

## Field Definitions

### Cable ID Format
- Lowercase alphanumeric with hyphens
- Examples: `fastnet`, `asia-united-gateway-east-aug-east`, `trans-global-cable-system-tgcs`
- Used as unique identifier in the database

### Color Codes
- Hex color format: `#RRGGBB`
- Used for visualization and mapping
- Examples: `#939597` (gray), `#cf3a26` (red), `#923e97` (purple)

### Coordinate System
- **CRS:** OGC:1.3:CRS84 (WGS84, longitude/latitude)
- **Format:** `[longitude, latitude]` (X, Y order)
- **Units:** Decimal degrees
- **Longitude range:** -180 to 180
- **Latitude range:** -90 to 90

---

## Data Import

### Import Script

The `import.ts` script handles bulk import of cable data:

**Features:**
- Automatic schema initialization
- Progress tracking (shows progress every 100 cables)
- Error handling for individual records
- Upsert logic (updates existing records on conflict)
- Summary statistics after import

**Usage:**
```bash
bun run import:cables
# or
bun data_sources/infrastructure/db/import.ts
```

**Environment Variables:**
- `POSTGRES_HOST` - Database host (default: localhost)
- `POSTGRES_PORT` - Database port (default: 5432)
- `POSTGRES_USER` - Database user (default: postgres)
- `POSTGRES_PASSWORD` - Database password (default: empty)
- `POSTGRES_DB` - Database name (default: postgres)

---

## Maintenance Notes

- **JSONB Storage** - Path coordinates stored as JSONB for flexibility and performance
- **Automatic Timestamps** - `created_at` and `updated_at` are automatically managed
- **Upsert Logic** - Duplicate `cable_id` values update existing records instead of failing
- **GIN Index** - JSONB path_coordinates field has a GIN index for efficient queries
- **No Foreign Keys** - Standalone table with no dependencies on other tables

---

## Example Data

### Sample Cable Record

```json
{
  "id": 1,
  "cable_id": "fastnet",
  "name": "Fastnet",
  "color": "#939597",
  "feature_id": "fastnet-0",
  "representative_longitude": -42.135412225493354,
  "representative_latitude": 45.92363058108652,
  "path_coordinates": [
    [
      [-75.089, 38.321],
      [-74.159, 38.989],
      [-71.208, 40.384],
      [-68.393, 40.875],
      [-61.110, 41.902],
      [-50.398, 43.906],
      [-39.600, 46.542],
      [-23.399, 50.451],
      [-16.199, 50.324],
      [-10.759, 50.456],
      [-8.963, 51.557]
    ]
  ],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

## Files in This Directory

- `schema.sql` - Complete database schema definition
- `db.ts` - Database connection and query functions
- `import.ts` - Bulk import script for GeoJSON data
- `SCHEMA.md` - This documentation file

---

## Related Files

- `../internet_cables_coordinates.json` - Source GeoJSON file containing all cable data

