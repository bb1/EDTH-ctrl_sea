# AIS Database Schema Documentation

## Overview

This database schema stores AIS (Automatic Identification System) messages received from maritime vessels. The schema is designed for efficient querying and analysis of vessel position data, movement patterns, and communication management.

## Database Structure

The schema consists of **3 main tables** that work together to store and organize AIS data:

### 1. `object` - Main Object Archive

**Purpose:** Central table that stores all incoming AIS object metadata. Each record represents the object that emitted the message.

**Key Fields:**
- `id` - UUID identifier for each object message
- `type` - Type of AIS object/message (e.g., "PositionReport", "DataLinkManagementMessage")
- `mmsi` - Maritime Mobile Service Identity (unique ship identifier)
- `object_name` - Name of the vessel/object (if available)
- `time_utc` - When the message was received
- `created_at` - When the record was inserted into the database

**Use Case:** Complete archive of all AIS messages for historical tracking and auditing.

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

### 3. `data_link_management_messages` - Communication Management

**Purpose:** Stores data link management messages that control AIS communication parameters.

**Key Fields:**
- `object_id` - Links back to the main `object` table
- `mmsi` - Ship identifier
- `location` - Optional PostGIS point geometry when position metadata is available
- `message_id` - Type of management message
- `repeat_indicator` - Message repeat status
- `user_id` - User/ship identifier
- `valid` - Whether the message is valid

**Use Case:** Tracking communication management and network coordination between AIS stations.

---

## Relationships

```
object (1) ──< (many) position_reports
object (1) ──< (many) data_link_management_messages
```

- Each message in `object` can have **one** corresponding record in `position_reports` (if it's a position report)
- Each message in `object` can have **one** corresponding record in `data_link_management_messages` (if it's a DLM message)
- Foreign keys ensure data integrity: if an object is deleted, related records are automatically removed (CASCADE)

---

## Performance Optimizations

### Indexes

The schema includes indexes on commonly queried fields for fast lookups:

**`object` indexes:**
- `mmsi` - Find all messages from a specific ship
- `time_utc` - Time-based queries and filtering
- `type` - Filter by message type
- `created_at` - Database insertion time queries

**`position_reports` indexes:**
- `mmsi` - Track a specific vessel's movements
- `time_utc` - Recent position queries
- `location` (GIST) - Spatial searches and bounding box queries
- `created_at` - Recent data queries

**`data_link_management_messages` indexes:**
- `mmsi` - Find DLM messages for a ship
- `time_utc` - Time-based filtering
- `location` (GIST) - Optional spatial lookups when geometry exists

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
2. **Insert into `object`** - Basic metadata stored
3. **Application code extracts data** based on message type:
   - If `PositionReport` → Insert into `position_reports` table
   - If `DataLinkManagementMessage` → Insert into `data_link_management_messages` table

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

### Find all objects of a specific type
```sql
SELECT * FROM object 
WHERE type = 'PositionReport'
ORDER BY time_utc DESC;
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
