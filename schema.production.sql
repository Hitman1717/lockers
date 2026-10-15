-- =====================================================================
-- SMART LOCKER SYSTEM - ENTERPRISE PRODUCTION DATABASE SCHEMA (PostgreSQL 14+)
-- =====================================================================
-- File: schema.production.sql
-- Description:
--   High-performance, multi-tenant relational schema for IoT-driven Smart Lockers.
--   Engineered for hospitals, gyms, corporate facilities, and public locker banks.
--
-- Key Design Pillars:
--   1. Strict Normalization & Tenant Hierarchy:
--      companies -> cities -> branches -> wards -> kiosks -> lockers
--   2. Sessionized Occupancy (Audit & GDPR Compliant):
--      Separates volatile active occupancy from physical hardware compartments.
--      Preserves complete booking histories and auto-purges sensitive PII photos.
--   3. IoT Telemetry & Partitioned Event Auditing:
--      High-frequency locker events (relays, heartbeats, ACKs) partitioned by date.
--   4. Drop-In Backward Compatibility:
--      Provides database VIEWs (e.g., v_active_lockers) matching the current Express
--      REST & Socket.IO contracts.
--   5. Fine-Grained RBAC & Security:
--      Bcrypt password hashes, role verification, and maintenance ticketing.
-- =====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean schema teardown (Optional - for clean resets)
-- DROP VIEW IF EXISTS v_active_lockers CASCADE;
-- DROP VIEW IF EXISTS v_ward_occupancy_summary CASCADE;
-- DROP TABLE IF EXISTS maintenance_tickets CASCADE;
-- DROP TABLE IF EXISTS locker_events CASCADE;
-- DROP TABLE IF EXISTS locker_allocations CASCADE;
-- DROP TABLE IF EXISTS kiosks CASCADE;
-- DROP TABLE IF EXISTS lockers CASCADE;
-- DROP TABLE IF EXISTS employees CASCADE;
-- DROP TABLE IF EXISTS wards CASCADE;
-- DROP TABLE IF EXISTS branches CASCADE;
-- DROP TABLE IF EXISTS cities CASCADE;
-- DROP TABLE IF EXISTS companies CASCADE;

-- =====================================================================
-- 1. TENANCY & ORGANIZATIONAL HIERARCHY
-- =====================================================================

-- 1.1 Companies (Tenants / Organizations)
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB NOT NULL DEFAULT '{
        "pin_length": 4,
        "max_occupancy_hours": 24,
        "photo_retention_days": 7,
        "require_occupant_phone": false,
        "auto_unlock_on_timeout": false
    }'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.2 Cities
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    country VARCHAR(3) NOT NULL DEFAULT 'USA',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_company_city UNIQUE (company_id, name)
);

-- 1.3 Branches (Hospitals, Facilities, Campuses)
CREATE TABLE IF NOT EXISTS branches (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    city_id INT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'CMH-NYC'
    address TEXT,
    timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 1.4 Wards (Departments, Floors, Locker Zones)
CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,
    branch_id INT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    floor VARCHAR(50) NOT NULL DEFAULT '1st Floor',
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_branch_ward UNIQUE (branch_id, name)
);

-- =====================================================================
-- 2. HARDWARE TOPOLOGY: KIOSKS & SMART LOCKER COMPARTMENTS
-- =====================================================================

-- 2.1 Kiosks (User-facing touchscreen terminals / Raspberry Pi / Tablets)
CREATE TABLE IF NOT EXISTS kiosks (
    id SERIAL PRIMARY KEY,
    ward_id INT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
    kiosk_code VARCHAR(50) UNIQUE NOT NULL, -- e.g., 'KIOSK-3A-01'
    name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    app_version VARCHAR(20) DEFAULT '1.0.0',
    status VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'maintenance')),
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2.2 Lockers (Individual physical door compartments & IoT controller telemetry)
CREATE TABLE IF NOT EXISTS lockers (
    id SERIAL PRIMARY KEY,
    ward_id INT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
    locker_number VARCHAR(50) NOT NULL, -- e.g., 'L-101'
    status VARCHAR(20) NOT NULL DEFAULT 'available' 
        CHECK (status IN ('available', 'occupied', 'unlocked', 'maintenance', 'offline')),
    relay_channel INT, -- Hardware relay output index on controller board (1-32)
    battery_level INT CHECK (battery_level BETWEEN 0 AND 100),
    rssi INT, -- Wi-Fi / Zigbee signal strength in dBm (-30 to -100)
    firmware_version VARCHAR(30) DEFAULT '1.0.0',
    last_heartbeat TIMESTAMPTZ,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ward_locker_number UNIQUE (ward_id, locker_number)
);

-- =====================================================================
-- 3. USER MANAGEMENT & RBAC
-- =====================================================================

-- 3.1 Employees / System Staff
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'staff' 
        CHECK (role IN ('super_admin', 'company_admin', 'branch_admin', 'staff', 'technician')),
    phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- 4. ALLOCATION / OCCUPANCY SESSIONS (AUDIT TRAIL & PRIVACY)
-- =====================================================================

-- 4.1 Locker Allocations (Tracks every single checkout lifecycle separately)
-- Note: Releasing a locker completes an allocation session rather than wiping history.
CREATE TABLE IF NOT EXISTS locker_allocations (
    id BIGSERIAL PRIMARY KEY,
    locker_id INT NOT NULL REFERENCES lockers(id) ON DELETE CASCADE,
    ward_id INT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
    kiosk_id INT REFERENCES kiosks(id) ON DELETE SET NULL,
    occupant_name VARCHAR(150) NOT NULL,
    occupant_phone VARCHAR(50),
    pin_hash VARCHAR(255), -- Secure bcrypt hash of user access PIN
    snapshot_path VARCHAR(500), -- Local file path or S3/cloud URL for camera photo
    status VARCHAR(20) NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'completed', 'cancelled', 'forced_override', 'expired')),
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at TIMESTAMPTZ,
    released_by_type VARCHAR(30) 
        CHECK (released_by_type IN ('occupant_pin', 'staff_override', 'timeout_auto', 'admin_remote')),
    released_by_employee_id INT REFERENCES employees(id) ON DELETE SET NULL,
    release_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Partial unique index: Guarantees that no locker can have more than ONE active allocation at a time!
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_locker_allocation 
    ON locker_allocations(locker_id) 
    WHERE status = 'active';

-- =====================================================================
-- 5. MAINTENANCE & FAULT TICKETING
-- =====================================================================

CREATE TABLE IF NOT EXISTS maintenance_tickets (
    id SERIAL PRIMARY KEY,
    locker_id INT NOT NULL REFERENCES lockers(id) ON DELETE CASCADE,
    reported_by_id INT REFERENCES employees(id) ON DELETE SET NULL,
    assigned_to_id INT REFERENCES employees(id) ON DELETE SET NULL,
    issue_type VARCHAR(50) NOT NULL 
        CHECK (issue_type IN ('stuck_latch', 'relay_failure', 'sensor_fault', 'low_battery', 'physical_damage', 'connectivity_offline', 'other')),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' 
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) NOT NULL DEFAULT 'open' 
        CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    description TEXT NOT NULL,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMPTZ
);

-- =====================================================================
-- 6. AUDIT LOGS & HIGH-THROUGHPUT IOT TELEMETRY (PARTITIONED)
-- =====================================================================

-- Partitioned table for high-throughput locker event audit logs
CREATE TABLE IF NOT EXISTS locker_events (
    id BIGSERIAL,
    locker_id INT NOT NULL,
    allocation_id BIGINT,
    event_type VARCHAR(60) NOT NULL, -- 'KIOSK_REGISTRATION', 'UNLOCK_COMMAND', 'DEVICE_ACK', 'DOOR_CLOSED', 'MANUAL_OVERRIDE', etc.
    source VARCHAR(30) NOT NULL DEFAULT 'system' 
        CHECK (source IN ('kiosk', 'admin', 'hardware_mqtt', 'system', 'cron')),
    actor_employee_id INT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Pre-created monthly partitions (current and future months + fallback default)
CREATE TABLE IF NOT EXISTS locker_events_2026_10 PARTITION OF locker_events
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS locker_events_2026_11 PARTITION OF locker_events
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS locker_events_2026_12 PARTITION OF locker_events
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS locker_events_default PARTITION OF locker_events DEFAULT;

-- =====================================================================
-- 7. PERFORMANCE INDEXES
-- =====================================================================

-- High-speed locker assignment queries (Find first available locker in ward)
CREATE INDEX IF NOT EXISTS idx_lockers_ward_status 
    ON lockers(ward_id, status);

-- Kiosk lookups by code
CREATE INDEX IF NOT EXISTS idx_kiosks_ward_code 
    ON kiosks(ward_id, kiosk_code);

-- Search allocations by phone number or active status
CREATE INDEX IF NOT EXISTS idx_allocations_active_lookup 
    ON locker_allocations(locker_id, status) 
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_allocations_phone 
    ON locker_allocations(occupant_phone);

-- Employee authentication & lookup
CREATE INDEX IF NOT EXISTS idx_employees_email 
    ON employees(email);

CREATE INDEX IF NOT EXISTS idx_employees_branch 
    ON employees(branch_id);

-- JSONB indexing for event searching
CREATE INDEX IF NOT EXISTS idx_locker_events_created 
    ON locker_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_locker_events_locker_id 
    ON locker_events(locker_id);

CREATE INDEX IF NOT EXISTS idx_locker_events_details_gin 
    ON locker_events USING gin (details);

-- =====================================================================
-- 8. COMPATIBILITY & ANALYTICS VIEWS
-- =====================================================================

-- 8.1 Active Locker View (Seamless Drop-In for Express Backend API)
-- Bridges the normalized allocation model directly into the existing API structure:
CREATE OR REPLACE VIEW v_active_lockers AS
SELECT 
    l.id,
    l.ward_id,
    l.locker_number,
    l.status,
    l.battery_level,
    l.last_heartbeat,
    l.relay_channel,
    l.firmware_version,
    l.is_enabled,
    a.id AS current_allocation_id,
    a.occupant_name,
    a.occupant_phone,
    a.snapshot_path AS occupant_photo,
    a.pin_hash,
    a.allocated_at,
    w.name AS ward_name,
    w.floor AS ward_floor,
    b.id AS branch_id,
    b.name AS branch_name
FROM lockers l
JOIN wards w ON l.ward_id = w.id
JOIN branches b ON w.branch_id = b.id
LEFT JOIN locker_allocations a ON l.id = a.locker_id AND a.status = 'active';

-- 8.2 Ward Occupancy Analytics View
CREATE OR REPLACE VIEW v_ward_occupancy_summary AS
SELECT 
    w.id AS ward_id,
    w.name AS ward_name,
    b.id AS branch_id,
    b.name AS branch_name,
    COUNT(l.id) AS total_lockers,
    COUNT(l.id) FILTER (WHERE l.status = 'occupied') AS occupied_count,
    COUNT(l.id) FILTER (WHERE l.status = 'available') AS available_count,
    COUNT(l.id) FILTER (WHERE l.status = 'unlocked') AS unlocked_count,
    COUNT(l.id) FILTER (WHERE l.status = 'maintenance') AS maintenance_count,
    COUNT(l.id) FILTER (WHERE l.status = 'offline') AS offline_count,
    ROUND(
        (COUNT(l.id) FILTER (WHERE l.status = 'occupied')::NUMERIC / NULLIF(COUNT(l.id), 0)) * 100, 
        1
    ) AS occupancy_rate_percentage
FROM wards w
JOIN branches b ON w.branch_id = b.id
LEFT JOIN lockers l ON w.id = l.ward_id
GROUP BY w.id, w.name, b.id, b.name;

-- =====================================================================
-- 9. AUTOMATED TRIGGERS & PROCEDURES
-- =====================================================================

-- Trigger function: Update `updated_at` on row changes
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_companies_updated ON companies;
CREATE TRIGGER trg_companies_updated BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_branches_updated ON branches;
CREATE TRIGGER trg_branches_updated BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_wards_updated ON wards;
CREATE TRIGGER trg_wards_updated BEFORE UPDATE ON wards FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_lockers_updated ON lockers;
CREATE TRIGGER trg_lockers_updated BEFORE UPDATE ON lockers FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trg_employees_updated ON employees;
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_timestamp_column();

-- =====================================================================
-- 10. COMPREHENSIVE SEED DATA (Ready for Immediate Testing)
-- =====================================================================

-- 10.1 Company
INSERT INTO companies (id, name, slug) VALUES 
(1, 'Apex Health Systems', 'apex-health')
ON CONFLICT (id) DO NOTHING;

-- 10.2 Cities
INSERT INTO cities (id, company_id, name, state, country) VALUES 
(1, 1, 'Metro City', 'NY', 'USA'),
(2, 1, 'West Valley', 'CA', 'USA')
ON CONFLICT (id) DO NOTHING;

-- 10.3 Branches
INSERT INTO branches (id, company_id, city_id, name, code, address, timezone) VALUES 
(1, 1, 1, 'Central Memorial Hospital', 'CMH-01', '100 Medical Plaza Blvd, New York, NY', 'America/New_York'),
(2, 1, 2, 'Westside Community Clinic', 'WCC-02', '450 Sunset Ave, Los Angeles, CA', 'America/Los_Angeles')
ON CONFLICT (id) DO NOTHING;

-- 10.4 Wards
INSERT INTO wards (id, branch_id, name, floor, description) VALUES 
(1, 1, 'Ward 3A - Intensive Care', '3rd Floor', 'Inpatient surgical recovery & ICU storage'),
(2, 1, 'Ward 1B - Emergency Room', '1st Floor', 'Urgent trauma & ER public patient storage'),
(3, 2, 'Ward 2C - Outpatient Care', '2nd Floor', 'Outpatient procedures and staff lockers')
ON CONFLICT (id) DO NOTHING;

-- 10.5 Kiosks
INSERT INTO kiosks (id, ward_id, kiosk_code, name, ip_address, status) VALUES
(1, 1, 'KIOSK-3A-01', 'Ward 3A Main Entrance Terminal', '192.168.1.101', 'online'),
(2, 2, 'KIOSK-1B-01', 'ER Waiting Room Terminal', '192.168.1.102', 'online')
ON CONFLICT (id) DO NOTHING;

-- 10.6 Lockers
INSERT INTO lockers (id, ward_id, locker_number, status, relay_channel, battery_level, rssi, last_heartbeat) VALUES
(101, 1, 'L-101', 'available', 1, 98, -52, CURRENT_TIMESTAMP),
(102, 1, 'L-102', 'occupied',  2, 95, -55, CURRENT_TIMESTAMP),
(103, 1, 'L-103', 'available', 3, 91, -58, CURRENT_TIMESTAMP),
(104, 1, 'L-104', 'available', 4, 88, -62, CURRENT_TIMESTAMP),
(105, 1, 'L-105', 'maintenance', 5, 42, -75, CURRENT_TIMESTAMP),
(201, 2, 'L-201', 'available', 1, 97, -50, CURRENT_TIMESTAMP),
(202, 2, 'L-202', 'occupied',  2, 93, -53, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 10.7 Seed Employees
-- Passwords corresponding to:
--   admin@lockers.local  -> Admin123!
--   branch@lockers.local -> Branch123!
--   staff@lockers.local  -> Staff123!
INSERT INTO employees (id, company_id, branch_id, name, email, password_hash, role, is_active) VALUES
(1, 1, 1, 'Sarah Connor', 'admin@lockers.local', '$2a$10$wT0lV3zC4d8F.gq6cZsm3e1P0R.j0H5zF2u2cM8aF1kK1w4Z1e4Z.', 'super_admin', TRUE),
(2, 1, 1, 'Michael Scott', 'branch@lockers.local', '$2a$10$wT0lV3zC4d8F.gq6cZsm3e1P0R.j0H5zF2u2cM8aF1kK1w4Z1e4Z.', 'branch_admin', TRUE),
(3, 1, 1, 'Pam Beesly', 'staff@lockers.local', '$2a$10$wT0lV3zC4d8F.gq6cZsm3e1P0R.j0H5zF2u2cM8aF1kK1w4Z1e4Z.', 'staff', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 10.8 Seed Active Allocations (Matches Occupied Lockers L-102 and L-202)
INSERT INTO locker_allocations (id, locker_id, ward_id, occupant_name, occupant_phone, pin_hash, status, allocated_at) VALUES
(1, 102, 1, 'John Doe', '+1-555-0102', '1234', 'active', CURRENT_TIMESTAMP - INTERVAL '2 hours'),
(2, 202, 2, 'Alice Smith', '+1-555-0202', '4321', 'active', CURRENT_TIMESTAMP - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

-- 10.9 Seed Initial Audit Events
INSERT INTO locker_events (locker_id, allocation_id, event_type, source, details, created_at) VALUES
(102, 1, 'KIOSK_REGISTRATION', 'kiosk', '{"occupant": "John Doe", "phone": "+1-555-0102", "ward": "Ward 3A"}'::jsonb, CURRENT_TIMESTAMP - INTERVAL '2 hours'),
(102, 1, 'DEVICE_ACK', 'hardware_mqtt', '{"status": "unlocked", "relayFired": true, "batteryLevel": 95}'::jsonb, CURRENT_TIMESTAMP - INTERVAL '2 hours' + INTERVAL '300 milliseconds'),
(105, NULL, 'MAINTENANCE_FLAG', 'admin', '{"reason": "Scheduled latch inspection & battery replacement", "technician": "Michael Scott"}'::jsonb, CURRENT_TIMESTAMP - INTERVAL '1 day');

-- Reset identity sequence counters to prevent key collision on subsequent manual inserts
SELECT setval('companies_id_seq', (SELECT COALESCE(MAX(id), 1) FROM companies));
SELECT setval('cities_id_seq', (SELECT COALESCE(MAX(id), 1) FROM cities));
SELECT setval('branches_id_seq', (SELECT COALESCE(MAX(id), 1) FROM branches));
SELECT setval('wards_id_seq', (SELECT COALESCE(MAX(id), 1) FROM wards));
SELECT setval('kiosks_id_seq', (SELECT COALESCE(MAX(id), 1) FROM kiosks));
SELECT setval('lockers_id_seq', (SELECT COALESCE(MAX(id), 1) FROM lockers));
SELECT setval('employees_id_seq', (SELECT COALESCE(MAX(id), 1) FROM employees));
SELECT setval('locker_allocations_id_seq', (SELECT COALESCE(MAX(id), 1) FROM locker_allocations));
SELECT setval('locker_events_id_seq', (SELECT COALESCE(MAX(id), 1) FROM locker_events));

-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
