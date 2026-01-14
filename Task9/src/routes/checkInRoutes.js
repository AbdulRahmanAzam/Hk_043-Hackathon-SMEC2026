/**
 * Check-In Routes
 * Provides endpoints for QR check-in and auto-release functionality
 */

const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { ValidationError, NotFoundError } = require('../utils/errors');
const checkInService = require('../services/checkInService');
const { Booking } = require('../database/models');

/**
 * GET /api/checkin/qr/:bookingId
 * Generate QR code for check-in
 */
router.get('/qr/:bookingId', 
    authenticate,
    asyncHandler(async (req, res) => {
        const { bookingId } = req.params;
        const { format = 'dataUrl' } = req.query;
        
        const booking = await Booking.findById(bookingId);
        
        if (!booking) {
            throw new NotFoundError('Booking');
        }
        
        // Check authorization
        if (req.user.role !== 'admin' && String(booking.userId) !== String(req.user.id)) {
            throw new ValidationError('You can only access your own bookings');
        }
        
        const qrData = await checkInService.generateCheckInQR(booking, format);
        
        res.json({
            success: true,
            data: qrData
        });
    })
);

/**
 * POST /api/checkin/process
 * Process check-in using QR code data
 */
router.post('/process', 
    authenticate,
    asyncHandler(async (req, res) => {
        const { bookingId, checkInCode } = req.body;
        
        if (!bookingId || !checkInCode) {
            throw new ValidationError('bookingId and checkInCode are required');
        }
        
        const result = await checkInService.processCheckIn(
            bookingId,
            checkInCode,
            req.user.id
        );
        
        res.json({
            success: true,
            data: result
        });
    })
);

/**
 * POST /api/checkin/location
 * Process location-based check-in using resource QR
 */
router.post('/location', 
    authenticate,
    asyncHandler(async (req, res) => {
        const { resourceId } = req.body;
        
        if (!resourceId) {
            throw new ValidationError('resourceId is required');
        }
        
        const result = await checkInService.processLocationCheckIn(
            resourceId,
            req.user.id
        );
        
        res.json({
            success: true,
            data: result
        });
    })
);

/**
 * GET /api/checkin/resource-qr/:resourceId
 * Generate QR code for a resource (for location-based check-in)
 */
router.get('/resource-qr/:resourceId', 
    authenticate,
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const { resourceId } = req.params;
        const { format = 'dataUrl' } = req.query;
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const qrData = await checkInService.generateResourceQR(resourceId, baseUrl, format);
        
        res.json({
            success: true,
            data: qrData
        });
    })
);

/**
 * GET /api/checkin/stats
 * Get check-in statistics (admin only)
 */
router.get('/stats', 
    authenticate,
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const { startDate, endDate, resourceId } = req.query;
        
        const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const end = endDate ? new Date(endDate) : new Date();
        
        const stats = await checkInService.getCheckInStats(start, end, resourceId);
        
        res.json({
            success: true,
            data: stats
        });
    })
);

/**
 * POST /api/checkin/manual
 * Manual check-in by admin
 */
router.post('/manual', 
    authenticate,
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const { bookingId } = req.body;
        
        if (!bookingId) {
            throw new ValidationError('bookingId is required');
        }
        
        const booking = await Booking.findById(bookingId);
        
        if (!booking) {
            throw new NotFoundError('Booking');
        }
        
        if (booking.status !== 'approved') {
            throw new ValidationError('Only approved bookings can be checked in');
        }
        
        if (booking.checkedInAt) {
            throw new ValidationError('Booking is already checked in');
        }
        
        booking.checkedInAt = new Date();
        booking.checkedInBy = req.user.id;
        await booking.save();
        
        res.json({
            success: true,
            message: 'Manual check-in successful',
            data: {
                bookingId: booking._id,
                checkedInAt: booking.checkedInAt
            }
        });
    })
);

/**
 * POST /api/checkin/trigger-auto-release
 * Manually trigger auto-release check (admin only)
 */
router.post('/trigger-auto-release', 
    authenticate,
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const released = await checkInService.checkAndAutoRelease();
        
        res.json({
            success: true,
            message: `Auto-release check completed. Released ${released.length} bookings.`,
            data: { releasedBookings: released }
        });
    })
);

module.exports = router;
