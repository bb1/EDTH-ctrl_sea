-- Submarine Internet Cables Database Schema
-- This schema stores information about underwater internet cable infrastructure

-- Main table for infrastructure (metadata only)
-- Originally named: submarine_cables
CREATE TABLE IF NOT EXISTS infrastructure (
    id BIGSERIAL PRIMARY KEY,
    cable_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(500) NOT NULL,
    color VARCHAR(7), -- Hex color code
    feature_id VARCHAR(255) NOT NULL,
    
    -- Representative point (from properties.coordinates)
    representative_longitude DOUBLE PRECISION,
    representative_latitude DOUBLE PRECISION,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for infrastructure segments (each LineString array from MultiLineString)
-- Originally named: submarine_cable_segments
CREATE TABLE IF NOT EXISTS infrastructure_segments (
    id BIGSERIAL PRIMARY KEY,
    cable_id BIGINT NOT NULL REFERENCES infrastructure(id) ON DELETE CASCADE,
    segment_index INTEGER NOT NULL, -- Order of the segment within the cable (0-based)
    
    -- Segment coordinates stored as JSONB (array of [lon, lat] pairs)
    -- Structure: [[lon, lat], [lon, lat], ...]
    coordinates JSONB NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique segment index per cable
    UNIQUE(cable_id, segment_index)
);

-- Indexes for infrastructure table
-- Originally for: submarine_cables
CREATE INDEX IF NOT EXISTS idx_infrastructure_cable_id ON infrastructure(cable_id);
CREATE INDEX IF NOT EXISTS idx_infrastructure_name ON infrastructure(name);
CREATE INDEX IF NOT EXISTS idx_infrastructure_feature_id ON infrastructure(feature_id);
CREATE INDEX IF NOT EXISTS idx_infrastructure_location ON infrastructure(representative_latitude, representative_longitude);
CREATE INDEX IF NOT EXISTS idx_infrastructure_created_at ON infrastructure(created_at);

-- Indexes for infrastructure_segments table
-- Originally for: submarine_cable_segments
CREATE INDEX IF NOT EXISTS idx_infrastructure_segments_cable_id ON infrastructure_segments(cable_id);
CREATE INDEX IF NOT EXISTS idx_infrastructure_segments_segment_index ON infrastructure_segments(cable_id, segment_index);
CREATE INDEX IF NOT EXISTS idx_infrastructure_segments_coordinates ON infrastructure_segments USING GIN (coordinates);

-- Table for individual line segments (start and end points)
-- Each segment is broken down into individual line segments
CREATE TABLE IF NOT EXISTS submarine_cable_line_segments (
    id BIGSERIAL PRIMARY KEY,
    segment_id BIGINT NOT NULL REFERENCES infrastructure_segments(id) ON DELETE CASCADE,
    line_index INTEGER NOT NULL, -- Order of the line within the segment (0-based)
    
    -- Start point of the line segment
    start_longitude DOUBLE PRECISION NOT NULL,
    start_latitude DOUBLE PRECISION NOT NULL,
    
    -- End point of the line segment
    end_longitude DOUBLE PRECISION NOT NULL,
    end_latitude DOUBLE PRECISION NOT NULL,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique line index per segment
    UNIQUE(segment_id, line_index)
);

-- Indexes for submarine_cable_line_segments table
CREATE INDEX IF NOT EXISTS idx_line_segments_segment_id ON submarine_cable_line_segments(segment_id);
CREATE INDEX IF NOT EXISTS idx_line_segments_line_index ON submarine_cable_line_segments(segment_id, line_index);
CREATE INDEX IF NOT EXISTS idx_line_segments_start_location ON submarine_cable_line_segments(start_latitude, start_longitude);
CREATE INDEX IF NOT EXISTS idx_line_segments_end_location ON submarine_cable_line_segments(end_latitude, end_longitude);

-- View for infrastructure with segment count
-- Originally named: submarine_cables_summary
CREATE OR REPLACE VIEW infrastructure_summary AS
SELECT 
    sc.id,
    sc.cable_id,
    sc.name,
    sc.color,
    sc.feature_id,
    sc.representative_longitude,
    sc.representative_latitude,
    COUNT(scs.id) as segment_count,
    sc.created_at
FROM infrastructure sc
LEFT JOIN infrastructure_segments scs ON sc.id = scs.cable_id
GROUP BY sc.id, sc.cable_id, sc.name, sc.color, sc.feature_id, 
         sc.representative_longitude, sc.representative_latitude, sc.created_at
ORDER BY sc.name;

