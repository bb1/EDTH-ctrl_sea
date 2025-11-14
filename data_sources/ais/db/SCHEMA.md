# AIS Database Schema Documentation

## Overview

This database schema stores AIS (Automatic Identification System) messages received from maritime vessels. The schema is designed for efficient querying and analysis of vessel position data, movement patterns, and communication management.

## Database Structure

The schema consists of **3 main tables** that work together to store and organize AIS data:

### 1. `ais_messages` - Main Message Archive

**Purpose:** Central table that stores all incoming AIS messages with basic metadata.

**Key Fields:**
- `id` - Unique identifier for each message
- `message_type` - Type of AIS message (e.g., "PositionReport", "DataLinkManagementMessage")
- `mmsi` - Maritime Mobile Service Identity (unique ship identifier)
- `ship_name` - Name of the vessel (if available)
- `latitude` / `longitude` - Geographic coordinates
- `time_utc` - When the message was received
- `created_at` - When the record was inserted into the database

**Use Case:** Complete archive of all AIS messages for historical tracking and auditing.

---

### 2. `position_reports` - Vessel Position Data

**Purpose:** Specialized table for fast queries on vessel positions and movement data.

**Key Fields:**
- `ais_message_id` - Links back to the main `ais_messages` table
- `mmsi` - Ship identifier
- `latitude` / `longitude` - Precise position coordinates
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
- `ais_message_id` - Links back to the main `ais_messages` table
- `mmsi` - Ship identifier
- `message_id` - Type of management message
- `repeat_indicator` - Message repeat status
- `user_id` - User/ship identifier
- `valid` - Whether the message is valid

**Use Case:** Tracking communication management and network coordination between AIS stations.

---

## Relationships

```
ais_messages (1) ──< (many) position_reports
ais_messages (1) ──< (many) data_link_management_messages
```

- Each message in `ais_messages` can have **one** corresponding record in `position_reports` (if it's a position report)
- Each message in `ais_messages` can have **one** corresponding record in `data_link_management_messages` (if it's a DLM message)
- Foreign keys ensure data integrity: if a message is deleted, related records are automatically removed (CASCADE)

---

## Performance Optimizations

### Indexes

The schema includes indexes on commonly queried fields for fast lookups:

**`ais_messages` indexes:**
- `mmsi` - Find all messages from a specific ship
- `time_utc` - Time-based queries and filtering
- `message_type` - Filter by message type
- `latitude, longitude` - Geographic searches
- `created_at` - Database insertion time queries

**`position_reports` indexes:**
- `mmsi` - Track a specific vessel's movements
- `time_utc` - Recent position queries
- `latitude, longitude` - Geographic bounding box searches
- `created_at` - Recent data queries

**`data_link_management_messages` indexes:**
- `mmsi` - Find DLM messages for a ship
- `time_utc` - Time-based filtering

### View: `recent_position_reports`

A pre-built view that automatically joins `position_reports` with `ais_messages` to show:
- All position data
- Ship names
- Only messages from the last 24 hours
- Sorted by most recent first

**Usage Example:**
```sql
SELECT * FROM recent_position_reports;
-- Automatically shows last 24 hours with ship names
```

---

## Data Flow

### How Data Gets Stored

1. **AIS message arrives** from the stream
2. **Insert into `ais_messages`** - Basic metadata stored
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
SELECT * FROM position_reports 
WHERE latitude BETWEEN 55.0 AND 56.0
  AND longitude BETWEEN 13.0 AND 14.0
  AND time_utc >= NOW() - INTERVAL '1 hour';
```

### Get recent position reports with ship names
```sql
SELECT * FROM recent_position_reports;
```

### Find all messages of a specific type
```sql
SELECT * FROM ais_messages 
WHERE message_type = 'PositionReport'
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

- **No JSONB fields** - All data is stored in structured columns for better performance
- **Automatic timestamps** - `created_at` is automatically set on insert
- **Cascade deletes** - Deleting from `ais_messages` automatically removes related records
- **Indexes** - Automatically created for optimal query performance

---

## Files in This Directory

- `schema.sql` - Complete database schema definition
- `db.ts` - Database connection and query functions
- `README.md` - This documentation file

