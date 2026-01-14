/**
 * Audit Service - MongoDB Version
 * Logs all critical operations to the AuditLog collection
 * Provides immutable audit trail for compliance and debugging
 */

const { AuditLog } = require('../database/models');
const { logger, logAudit } = require('../utils/logger');

/**
 * Log an audit event to the database
 */
async function logAuditEvent({
    action,
    userId,
    userEmail,
    userRole,
    entityType,
    entityId,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null,
    requestId = null,
    metadata = {}
}) {
    try {
        await AuditLog.create({
            action,
            userId: userId || null,
            userEmail: userEmail || null,
            userRole: userRole || null,
            entityType,
            entityId,
            oldValues,
            newValues,
            ipAddress,
            userAgent,
            requestId,
            metadata
        });
        
        // Also log to file for redundancy
        logAudit(action, {
            userId,
            userEmail,
            entityType,
            entityId,
            metadata
        });
        
    } catch (error) {
        // Audit logging should never fail the main operation
        logger.error('Failed to write audit log', {
            error: error.message,
            action,
            entityType,
            entityId
        });
    }
}

/**
 * Create audit middleware for automatic logging
 */
function auditMiddleware(action, entityType, getEntityId) {
    return async (req, res, next) => {
        const originalJson = res.json.bind(res);
        
        res.json = function(data) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const entityId = getEntityId(req, data);
                
                logAuditEvent({
                    action,
                    userId: req.user?.id,
                    userEmail: req.user?.email,
                    userRole: req.user?.role,
                    entityType,
                    entityId,
                    newValues: data?.data,
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent'),
                    requestId: req.id
                });
            }
            
            return originalJson(data);
        };
        
        next();
    };
}

/**
 * Get audit logs with filtering
 */
async function getAuditLogs({
    action = null,
    userId = null,
    entityType = null,
    entityId = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 50
}) {
    const query = {};
    
    if (action) query.action = action;
    if (userId) query.userId = userId;
    if (entityType) query.entityType = entityType;
    if (entityId) query.entityId = entityId;
    
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const skip = (page - 1) * limit;
    
    const [logs, total] = await Promise.all([
        AuditLog.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        AuditLog.countDocuments(query)
    ]);
    
    return {
        logs: logs.map(log => ({
            id: log._id,
            action: log.action,
            userId: log.userId,
            userEmail: log.userEmail,
            userRole: log.userRole,
            entityType: log.entityType,
            entityId: log.entityId,
            oldValues: log.oldValues,
            newValues: log.newValues,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            requestId: log.requestId,
            metadata: log.metadata,
            createdAt: log.createdAt
        })),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

// Convenience functions for common audit actions
const AuditActions = {
    // User actions
    USER_CREATED: 'user_created',
    USER_UPDATED: 'user_updated',
    USER_DELETED: 'user_deleted',
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    
    // Booking actions
    BOOKING_CREATED: 'booking_created',
    BOOKING_APPROVED: 'booking_approved',
    BOOKING_DECLINED: 'booking_declined',
    BOOKING_CANCELLED: 'booking_cancelled',
    BOOKING_COMPLETED: 'booking_completed',
    BOOKING_NO_SHOW: 'booking_no_show',
    BOOKING_MODIFIED: 'booking_modified',
    BOOKING_BUMPED: 'booking_bumped',
    BOOKING_AUTO_RELEASED: 'booking_auto_released',
    BOOKING_CHECKED_IN: 'booking_checked_in',
    
    // Resource actions
    RESOURCE_CREATED: 'resource_created',
    RESOURCE_UPDATED: 'resource_updated',
    RESOURCE_DELETED: 'resource_deleted',
    
    // Availability actions
    AVAILABILITY_CREATED: 'availability_created',
    AVAILABILITY_UPDATED: 'availability_updated',
    AVAILABILITY_DELETED: 'availability_deleted',
    
    // Rule actions
    RULE_CREATED: 'rule_created',
    RULE_UPDATED: 'rule_updated',
    RULE_DELETED: 'rule_deleted'
};

module.exports = {
    logAuditEvent,
    auditMiddleware,
    getAuditLogs,
    AuditActions
};
