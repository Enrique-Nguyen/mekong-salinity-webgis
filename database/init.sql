-- PostgreSQL Database Initialization Script for Mekong Salinity Monitoring System
-- Requires PostgreSQL 12+ with PostGIS extension

-- Enable PostGIS extension for spatial data support
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indexes for users table
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================================
-- UPLOADS TABLE
-- ============================================================================
CREATE TABLE uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('csv', 'xlsx')),
    file_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cleared')),
    total_rows INTEGER DEFAULT 0,
    valid_rows INTEGER DEFAULT 0,
    invalid_rows INTEGER DEFAULT 0
);

-- Indexes for uploads table
CREATE INDEX idx_uploads_user_id ON uploads(user_id);
CREATE INDEX idx_uploads_status ON uploads(status);
CREATE INDEX idx_uploads_uploaded_at ON uploads(uploaded_at);

-- ============================================================================
-- SALINITY_OBSERVATIONS TABLE
-- ============================================================================
CREATE TABLE salinity_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
    station_id VARCHAR(50) NOT NULL,
    station_name VARCHAR(255),
    measured_at TIMESTAMPTZ NOT NULL,
    salinity DECIMAL(6,2) NOT NULL CHECK (salinity >= 0),
    ph DECIMAL(4,2) CHECK (ph >= 0 AND ph <= 14),
    dissolved_oxygen DECIMAL(5,2) CHECK (dissolved_oxygen >= 0),
    temperature DECIMAL(4,1) CHECK (temperature >= -10 AND temperature <= 50),
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    geom GEOMETRY(POINT, 4326)
);

-- Indexes for salinity_observations table
CREATE INDEX idx_salinity_measured_at ON salinity_observations(measured_at);
CREATE INDEX idx_salinity_station_id ON salinity_observations(station_id);
CREATE INDEX idx_salinity_upload_id ON salinity_observations(upload_id);
CREATE INDEX idx_salinity_geom ON salinity_observations USING GIST(geom);

-- ============================================================================
-- TRIGGER FUNCTION: Auto-create geometry from lat/lon
-- ============================================================================
CREATE OR REPLACE FUNCTION update_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to salinity_observations table
CREATE TRIGGER set_geom
BEFORE INSERT OR UPDATE ON salinity_observations
FOR EACH ROW EXECUTE FUNCTION update_geom();

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================
COMMENT ON TABLE users IS 'User accounts with role-based access control';
COMMENT ON TABLE uploads IS 'Track uploaded CSV/Excel files and processing status';
COMMENT ON TABLE salinity_observations IS 'Salinity measurements with spatial data (WGS84/EPSG:4326)';
COMMENT ON COLUMN salinity_observations.geom IS 'Auto-generated from latitude/longitude via trigger';
COMMENT ON COLUMN salinity_observations.measured_at IS 'Timestamp in UTC';
