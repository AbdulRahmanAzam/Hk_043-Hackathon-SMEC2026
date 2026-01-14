/**
 * Calendar Routes
 * Provides endpoints for calendar integration (ICS, Google Calendar, Outlook)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError, NotFoundError } = require('../utils/errors');
const calendarService = require('../services/calendarService');
const { Booking } = require('../database/models');

/**
 * GET /api/calendar/booking/:bookingId/ics
 * Download ICS file for a single booking
 */
router.get('/booking/:bookingId/ics', 
    authenticate,
    asyncHandler(async (req, res) => {
        const { bookingId } = req.params;
        
        const booking = await Booking.findById(bookingId)
            .populate('resourceId', 'name location')
            .populate('userId', 'email firstName lastName');
        
        if (!booking) {
            throw new NotFoundError('Booking');
        }
        
        // Check authorization
        if (req.user.role !== 'admin' && String(booking.userId._id) !== String(req.user.id)) {
            throw new ValidationError('You can only access your own bookings');
        }
        
        const icsContent = calendarService.generateBookingICS(booking);
        
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="booking-${booking.bookingReference}.ics"`);
        res.send(icsContent);
    })
);

/**
 * GET /api/calendar/bookings/ics
 * Download ICS file for multiple bookings
 */
router.get('/bookings/ics', 
    authenticate,
    asyncHandler(async (req, res) => {
        const { startDate, endDate, resourceId } = req.query;
        
        const query = {
            userId: req.user.id,
            status: { $in: ['approved', 'pending'] }
        };
        
        if (startDate) query.startTime = { $gte: new Date(startDate) };
        if (endDate) {
            query.endTime = query.endTime || {};
            query.endTime.$lte = new Date(endDate);
        }
        if (resourceId) query.resourceId = resourceId;
        
        const bookings = await Booking.find(query)
            .populate('resourceId', 'name location')
            .populate('userId', 'email firstName lastName');
        
        const icsContent = calendarService.generateMultipleBookingsICS(bookings);
        
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="my-bookings.ics"');
        res.send(icsContent);
    })
);

/**
 * GET /api/calendar/resource/:resourceId/ics
 * Download ICS schedule for a resource
 */
router.get('/resource/:resourceId/ics', 
    authenticate,
    asyncHandler(async (req, res) => {
        const { resourceId } = req.params;
        const { startDate, endDate } = req.query;
        
        const start = startDate ? new Date(startDate) : new Date();
        const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        const icsContent = await calendarService.generateResourceScheduleICS(resourceId, start, end);
        
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="resource-schedule-${resourceId}.ics"`);
        res.send(icsContent);
    })
);

/**
 * GET /api/calendar/booking/:bookingId/links
 * Get all calendar links for a booking
 */
router.get('/booking/:bookingId/links', 
    authenticate,
    asyncHandler(async (req, res) => {
        const { bookingId } = req.params;
        
        const booking = await Booking.findById(bookingId)
            .populate('resourceId', 'name location');
        
        if (!booking) {
            throw new NotFoundError('Booking');
        }
        
        // Check authorization
        if (req.user.role !== 'admin' && String(booking.userId) !== String(req.user.id)) {
            throw new ValidationError('You can only access your own bookings');
        }
        
        const links = calendarService.getAllCalendarLinks(booking);
        
        res.json({
            success: true,
            data: links
        });
    })
);

/**
 * GET /api/calendar/subscription-url
 * Get subscription URL for user's calendar
 */
router.get('/subscription-url', 
    authenticate,
    asyncHandler(async (req, res) => {
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const subscriptionUrl = calendarService.generateCalendarSubscriptionURL(
            req.user.id,
            baseUrl
        );
        
        res.json({
            success: true,
            data: {
                subscriptionUrl,
                instructions: 'Add this URL to your calendar app to sync your bookings automatically'
            }
        });
    })
);

module.exports = router;
