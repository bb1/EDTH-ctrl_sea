# Data Transformation Example

This document shows how a GeoJSON entry from the source file gets transformed into the database tables.

## Original GeoJSON Entry

```json
{
  "type": "Feature",
  "properties": {
    "id": "asia-united-gateway-east-aug-east",
    "name": "Asia United Gateway East (AUG East)",
    "color": "#939597",
    "feature_id": "asia-united-gateway-east-aug-east-0",
    "coordinates": [120.50661472537668, 21.13202484164407]
  },
  "geometry": {
    "type": "MultiLineString",
    "coordinates": [
      [
        [104.00411055785635, 1.373499297000449],
        [104.36205904297623, 1.270050569926827],
        [103.7234429999998, 0.834217798173971]
      ],
      [
        [104.36205904297623, 1.270050569926827],
        [104.87449000000015, 1.892657008485546],
        [105.01938569859679, 2.694535330212616],
        // ... many more coordinates ...
        [140.00231880638776, 35.01763482425761]
      ],
      [
        [126.73662929999966, 35.96767720000027],
        [125.87119947589126, 35.24748606079355],
        [125.29998547165854, 34.21298798248237],
        [127.09744513582127, 30.889576581749527],
        [128.20623341284528, 29.582151688140414]
      ],
      [
        [121.81483169057424, 24.644044899818205],
        [122.54589674250994, 23.362789999999872]
      ],
      [
        [120.88977859589048, 22.340450000000153],
        [121.56833222233168, 21.924689276263475]
      ],
      [
        [118.5558265055181, 16.917522794116454],
        [120.35483897484683, 16.830716773770945]
      ],
      [
        [104.11414047991015, 1.925884465105483],
        [104.87449000000015, 1.892657008485546]
      ],
      [
        [111.39672165701015, 6.171501577529976],
        [113.00481498190783, 5.487590881986131],
        [114.23759482610686, 4.588647828574142]
      ]
    ]
  }
}
```

**Note:** This cable has **8 segments** (8 separate LineString arrays in the MultiLineString).

---

## Transformed Database Records

### Table 1: `infrastructure` (Metadata Only)
**Originally named:** `submarine_cables`

**Single row** containing the cable metadata:

| id | cable_id | name | color | feature_id | representative_longitude | representative_latitude | created_at | updated_at |
|----|----------|------|-------|------------|-------------------------|-------------------------|------------|------------|
| 1 | asia-united-gateway-east-aug-east | Asia United Gateway East (AUG East) | #939597 | asia-united-gateway-east-aug-east-0 | 120.50661472537668 | 21.13202484164407 | 2024-01-15 10:30:00+00 | 2024-01-15 10:30:00+00 |

---

### Table 2: `infrastructure_segments` (All Segments)
**Originally named:** `submarine_cable_segments`

**8 rows** - one for each segment in the MultiLineString:

#### Segment 0 (First LineString)
| id | cable_id | segment_index | coordinates | created_at |
|----|----------|---------------|-------------|------------|
| 1 | 1 | 0 | `[[104.00411055785635, 1.373499297000449], [104.36205904297623, 1.270050569926827], [103.7234429999998, 0.834217798173971]]` | 2024-01-15 10:30:00+00 |

#### Segment 1 (Second LineString - Main Trunk)
| id | cable_id | segment_index | coordinates | created_at |
|----|----------|---------------|-------------|------------|
| 2 | 1 | 1 | `[[104.36205904297623, 1.270050569926827], [104.87449000000015, 1.892657008485546], [105.01938569859679, 2.694535330212616], ..., [140.00231880638776, 35.01763482425761]]` | 2024-01-15 10:30:00+00 |

#### Segment 2 (Third LineString - Branch)
| id | cable_id | segment_index | coordinates | created_at |
|----|----------|---------------|-------------|------------|
| 3 | 1 | 2 | `[[126.73662929999966, 35.96767720000027], [125.87119947589126, 35.24748606079355], [125.29998547165854, 34.21298798248237], [127.09744513582127, 30.889576581749527], [128.20623341284528, 29.582151688140414]]` | 2024-01-15 10:30:00+00 |

#### Segment 3 (Fourth LineString - Branch)
| id | cable_id | segment_index | coordinates | created_at |
|----|----------|---------------|-------------|------------|
| 4 | 1 | 3 | `[[121.81483169057424, 24.644044899818205], [122.54589674250994, 23.362789999999872]]` | 2024-01-15 10:30:00+00 |

#### Segment 4 (Fifth LineString - Branch)
| id | cable_id | segment_index | coordinates | created_at |
|----|----------|---------------|-------------|------------|
| 5 | 1 | 4 | `[[120.88977859589048, 22.340450000000153], [121.56833222233168, 21.924689276263475]]` | 2024-01-15 10:30:00+00 |

#### Segment 5 (Sixth LineString - Branch)
| id | cable_id | segment_index | coordinates | created_at |
|----|----------|---------------|-------------|------------|
| 6 | 1 | 5 | `[[118.5558265055181, 16.917522794116454], [120.35483897484683, 16.830716773770945]]` | 2024-01-15 10:30:00+00 |

#### Segment 6 (Seventh LineString - Branch)
| id | cable_id | segment_index | coordinates | created_at |
|----|----------|---------------|-------------|------------|
| 7 | 1 | 6 | `[[104.11414047991015, 1.925884465105483], [104.87449000000015, 1.892657008485546]]` | 2024-01-15 10:30:00+00 |

#### Segment 7 (Eighth LineString - Branch)
| id | cable_id | segment_index | coordinates | created_at |
|----|----------|---------------|-------------|------------|
| 8 | 1 | 7 | `[[111.39672165701015, 6.171501577529976], [113.00481498190783, 5.487590881986131], [114.23759482610686, 4.588647828574142]]` | 2024-01-15 10:30:00+00 |

---

## Key Points

1. **One cable → One row** in `infrastructure` table (originally `submarine_cables`)
2. **Multiple segments → Multiple rows** in `infrastructure_segments` table (originally `submarine_cable_segments`)
3. **Foreign key relationship**: `infrastructure_segments.cable_id` → `infrastructure.id`
4. **Segment ordering**: `segment_index` preserves the original order (0-based)
5. **Coordinates stored as JSONB**: Each segment's coordinates are stored as a JSONB array of `[lon, lat]` pairs

---

## Query Example

To reconstruct the full cable with all segments:

```sql
SELECT 
  sc.id,
  sc.cable_id,
  sc.name,
  sc.color,
  json_agg(
    json_build_object(
      'segment_index', scs.segment_index,
      'coordinates', scs.coordinates
    ) ORDER BY scs.segment_index
  ) as segments
FROM infrastructure sc
JOIN infrastructure_segments scs ON sc.id = scs.cable_id
WHERE sc.cable_id = 'asia-united-gateway-east-aug-east'
GROUP BY sc.id, sc.cable_id, sc.name, sc.color;
```

This will return the cable metadata with all segments in order, reconstructing the original MultiLineString structure.

