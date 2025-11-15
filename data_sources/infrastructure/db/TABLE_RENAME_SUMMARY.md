# Table Rename Summary

This document summarizes the table renames that were performed.

## Renamed Tables

### 1. `submarine_cables` → `infrastructure`
- **New table name:** `infrastructure`
- **Original table name:** `submarine_cables`
- **Purpose:** Main table storing cable metadata

### 2. `submarine_cable_segments` → `infrastructure_segments`
- **New table name:** `infrastructure_segments`
- **Original table name:** `submarine_cable_segments`
- **Purpose:** Table storing individual segments for each cable

### 3. View: `submarine_cables_summary` → `infrastructure_summary`
- **New view name:** `infrastructure_summary`
- **Original view name:** `submarine_cables_summary`
- **Purpose:** Summary view with segment counts

## Updated Files

### Schema Files
- ✅ `schema.sql` - Updated table definitions, indexes, foreign keys, and view

### TypeScript Code Files
- ✅ `db.ts` - Updated all SQL queries and table references
- ✅ `import.ts` - No changes needed (uses functions from db.ts)
- ✅ `populate_line_segments.ts` - No changes needed (uses functions from db.ts)
- ✅ `show_example.ts` - Updated SQL queries
- ✅ `show_specific_example.ts` - Updated SQL queries

### Documentation Files
- ✅ `SCHEMA.md` - Updated table names with notes about original names
- ✅ `EXAMPLE_TRANSFORMATION.md` - Updated table references
- ✅ `LINE_SEGMENTS_EXAMPLE.md` - Updated table references
- ✅ `SPECIFIC_EXAMPLE.md` - Updated table references

## Index Names Updated

All indexes were renamed to match the new table names:

### Infrastructure Table Indexes
- `idx_submarine_cables_cable_id` → `idx_infrastructure_cable_id`
- `idx_submarine_cables_name` → `idx_infrastructure_name`
- `idx_submarine_cables_feature_id` → `idx_infrastructure_feature_id`
- `idx_submarine_cables_location` → `idx_infrastructure_location`
- `idx_submarine_cables_created_at` → `idx_infrastructure_created_at`

### Infrastructure Segments Table Indexes
- `idx_submarine_cable_segments_cable_id` → `idx_infrastructure_segments_cable_id`
- `idx_submarine_cable_segments_segment_index` → `idx_infrastructure_segments_segment_index`
- `idx_submarine_cable_segments_coordinates` → `idx_infrastructure_segments_coordinates`

## Foreign Key Relationships

Updated foreign key references:
- `infrastructure_segments.cable_id` → `infrastructure.id` (was: `submarine_cable_segments.cable_id` → `submarine_cables.id`)
- `submarine_cable_line_segments.segment_id` → `infrastructure_segments.id` (was: → `submarine_cable_segments.id`)

## Notes

- The table `submarine_cable_line_segments` was **NOT** renamed (as it was not requested)
- All documentation includes notes about the original table names for reference
- Comments in `schema.sql` indicate the original table names
- All SQL queries in code and documentation have been updated

## Migration Notes

If you have existing data in the old tables, you'll need to:

1. **Rename the tables** (if data exists):
   ```sql
   ALTER TABLE submarine_cables RENAME TO infrastructure;
   ALTER TABLE submarine_cable_segments RENAME TO infrastructure_segments;
   ```

2. **Rename the view**:
   ```sql
   DROP VIEW IF EXISTS submarine_cables_summary;
   -- The new view will be created by schema.sql
   ```

3. **Update indexes** (optional, for consistency):
   ```sql
   -- Drop old indexes and let schema.sql create new ones
   -- Or rename them manually
   ```

4. **Re-run schema initialization**:
   ```bash
   bun run import:cables
   ```
   This will create the new tables/views if they don't exist.

## Verification

To verify the changes, you can:

1. Check that tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('infrastructure', 'infrastructure_segments');
   ```

2. Check the view:
   ```sql
   SELECT * FROM infrastructure_summary LIMIT 5;
   ```

3. Run the example scripts:
   ```bash
   bun run show:line-segments-example
   ```

