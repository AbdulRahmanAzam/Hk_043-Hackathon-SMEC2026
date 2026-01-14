/**
 * Booking Routes
 * RESTful API endpoints for booking management
 */

const express = require('express');
const router = express.Router();
const bookingService = require('../services/bookingService');
const approvalService = require('../services/approvalService');
const { authenticate, authorize } = require('../middleware/auth');
const { 
    createBookingValidation, 
    cancelBookingValidation,
    approveBookingValidation,
    idParamValidation,
    paginationValidation,
    dateRangeValidation
} = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking
 * @access  Private (All authenticated users based on resource permissions)
 * 
 * @body    {
 *            resourceId: UUID,
 *            startTime: ISO8601 string,
 *            endTime: ISO8601 string,
 *            purpose: 'academic'|'research'|'event'|'maintenance'|'examination'|'workshop'|'meeting',
 *            title: string,
 *            description?: string,
 *            purposeDetails?: object,
 *            expectedAttendees?: number
 *          }
 * 
 * @returns {
 *            success: true,
 *            data: { booking object }
 *          }
 */
router.post('/', authenticate, createBookingValidation, asyncHandler(async (req, res) => {
    const booking = await bookingService.createBooking(req.body, req.user);
    
    res.status(201).json({
        success: true,
        message: booking.status === 'approved' 
            ? 'Booking created and auto-approved' 
            : 'Booking created and pending approval',
        data: booking
    });
}));

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings (filtered by user role)
 * @access  Private
 * 
 * @query   resourceId, userId (admin only), status, purpose, startDate, endDate, page, limit
 */
router.get('/', authenticate, paginationValidation, dateRangeValidation, asyncHandler(async (req, res) => {
    const filters = {
        resourceId: req.query.resourceId,
        userId: req.query.userId,
        status: req.query.status,
        purpose: req.query.purpose,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20
    };
    
    const result = await bookingService.getBookings(filters, req.user);
    
    res.json({
        success: true,
        data: result.bookings,
        pagination: result.pagination
    });
}));

/**
 * @route   GET /api/bookings/my
 * @desc    Get current user's bookings
 * @access  Private
 */
router.get('/my', authenticate, paginationValidation, asyncHandler(async (req, res) => {
    const filters = {
        userId: req.user.id,
        status: req.query.status,
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20
    };
    
    // Temporarily override to allow seeing own bookings
    const result = await bookingService.getBookings(filters, { ...req.user, role: 'admin' });
    
    // Filter to only user's bookings
    const userBookings = result.bookings.filter(b => b.userId === req.user.id);
    
    res.json({
        success: true,
        data: userBookings,
        pagination: result.pagination
    });
}));

/**
 * @route   GET /api/bookings/pending
 * @desc    Get pending bookings for approval (admin/faculty)
 * @access  Private (Admin, Faculty)
 */
router.get('/pending', authenticate, authorize('admin', 'faculty'), asyncHandler(async (req, res) => {
    const filters = {
        resourceId: req.query.resourceId,
        departmentId: req.query.departmentId,
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20
    };
    
    const result = await approvalService.getPendingBookings(req.user, filters);
    
    res.json({
        success: true,
        data: result.bookings,
        pagination: result.pagination
    });
}));

/**
 * @route   GET /api/bookings/:id
 * @desc    Get booking by ID
 * @access  Private
 */
router.get('/:id', authenticate, idParamValidation, asyncHandler(async (req, res) => {
    const booking = await bookingService.getBookingById(req.params.id, req.user);
    
    res.json({
        success: true,
        data: booking
    });
}));

/**
 * @route   GET /api/bookings/:id/history
 * @desc    Get approval workflow history for a booking
 * @access  Private
 */
router.get('/:id/history', authenticate, idParamValidation, asyncHandler(async (req, res) => {
    // First verify user has access to view this booking
    await bookingService.getBookingById(req.params.id, req.user);
    
    const history = await approvalService.getApprovalHistory(req.params.id);
    
    res.json({
        success: true,
        data: history
    });
}));

/**
 * @route   POST /api/bookings/:id/approve
 * @desc    Approve a pending booking
 * @access  Private (Admin, Faculty)
 */
router.post('/:id/approve', authenticate, authorize('admin', 'faculty'), approveBookingValidation, asyncHandler(async (req, res) => {
    const booking = await approvalService.approveBooking(
        req.params.id, 
        req.user, 
        req.body.notes
    );
    
    res.json({
        success: true,
        message: 'Booking approved successfully',
        data: bookingService.formatBookingResponse(booking)
    });
}));

/**
 * @route   POST /api/bookings/:id/decline
 * @desc    Decline a pending booking
 * @access  Private (Admin, Faculty)
 */
router.post('/:id/decline', authenticate, authorize('admin', 'faculty'), asyncHandler(async (req, res) => {
    const { reason } = req.body;
    
    if (!reason || reason.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Decline reason is required'
            }
        });
    }
    
    const booking = await approvalService.declineBooking(
        req.params.id, 
        req.user, 
        reason
    );
    
    res.json({
        success: true,
        message: 'Booking declined',
        data: bookingService.formatBookingResponse(booking)
    });
}));

/**
 * @route   POST /api/bookings/:id/override-approve
 * @desc    Override approve a declined booking (Admin only)
 * @access  Private (Admin)
 */
router.post('/:id/override-approve', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    const { notes } = req.body;
    
    if (!notes || notes.trim().length === 0) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Override reason is required'
            }
        });
    }
    
    const booking = await approvalService.overrideApprove(
        req.params.id, 
        req.user, 
        notes
    );
    
    res.json({
        success: true,
        message: 'Booking override approved',
        data: bookingService.formatBookingResponse(booking)
    });
}));

/**
 * @route   POST /api/bookings/:id/cancel
 * @desc    Cancel a booking
 * @access  Private (Owner or Admin)
 */
router.post('/:id/cancel', authenticate, cancelBookingValidation, asyncHandler(async (req, res) => {
    const booking = await bookingService.cancelBooking(
        req.params.id, 
        req.user, 
        req.body.reason
    );
    
    res.json({
        success: true,
        message: 'Booking cancelled successfully',
        data: booking
    });
}));

/**
 * @route   POST /api/bookings/:id/complete
 * @desc    Mark booking as completed
 * @access  Private (Admin)
 */
router.post('/:id/complete', authenticate, authorize('admin'), idParamValidation, asyncHandler(async (req, res) => {
    const booking = await bookingService.completeBooking(req.params.id, req.user);
    
    res.json({
        success: true,
        message: 'Booking marked as completed',
        data: booking
    });
}));

/**
 * @route   POST /api/bookings/:id/no-show
 * @desc    Mark booking as no-show
 * @access  Private (Admin)
 */
router.post('/:id/no-show', authenticate, authorize('admin'), idParamValidation, asyncHandler(async (req, res) => {
    const booking = await bookingService.markNoShow(req.params.id, req.user);
    
    res.json({
        success: true,
        message: 'Booking marked as no-show',
        data: booking
    });
}));

module.exports = router;
