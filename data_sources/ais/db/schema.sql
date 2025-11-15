-- AIS Messages Database Schema
-- This schema stores AIS messages received from the stream

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable PostGIS for geometry support
CREATE EXTENSION IF NOT EXISTS postgis;

-- Main table for all AIS messages
CREATE TABLE IF NOT EXISTS object (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    mmsi BIGINT NOT NULL,
    object_name VARCHAR(255),
    time_utc TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_object_mmsi ON object(mmsi);
CREATE INDEX IF NOT EXISTS idx_object_time_utc ON object(time_utc);
CREATE INDEX IF NOT EXISTS idx_object_type ON object(type);
CREATE INDEX IF NOT EXISTS idx_object_created_at ON object(created_at);

-- Table for position reports (most common message type)
-- This provides fast access to position data without parsing JSON
CREATE TABLE IF NOT EXISTS position_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    object_id UUID REFERENCES object(id) ON DELETE CASCADE,
    mmsi BIGINT NOT NULL,
    location geometry(Point, 4326) NOT NULL,
    time_utc TIMESTAMPTZ NOT NULL,
    
    -- Position report specific fields
    cog DOUBLE PRECISION, -- Course over ground (degrees)
    sog DOUBLE PRECISION, -- Speed over ground (knots)
    true_heading INTEGER, -- True heading (degrees)
    navigational_status INTEGER,
    rate_of_turn INTEGER,
    position_accuracy BOOLEAN,
    raim BOOLEAN, -- Receiver autonomous integrity monitoring
    special_manoeuvre_indicator INTEGER,
    timestamp INTEGER, -- AIS timestamp
    communication_state INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for position reports
CREATE INDEX IF NOT EXISTS idx_position_reports_mmsi ON position_reports(mmsi);
CREATE INDEX IF NOT EXISTS idx_position_reports_time_utc ON position_reports(time_utc);
CREATE INDEX IF NOT EXISTS idx_position_reports_location ON position_reports USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_position_reports_created_at ON position_reports(created_at);

-- Table for data link management messages
CREATE TABLE IF NOT EXISTS data_link_management_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    object_id UUID REFERENCES object(id) ON DELETE CASCADE,
    mmsi BIGINT NOT NULL,
    location geometry(Point, 4326),
    time_utc TIMESTAMPTZ NOT NULL,
    
    -- Data link management specific fields
    message_id INTEGER,
    repeat_indicator INTEGER,
    spare INTEGER,
    user_id BIGINT,
    valid BOOLEAN,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for data link management messages
CREATE INDEX IF NOT EXISTS idx_dlm_messages_mmsi ON data_link_management_messages(mmsi);
CREATE INDEX IF NOT EXISTS idx_dlm_messages_time_utc ON data_link_management_messages(time_utc);
CREATE INDEX IF NOT EXISTS idx_dlm_messages_location ON data_link_management_messages USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_dlm_messages_created_at ON data_link_management_messages(created_at);

-- View for recent position reports (last 24 hours)
CREATE OR REPLACE VIEW recent_position_reports AS
SELECT 
    pr.*,
    o.object_name
FROM position_reports pr
JOIN object o ON pr.object_id = o.id
WHERE pr.time_utc >= NOW() - INTERVAL '24 hours'
ORDER BY pr.time_utc DESC;

-- Note: Data extraction is now handled in application code (db.ts)
-- instead of database triggers, since JSONB fields have been removed
