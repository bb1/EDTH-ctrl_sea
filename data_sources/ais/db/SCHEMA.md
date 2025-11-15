# AIS Database Schema Documentation

## Overview

This database schema stores AIS (Automatic Identification System) messages received from maritime vessels. The schema is designed for efficient querying and analysis of vessel position data, movement patterns, and communication management.

## Database Structure

The schema consists of **3 main tables** that work together to store and organize AIS data:

### 1. `object` - Main Object Archive

**Purpose:** Central table that stores all incoming AIS object metadata that we decided to persist (position reports and ship metadata messages).

**Key Fields:**
- `id` - UUID identifier for each object message
- `mmsi` - Maritime Mobile Service Identity (unique ship identifier, maintained as one row per vessel by the ingestion code)
- `object_name` - Latest known vessel/object name (if available)
- `created_at` - When the record was inserted into the database

**Use Case:** Stable vessel registry (one row per MMSI) that keeps a consistent UUID for joins with high-volume tables like `position_reports` and `ship_metadata`.

---

### 2. `position_reports` - Vessel Position Data

**Purpose:** Specialized table for fast queries on vessel positions and movement data.

**Key Fields:**
- `object_id` - Links back to the main `object` table
- `mmsi` - Ship identifier
- `location` - PostGIS `geometry(POINT, 4326)` capturing precise vessel coordinates
- `cog` - Course Over Ground (direction vessel is moving, in degrees)
- `sog` - Speed Over Ground (vessel speed in knots)
- `true_heading` - Direction the vessel is pointing (degrees)
- `navigational_status` - Current operational status (0-15, e.g., underway, anchored, moored)
- `rate_of_turn` - How quickly the vessel is turning
- `position_accuracy` - GPS accuracy indicator
- `raim` - Receiver Autonomous Integrity Monitoring status
- `timestamp` - AIS system timestamp

**Use Case:** Fast queries for:
- Real-time vessel tracking
- Movement pattern analysis
- Speed and course calculations
- Geographic area searches

**Why Separate Table?** Position reports are the most common message type. Storing them in a dedicated table with proper indexes allows for very fast queries without parsing JSON or joining complex data structures.

---

### 3. `ship_metadata` - Static Vessel Information

**Purpose:** Stores static AIS information (message types 5 and 24) that describe the vessel rather than its current position.

**Key Fields:**
- `object_id` - Links back to the main `object` table
- `mmsi` - Ship identifier (unique per vessel)
- `ship_name` - Latest reported vessel name
- `callsign` - Vessel callsign
- `ship_type` - AIS vessel type code
- `dimension_to_*` - Hull dimensions reported in AIS static data (bow, stern, port, starboard)

**Use Case:** Quickly answering questions about a vessel (name, callsign, size, type) and joining that metadata with live position reports.

---

## Relationships

```
object (1) ──< (many) position_reports
object (1) ──1 ship_metadata
```

- Each vessel record in `object` can have **many** corresponding records in `position_reports` (all qualifying position reports for its MMSI: AIS types 1, 2, 3, 18, 19, or 27)
- Each vessel record in `object` can have **at most one** corresponding record in `ship_metadata` (static data messages: AIS types 5 or 24, upserted per MMSI)
- Foreign keys ensure data integrity: if an object is deleted, related records are automatically removed (CASCADE)

---

## Performance Optimizations

### Indexes

The schema includes indexes on commonly queried fields for fast lookups:

**`object` indexes:**
- `mmsi` - Fast lookups by MMSI
- `created_at` - Database insertion time queries

**`position_reports` indexes:**
- `mmsi` - Track a specific vessel's movements
- `time_utc` - Recent position queries
- `location` (GIST) - Spatial searches and bounding box queries
- `created_at` - Recent data queries

**`ship_metadata` indexes:**
- `mmsi` (UNIQUE) - One metadata record per vessel
- `callsign` - Lookup by callsign

### View: `recent_position_reports`

A pre-built view that automatically joins `position_reports` with `object` to show:
- All position data and associated geometry
- Object names
- Only messages from the last 24 hours
- Sorted by most recent first

**Usage Example:**
```sql
SELECT * FROM recent_position_reports;
-- Automatically shows last 24 hours with object names
```

---

## Data Flow

### How Data Gets Stored

1. **AIS message arrives** from the stream
2. **Upsert into `object`** - Basic vessel metadata stored per MMSI (reuses the same UUID if the ship already exists)
3. **Application code extracts data** based on message type:
   - If AIS type is `1, 2, 3, 18, 19, 27` → Insert into `position_reports` table
   - If AIS type is `5 or 24` → Upsert into `ship_metadata` table
   - All other message types are ignored at ingestion time to keep the dataset focused

**Note:** Data extraction happens in application code (`db.ts`), not database triggers, for better control and flexibility.

---

## Common Query Patterns

### Find all positions for a specific ship
```sql
SELECT * FROM position_reports 
WHERE mmsi = 636023108 
ORDER BY time_utc DESC;
```

### Find ships in a geographic area
```sql
SELECT *
FROM position_reports
WHERE ST_Intersects(
        location,
        ST_MakeEnvelope(13.0, 55.0, 14.0, 56.0, 4326)
      )
  AND time_utc >= NOW() - INTERVAL '1 hour';
```

> Use `ST_Y(location)` and `ST_X(location)` to access latitude and longitude respectively when needed.

### Get recent position reports with object names
```sql
SELECT * FROM recent_position_reports;
```

### Find a vessel by MMSI
```sql
SELECT * FROM object 
WHERE mmsi = 636023108;
```

### Look up vessel metadata
```sql
SELECT ship_name, callsign, ship_type,
       dimension_to_bow, dimension_to_stern,
       dimension_to_port, dimension_to_starboard
FROM ship_metadata
WHERE mmsi = 636023108;
```

---

## Field Definitions

### Navigational Status Values
Common values for `navigational_status`:
- `0` - Under way using engine
- `1` - At anchor
- `2` - Not under command
- `3` - Restricted manoeuvrability
- `4` - Constrained by draught
- `5` - Moored
- `6` - Aground
- `7` - Engaged in fishing
- `8` - Under way sailing
- (See AIS specification for complete list)

### MMSI (Maritime Mobile Service Identity)
- Unique 9-digit identifier for each vessel
- Format: `MIDXXXXXX` where MID is country code
- Example: `636023108` (Liberia)

---

## Maintenance Notes

- **PostGIS required** - The schema enables the `postgis` extension for geometry storage
- **No JSONB fields** - All data is stored in structured columns for better performance
- **Automatic timestamps** - `created_at` is automatically set on insert
- **Cascade deletes** - Deleting from `object` automatically removes related records
- **Indexes** - Automatically created for optimal query performance

---

## Files in This Directory

- `schema.sql` - Complete database schema definition
- `db.ts` - Database connection and query functions
- `README.md` - This documentation file
