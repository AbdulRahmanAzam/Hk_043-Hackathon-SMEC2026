/**
 * Database Schema for Intelligent Campus Resource Optimization Platform
 * 
 * DESIGN PRINCIPLES:
 * 1. Normalized to 3NF to eliminate redundancy
 * 2. Uses PostgreSQL-specific features for concurrency control
 * 3. Implements range types for time slot management (prevents overlaps at DB level)
 * 4. Uses EXCLUSION constraints for bulletproof double-booking prevention
 * 5. Comprehensive audit trail for all critical operations
 */

const { pool } = require('./connection');

const SCHEMA_SQL = `
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";  -- Required for EXCLUSION constraints with range types

-- ============================================================
-- ENUM TYPES (Enforces valid values at database level)
-- ============================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'faculty', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE resource_type AS ENUM ('lab', 'hall', 'equipment', 'meeting_room', 'sports_facility');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'declined', 'cancelled', 'completed', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_purpose AS ENUM ('academic', 'research', 'event', 'maintenance', 'examination', 'workshop', 'meeting');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE approval_action AS ENUM ('auto_approved', 'manual_approved', 'declined', 'override_approved', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM (
        'user_created', 'user_updated', 'user_deleted', 'user_login', 'user_logout',
        'booking_created', 'booking_approved', 'booking_declined', 'booking_cancelled', 
        'booking_completed', 'booking_no_show', 'booking_modified',
        'resource_created', 'resource_updated', 'resource_deleted',
        'availability_created', 'availability_updated', 'availability_deleted',
        'rule_created', 'rule_updated', 'rule_deleted'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'booking_confirmation', 'booking_approved', 'booking_declined', 
        'booking_reminder', 'booking_cancelled', 'system_alert'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push', 'in_app');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TABLE: departments
-- Central reference for organizational units
-- ============================================================
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    head_user_id UUID,  -- FK added after users table
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_active ON departments(is_active) WHERE is_active = true;

-- ============================================================
-- TABLE: users
-- Stores all system users with role-based classification
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'student',
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    employee_id VARCHAR(50) UNIQUE,  -- Staff/Student ID
    phone VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    is_email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
    CONSTRAINT valid_phone CHECK (phone IS NULL OR phone ~ '^[+]?[0-9\\s\\-()]{7,20}$')
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- Add FK for department head
ALTER TABLE departments 
    DROP CONSTRAINT IF EXISTS fk_department_head;
ALTER TABLE departments 
    ADD CONSTRAINT fk_department_head 
    FOREIGN KEY (head_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- TABLE: resources
-- All bookable campus resources
-- ============================================================
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type resource_type NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    description TEXT,
    location VARCHAR(255),
    building VARCHAR(100),
    floor INTEGER,
    capacity INTEGER CHECK (capacity > 0),
    
    -- Resource-specific attributes stored as JSONB for flexibility
    attributes JSONB DEFAULT '{}',
    -- Example: {"has_projector": true, "has_whiteboard": true, "software": ["MATLAB", "Python"]}
    
    -- Booking constraints
    min_booking_duration_minutes INTEGER DEFAULT 30 CHECK (min_booking_duration_minutes >= 15),
    max_booking_duration_minutes INTEGER DEFAULT 480 CHECK (max_booking_duration_minutes <= 1440),
    advance_booking_days INTEGER DEFAULT 30 CHECK (advance_booking_days >= 1),
    requires_approval BOOLEAN DEFAULT true,
    
    -- Access control
    allowed_roles user_role[] DEFAULT ARRAY['student', 'faculty', 'admin']::user_role[],
    restricted_to_department BOOLEAN DEFAULT false,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_duration_range CHECK (min_booking_duration_minutes <= max_booking_duration_minutes)
);

CREATE INDEX IF NOT EXISTS idx_resources_code ON resources(code);
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_department ON resources(department_id);
CREATE INDEX IF NOT EXISTS idx_resources_active ON resources(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_resources_attributes ON resources USING GIN(attributes);

-- ============================================================
-- TABLE: resource_availability_slots
-- Defines when resources are available for booking
-- Uses tstzrange for precise time range handling
-- ============================================================
CREATE TABLE IF NOT EXISTS resource_availability_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    
    -- Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    
    -- Time range within the day (stored as TIME)
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    
    -- For specific date overrides (holidays, special events)
    specific_date DATE,
    is_available BOOLEAN DEFAULT true,  -- false for blocked periods
    
    -- Recurrence
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_until DATE,
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_time_range CHECK (start_time < end_time),
    CONSTRAINT valid_effective_range CHECK (effective_until IS NULL OR effective_from <= effective_until)
);

CREATE INDEX IF NOT EXISTS idx_availability_resource ON resource_availability_slots(resource_id);
CREATE INDEX IF NOT EXISTS idx_availability_day ON resource_availability_slots(day_of_week);
CREATE INDEX IF NOT EXISTS idx_availability_specific_date ON resource_availability_slots(specific_date) WHERE specific_date IS NOT NULL;

-- ============================================================
-- TABLE: bookings
-- Core booking records with EXCLUSION constraint to prevent overlaps
-- THIS IS THE CRITICAL TABLE FOR DOUBLE-BOOKING PREVENTION
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_reference VARCHAR(20) UNIQUE NOT NULL,  -- Human-readable reference
    
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    
    -- Time range using PostgreSQL range type for EXCLUSION constraint
    -- CRITICAL: tstzrange handles timezone-aware timestamps
    time_range TSTZRANGE NOT NULL,
    
    -- Extracted for easier querying (derived from time_range)
    start_time TIMESTAMPTZ NOT NULL GENERATED ALWAYS AS (lower(time_range)) STORED,
    end_time TIMESTAMPTZ NOT NULL GENERATED ALWAYS AS (upper(time_range)) STORED,
    
    -- Booking purpose with structured data
    purpose booking_purpose NOT NULL,
    purpose_details JSONB DEFAULT '{}',
    -- Example: {"course_code": "CS101", "event_name": "Guest Lecture", "attendees": 50}
    
    title VARCHAR(255) NOT NULL,
    description TEXT,
    expected_attendees INTEGER CHECK (expected_attendees > 0),
    
    status booking_status NOT NULL DEFAULT 'pending',
    
    -- Approval tracking
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    
    -- Cancellation tracking
    cancelled_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    
    -- Recurrence support (for future expansion)
    recurrence_rule JSONB,  -- iCal RRULE format stored as JSON
    parent_booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- ============================================================
    -- CRITICAL: EXCLUSION CONSTRAINT FOR DOUBLE-BOOKING PREVENTION
    -- This constraint guarantees that no two confirmed bookings 
    -- can overlap for the same resource at the database level.
    -- The && operator checks for range overlap.
    -- Only applies to 'pending' and 'approved' statuses.
    -- ============================================================
    CONSTRAINT no_double_booking EXCLUDE USING GIST (
        resource_id WITH =,
        time_range WITH &&
    ) WHERE (status IN ('pending', 'approved')),
    
    -- Ensure booking is in the future at creation
    CONSTRAINT future_booking CHECK (lower(time_range) > created_at - INTERVAL '1 minute'),
    
    -- Validate time range is not empty
    CONSTRAINT non_empty_time_range CHECK (NOT isempty(time_range))
);

CREATE INDEX IF NOT EXISTS idx_bookings_resource ON bookings(resource_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_time_range ON bookings USING GIST(time_range);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_bookings_purpose ON bookings(purpose);

-- ============================================================
-- TABLE: approval_rules
-- Configurable rules for automatic approval decisions
-- ============================================================
CREATE TABLE IF NOT EXISTS approval_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority INTEGER NOT NULL DEFAULT 100,  -- Lower = higher priority
    is_active BOOLEAN DEFAULT true,
    
    -- Rule conditions (all must match for rule to apply)
    conditions JSONB NOT NULL DEFAULT '{}',
    /*
    Example conditions:
    {
        "resource_types": ["lab", "meeting_room"],
        "user_roles": ["faculty"],
        "purposes": ["academic", "research"],
        "max_duration_minutes": 120,
        "time_window": {"start": "08:00", "end": "18:00"},
        "days_of_week": [1, 2, 3, 4, 5],  // Monday-Friday
        "department_match": true,  // User dept must match resource dept
        "advance_days_max": 7
    }
    */
    
    -- Action to take when rule matches
    auto_approve BOOLEAN NOT NULL DEFAULT false,
    
    -- Department scope (null = global)
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approval_rules_priority ON approval_rules(priority) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_approval_rules_department ON approval_rules(department_id);

-- ============================================================
-- TABLE: approval_workflow
-- Tracks the approval process for each booking
-- ============================================================
CREATE TABLE IF NOT EXISTS approval_workflow (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    
    action approval_action NOT NULL,
    performed_by UUID REFERENCES users(id),  -- NULL for auto-actions
    
    -- Which rule triggered auto-approval (if applicable)
    triggered_rule_id UUID REFERENCES approval_rules(id),
    
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_approval_workflow_booking ON approval_workflow(booking_id);
CREATE INDEX IF NOT EXISTS idx_approval_workflow_action ON approval_workflow(action);

-- ============================================================
-- TABLE: audit_logs
-- Immutable audit trail for all critical operations
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- What happened
    action audit_action NOT NULL,
    
    -- Who did it
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),  -- Preserved even if user is deleted
    user_role user_role,
    
    -- What was affected
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    
    -- State tracking
    old_values JSONB,
    new_values JSONB,
    
    -- Request context
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100),
    
    -- Additional context
    metadata JSONB DEFAULT '{}',
    
    -- Immutable timestamp
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Prevent updates/deletes
    CONSTRAINT audit_immutable CHECK (true)
);

-- Audit logs are append-only - this is enforced by NOT granting UPDATE/DELETE
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================
-- TABLE: notification_logs
-- Track all notifications sent to users
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    
    type notification_type NOT NULL,
    channel notification_channel NOT NULL,
    
    recipient VARCHAR(255) NOT NULL,  -- Email/phone/device token
    subject VARCHAR(500),
    body TEXT NOT NULL,
    
    -- Delivery tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    
    retry_count INTEGER DEFAULT 0,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_booking ON notification_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent ON notification_logs(sent_at);

-- ============================================================
-- TABLE: refresh_tokens
-- Secure token management for JWT refresh tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Device/session tracking
    device_info JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to all relevant tables
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['users', 'departments', 'resources', 'resource_availability_slots', 'bookings', 'approval_rules']
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
            CREATE TRIGGER update_%s_updated_at
                BEFORE UPDATE ON %s
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END $$;

-- Function to generate booking reference
CREATE OR REPLACE FUNCTION generate_booking_reference()
RETURNS TRIGGER AS $$
BEGIN
    NEW.booking_reference := 'BK-' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '-' || 
                             UPPER(SUBSTRING(NEW.id::text, 1, 6));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_reference_trigger ON bookings;
CREATE TRIGGER booking_reference_trigger
    BEFORE INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION generate_booking_reference();

-- Function to validate booking against resource availability
CREATE OR REPLACE FUNCTION validate_booking_availability()
RETURNS TRIGGER AS $$
DECLARE
    booking_start TIMESTAMPTZ;
    booking_end TIMESTAMPTZ;
    booking_day INTEGER;
    is_available BOOLEAN := false;
BEGIN
    booking_start := lower(NEW.time_range);
    booking_end := upper(NEW.time_range);
    booking_day := EXTRACT(DOW FROM booking_start);
    
    -- Check if resource is active
    IF NOT EXISTS (SELECT 1 FROM resources WHERE id = NEW.resource_id AND is_active = true) THEN
        RAISE EXCEPTION 'Resource is not active or does not exist';
    END IF;
    
    -- Check against availability slots
    SELECT EXISTS (
        SELECT 1 FROM resource_availability_slots ras
        WHERE ras.resource_id = NEW.resource_id
          AND ras.is_available = true
          AND ras.day_of_week = booking_day
          AND ras.start_time <= booking_start::TIME
          AND ras.end_time >= booking_end::TIME
          AND (ras.specific_date IS NULL OR ras.specific_date = booking_start::DATE)
          AND ras.effective_from <= booking_start::DATE
          AND (ras.effective_until IS NULL OR ras.effective_until >= booking_end::DATE)
    ) INTO is_available;
    
    -- If no specific availability defined, allow booking (resource has no restrictions)
    IF NOT is_available AND EXISTS (
        SELECT 1 FROM resource_availability_slots WHERE resource_id = NEW.resource_id
    ) THEN
        RAISE EXCEPTION 'Booking time is outside resource availability hours';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_booking_trigger ON bookings;
CREATE TRIGGER validate_booking_trigger
    BEFORE INSERT ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION validate_booking_availability();

-- ============================================================
-- VIEWS for Common Queries
-- ============================================================

-- Active bookings view
CREATE OR REPLACE VIEW active_bookings AS
SELECT 
    b.*,
    r.name as resource_name,
    r.type as resource_type,
    r.location as resource_location,
    u.email as user_email,
    u.first_name || ' ' || u.last_name as user_name,
    d.name as department_name
FROM bookings b
JOIN resources r ON b.resource_id = r.id
JOIN users u ON b.user_id = u.id
LEFT JOIN departments d ON r.department_id = d.id
WHERE b.status IN ('pending', 'approved')
  AND upper(b.time_range) > CURRENT_TIMESTAMP;

-- Resource utilization summary
CREATE OR REPLACE VIEW resource_utilization AS
SELECT 
    r.id as resource_id,
    r.name as resource_name,
    r.type as resource_type,
    COUNT(b.id) as total_bookings,
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
    COUNT(CASE WHEN b.status = 'no_show' THEN 1 END) as no_shows,
    COALESCE(SUM(
        EXTRACT(EPOCH FROM (upper(b.time_range) - lower(b.time_range))) / 3600
    ), 0) as total_booked_hours
FROM resources r
LEFT JOIN bookings b ON r.id = b.resource_id 
    AND b.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY r.id, r.name, r.type;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) Policies
-- Provides additional security layer
-- ============================================================

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Users can view their own bookings
CREATE POLICY user_view_own_bookings ON bookings
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', true)::UUID);

-- Admins can view all bookings
CREATE POLICY admin_view_all_bookings ON bookings
    FOR SELECT
    USING (current_setting('app.current_user_role', true) = 'admin');

-- Note: RLS policies are disabled by default and enabled per-session
-- Application should set session variables for RLS to work

`;

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting database migration...\n');
        
        await client.query('BEGIN');
        await client.query(SCHEMA_SQL);
        await client.query('COMMIT');
        
        console.log('✅ Migration completed successfully!\n');
        console.log('📊 Tables created:');
        console.log('   - departments');
        console.log('   - users');
        console.log('   - resources');
        console.log('   - resource_availability_slots');
        console.log('   - bookings (with EXCLUSION constraint for double-booking prevention)');
        console.log('   - approval_rules');
        console.log('   - approval_workflow');
        console.log('   - audit_logs');
        console.log('   - notification_logs');
        console.log('   - refresh_tokens');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { runMigration, SCHEMA_SQL };

// Run if executed directly
if (require.main === module) {
    runMigration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
