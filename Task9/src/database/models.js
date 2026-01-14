/**
 * MongoDB Schema Models
 * 
 * Comprehensive schema definitions for the Campus Resource Optimization Platform
 * Implements document-based design with proper indexing and validation
 */

const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// ============================================================
// ENUMS
// ============================================================

const USER_ROLES = ['student', 'faculty', 'admin'];
const RESOURCE_TYPES = ['lab', 'hall', 'equipment', 'meeting_room', 'sports_facility'];
const BOOKING_STATUSES = ['pending', 'approved', 'declined', 'cancelled', 'completed', 'no_show'];
const BOOKING_PURPOSES = ['academic', 'research', 'event', 'maintenance', 'examination', 'workshop', 'meeting'];
const APPROVAL_ACTIONS = ['auto_approved', 'manual_approved', 'declined', 'override_approved', 'cancelled'];
const NOTIFICATION_TYPES = ['booking_confirmation', 'booking_approved', 'booking_declined', 'booking_reminder', 'booking_cancelled', 'system_alert', 'alternative_suggestion', 'check_in_reminder'];
const NOTIFICATION_CHANNELS = ['email', 'sms', 'push', 'in_app'];
const SLOT_DEMAND_LEVELS = ['low', 'medium', 'high', 'recommended'];
const PRIORITY_LEVELS = ['low', 'normal', 'high', 'critical'];

// ============================================================
// DEPARTMENT SCHEMA
// ============================================================

const departmentSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String },
    headUserId: { type: String, ref: 'User' },
    contactEmail: { type: String, lowercase: true },
    contactPhone: { type: String },
    priorityWeight: { type: Number, default: 1, min: 0, max: 10 }, // For priority-based conflict resolution
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// code is already indexed via unique: true
departmentSchema.index({ isActive: 1 });

// ============================================================
// USER SCHEMA
// ============================================================

const userSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email']
    },
    passwordHash: { type: String, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    role: { type: String, enum: USER_ROLES, default: 'student' },
    departmentId: { type: String, ref: 'Department' },
    employeeId: { type: String, unique: true, sparse: true },
    phone: { type: String },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    passwordChangedAt: { type: Date },
    failedLoginAttempts: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    // Notification preferences
    notificationPreferences: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        push: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true }
    },
    // Calendar integration
    calendarSettings: {
        googleCalendarConnected: { type: Boolean, default: false },
        googleCalendarId: { type: String },
        syncEnabled: { type: Boolean, default: false }
    }
}, { timestamps: true });

// email is already indexed via unique: true
userSchema.index({ role: 1 });
userSchema.index({ departmentId: 1 });
userSchema.index({ isActive: 1 });

userSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// ============================================================
// RESOURCE SCHEMA
// ============================================================

const availabilitySlotSchema = new mongoose.Schema({
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 }, // 0=Sunday, 6=Saturday
    startTime: { type: String, required: true }, // HH:mm format
    endTime: { type: String, required: true },
    specificDate: { type: Date }, // For specific date overrides
    isAvailable: { type: Boolean, default: true },
    effectiveFrom: { type: Date, default: Date.now },
    effectiveUntil: { type: Date },
    notes: { type: String }
}, { _id: true });

const resourceSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: RESOURCE_TYPES, required: true },
    departmentId: { type: String, ref: 'Department' },
    description: { type: String },
    location: { type: String },
    building: { type: String },
    floor: { type: Number },
    capacity: { type: Number, min: 1 },
    // Flexible attributes
    attributes: {
        hasProjector: { type: Boolean, default: false },
        hasWhiteboard: { type: Boolean, default: false },
        hasVideoConference: { type: Boolean, default: false },
        hasAC: { type: Boolean, default: true },
        software: [{ type: String }],
        equipment: [{ type: String }],
        custom: { type: mongoose.Schema.Types.Mixed }
    },
    // Booking constraints
    minBookingDurationMinutes: { type: Number, default: 30, min: 15 },
    maxBookingDurationMinutes: { type: Number, default: 480, max: 1440 },
    advanceBookingDays: { type: Number, default: 30, min: 1 },
    requiresApproval: { type: Boolean, default: true },
    // Access control
    allowedRoles: [{ type: String, enum: USER_ROLES }],
    restrictedToDepartment: { type: Boolean, default: false },
    // Priority weight for conflict resolution
    priorityWeight: { type: Number, default: 1, min: 0, max: 10 },
    // Availability slots
    availabilitySlots: [availabilitySlotSchema],
    // QR check-in
    qrCode: { type: String },
    checkInRequired: { type: Boolean, default: false },
    checkInWindowMinutes: { type: Number, default: 15 }, // Minutes before/after start time to check in
    autoReleaseMinutes: { type: Number, default: 15 }, // Release resource if no check-in after this time
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

// code is already indexed via unique: true
resourceSchema.index({ type: 1 });
resourceSchema.index({ departmentId: 1 });
resourceSchema.index({ isActive: 1 });
resourceSchema.index({ 'availabilitySlots.dayOfWeek': 1 });

// ============================================================
// BOOKING SCHEMA
// ============================================================

const bookingSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    bookingReference: { type: String, unique: true },
    resourceId: { type: String, ref: 'Resource', required: true },
    userId: { type: String, ref: 'User', required: true },
    // Time range
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    // Purpose
    purpose: { type: String, enum: BOOKING_PURPOSES, required: true },
    purposeDetails: {
        courseCode: { type: String },
        eventName: { type: String },
        projectName: { type: String },
        description: { type: String },
        attendeeList: [{ type: String }],
        externalParticipants: { type: Boolean, default: false },
        custom: { type: mongoose.Schema.Types.Mixed }
    },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    expectedAttendees: { type: Number, min: 1 },
    // Status
    status: { type: String, enum: BOOKING_STATUSES, default: 'pending' },
    // Priority for conflict resolution
    priority: { type: String, enum: PRIORITY_LEVELS, default: 'normal' },
    priorityScore: { type: Number, default: 0 }, // Calculated priority score
    // Approval tracking
    approvedBy: { type: String, ref: 'User' },
    approvedAt: { type: Date },
    approvalNotes: { type: String },
    // Cancellation tracking
    cancelledBy: { type: String, ref: 'User' },
    cancelledAt: { type: Date },
    cancellationReason: { type: String },
    // QR Check-in
    checkInCode: { type: String },
    checkedInAt: { type: Date },
    checkedInBy: { type: String, ref: 'User' },
    autoReleased: { type: Boolean, default: false },
    autoReleasedAt: { type: Date },
    // Recurrence (for future expansion)
    recurrenceRule: { type: mongoose.Schema.Types.Mixed },
    parentBookingId: { type: String, ref: 'Booking' },
    // Analytics metadata
    demandLevel: { type: String, enum: SLOT_DEMAND_LEVELS },
    wasRecommended: { type: Boolean, default: false },
    alternativesOffered: [{ type: String }], // IDs of alternative slots offered
    // Calendar sync
    icsEventId: { type: String },
    googleEventId: { type: String }
}, { timestamps: true });

// Generate booking reference before save
bookingSchema.pre('save', function(next) {
    if (!this.bookingReference) {
        const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
        const suffix = this._id.slice(0, 6).toUpperCase();
        this.bookingReference = `BK-${date}-${suffix}`;
    }
    
    // Generate check-in code
    if (!this.checkInCode) {
        this.checkInCode = uuidv4().slice(0, 8).toUpperCase();
    }
    
    next();
});

// Compound index for conflict detection - critical for double-booking prevention
bookingSchema.index({ resourceId: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ resourceId: 1, status: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ userId: 1, status: 1 });
bookingSchema.index({ status: 1, startTime: 1 });
// bookingReference is already indexed via unique: true
bookingSchema.index({ checkInCode: 1 });

// ============================================================
// APPROVAL RULES SCHEMA
// ============================================================

const approvalRuleSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    name: { type: String, required: true },
    description: { type: String },
    priority: { type: Number, default: 100 }, // Lower = higher priority
    isActive: { type: Boolean, default: true },
    // Rule conditions
    conditions: {
        resourceTypes: [{ type: String, enum: RESOURCE_TYPES }],
        userRoles: [{ type: String, enum: USER_ROLES }],
        purposes: [{ type: String, enum: BOOKING_PURPOSES }],
        maxDurationMinutes: { type: Number },
        minDurationMinutes: { type: Number },
        timeWindow: {
            start: { type: String }, // HH:mm
            end: { type: String }
        },
        daysOfWeek: [{ type: Number, min: 0, max: 6 }],
        departmentMatch: { type: Boolean },
        advanceDaysMax: { type: Number }
    },
    // Action
    autoApprove: { type: Boolean, default: false },
    // Scope
    departmentId: { type: String, ref: 'Department' },
    createdBy: { type: String, ref: 'User' }
}, { timestamps: true });

approvalRuleSchema.index({ priority: 1, isActive: 1 });
approvalRuleSchema.index({ departmentId: 1 });

// ============================================================
// APPROVAL WORKFLOW SCHEMA
// ============================================================

const approvalWorkflowSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    bookingId: { type: String, ref: 'Booking', required: true },
    action: { type: String, enum: APPROVAL_ACTIONS, required: true },
    performedBy: { type: String, ref: 'User' },
    triggeredRuleId: { type: String, ref: 'ApprovalRule' },
    notes: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

approvalWorkflowSchema.index({ bookingId: 1 });
approvalWorkflowSchema.index({ action: 1 });

// ============================================================
// AUDIT LOG SCHEMA
// ============================================================

const auditLogSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    action: { type: String, required: true },
    userId: { type: String, ref: 'User' },
    userEmail: { type: String },
    userRole: { type: String },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    oldValues: { type: mongoose.Schema.Types.Mixed },
    newValues: { type: mongoose.Schema.Types.Mixed },
    ipAddress: { type: String },
    userAgent: { type: String },
    requestId: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Audit logs are immutable - no updates allowed
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ userId: 1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

// ============================================================
// NOTIFICATION LOG SCHEMA
// ============================================================

const notificationLogSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    userId: { type: String, ref: 'User' },
    bookingId: { type: String, ref: 'Booking' },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
    recipient: { type: String, required: true },
    subject: { type: String },
    body: { type: String, required: true },
    // Delivery tracking
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    failedAt: { type: Date },
    failureReason: { type: String },
    retryCount: { type: Number, default: 0 },
    metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

notificationLogSchema.index({ userId: 1 });
notificationLogSchema.index({ bookingId: 1 });
notificationLogSchema.index({ type: 1 });
notificationLogSchema.index({ sentAt: 1 });

// ============================================================
// REFRESH TOKEN SCHEMA
// ============================================================

const refreshTokenSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    userId: { type: String, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    deviceInfo: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ expiresAt: 1 });
// tokenHash is already indexed via unique: true

// ============================================================
// BOOKING ANALYTICS SCHEMA
// For historical analysis and smart recommendations
// ============================================================

const bookingAnalyticsSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    resourceId: { type: String, ref: 'Resource', required: true },
    date: { type: Date, required: true },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    hourSlot: { type: Number, min: 0, max: 23 },
    // Metrics
    totalBookings: { type: Number, default: 0 },
    completedBookings: { type: Number, default: 0 },
    cancelledBookings: { type: Number, default: 0 },
    noShowBookings: { type: Number, default: 0 },
    totalBookedMinutes: { type: Number, default: 0 },
    // Demand metrics
    requestCount: { type: Number, default: 0 }, // Including rejected/conflicted
    conflictCount: { type: Number, default: 0 },
    demandScore: { type: Number, default: 0 }, // Calculated demand score
    // Utilization
    utilizationPercentage: { type: Number, default: 0 },
    peakHours: [{ type: Number }],
    idleHours: [{ type: Number }]
}, { timestamps: true });

bookingAnalyticsSchema.index({ resourceId: 1, date: 1 });
bookingAnalyticsSchema.index({ resourceId: 1, dayOfWeek: 1, hourSlot: 1 });
bookingAnalyticsSchema.index({ date: 1 });

// ============================================================
// SLOT RECOMMENDATION CACHE
// For smart slot recommendations
// ============================================================

const slotRecommendationSchema = new mongoose.Schema({
    _id: { type: String, default: uuidv4 },
    resourceId: { type: String, ref: 'Resource', required: true },
    dayOfWeek: { type: Number, min: 0, max: 6 },
    hourSlot: { type: Number, min: 0, max: 23 },
    // Recommendation data
    demandLevel: { type: String, enum: SLOT_DEMAND_LEVELS, default: 'medium' },
    recommendationScore: { type: Number, default: 0 },
    historicalUtilization: { type: Number, default: 0 },
    averageBookingDuration: { type: Number, default: 0 },
    conflictProbability: { type: Number, default: 0 },
    // Last calculation
    calculatedAt: { type: Date, default: Date.now },
    dataPointCount: { type: Number, default: 0 }
}, { timestamps: true });

slotRecommendationSchema.index({ resourceId: 1, dayOfWeek: 1, hourSlot: 1 }, { unique: true });
slotRecommendationSchema.index({ demandLevel: 1 });

// ============================================================
// EXPORT MODELS
// ============================================================

const Department = mongoose.model('Department', departmentSchema);
const User = mongoose.model('User', userSchema);
const Resource = mongoose.model('Resource', resourceSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const ApprovalRule = mongoose.model('ApprovalRule', approvalRuleSchema);
const ApprovalWorkflow = mongoose.model('ApprovalWorkflow', approvalWorkflowSchema);
const AuditLog = mongoose.model('AuditLog', auditLogSchema);
const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);
const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
const BookingAnalytics = mongoose.model('BookingAnalytics', bookingAnalyticsSchema);
const SlotRecommendation = mongoose.model('SlotRecommendation', slotRecommendationSchema);

module.exports = {
    Department,
    User,
    Resource,
    Booking,
    ApprovalRule,
    ApprovalWorkflow,
    AuditLog,
    NotificationLog,
    RefreshToken,
    BookingAnalytics,
    SlotRecommendation,
    // Enums for validation
    USER_ROLES,
    RESOURCE_TYPES,
    BOOKING_STATUSES,
    BOOKING_PURPOSES,
    APPROVAL_ACTIONS,
    NOTIFICATION_TYPES,
    NOTIFICATION_CHANNELS,
    SLOT_DEMAND_LEVELS,
    PRIORITY_LEVELS
};
