/**
 * Notification Routes
 * Provides endpoints for user notifications
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError } = require('../utils/errors');
const notificationService = require('../services/notificationService');

/**
 * GET /api/notifications
 * Get user's notifications
 */
router.get('/', 
    authenticate,
    asyncHandler(async (req, res) => {
        const { unreadOnly, limit = 20, offset = 0 } = req.query;
        
        const notifications = await notificationService.getUserNotifications(
            req.user.id,
            {
                unreadOnly: unreadOnly === 'true',
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        );
        
        res.json({
            success: true,
            data: notifications
        });
    })
);

/**
 * PUT /api/notifications/:notificationId/read
 * Mark a notification as read
 */
router.put('/:notificationId/read', 
    authenticate,
    asyncHandler(async (req, res) => {
        const { notificationId } = req.params;
        
        const result = await notificationService.markAsRead(notificationId, req.user.id);
        
        res.json({
            success: true,
            data: result
        });
    })
);

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', 
    authenticate,
    asyncHandler(async (req, res) => {
        const { NotificationLog } = require('../database/models');
        
        await NotificationLog.updateMany(
            { userId: req.user.id, readAt: null },
            { readAt: new Date() }
        );
        
        res.json({
            success: true,
            message: 'All notifications marked as read'
        });
    })
);

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', 
    authenticate,
    asyncHandler(async (req, res) => {
        const { NotificationLog } = require('../database/models');
        
        const count = await NotificationLog.countDocuments({
            userId: req.user.id,
            readAt: null
        });
        
        res.json({
            success: true,
            data: { unreadCount: count }
        });
    })
);

module.exports = router;
