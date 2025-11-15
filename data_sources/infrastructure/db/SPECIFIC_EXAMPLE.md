# Specific Example: Line Segments Transformation

This document shows the exact transformation you requested.

## Your Example

### Original Segment Data (from `infrastructure_segments` table)
**Originally named:** `submarine_cable_segments`

```json
{
  "coordinates": [
    [104.00411055785635, 1.373499297000449],
    [104.36205904297623, 1.270050569926827],
    [103.7234429999998, 0.834217798173971]
  ]
}
```

**Note:** This segment has **3 coordinate points**.

---

## Transformed Line Segments (in `submarine_cable_line_segments` table)

### Line Segment 0

| Field | Value |
|-------|-------|
| `segment_id` | (ID of the segment above) |
| `line_index` | 0 |
| `start_longitude` | 104.00411055785635 |
| `start_latitude` | 1.373499297000449 |
| `end_longitude` | 104.36205904297623 |
| `end_latitude` | 1.270050569926827 |

**Represents:** `[104.00411055785635, 1.373499297000449] to [104.36205904297623, 1.270050569926827]`

---

### Line Segment 1

| Field | Value |
|-------|-------|
| `segment_id` | (ID of the segment above) |
| `line_index` | 1 |
| `start_longitude` | 104.36205904297623 |
| `start_latitude` | 1.270050569926827 |
| `end_longitude` | 103.7234429999998 |
| `end_latitude` | 0.834217798173971 |

**Represents:** `[104.36205904297623, 1.270050569926827] to [103.7234429999998, 0.834217798173971]`

---

## Summary

- **Input:** 3 coordinate points
- **Output:** 2 line segments
- **Formula:** N points = N-1 line segments

---

## Visual Representation

```
Original Segment:
Point A → Point B → Point C
[104.004, 1.373] → [104.362, 1.270] → [103.723, 0.834]

Transformed into:

Line Segment 0: Point A → Point B
[104.00411055785635, 1.373499297000449] to [104.36205904297623, 1.270050569926827]

Line Segment 1: Point B → Point C
[104.36205904297623, 1.270050569926827] to [103.7234429999998, 0.834217798173971]
```

---

## How to See This in Action

### Option 1: Run the example script
```bash
bun run show:line-segments-example
```

This will:
- Find a segment with 3 points (or any segment with line segments)
- Show the original coordinates
- Show the transformed line segments
- Verify the transformation is correct

### Option 2: Query the database directly

```sql
-- Get a segment with 3 points
SELECT 
  scs.id,
  scs.segment_index,
  scs.coordinates,
  sc.cable_id,
  sc.name
FROM infrastructure_segments scs
JOIN infrastructure sc ON scs.cable_id = sc.id
WHERE jsonb_array_length(scs.coordinates) = 3
LIMIT 1;

-- Get the line segments for that segment
SELECT 
  line_index,
  start_longitude,
  start_latitude,
  end_longitude,
  end_latitude
FROM submarine_cable_line_segments
WHERE segment_id = <segment_id_from_above>
ORDER BY line_index;
```

---

## Database Schema

### Table: `submarine_cable_line_segments`

```sql
CREATE TABLE submarine_cable_line_segments (
    id BIGSERIAL PRIMARY KEY,
    segment_id BIGINT NOT NULL REFERENCES infrastructure_segments(id), -- Originally: submarine_cable_segments(id)
    line_index INTEGER NOT NULL,
    start_longitude DOUBLE PRECISION NOT NULL,
    start_latitude DOUBLE PRECISION NOT NULL,
    end_longitude DOUBLE PRECISION NOT NULL,
    end_latitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(segment_id, line_index)
);
```

---

## Notes

- Each line segment connects two consecutive points from the original coordinate array
- The `line_index` preserves the order (0-based)
- The end point of one line segment is the start point of the next (for continuous segments)
- This structure makes it easy to:
  - Query individual line segments
  - Calculate distances between points
  - Render each line segment independently
  - Perform spatial analysis on individual segments

