# Intelligent Campus Resource Optimization Platform

## Backend Architecture Documentation

A comprehensive, production-ready backend system for managing campus resources (labs, halls, equipment) with bulletproof double-booking prevention, role-based access control, and intelligent approval workflows.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Double-Booking Prevention](#double-booking-prevention)
4. [Role-Based Access Control](#role-based-access-control)
5. [Approval Engine](#approval-engine)
6. [API Reference](#api-reference)
7. [Race Condition Prevention](#race-condition-prevention)
8. [Setup & Installation](#setup--installation)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API Gateway (Express.js)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Helmet    │  │    CORS     │  │ Rate Limit  │  │   Request Logger    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Middleware Layer                               │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────────────┐ │
│  │ Authentication │  │  Authorization  │  │      Request Validation       │ │
│  │   (JWT Auth)   │  │     (RBAC)     │  │    (express-validator)        │ │
│  └────────────────┘  └────────────────┘  └────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               Service Layer                                  │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │ Auth Service  │  │Booking Service│  │Resource Service│  │Approval Svc │  │
│  │               │  │               │  │               │  │              │  │
│  │ • Register    │  │ • Create      │  │ • CRUD        │  │ • Rules      │  │
│  │ • Login       │  │ • Validate    │  │ • Availability│  │ • Approve    │  │
│  │ • Token Mgmt  │  │ • Conflicts   │  │ • Utilization │  │ • Decline    │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  └──────────────┘  │
│                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                          Audit Service                                 │  │
│  │   • Logs all critical operations to database and file                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Database Layer (PostgreSQL)                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    EXCLUSION Constraint (no_double_booking)             ││
│  │   EXCLUDE USING GIST (resource_id WITH =, time_range WITH &&)           ││
│  │   WHERE (status IN ('pending', 'approved'))                             ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  • Connection Pooling (pg)                                                   │
│  • Transaction Management (SERIALIZABLE isolation)                          │
│  • Row-Level Locking (SELECT ... FOR UPDATE)                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   departments    │       │      users       │       │    resources     │
├──────────────────┤       ├──────────────────┤       ├──────────────────┤
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ code (UNIQUE)    │◄──────│ department_id(FK)│       │ code (UNIQUE)    │
│ name             │       │ email (UNIQUE)   │       │ name             │
│ head_user_id(FK) │───────│ password_hash    │       │ type (ENUM)      │
│ contact_email    │       │ first_name       │       │ department_id(FK)│──┐
│ is_active        │       │ last_name        │       │ capacity         │  │
└──────────────────┘       │ role (ENUM)      │       │ attributes(JSONB)│  │
                           │ is_active        │       │ requires_approval│  │
                           │ failed_login_attempts   │ allowed_roles[]  │  │
                           └──────────────────┘       └──────────────────┘  │
                                    │                          │            │
                                    │                          │            │
                                    ▼                          ▼            │
                           ┌──────────────────────────────────────────┐     │
                           │                 bookings                  │     │
                           ├──────────────────────────────────────────┤     │
                           │ id (PK)                                   │     │
                           │ booking_reference (UNIQUE, auto-gen)      │     │
                           │ resource_id (FK)─────────────────────────┤◄────┘
                           │ user_id (FK)                              │
                           │ time_range (TSTZRANGE) ──────────────────┼─────┐
                           │ start_time (GENERATED)                    │     │
                           │ end_time (GENERATED)                      │     │
                           │ purpose (ENUM)                            │     │
                           │ purpose_details (JSONB)                   │     │
                           │ status (ENUM)                             │     │
                           │ approved_by (FK)                          │     │
                           │ cancelled_by (FK)                         │     │
                           ├──────────────────────────────────────────┤     │
                           │ EXCLUSION CONSTRAINT:                     │     │
                           │   (resource_id, time_range)               │◄────┘
                           │   WHERE status IN (pending, approved)     │
                           └──────────────────────────────────────────┘
                                    │
                                    ▼
                           ┌──────────────────┐       ┌──────────────────┐
                           │approval_workflow │       │   audit_logs     │
                           ├──────────────────┤       ├──────────────────┤
                           │ id (PK)          │       │ id (PK)          │
                           │ booking_id (FK)  │       │ action (ENUM)    │
                           │ action (ENUM)    │       │ user_id (FK)     │
                           │ performed_by(FK) │       │ entity_type      │
                           │ triggered_rule_id│       │ entity_id        │
                           │ notes            │       │ old_values(JSONB)│
                           │ created_at       │       │ new_values(JSONB)│
                           └──────────────────┘       │ ip_address       │
                                                      │ created_at       │
                                                      └──────────────────┘
```

### Table Definitions

#### Core Tables

| Table | Description | Key Fields |
|-------|-------------|------------|
| `departments` | Organizational units | code, name, head_user_id |
| `users` | All system users | email, role, department_id |
| `resources` | Bookable resources | code, type, capacity, allowed_roles |
| `resource_availability_slots` | When resources are available | day_of_week, start_time, end_time |
| `bookings` | All booking records | time_range, purpose, status |
| `approval_rules` | Auto-approval configuration | conditions, auto_approve |
| `approval_workflow` | Approval history | booking_id, action, performed_by |
| `audit_logs` | Immutable audit trail | action, entity_type, old/new_values |
| `notification_logs` | Notification tracking | user_id, type, sent_at |
| `refresh_tokens` | JWT refresh token storage | user_id, token_hash, expires_at |

### ENUM Types

```sql
-- User roles with clear hierarchy
CREATE TYPE user_role AS ENUM ('student', 'faculty', 'admin');

-- Resource categories
CREATE TYPE resource_type AS ENUM ('lab', 'hall', 'equipment', 'meeting_room', 'sports_facility');

-- Booking lifecycle states
CREATE TYPE booking_status AS ENUM ('pending', 'approved', 'declined', 'cancelled', 'completed', 'no_show');

-- Structured booking purposes
CREATE TYPE booking_purpose AS ENUM ('academic', 'research', 'event', 'maintenance', 'examination', 'workshop', 'meeting');
```

---

## Double-Booking Prevention

### Multi-Layer Protection Strategy

The system implements **THREE independent layers** of protection against double-booking:

```
Layer 1: Application-Level Pre-Check
         ↓ (Soft Check - for user experience)
Layer 2: SERIALIZABLE Transaction
         ↓ (Prevents phantom reads)
Layer 3: EXCLUSION Constraint
         ↓ (Database-enforced, bulletproof)
         BOOKING CREATED ✓
```

### Layer 1: Pre-flight Validation

```javascript
// Before attempting to create a booking, check for conflicts
async function checkBookingConflicts(client, resourceId, startTime, endTime) {
    const timeRange = toTstzrange(startTime, endTime);
    
    const result = await client.query(`
        SELECT b.id, b.booking_reference, b.start_time, b.end_time
        FROM bookings b
        WHERE b.resource_id = $1
          AND b.status IN ('pending', 'approved')
          AND b.time_range && $2::tstzrange
    `, [resourceId, timeRange]);
    
    return result.rows; // Return conflicts for informative error message
}
```

### Layer 2: SERIALIZABLE Transaction Isolation

```javascript
async function createBooking(bookingData, user) {
    return await withTransaction(async (client) => {
        // SERIALIZABLE prevents phantom reads - no other transaction
        // can insert a conflicting booking while we're checking
        await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');
        
        // Check for conflicts
        const conflicts = await checkBookingConflicts(client, resourceId, startTime, endTime);
        if (conflicts.length > 0) {
            throw new BookingConflictError(conflicts);
        }
        
        // Insert booking
        const result = await client.query(`
            INSERT INTO bookings (resource_id, user_id, time_range, ...)
            VALUES ($1, $2, $3::tstzrange, ...)
            RETURNING *
        `, [...]);
        
        return result.rows[0];
    });
}
```

### Layer 3: Database EXCLUSION Constraint

```sql
-- This constraint is the ULTIMATE safeguard
-- It's enforced by PostgreSQL at the storage level
-- Even if application logic fails, this prevents double-booking

ALTER TABLE bookings ADD CONSTRAINT no_double_booking 
    EXCLUDE USING GIST (
        resource_id WITH =,
        time_range WITH &&
    ) 
    WHERE (status IN ('pending', 'approved'));
```

The `&&` operator checks if two time ranges overlap. The GIST index makes this check extremely efficient.

### How Race Conditions Are Prevented

```
Timeline: Two users try to book the same slot simultaneously

User A                              User B
   │                                   │
   ├─ BEGIN TRANSACTION ───────────────┼─ BEGIN TRANSACTION
   │                                   │
   ├─ SET SERIALIZABLE ────────────────┼─ SET SERIALIZABLE
   │                                   │
   ├─ Check conflicts: none ───────────┼─ Check conflicts: none
   │                                   │
   ├─ INSERT booking ──────────────────┼─ (waiting for lock)
   │       │                           │
   │       ▼                           │
   │  EXCLUSION constraint OK          │
   │       │                           │
   ├─ COMMIT ──────────────────────────┤
   │                                   │
   │                                   ├─ INSERT booking
   │                                   │       │
   │                                   │       ▼
   │                                   │  EXCLUSION VIOLATION!
   │                                   │  Error code: 23P01
   │                                   │
   │                                   ├─ ROLLBACK
   │                                   │
   ▼                                   ▼
SUCCESS                             CONFLICT ERROR
```

---

## Role-Based Access Control

### Role Hierarchy

```
         ┌─────────────────────────────────────────┐
         │                 ADMIN                    │
         │  • Full system access                    │
         │  • Manage users, resources, rules       │
         │  • Override any booking decision        │
         │  • View all audit logs                  │
         └────────────────────┬────────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         │                FACULTY                   │
         │  • Book faculty-allowed resources       │
         │  • Approve/decline own department       │
         │  • View department statistics           │
         └────────────────────┬────────────────────┘
                              │
         ┌────────────────────┴────────────────────┐
         │                STUDENT                   │
         │  • Book student-allowed resources       │
         │  • View/cancel own bookings only        │
         │  • Limited advance booking days         │
         └─────────────────────────────────────────┘
```

### Permission Matrix

| Action | Student | Faculty | Admin |
|--------|:-------:|:-------:|:-----:|
| Book student-allowed resources | ✅ | ✅ | ✅ |
| Book faculty-only resources | ❌ | ✅ | ✅ |
| View own bookings | ✅ | ✅ | ✅ |
| View all bookings | ❌ | ❌ | ✅ |
| Cancel own booking | ✅ | ✅ | ✅ |
| Cancel any booking | ❌ | ❌ | ✅ |
| Approve bookings | ❌ | Dept only | ✅ |
| Decline bookings | ❌ | Dept only | ✅ |
| Override declined booking | ❌ | ❌ | ✅ |
| Manage resources | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ✅ |
| Manage approval rules | ❌ | ❌ | ✅ |

### Resource-Level Access Control

```javascript
// Each resource defines who can book it
{
    "allowed_roles": ["student", "faculty", "admin"],
    "restricted_to_department": false  // If true, only department members can book
}

// Validation in booking service
if (!resource.allowed_roles.includes(user.role)) {
    throw new AuthorizationError(`Your role (${user.role}) is not allowed to book this resource`);
}

if (resource.restricted_to_department && resource.department_id !== user.departmentId) {
    throw new AuthorizationError('This resource is restricted to its department members');
}
```

---

## Approval Engine

### Rule-Based Auto-Approval

The system evaluates approval rules in priority order (lower number = higher priority):

```javascript
const approvalRules = [
    {
        name: "Admin Override",
        priority: 1,
        conditions: {
            user_roles: ["admin"]
        },
        auto_approve: true  // Admins always auto-approved
    },
    {
        name: "Faculty Short Bookings",
        priority: 10,
        conditions: {
            user_roles: ["faculty"],
            max_duration_minutes: 120,
            time_window: { start: "08:00", end: "18:00" },
            days_of_week: [1, 2, 3, 4, 5]  // Mon-Fri
        },
        auto_approve: true
    },
    {
        name: "Conference Room Auto-Approve",
        priority: 20,
        conditions: {
            resource_types: ["meeting_room"],
            max_duration_minutes: 120
        },
        auto_approve: true
    },
    {
        name: "Large Event Manual Review",
        priority: 50,
        conditions: {
            purposes: ["event"],
            min_duration_minutes: 240
        },
        auto_approve: false  // Requires manual approval
    }
];
```

### Rule Condition Types

| Condition | Description | Example |
|-----------|-------------|---------|
| `resource_types` | Match resource type | `["lab", "meeting_room"]` |
| `user_roles` | Match user role | `["faculty", "admin"]` |
| `purposes` | Match booking purpose | `["academic", "research"]` |
| `max_duration_minutes` | Maximum duration | `120` |
| `min_duration_minutes` | Minimum duration | `60` |
| `time_window` | Within time range | `{"start": "08:00", "end": "18:00"}` |
| `days_of_week` | Specific days | `[1, 2, 3, 4, 5]` (Mon-Fri) |
| `department_match` | User/resource same dept | `true` |
| `advance_days_max` | Max days in advance | `7` |

### Approval Workflow States

```
                          ┌──────────────┐
           ┌──────────────│   PENDING    │──────────────┐
           │              └──────────────┘              │
           │                     │                      │
     Auto-approve           Manual Review          Timeout/
     rule matched                │                 System
           │                     │                      │
           ▼                     ▼                      ▼
    ┌──────────────┐      ┌─────────────┐       ┌──────────────┐
    │   APPROVED   │◄─────│   Review    │──────►│   DECLINED   │
    └──────────────┘      └─────────────┘       └──────────────┘
           │                                           │
           │                                           │
           ▼                                           ▼
    ┌──────────────┐     Admin Override         ┌──────────────┐
    │  COMPLETED   │◄───────────────────────────│   APPROVED   │
    └──────────────┘                            └──────────────┘
           │
    No-show │
           ▼
    ┌──────────────┐
    │   NO_SHOW    │
    └──────────────┘
```

---

## API Reference

### Authentication Endpoints

#### POST /api/auth/register
Create a new user account.

**Request:**
```json
{
    "email": "student@campus.edu",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "student",
    "departmentId": "uuid-of-department",
    "employeeId": "STU001"
}
```

**Response (201):**
```json
{
    "success": true,
    "message": "Registration successful",
    "data": {
        "user": {
            "id": "uuid",
            "email": "student@campus.edu",
            "firstName": "John",
            "lastName": "Doe",
            "role": "student"
        },
        "accessToken": "eyJhbGci...",
        "refreshToken": "eyJhbGci...",
        "expiresIn": "24h"
    }
}
```

#### POST /api/auth/login
Authenticate and receive tokens.

**Request:**
```json
{
    "email": "student@campus.edu",
    "password": "SecurePass123!"
}
```

### Booking Endpoints

#### POST /api/bookings
Create a new booking.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Request:**
```json
{
    "resourceId": "uuid-of-resource",
    "startTime": "2026-01-20T10:00:00Z",
    "endTime": "2026-01-20T12:00:00Z",
    "purpose": "academic",
    "title": "CS101 Lab Session",
    "description": "Weekly programming lab",
    "purposeDetails": {
        "courseCode": "CS101",
        "section": "A"
    },
    "expectedAttendees": 30
}
```

**Response (201):**
```json
{
    "success": true,
    "message": "Booking created and auto-approved",
    "data": {
        "id": "uuid",
        "bookingReference": "BK-260120-A1B2C3",
        "resourceId": "uuid",
        "resource": {
            "code": "LAB-CS-101",
            "name": "Computer Lab 101",
            "type": "lab"
        },
        "startTime": "2026-01-20T10:00:00.000Z",
        "endTime": "2026-01-20T12:00:00.000Z",
        "purpose": "academic",
        "status": "approved"
    }
}
```

**Error Response (409 - Conflict):**
```json
{
    "success": false,
    "error": {
        "code": "BOOKING_CONFLICT",
        "message": "The requested time slot conflicts with existing bookings",
        "conflictingBookings": [
            {
                "bookingId": "uuid",
                "bookingReference": "BK-260120-X1Y2Z3",
                "startTime": "2026-01-20T09:00:00.000Z",
                "endTime": "2026-01-20T11:00:00.000Z",
                "bookedBy": "Jane Smith"
            }
        ]
    }
}
```

#### GET /api/bookings
List bookings with filters.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| resourceId | UUID | Filter by resource |
| userId | UUID | Filter by user (admin only) |
| status | String | pending, approved, etc. |
| purpose | String | academic, research, etc. |
| startDate | ISO8601 | Filter start date |
| endDate | ISO8601 | Filter end date |
| page | Integer | Page number (default: 1) |
| limit | Integer | Items per page (default: 20) |

#### POST /api/bookings/:id/approve
Approve a pending booking (Admin/Faculty).

#### POST /api/bookings/:id/decline
Decline a pending booking with reason.

**Request:**
```json
{
    "reason": "Resource is under maintenance on this date"
}
```

#### POST /api/bookings/:id/cancel
Cancel a booking.

**Request:**
```json
{
    "reason": "Schedule conflict with another event"
}
```

### Resource Endpoints

#### GET /api/resources
List all resources.

#### GET /api/resources/:id/slots?date=2026-01-20
Get available time slots for a specific date.

**Response:**
```json
{
    "success": true,
    "data": {
        "resource": {
            "id": "uuid",
            "name": "Computer Lab 101",
            "minDuration": 30,
            "maxDuration": 180
        },
        "date": "2026-01-20",
        "availabilitySlots": [
            { "startTime": "08:00:00", "endTime": "18:00:00" }
        ],
        "existingBookings": [
            { "startTime": "2026-01-20T10:00:00Z", "endTime": "2026-01-20T12:00:00Z" },
            { "startTime": "2026-01-20T14:00:00Z", "endTime": "2026-01-20T16:00:00Z" }
        ]
    }
}
```

### Admin Endpoints

#### GET /api/admin/dashboard
Get dashboard statistics.

#### GET /api/admin/audit-logs
Get audit trail with filters.

#### GET /api/admin/approval-rules
List all approval rules.

---

## Setup & Installation

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Installation Steps

```bash
# 1. Clone and navigate to project
cd Task9

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Edit .env with your database credentials

# 4. Create PostgreSQL database
createdb campus_resource_db

# 5. Run migrations
npm run migrate

# 6. Seed sample data
npm run seed

# 7. Start the server
npm run dev
```

### Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=campus_resource_db
DB_USER=postgres
DB_PASSWORD=your_password

# JWT (minimum 32 characters)
JWT_SECRET=your_super_secret_jwt_key_minimum_32_chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Timezone
DEFAULT_TIMEZONE=Asia/Karachi
```

### Running Tests

```bash
# Run all tests
npm test

# Run booking conflict tests specifically
node tests/booking-conflicts.test.js
```

---

## Design Decisions & Rationale

### Why PostgreSQL EXCLUSION Constraint?

1. **Database-level enforcement**: Cannot be bypassed by application bugs
2. **Efficient**: Uses GIST index for O(log n) conflict detection
3. **Atomic**: Checked during INSERT/UPDATE, no race conditions
4. **Declarative**: Self-documenting schema

### Why SERIALIZABLE Isolation?

1. **Phantom read prevention**: New conflicting rows cannot appear mid-transaction
2. **Strong consistency**: All reads see a consistent snapshot
3. **PostgreSQL's SSI**: Uses Serializable Snapshot Isolation (no locks for reads)

### Why TSTZRANGE?

1. **Native range type**: Built-in overlap operator (`&&`)
2. **Timezone-aware**: Stores timestamps in UTC, no timezone bugs
3. **Efficient indexing**: GIST index optimized for range queries
4. **Exclusive upper bound**: `[start, end)` semantics prevent off-by-one errors

---

## Error Codes Reference

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `AUTHENTICATION_ERROR` | 401 | Missing or invalid token |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `BOOKING_CONFLICT` | 409 | Time slot already booked |
| `CONCURRENT_MODIFICATION` | 409 | Optimistic locking failure |
| `RESOURCE_LOCKED` | 423 | Resource being modified |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## License

MIT License - See LICENSE file for details.
