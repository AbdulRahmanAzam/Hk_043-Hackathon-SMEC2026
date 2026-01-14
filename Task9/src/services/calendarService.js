/**
 * Calendar Integration Service
 * 
 * Provides:
 * - ICS file generation
 * - Google Calendar compatibility
 * - Calendar export/download
 */

const ical = require('ical-generator').default;
const { Booking, Resource, User } = require('../database/models');
const { DateTime } = require('luxon');
const { logger } = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate ICS calendar file for a booking
 * 
 * @param {string} bookingId - Booking ID
 * @returns {Object} ICS data and filename
 */
async function generateBookingICS(bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new Error('Booking not found');
    }
    
    const resource = await Resource.findById(booking.resourceId);
    const user = await User.findById(booking.userId);
    
    const calendar = ical({
        name: 'Campus Booking',
        prodId: { company: 'Campus Resource Platform', product: 'Booking System' }
    });
    
    const event = calendar.createEvent({
        id: booking._id,
        start: booking.startTime,
        end: booking.endTime,
        summary: booking.title,
        description: buildEventDescription(booking, resource),
        location: resource?.location || '',
        url: `${process.env.APP_URL || 'http://localhost:3000'}/bookings/${booking._id}`,
        organizer: {
            name: 'Campus Resource Platform',
            email: process.env.SYSTEM_EMAIL || 'noreply@campus.edu'
        }
    });
    
    // Add attendee if user exists
    if (user) {
        event.createAttendee({
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            rsvp: true,
            role: 'REQ-PARTICIPANT'
        });
    }
    
    // Add alarm (reminder)
    event.createAlarm({
        type: 'display',
        trigger: 3600 // 1 hour before
    });
    
    event.createAlarm({
        type: 'display',
        trigger: 900 // 15 minutes before
    });
    
    return {
        icsString: calendar.toString(),
        filename: `booking-${booking.bookingReference}.ics`,
        mimeType: 'text/calendar'
    };
}

/**
 * Generate ICS for multiple bookings (e.g., user's schedule)
 * 
 * @param {Array} bookingIds - Array of booking IDs
 * @param {string} calendarName - Name for the calendar
 */
async function generateMultipleBookingsICS(bookingIds, calendarName = 'My Campus Bookings') {
    const bookings = await Booking.find({ 
        _id: { $in: bookingIds },
        status: { $in: ['approved', 'pending'] }
    });
    
    const resourceIds = [...new Set(bookings.map(b => b.resourceId))];
    const resources = await Resource.find({ _id: { $in: resourceIds } });
    const resourceMap = {};
    resources.forEach(r => { resourceMap[r._id] = r; });
    
    const calendar = ical({
        name: calendarName,
        prodId: { company: 'Campus Resource Platform', product: 'Booking System' }
    });
    
    for (const booking of bookings) {
        const resource = resourceMap[booking.resourceId];
        
        calendar.createEvent({
            id: booking._id,
            start: booking.startTime,
            end: booking.endTime,
            summary: `[${resource?.code || 'BOOKING'}] ${booking.title}`,
            description: buildEventDescription(booking, resource),
            location: resource?.location || '',
            status: booking.status === 'pending' ? 'TENTATIVE' : 'CONFIRMED'
        });
    }
    
    return {
        icsString: calendar.toString(),
        filename: `bookings-${DateTime.now().toFormat('yyyyMMdd')}.ics`,
        mimeType: 'text/calendar'
    };
}

/**
 * Generate ICS for a resource's schedule
 * 
 * @param {string} resourceId - Resource ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 */
async function generateResourceScheduleICS(resourceId, startDate, endDate) {
    const resource = await Resource.findById(resourceId);
    if (!resource) {
        throw new Error('Resource not found');
    }
    
    const bookings = await Booking.find({
        resourceId,
        startTime: { $gte: new Date(startDate) },
        endTime: { $lte: new Date(endDate) },
        status: { $in: ['approved'] }
    });
    
    const calendar = ical({
        name: `${resource.name} Schedule`,
        prodId: { company: 'Campus Resource Platform', product: 'Booking System' }
    });
    
    for (const booking of bookings) {
        calendar.createEvent({
            id: booking._id,
            start: booking.startTime,
            end: booking.endTime,
            summary: booking.title,
            description: `Purpose: ${booking.purpose}\nReference: ${booking.bookingReference}`,
            location: resource.location || ''
        });
    }
    
    return {
        icsString: calendar.toString(),
        filename: `${resource.code}-schedule-${DateTime.now().toFormat('yyyyMMdd')}.ics`,
        mimeType: 'text/calendar'
    };
}

/**
 * Generate a subscription-ready iCal URL
 * This creates a URL that can be subscribed to in calendar apps
 * 
 * @param {string} userId - User ID for personalized calendar
 * @returns {Object} Subscription URL and token
 */
function generateCalendarSubscriptionURL(userId) {
    // Generate a unique token for this subscription
    const token = uuidv4();
    
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    const subscriptionUrl = `${baseUrl}/api/calendar/subscribe/${userId}/${token}`;
    
    return {
        url: subscriptionUrl,
        webcalUrl: subscriptionUrl.replace('http', 'webcal').replace('https', 'webcal'),
        googleCalendarUrl: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(subscriptionUrl)}`,
        token
    };
}

/**
 * Generate Google Calendar add event URL
 * 
 * @param {Object} booking - Booking document
 * @param {Object} resource - Resource document
 */
function generateGoogleCalendarUrl(booking, resource) {
    const start = DateTime.fromJSDate(booking.startTime).toFormat("yyyyMMdd'T'HHmmss");
    const end = DateTime.fromJSDate(booking.endTime).toFormat("yyyyMMdd'T'HHmmss");
    
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: booking.title,
        dates: `${start}/${end}`,
        details: buildEventDescription(booking, resource),
        location: resource?.location || '',
        sprop: 'website:campus-booking'
    });
    
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate Outlook calendar add event URL
 */
function generateOutlookCalendarUrl(booking, resource) {
    const start = DateTime.fromJSDate(booking.startTime).toISO();
    const end = DateTime.fromJSDate(booking.endTime).toISO();
    
    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: booking.title,
        startdt: start,
        enddt: end,
        body: buildEventDescription(booking, resource),
        location: resource?.location || ''
    });
    
    return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`;
}

/**
 * Get all calendar links for a booking
 */
async function getAllCalendarLinks(bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) {
        throw new Error('Booking not found');
    }
    
    const resource = await Resource.findById(booking.resourceId);
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';
    
    return {
        downloadICS: `${baseUrl}/api/calendar/booking/${bookingId}/download`,
        googleCalendar: generateGoogleCalendarUrl(booking, resource),
        outlookCalendar: generateOutlookCalendarUrl(booking, resource),
        appleCalendar: `${baseUrl}/api/calendar/booking/${bookingId}/download` // ICS works for Apple
    };
}

/**
 * Build event description from booking data
 */
function buildEventDescription(booking, resource) {
    const lines = [
        `Booking Reference: ${booking.bookingReference}`,
        `Purpose: ${booking.purpose}`,
        `Resource: ${resource?.name || 'N/A'}`,
        `Type: ${resource?.type || 'N/A'}`,
        ''
    ];
    
    if (booking.description) {
        lines.push(`Description: ${booking.description}`);
        lines.push('');
    }
    
    if (booking.expectedAttendees) {
        lines.push(`Expected Attendees: ${booking.expectedAttendees}`);
    }
    
    if (booking.checkInCode) {
        lines.push('');
        lines.push(`Check-in Code: ${booking.checkInCode}`);
    }
    
    return lines.join('\n');
}

/**
 * Sync booking with external calendar (stub for future implementation)
 */
async function syncWithGoogleCalendar(booking, accessToken) {
    // This would integrate with Google Calendar API
    // Requires OAuth2 authentication flow
    
    logger.info('Google Calendar sync requested', {
        bookingId: booking._id,
        hasAccessToken: !!accessToken
    });
    
    // Placeholder for actual implementation
    return {
        synced: false,
        message: 'Google Calendar integration not yet implemented'
    };
}

module.exports = {
    generateBookingICS,
    generateMultipleBookingsICS,
    generateResourceScheduleICS,
    generateCalendarSubscriptionURL,
    generateGoogleCalendarUrl,
    generateOutlookCalendarUrl,
    getAllCalendarLinks,
    syncWithGoogleCalendar
};
