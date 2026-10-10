-- =====================================================================
-- SMART LOCKER SYSTEM - POSTGRESQL DATABASE SCHEMA (DRAFT / PLACEHOLDER)
-- =====================================================================
-- NOTE: Table creation is on hold awaiting your specific schema definitions.
-- You can replace or paste your table schemas directly in this file.
--
-- Planned Table Hierarchy & Roadmap Entities:
--   1. companies (id, name, created_at)
--   2. cities (id, company_id, name, state, created_at)
--   3. branches (id, city_id, name, address, created_at)
--   4. wards (id, branch_id, name, floor, created_at)
--   5. lockers (id, ward_id, locker_number, status, pin_hash, last_heartbeat, battery_level)
--   6. employees (id, branch_id, email, password_hash, role, is_active, created_at)
--   7. locker_events (id, locker_id, event_type, details, created_at)
--      * Monthly partitioning recommended for scalability (pg_partman or date range).
-- =====================================================================

-- Example placeholder table definitions:
/*
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    city_id INT REFERENCES cities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    branch_id INT REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    floor VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lockers (
    id SERIAL PRIMARY KEY,
    ward_id INT REFERENCES wards(id) ON DELETE CASCADE,
    locker_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'available', -- 'available', 'occupied', 'unlocked', 'maintenance', 'offline'
    pin_hash VARCHAR(255),
    occupied_by VARCHAR(255),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'staff', -- 'super_admin', 'branch_admin', 'staff'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Partitioned table for high-throughput locker event audit logs
CREATE TABLE IF NOT EXISTS locker_events (
    id BIGSERIAL,
    locker_id INT NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- 'UNLOCK_COMMAND', 'DEVICE_ACK', 'HEARTBEAT', 'FAULT', 'MANUAL_OVERRIDE'
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
*/
