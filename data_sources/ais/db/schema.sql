-- AIS Messages Database Schema
-- This schema stores AIS messages received from the stream

-- Main table for all AIS messages
CREATE TABLE IF NOT EXISTS ais_messages (
    id BIGSERIAL PRIMARY KEY,
    message_type VARCHAR(50) NOT NULL,
    mmsi BIGINT NOT NULL,
    ship_name VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    time_utc TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ais_messages_mmsi ON ais_messages(mmsi);
CREATE INDEX IF NOT EXISTS idx_ais_messages_time_utc ON ais_messages(time_utc);
CREATE INDEX IF NOT EXISTS idx_ais_messages_message_type ON ais_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_ais_messages_location ON ais_messages(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_ais_messages_created_at ON ais_messages(created_at);

-- Table for position reports (most common message type)
-- This provides fast access to position data without parsing JSON
CREATE TABLE IF NOT EXISTS position_reports (
    id BIGSERIAL PRIMARY KEY,
    ais_message_id BIGINT REFERENCES ais_messages(id) ON DELETE CASCADE,
    mmsi BIGINT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
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
CREATE INDEX IF NOT EXISTS idx_position_reports_location ON position_reports(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_position_reports_created_at ON position_reports(created_at);

-- Table for data link management messages
CREATE TABLE IF NOT EXISTS data_link_management_messages (
    id BIGSERIAL PRIMARY KEY,
    ais_message_id BIGINT REFERENCES ais_messages(id) ON DELETE CASCADE,
    mmsi BIGINT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
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
CREATE INDEX IF NOT EXISTS idx_dlm_messages_created_at ON data_link_management_messages(created_at);

-- View for recent position reports (last 24 hours)
CREATE OR REPLACE VIEW recent_position_reports AS
SELECT 
    pr.*,
    am.ship_name
FROM position_reports pr
JOIN ais_messages am ON pr.ais_message_id = am.id
WHERE pr.time_utc >= NOW() - INTERVAL '24 hours'
ORDER BY pr.time_utc DESC;

-- Note: Data extraction is now handled in application code (db.ts)
-- instead of database triggers, since JSONB fields have been removed

