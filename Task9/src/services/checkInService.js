/**
 * QR Check-In and Auto-Release Service
 * 
 * Handles:
 * - QR code generation for check-in
 * - Check-in validation
 * - Automatic resource release for no-shows
 * - No-show logging
 */

const QRCode = require('qrcode');
const { Booking, Resource, User } = require('../database/models');
const { logger } = require('../utils/logger');
const { logAuditEvent, AuditActions } = require('./auditService');
const { sendCheckInReminder, notifyBookingStatusChange } = require('./notificationService');
const { recordBookingEvent } = require('./recommendationService');
const { DateTime } = require('luxon');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate QR code for a booking
 * 
 * @param {string} bookingId - Booking ID
 * @returns {Object} QR code data
 */
async function generateCheckInQR(bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new Error('Booking not found');
    }
    
    // Create check-in URL
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const checkInUrl = `${baseUrl}/api/checkin/${booking.checkInCode}`;
    
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(checkInUrl, {
        width: 300,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#ffffff'
        }
    });
    
    // Generate QR code as SVG string
    const qrSvg = await QRCode.toString(checkInUrl, {
        type: 'svg',
        width: 300
    });
    
    return {
        bookingId,
        bookingReference: booking.bookingReference,
        checkInCode: booking.checkInCode,
        checkInUrl,
        qrDataUrl,
        qrSvg,
        validFrom: DateTime.fromJSDate(booking.startTime)
            .minus({ minutes: 15 })
            .toJSDate(),
        validUntil: DateTime.fromJSDate(booking.startTime)
            .plus({ minutes: 15 })
            .toJSDate()
    };
}

/**
 * Process check-in for a booking
 * 
 * @param {string} checkInCode - The check-in code from QR
 * @param {string} userId - User attempting to check in
 * @returns {Object} Check-in result
 */
async function processCheckIn(checkInCode, userId = null) {
    const booking = await Booking.findOne({ checkInCode });
    
    if (!booking) {
        return {
            success: false,
            error: 'INVALID_CODE',
            message: 'Invalid check-in code'
        };
    }
    
    // Check booking status
    if (booking.status !== 'approved') {
        return {
            success: false,
            error: 'INVALID_STATUS',
            message: `Cannot check in. Booking status is: ${booking.status}`
        };
    }
    
    // Check if already checked in
    if (booking.checkedInAt) {
        return {
            success: false,
            error: 'ALREADY_CHECKED_IN',
            message: 'This booking has already been checked in',
            checkedInAt: booking.checkedInAt
        };
    }
    
    // Check time window
    const now = new Date();
    const resource = await Resource.findById(booking.resourceId);
    const checkInWindowMinutes = resource?.checkInWindowMinutes || 15;
    
    const windowStart = DateTime.fromJSDate(booking.startTime)
        .minus({ minutes: checkInWindowMinutes })
        .toJSDate();
    const windowEnd = DateTime.fromJSDate(booking.startTime)
        .plus({ minutes: checkInWindowMinutes })
        .toJSDate();
    
    if (now < windowStart) {
        const minutesUntilWindow = Math.ceil((windowStart - now) / (1000 * 60));
        return {
            success: false,
            error: 'TOO_EARLY',
            message: `Check-in will be available in ${minutesUntilWindow} minutes`,
            windowStart
        };
    }
    
    if (now > windowEnd) {
        return {
            success: false,
            error: 'TOO_LATE',
            message: 'Check-in window has expired',
            windowEnd
        };
    }
    
    // Validate user if provided
    if (userId && booking.userId !== userId) {
        // Allow admins to check in for others
        const user = await User.findById(userId);
        if (user?.role !== 'admin') {
            return {
                success: false,
                error: 'UNAUTHORIZED',
                message: 'Only the booking owner or an admin can check in'
            };
        }
    }
    
    // Process check-in
    booking.checkedInAt = now;
    booking.checkedInBy = userId || booking.userId;
    await booking.save();
    
    // Audit log
    await logAuditEvent({
        action: 'booking_checked_in',
        userId: userId || booking.userId,
        entityType: 'booking',
        entityId: booking._id,
        newValues: { checkedInAt: now }
    });
    
    logger.info('Booking checked in', {
        bookingId: booking._id,
        bookingReference: booking.bookingReference,
        checkedInBy: userId || booking.userId
    });
    
    return {
        success: true,
        message: 'Check-in successful',
        booking: {
            id: booking._id,
            reference: booking.bookingReference,
            resourceId: booking.resourceId,
            startTime: booking.startTime,
            endTime: booking.endTime,
            checkedInAt: booking.checkedInAt
        }
    };
}

/**
 * Check for bookings that should be auto-released
 * Should be run by a scheduler every minute
 */
async function checkAndAutoRelease() {
    const now = new Date();
    
    // Find approved bookings that:
    // 1. Have started
    // 2. Haven't been checked in
    // 3. Are past their auto-release window
    // 4. Haven't been auto-released yet
    
    const candidates = await Booking.find({
        status: 'approved',
        checkedInAt: null,
        autoReleased: false,
        startTime: { $lte: now }
    }).populate('resourceId');
    
    const released = [];
    const errors = [];
    
    for (const booking of candidates) {
        try {
            const resource = booking.resourceId;
            if (!resource || !resource.checkInRequired) {
                continue; // Skip if check-in not required
            }
            
            const autoReleaseMinutes = resource.autoReleaseMinutes || 15;
            const releaseTime = DateTime.fromJSDate(booking.startTime)
                .plus({ minutes: autoReleaseMinutes })
                .toJSDate();
            
            if (now >= releaseTime) {
                // Auto-release the booking
                await autoReleaseBooking(booking._id);
                released.push(booking._id);
            }
        } catch (error) {
            errors.push({ bookingId: booking._id, error: error.message });
            logger.error('Error auto-releasing booking', { 
                bookingId: booking._id, 
                error: error.message 
            });
        }
    }
    
    if (released.length > 0) {
        logger.info('Auto-released bookings', { count: released.length, ids: released });
    }
    
    return { released, errors };
}

/**
 * Auto-release a specific booking
 */
async function autoReleaseBooking(bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new Error('Booking not found');
    }
    
    if (booking.checkedInAt) {
        throw new Error('Cannot auto-release: booking already checked in');
    }
    
    // Update booking status
    booking.status = 'no_show';
    booking.autoReleased = true;
    booking.autoReleasedAt = new Date();
    await booking.save();
    
    // Record analytics event
    await recordBookingEvent(booking, 'no_show');
    
    // Audit log
    await logAuditEvent({
        action: AuditActions.BOOKING_NO_SHOW,
        userId: null, // System action
        entityType: 'booking',
        entityId: booking._id,
        metadata: { autoReleased: true }
    });
    
    // Notify user
    await notifyBookingStatusChange(booking, 'cancelled', {
        cancelledBySelf: false,
        cancelledBy: 'System',
        cancellationReason: 'Auto-released due to no check-in'
    });
    
    logger.info('Booking auto-released', {
        bookingId: booking._id,
        bookingReference: booking.bookingReference
    });
    
    return booking;
}

/**
 * Send check-in reminders for upcoming bookings
 * Should be run by a scheduler
 */
async function sendCheckInReminders() {
    const now = new Date();
    
    // Find bookings starting in the next 15 minutes that haven't been reminded
    const windowStart = now;
    const windowEnd = DateTime.fromJSDate(now).plus({ minutes: 15 }).toJSDate();
    
    const bookings = await Booking.find({
        status: 'approved',
        checkedInAt: null,
        startTime: { $gte: windowStart, $lte: windowEnd }
    }).populate('resourceId');
    
    const sent = [];
    
    for (const booking of bookings) {
        const resource = booking.resourceId;
        if (!resource?.checkInRequired) continue;
        
        // Check if we already sent a reminder (check notification logs)
        const { NotificationLog } = require('../database/models');
        const existingReminder = await NotificationLog.findOne({
            bookingId: booking._id,
            type: 'check_in_reminder',
            createdAt: { $gte: DateTime.fromJSDate(now).minus({ hours: 1 }).toJSDate() }
        });
        
        if (!existingReminder) {
            const minutesUntilStart = Math.ceil(
                (new Date(booking.startTime) - now) / (1000 * 60)
            );
            
            await sendCheckInReminder(booking, resource.autoReleaseMinutes || 15);
            sent.push(booking._id);
        }
    }
    
    if (sent.length > 0) {
        logger.info('Sent check-in reminders', { count: sent.length });
    }
    
    return { sent };
}

/**
 * Generate QR code for a resource (for location-based check-in)
 */
async function generateResourceQR(resourceId) {
    const resource = await Resource.findById(resourceId);
    if (!resource) {
        throw new Error('Resource not found');
    }
    
    // Generate or get resource QR code
    if (!resource.qrCode) {
        resource.qrCode = uuidv4();
        await resource.save();
    }
    
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const locationCheckInUrl = `${baseUrl}/api/checkin/resource/${resource.qrCode}`;
    
    const qrDataUrl = await QRCode.toDataURL(locationCheckInUrl, {
        width: 400,
        margin: 2
    });
    
    return {
        resourceId: resource._id,
        resourceCode: resource.code,
        resourceName: resource.name,
        qrCode: resource.qrCode,
        checkInUrl: locationCheckInUrl,
        qrDataUrl
    };
}

/**
 * Process location-based check-in (scan QR at resource location)
 */
async function processLocationCheckIn(resourceQrCode, userId) {
    const resource = await Resource.findOne({ qrCode: resourceQrCode });
    if (!resource) {
        return {
            success: false,
            error: 'INVALID_RESOURCE',
            message: 'Invalid resource QR code'
        };
    }
    
    const now = new Date();
    const windowMinutes = resource.checkInWindowMinutes || 15;
    
    // Find the user's current booking for this resource
    const booking = await Booking.findOne({
        resourceId: resource._id,
        userId,
        status: 'approved',
        checkedInAt: null,
        startTime: {
            $lte: DateTime.fromJSDate(now).plus({ minutes: windowMinutes }).toJSDate()
        },
        endTime: { $gte: now }
    });
    
    if (!booking) {
        return {
            success: false,
            error: 'NO_BOOKING',
            message: 'No active booking found for you at this resource'
        };
    }
    
    // Process check-in using the booking's check-in code
    return processCheckIn(booking.checkInCode, userId);
}

/**
 * Get check-in statistics for a resource
 */
async function getCheckInStats(resourceId, startDate, endDate) {
    const bookings = await Booking.find({
        resourceId,
        startTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
        status: { $in: ['completed', 'no_show'] }
    });
    
    let checkedIn = 0;
    let noShow = 0;
    let totalCheckInTime = 0;
    
    for (const booking of bookings) {
        if (booking.checkedInAt) {
            checkedIn++;
            const checkInDelay = (new Date(booking.checkedInAt) - new Date(booking.startTime)) / (1000 * 60);
            totalCheckInTime += Math.max(0, checkInDelay);
        } else if (booking.status === 'no_show') {
            noShow++;
        }
    }
    
    return {
        resourceId,
        period: { startDate, endDate },
        totalBookings: bookings.length,
        checkedIn,
        noShows: noShow,
        checkInRate: bookings.length > 0 ? Math.round((checkedIn / bookings.length) * 100) : 0,
        noShowRate: bookings.length > 0 ? Math.round((noShow / bookings.length) * 100) : 0,
        averageCheckInDelay: checkedIn > 0 ? Math.round(totalCheckInTime / checkedIn) : 0
    };
}

module.exports = {
    generateCheckInQR,
    processCheckIn,
    checkAndAutoRelease,
    autoReleaseBooking,
    sendCheckInReminders,
    generateResourceQR,
    processLocationCheckIn,
    getCheckInStats
};
