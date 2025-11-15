# Line Segments Transformation Example

This document shows how segments are broken down into individual line segments with start and end points.

## Original Segment Data

A segment in `infrastructure_segments` table (originally `submarine_cable_segments`) contains an array of coordinates:

```json
{
  "id": 1,
  "segment_id": 1,
  "segment_index": 0,
  "coordinates": [
    [104.00411055785635, 1.373499297000449],
    [104.36205904297623, 1.270050569926827],
    [103.7234429999998, 0.834217798173971]
  ]
}
```

**Note:** This segment has 3 coordinate points.

---

## Transformed Line Segments

The segment is broken down into **2 line segments** (N points = N-1 line segments):

### Line Segment 0
| id | segment_id | line_index | start_longitude | start_latitude | end_longitude | end_latitude |
|----|------------|------------|-----------------|----------------|---------------|--------------|
| 1 | 1 | 0 | 104.00411055785635 | 1.373499297000449 | 104.36205904297623 | 1.270050569926827 |

**Represents:** `[104.00411055785635, 1.373499297000449] → [104.36205904297623, 1.270050569926827]`

### Line Segment 1
| id | segment_id | line_index | start_longitude | start_latitude | end_longitude | end_latitude |
|----|------------|------------|-----------------|----------------|---------------|--------------|
| 2 | 1 | 1 | 104.36205904297623 | 1.270050569926827 | 103.7234429999998 | 0.834217798173971 |

**Represents:** `[104.36205904297623, 1.270050569926827] → [103.7234429999998, 0.834217798173971]`

---

## Transformation Logic

For a segment with coordinates `[A, B, C, D]`:
- Creates 3 line segments:
  1. `A → B` (line_index: 0)
  2. `B → C` (line_index: 1)
  3. `C → D` (line_index: 2)

**Formula:** N coordinate points = N-1 line segments

---

## Example with More Points

### Original Segment (28 points)
```json
{
  "segment_index": 1,
  "coordinates": [
    [104.36205904297623, 1.270050569926827],
    [104.87449000000015, 1.892657008485546],
    [105.01938569859679, 2.694535330212616],
    // ... 25 more points ...
    [140.00231880638776, 35.01763482425761]
  ]
}
```

### Result: 27 Line Segments

- **Line 0:** `[104.362059, 1.270051] → [104.874490, 1.892657]`
- **Line 1:** `[104.874490, 1.892657] → [105.019386, 2.694535]`
- **Line 2:** `[105.019386, 2.694535] → [next point]`
- ...
- **Line 26:** `[previous point] → [140.002319, 35.017635]`

---

## Database Structure

### Table: `submarine_cable_line_segments`

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `segment_id` | BIGINT | Foreign key to `infrastructure_segments.id` (originally `submarine_cable_segments.id`) |
| `line_index` | INTEGER | Order of line within segment (0-based) |
| `start_longitude` | DOUBLE PRECISION | Start point longitude |
| `start_latitude` | DOUBLE PRECISION | Start point latitude |
| `end_longitude` | DOUBLE PRECISION | End point longitude |
| `end_latitude` | DOUBLE PRECISION | End point latitude |
| `created_at` | TIMESTAMPTZ | Creation timestamp |

### Relationships

```
infrastructure (1) ──< (many) infrastructure_segments (1) ──< (many) submarine_cable_line_segments
(Originally: submarine_cables → submarine_cable_segments)
```

---

## Query Examples

### Get all line segments for a segment
```sql
SELECT * FROM submarine_cable_line_segments
WHERE segment_id = 1
ORDER BY line_index;
```

### Get all line segments for a cable
```sql
SELECT 
  scls.*,
  scs.segment_index,
  sc.cable_id,
  sc.name as cable_name
FROM submarine_cable_line_segments scls
JOIN infrastructure_segments scs ON scls.segment_id = scs.id
JOIN infrastructure sc ON scs.cable_id = sc.id
WHERE sc.cable_id = 'asia-united-gateway-east-aug-east'
ORDER BY scs.segment_index, scls.line_index;
```

### Count line segments per segment
```sql
SELECT 
  scs.id,
  scs.segment_index,
  COUNT(scls.id) as line_count
FROM infrastructure_segments scs
LEFT JOIN submarine_cable_line_segments scls ON scs.id = scls.segment_id
GROUP BY scs.id, scs.segment_index
ORDER BY scs.segment_index;
```

---

## Usage

### Automatic Population (during import)
When importing cables, line segments are automatically created:
```bash
bun run import:cables
```

### Manual Population (for existing data)
If you need to populate line segments for existing segments:
```bash
bun run populate:line-segments
```

---

## Benefits

1. **Simplified Queries**: Easy to query individual line segments
2. **Spatial Analysis**: Can calculate distances, bearings, etc. for each line
3. **Visualization**: Each line segment can be rendered independently
4. **Indexing**: Start/end points are indexed for fast spatial queries
5. **Flexibility**: Can filter, aggregate, or analyze specific line segments

