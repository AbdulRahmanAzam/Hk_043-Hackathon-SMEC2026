/**
 * Notification Service
 * 
 * Smart notification system for:
 * - Approval status updates
 * - Alternative slot suggestions
 * - Cancellation alerts
 * - Check-in reminders
 * - Booking reminders
 */

const { NotificationLog, User, Booking } = require('../database/models');
const { logger } = require('../utils/logger');
const { DateTime } = require('luxon');

/**
 * Notification templates
 */
const TEMPLATES = {
    booking_confirmation: {
        subject: 'Booking Confirmed: {{resourceName}}',
        body: `Your booking has been created successfully.

📍 Resource: {{resourceName}}
📅 Date: {{date}}
🕐 Time: {{startTime}} - {{endTime}}
📝 Reference: {{bookingReference}}

{{#if requiresApproval}}
Status: Pending Approval
You will be notified once your booking is reviewed.
{{else}}
Status: Approved
Your booking is confirmed!
{{/if}}

Check-in Code: {{checkInCode}}`
    },
    
    booking_approved: {
        subject: 'Booking Approved: {{resourceName}}',
        body: `Great news! Your booking has been approved.

📍 Resource: {{resourceName}}
📅 Date: {{date}}
🕐 Time: {{startTime}} - {{endTime}}
📝 Reference: {{bookingReference}}

{{#if approvalNotes}}
Notes from approver: {{approvalNotes}}
{{/if}}

Check-in Code: {{checkInCode}}
Remember to check in when you arrive!`
    },
    
    booking_declined: {
        subject: 'Booking Declined: {{resourceName}}',
        body: `Unfortunately, your booking request has been declined.

📍 Resource: {{resourceName}}
📅 Date: {{date}}
🕐 Time: {{startTime}} - {{endTime}}

Reason: {{declineReason}}

{{#if alternatives}}
📌 Alternative Slots Available:
{{#each alternatives}}
  • {{this.date}} {{this.startTime}} - {{this.endTime}} ({{this.demandLevel}} demand)
{{/each}}
{{/if}}

Please try booking a different time slot.`
    },
    
    booking_cancelled: {
        subject: 'Booking Cancelled: {{resourceName}}',
        body: `Your booking has been cancelled.

📍 Resource: {{resourceName}}
📅 Date: {{date}}
🕐 Time: {{startTime}} - {{endTime}}
📝 Reference: {{bookingReference}}

{{#if cancelledBySelf}}
This booking was cancelled by you.
{{else}}
This booking was cancelled by: {{cancelledBy}}
Reason: {{cancellationReason}}
{{/if}}

{{#if alternatives}}
📌 Available Alternative Slots:
{{#each alternatives}}
  • {{this.date}} {{this.startTime}} - {{this.endTime}}
{{/each}}
{{/if}}`
    },
    
    booking_reminder: {
        subject: 'Reminder: Upcoming Booking - {{resourceName}}',
        body: `This is a reminder for your upcoming booking.

📍 Resource: {{resourceName}}
📅 Date: {{date}}
🕐 Time: {{startTime}} - {{endTime}}
📍 Location: {{location}}

Check-in Code: {{checkInCode}}

Please remember to check in when you arrive.
If you can't attend, please cancel your booking to free up the slot for others.`
    },
    
    check_in_reminder: {
        subject: 'Check-In Required: {{resourceName}}',
        body: `Your booking is starting soon. Please check in!

📍 Resource: {{resourceName}}
🕐 Start Time: {{startTime}}
📝 Reference: {{bookingReference}}

Check-in Code: {{checkInCode}}

⚠️ If you don't check in within {{autoReleaseMinutes}} minutes of the start time, 
your booking will be automatically released.`
    },
    
    auto_release_warning: {
        subject: 'Warning: Booking Will Be Released - {{resourceName}}',
        body: `Your booking will be released in {{minutesRemaining}} minutes if you don't check in.

📍 Resource: {{resourceName}}
🕐 Start Time: {{startTime}}
📝 Reference: {{bookingReference}}

Check-in Code: {{checkInCode}}

Please check in immediately or your booking will be cancelled.`
    },
    
    booking_bumped: {
        subject: 'Booking Rescheduled: {{resourceName}}',
        body: `Your booking has been rescheduled due to a higher priority booking.

📍 Resource: {{resourceName}}
📅 Original Date: {{date}}
🕐 Original Time: {{startTime}} - {{endTime}}
📝 Reference: {{bookingReference}}

We apologize for the inconvenience.

{{#if alternatives}}
📌 Suggested Alternative Slots:
{{#each alternatives}}
  • {{this.date}} {{this.startTime}} - {{this.endTime}} ({{this.demandLevel}} demand)
{{/each}}
{{/if}}

Please rebook at your earliest convenience.`
    },
    
    alternative_suggestion: {
        subject: 'Alternative Booking Slots Available: {{resourceName}}',
        body: `We found some alternative time slots for your booking request.

📍 Resource: {{resourceName}}

Your original request ({{originalDate}} {{originalTime}}) was not available.

📌 Available Alternatives:
{{#each alternatives}}
  • {{this.date}} {{this.startTime}} - {{this.endTime}}
    Demand: {{this.demandLevel}} | Recommendation Score: {{this.recommendationScore}}
{{/each}}

Click the links above to book one of these slots.`
    }
};

/**
 * Send a notification
 * 
 * @param {Object} params - Notification parameters
 */
async function sendNotification({
    userId,
    bookingId,
    type,
    channel = 'in_app',
    data = {},
    forceChannel = false
}) {
    try {
        // Get user preferences
        const user = await User.findById(userId);
        if (!user) {
            logger.warn('User not found for notification', { userId });
            return null;
        }
        
        // Check user preferences (unless forced)
        if (!forceChannel && !shouldSendToChannel(user, channel)) {
            logger.debug('User opted out of channel', { userId, channel });
            return null;
        }
        
        // Get template
        const template = TEMPLATES[type];
        if (!template) {
            logger.error('Unknown notification type', { type });
            return null;
        }
        
        // Render template
        const subject = renderTemplate(template.subject, data);
        const body = renderTemplate(template.body, data);
        
        // Create notification log
        const notification = new NotificationLog({
            userId,
            bookingId,
            type,
            channel,
            recipient: getRecipient(user, channel),
            subject,
            body,
            metadata: data
        });
        
        // Attempt to send based on channel
        try {
            await deliverNotification(notification, user);
            notification.sentAt = new Date();
        } catch (deliveryError) {
            notification.failedAt = new Date();
            notification.failureReason = deliveryError.message;
            logger.error('Notification delivery failed', { 
                type, 
                userId, 
                error: deliveryError.message 
            });
        }
        
        await notification.save();
        
        return notification;
        
    } catch (error) {
        logger.error('Error sending notification', { error: error.message, type, userId });
        throw error;
    }
}

/**
 * Send booking status update notification
 */
async function notifyBookingStatusChange(booking, newStatus, additionalData = {}) {
    const notificationTypes = {
        approved: 'booking_approved',
        declined: 'booking_declined',
        cancelled: 'booking_cancelled',
        pending: 'booking_confirmation'
    };
    
    const type = notificationTypes[newStatus];
    if (!type) return null;
    
    // Get resource info
    const { Resource } = require('../database/models');
    const resource = await Resource.findById(booking.resourceId);
    
    const data = {
        bookingReference: booking.bookingReference,
        resourceName: resource?.name || 'Unknown Resource',
        date: DateTime.fromJSDate(booking.startTime).toFormat('cccc, MMMM d, yyyy'),
        startTime: DateTime.fromJSDate(booking.startTime).toFormat('HH:mm'),
        endTime: DateTime.fromJSDate(booking.endTime).toFormat('HH:mm'),
        location: resource?.location || '',
        checkInCode: booking.checkInCode,
        requiresApproval: resource?.requiresApproval,
        ...additionalData
    };
    
    // Get alternatives if declined or cancelled
    if (newStatus === 'declined' || newStatus === 'cancelled') {
        const { getAlternativeSlots } = require('./recommendationService');
        try {
            data.alternatives = await getAlternativeSlots(
                booking.resourceId,
                booking.startTime,
                booking.endTime,
                3
            );
        } catch (e) {
            // Don't fail notification if alternatives fail
            data.alternatives = [];
        }
    }
    
    return sendNotification({
        userId: booking.userId,
        bookingId: booking._id,
        type,
        data
    });
}

/**
 * Send check-in reminder
 */
async function sendCheckInReminder(booking, minutesUntilRelease) {
    const { Resource } = require('../database/models');
    const resource = await Resource.findById(booking.resourceId);
    
    const data = {
        bookingReference: booking.bookingReference,
        resourceName: resource?.name || 'Unknown Resource',
        startTime: DateTime.fromJSDate(booking.startTime).toFormat('HH:mm'),
        checkInCode: booking.checkInCode,
        autoReleaseMinutes: resource?.autoReleaseMinutes || 15,
        minutesRemaining: minutesUntilRelease
    };
    
    const type = minutesUntilRelease <= 5 ? 'auto_release_warning' : 'check_in_reminder';
    
    return sendNotification({
        userId: booking.userId,
        bookingId: booking._id,
        type,
        data,
        forceChannel: true // Force notification for time-sensitive alerts
    });
}

/**
 * Send booking reminder (e.g., 1 hour before)
 */
async function sendBookingReminder(booking) {
    const { Resource } = require('../database/models');
    const resource = await Resource.findById(booking.resourceId);
    
    const data = {
        bookingReference: booking.bookingReference,
        resourceName: resource?.name || 'Unknown Resource',
        date: DateTime.fromJSDate(booking.startTime).toFormat('cccc, MMMM d, yyyy'),
        startTime: DateTime.fromJSDate(booking.startTime).toFormat('HH:mm'),
        endTime: DateTime.fromJSDate(booking.endTime).toFormat('HH:mm'),
        location: resource?.location || '',
        checkInCode: booking.checkInCode
    };
    
    return sendNotification({
        userId: booking.userId,
        bookingId: booking._id,
        type: 'booking_reminder',
        data
    });
}

/**
 * Send alternative slot suggestions
 */
async function sendAlternativeSuggestions(userId, bookingId, resourceId, originalStart, originalEnd, alternatives) {
    const { Resource } = require('../database/models');
    const resource = await Resource.findById(resourceId);
    
    const data = {
        resourceName: resource?.name || 'Unknown Resource',
        originalDate: DateTime.fromJSDate(originalStart).toFormat('cccc, MMMM d'),
        originalTime: `${DateTime.fromJSDate(originalStart).toFormat('HH:mm')} - ${DateTime.fromJSDate(originalEnd).toFormat('HH:mm')}`,
        alternatives: alternatives.map(alt => ({
            date: DateTime.fromISO(alt.startTime).toFormat('cccc, MMMM d'),
            startTime: DateTime.fromISO(alt.startTime).toFormat('HH:mm'),
            endTime: DateTime.fromISO(alt.endTime).toFormat('HH:mm'),
            demandLevel: alt.demandLevel,
            recommendationScore: alt.recommendationScore
        }))
    };
    
    return sendNotification({
        userId,
        bookingId,
        type: 'alternative_suggestion',
        data
    });
}

/**
 * Get pending notifications for a user
 */
async function getUserNotifications(userId, options = {}) {
    const { unreadOnly = false, limit = 20, offset = 0 } = options;
    
    const query = { userId };
    if (unreadOnly) {
        query.readAt = null;
    }
    
    const notifications = await NotificationLog.find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);
    
    const total = await NotificationLog.countDocuments(query);
    const unreadCount = await NotificationLog.countDocuments({ userId, readAt: null });
    
    return {
        notifications,
        total,
        unreadCount
    };
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId, userId) {
    const notification = await NotificationLog.findOneAndUpdate(
        { _id: notificationId, userId },
        { readAt: new Date() },
        { new: true }
    );
    
    return notification;
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead(userId) {
    await NotificationLog.updateMany(
        { userId, readAt: null },
        { readAt: new Date() }
    );
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Check if user wants notifications on a specific channel
 */
function shouldSendToChannel(user, channel) {
    if (!user.notificationPreferences) return true;
    
    const channelMap = {
        email: 'email',
        sms: 'sms',
        push: 'push',
        in_app: 'inApp'
    };
    
    return user.notificationPreferences[channelMap[channel]] !== false;
}

/**
 * Get recipient address based on channel
 */
function getRecipient(user, channel) {
    switch (channel) {
        case 'email':
            return user.email;
        case 'sms':
            return user.phone || '';
        case 'push':
        case 'in_app':
            return user._id;
        default:
            return user.email;
    }
}

/**
 * Simple template renderer
 */
function renderTemplate(template, data) {
    let result = template;
    
    // Simple variable replacement
    for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value || '');
    }
    
    // Handle conditionals (simple version)
    result = result.replace(/{{#if (\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
        return data[condition] ? content : '';
    });
    
    // Handle each loops (simple version)
    result = result.replace(/{{#each (\w+)}}([\s\S]*?){{\/each}}/g, (match, arrayName, content) => {
        const arr = data[arrayName];
        if (!Array.isArray(arr)) return '';
        
        return arr.map(item => {
            let itemContent = content;
            for (const [key, value] of Object.entries(item)) {
                itemContent = itemContent.replace(new RegExp(`{{this\\.${key}}}`, 'g'), value || '');
            }
            return itemContent;
        }).join('');
    });
    
    // Clean up any remaining template tags
    result = result.replace(/{{[^}]+}}/g, '');
    
    return result.trim();
}

/**
 * Deliver notification based on channel
 * In a real system, this would integrate with email services, SMS providers, etc.
 */
async function deliverNotification(notification, user) {
    switch (notification.channel) {
        case 'email':
            // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
            logger.info('Would send email notification', {
                to: user.email,
                subject: notification.subject
            });
            break;
            
        case 'sms':
            // TODO: Integrate with SMS service (Twilio, etc.)
            if (!user.phone) {
                throw new Error('No phone number configured');
            }
            logger.info('Would send SMS notification', {
                to: user.phone
            });
            break;
            
        case 'push':
            // TODO: Integrate with push notification service
            logger.info('Would send push notification', {
                userId: user._id
            });
            break;
            
        case 'in_app':
            // In-app notifications are stored in database, no external delivery needed
            logger.debug('In-app notification stored', {
                userId: user._id
            });
            break;
            
        default:
            logger.warn('Unknown notification channel', { channel: notification.channel });
    }
    
    return true;
}

module.exports = {
    sendNotification,
    notifyBookingStatusChange,
    sendCheckInReminder,
    sendBookingReminder,
    sendAlternativeSuggestions,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    TEMPLATES
};
