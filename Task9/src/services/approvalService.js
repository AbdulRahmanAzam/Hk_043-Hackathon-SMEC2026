/**
 * Approval Service - MongoDB Version
 * 
 * Implements a rule-based approval engine for booking requests.
 * Rules are evaluated in priority order (lower number = higher priority).
 * First matching rule determines the outcome.
 */

const { Booking, Resource, ApprovalRule, ApprovalWorkflow, Department } = require('../database/models');
const { NotFoundError, ValidationError, AuthorizationError } = require('../utils/errors');
const { logAuditEvent, AuditActions } = require('./auditService');
const { isWithinHours, getDayOfWeek } = require('../utils/datetime');
const { notifyBookingStatusChange } = require('./notificationService');
const { logger } = require('../utils/logger');

/**
 * Evaluate approval rules for a booking request
 * 
 * @param {Object} context - Booking context
 * @returns {Object} { autoApprove: boolean, ruleId: string|null, ruleName: string|null }
 */
async function evaluateApprovalRules(context) {
    const { user, resource, startTime, endTime, durationMinutes, purpose } = context;
    
    // Fetch active rules ordered by priority
    const rules = await ApprovalRule.find({
        isActive: true,
        $or: [
            { departmentId: null },
            { departmentId: resource.departmentId }
        ]
    }).sort({ priority: 1 });
    
    for (const rule of rules) {
        const conditions = rule.conditions || {};
        
        if (evaluateRuleConditions(conditions, context)) {
            logger.debug('Approval rule matched', {
                ruleId: rule._id,
                ruleName: rule.name,
                autoApprove: rule.autoApprove
            });
            
            return {
                autoApprove: rule.autoApprove,
                ruleId: rule._id,
                ruleName: rule.name
            };
        }
    }
    
    // No rule matched - default to manual approval
    return {
        autoApprove: false,
        ruleId: null,
        ruleName: null
    };
}

/**
 * Evaluate if all conditions in a rule match the booking context
 */
function evaluateRuleConditions(conditions, context) {
    const { user, resource, startTime, endTime, durationMinutes, purpose } = context;
    
    // Resource type condition
    if (conditions.resourceTypes && conditions.resourceTypes.length > 0) {
        if (!conditions.resourceTypes.includes(resource.type)) {
            return false;
        }
    }
    
    // User role condition
    if (conditions.userRoles && conditions.userRoles.length > 0) {
        if (!conditions.userRoles.includes(user.role)) {
            return false;
        }
    }
    
    // Purpose condition
    if (conditions.purposes && conditions.purposes.length > 0) {
        if (!conditions.purposes.includes(purpose)) {
            return false;
        }
    }
    
    // Maximum duration condition
    if (conditions.maxDurationMinutes) {
        if (durationMinutes > conditions.maxDurationMinutes) {
            return false;
        }
    }
    
    // Minimum duration condition
    if (conditions.minDurationMinutes) {
        if (durationMinutes < conditions.minDurationMinutes) {
            return false;
        }
    }
    
    // Time window condition
    if (conditions.timeWindow) {
        const { start, end } = conditions.timeWindow;
        if (!isWithinHours(startTime, start, end) || !isWithinHours(endTime, start, end)) {
            return false;
        }
    }
    
    // Days of week condition
    if (conditions.daysOfWeek && conditions.daysOfWeek.length > 0) {
        const dayOfWeek = getDayOfWeek(startTime);
        if (!conditions.daysOfWeek.includes(dayOfWeek)) {
            return false;
        }
    }
    
    // Department match condition
    if (conditions.departmentMatch === true) {
        if (String(resource.departmentId) !== String(user.departmentId)) {
            return false;
        }
    }
    
    // Advance days condition
    if (conditions.advanceDaysMax) {
        const daysInAdvance = Math.ceil(
            (new Date(startTime) - new Date()) / (1000 * 60 * 60 * 24)
        );
        if (daysInAdvance > conditions.advanceDaysMax) {
            return false;
        }
    }
    
    // All conditions passed
    return true;
}

/**
 * Manually approve a booking
 */
async function approveBooking(bookingId, admin, notes = null) {
    if (admin.role !== 'admin' && admin.role !== 'faculty') {
        throw new AuthorizationError('Only admins and faculty can approve bookings');
    }
    
    const booking = await Booking.findById(bookingId).populate('resourceId');
    
    if (!booking) {
        throw new NotFoundError('Booking');
    }
    
    // Validate booking status
    if (booking.status !== 'pending') {
        throw new ValidationError(`Cannot approve a booking with status: ${booking.status}`);
    }
    
    // Faculty can only approve bookings for their department's resources
    if (admin.role === 'faculty') {
        if (String(booking.resourceId.departmentId) !== String(admin.departmentId)) {
            throw new AuthorizationError(
                'Faculty can only approve bookings for their department resources'
            );
        }
    }
    
    // Update booking
    booking.status = 'approved';
    booking.approvedBy = admin.id;
    booking.approvedAt = new Date();
    booking.approvalNotes = notes;
    await booking.save();
    
    // Record in workflow
    await ApprovalWorkflow.create({
        bookingId: booking._id,
        action: 'manual_approved',
        performedBy: admin.id,
        notes
    });
    
    // Notify user
    await notifyBookingStatusChange(booking, 'approved', { approvalNotes: notes });
    
    // Audit log
    await logAuditEvent({
        action: AuditActions.BOOKING_APPROVED,
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        entityType: 'booking',
        entityId: bookingId,
        oldValues: { status: 'pending' },
        newValues: { status: 'approved' }
    });
    
    return booking;
}

/**
 * Decline a booking
 */
async function declineBooking(bookingId, admin, reason) {
    if (admin.role !== 'admin' && admin.role !== 'faculty') {
        throw new AuthorizationError('Only admins and faculty can decline bookings');
    }
    
    if (!reason || reason.trim().length === 0) {
        throw new ValidationError('Decline reason is required');
    }
    
    const booking = await Booking.findById(bookingId).populate('resourceId');
    
    if (!booking) {
        throw new NotFoundError('Booking');
    }
    
    // Validate booking status
    if (booking.status !== 'pending') {
        throw new ValidationError(`Cannot decline a booking with status: ${booking.status}`);
    }
    
    // Faculty restriction
    if (admin.role === 'faculty') {
        if (String(booking.resourceId.departmentId) !== String(admin.departmentId)) {
            throw new AuthorizationError(
                'Faculty can only decline bookings for their department resources'
            );
        }
    }
    
    // Update booking
    booking.status = 'declined';
    booking.approvedBy = admin.id;
    booking.approvedAt = new Date();
    booking.approvalNotes = reason;
    await booking.save();
    
    // Record in workflow
    await ApprovalWorkflow.create({
        bookingId: booking._id,
        action: 'declined',
        performedBy: admin.id,
        notes: reason
    });
    
    // Notify user
    await notifyBookingStatusChange(booking, 'declined', { declineReason: reason });
    
    // Audit log
    await logAuditEvent({
        action: AuditActions.BOOKING_DECLINED,
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        entityType: 'booking',
        entityId: bookingId,
        oldValues: { status: 'pending' },
        newValues: { status: 'declined', reason }
    });
    
    return booking;
}

/**
 * Override approve a previously declined booking (admin only)
 */
async function overrideApprove(bookingId, admin, notes) {
    if (admin.role !== 'admin') {
        throw new AuthorizationError('Only admins can override approve bookings');
    }
    
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
        throw new NotFoundError('Booking');
    }
    
    // Can override declined bookings
    if (!['declined', 'pending'].includes(booking.status)) {
        throw new ValidationError(`Cannot override a booking with status: ${booking.status}`);
    }
    
    const oldStatus = booking.status;
    
    // Update booking
    booking.status = 'approved';
    booking.approvedBy = admin.id;
    booking.approvedAt = new Date();
    booking.approvalNotes = `OVERRIDE: ${notes}`;
    await booking.save();
    
    // Record in workflow
    await ApprovalWorkflow.create({
        bookingId: booking._id,
        action: 'override_approved',
        performedBy: admin.id,
        notes
    });
    
    // Notify user
    await notifyBookingStatusChange(booking, 'approved', { overrideApproval: true });
    
    // Audit log
    await logAuditEvent({
        action: AuditActions.BOOKING_APPROVED,
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        entityType: 'booking',
        entityId: bookingId,
        oldValues: { status: oldStatus },
        newValues: { status: 'approved', overrideApproval: true },
        metadata: { overrideReason: notes }
    });
    
    return booking;
}

/**
 * Get pending bookings for approval
 */
async function getPendingBookings(user, filters = {}) {
    const { resourceId, departmentId, page = 1, limit = 20 } = filters;
    
    const query = { status: 'pending' };
    
    // Faculty can only see pending bookings for their department
    if (user.role === 'faculty') {
        const resources = await Resource.find({ departmentId: user.departmentId }).select('_id');
        query.resourceId = { $in: resources.map(r => r._id) };
    } else if (departmentId) {
        const resources = await Resource.find({ departmentId }).select('_id');
        query.resourceId = { $in: resources.map(r => r._id) };
    }
    
    if (resourceId) {
        query.resourceId = resourceId;
    }
    
    const skip = (page - 1) * limit;
    
    const [bookings, total] = await Promise.all([
        Booking.find(query)
            .populate('resourceId', 'code name type location departmentId')
            .populate('userId', 'email firstName lastName')
            .sort({ createdAt: 1 })
            .skip(skip)
            .limit(limit),
        Booking.countDocuments(query)
    ]);
    
    return {
        bookings: bookings.map(b => ({
            id: b._id,
            bookingReference: b.bookingReference,
            resourceCode: b.resourceId?.code,
            resourceName: b.resourceId?.name,
            resourceType: b.resourceId?.type,
            userEmail: b.userId?.email,
            userName: `${b.userId?.firstName} ${b.userId?.lastName}`,
            startTime: b.startTime,
            endTime: b.endTime,
            purpose: b.purpose,
            createdAt: b.createdAt
        })),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

/**
 * Get approval workflow history for a booking
 */
async function getApprovalHistory(bookingId) {
    const workflows = await ApprovalWorkflow.find({ bookingId })
        .populate('performedBy', 'email firstName lastName')
        .populate('triggeredRuleId', 'name')
        .sort({ createdAt: 1 });
    
    return workflows.map(row => ({
        id: row._id,
        action: row.action,
        performedBy: row.performedBy ? {
            id: row.performedBy._id,
            email: row.performedBy.email,
            name: `${row.performedBy.firstName} ${row.performedBy.lastName}`
        } : null,
        triggeredRule: row.triggeredRuleId ? {
            id: row.triggeredRuleId._id,
            name: row.triggeredRuleId.name
        } : null,
        notes: row.notes,
        createdAt: row.createdAt
    }));
}

// ============================================================
// APPROVAL RULES MANAGEMENT
// ============================================================

/**
 * Create a new approval rule
 */
async function createApprovalRule(ruleData, admin) {
    if (admin.role !== 'admin') {
        throw new AuthorizationError('Only admins can create approval rules');
    }
    
    const {
        name,
        description,
        priority,
        conditions,
        autoApprove,
        departmentId
    } = ruleData;
    
    const rule = await ApprovalRule.create({
        name,
        description,
        priority: priority || 100,
        conditions,
        autoApprove,
        departmentId,
        createdBy: admin.id
    });
    
    await logAuditEvent({
        action: AuditActions.RULE_CREATED,
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        entityType: 'approval_rule',
        entityId: rule._id,
        newValues: ruleData
    });
    
    return rule;
}

/**
 * Get all approval rules
 */
async function getApprovalRules(filters = {}) {
    const { departmentId, isActive } = filters;
    
    const query = {};
    
    if (departmentId) {
        query.$or = [
            { departmentId },
            { departmentId: null }
        ];
    }
    
    if (isActive !== undefined) {
        query.isActive = isActive;
    }
    
    const rules = await ApprovalRule.find(query)
        .populate('departmentId', 'name')
        .sort({ priority: 1 });
    
    return rules.map(rule => ({
        id: rule._id,
        name: rule.name,
        description: rule.description,
        priority: rule.priority,
        conditions: rule.conditions,
        autoApprove: rule.autoApprove,
        isActive: rule.isActive,
        departmentId: rule.departmentId?._id,
        departmentName: rule.departmentId?.name,
        createdAt: rule.createdAt
    }));
}

/**
 * Update an approval rule
 */
async function updateApprovalRule(ruleId, updates, admin) {
    if (admin.role !== 'admin') {
        throw new AuthorizationError('Only admins can update approval rules');
    }
    
    const allowedFields = ['name', 'description', 'priority', 'conditions', 'autoApprove', 'isActive'];
    const updateData = {};
    
    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            updateData[key] = value;
        }
    }
    
    if (Object.keys(updateData).length === 0) {
        throw new ValidationError('No valid fields to update');
    }
    
    const rule = await ApprovalRule.findByIdAndUpdate(
        ruleId,
        updateData,
        { new: true }
    );
    
    if (!rule) {
        throw new NotFoundError('Approval rule');
    }
    
    await logAuditEvent({
        action: AuditActions.RULE_UPDATED,
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        entityType: 'approval_rule',
        entityId: ruleId,
        newValues: updates
    });
    
    return rule;
}

module.exports = {
    evaluateApprovalRules,
    approveBooking,
    declineBooking,
    overrideApprove,
    getPendingBookings,
    getApprovalHistory,
    createApprovalRule,
    getApprovalRules,
    updateApprovalRule
};
