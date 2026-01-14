/**
 * Resource Routes
 * RESTful API endpoints for resource management
 */

const express = require('express');
const router = express.Router();
const resourceService = require('../services/resourceService');
const bookingService = require('../services/bookingService');
const { authenticate, authorize } = require('../middleware/auth');
const { createResourceValidation, idParamValidation, paginationValidation } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/resources
 * @desc    Create a new resource
 * @access  Private (Admin only)
 */
router.post('/', authenticate, authorize('admin'), createResourceValidation, asyncHandler(async (req, res) => {
    const resource = await resourceService.createResource(req.body, req.user);
    
    res.status(201).json({
        success: true,
        message: 'Resource created successfully',
        data: resource
    });
}));

/**
 * @route   GET /api/resources
 * @desc    Get all resources with optional filters
 * @access  Public (for browsing) or Private (for full details)
 */
router.get('/', paginationValidation, asyncHandler(async (req, res) => {
    const filters = {
        type: req.query.type,
        departmentId: req.query.departmentId,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : true,
        search: req.query.search,
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20
    };
    
    const result = await resourceService.getResources(filters);
    
    res.json({
        success: true,
        data: result.resources,
        pagination: result.pagination
    });
}));

/**
 * @route   GET /api/resources/types
 * @desc    Get list of resource types
 * @access  Public
 */
router.get('/types', (req, res) => {
    res.json({
        success: true,
        data: [
            { value: 'lab', label: 'Laboratory' },
            { value: 'hall', label: 'Hall/Auditorium' },
            { value: 'equipment', label: 'Equipment' },
            { value: 'meeting_room', label: 'Meeting Room' },
            { value: 'sports_facility', label: 'Sports Facility' }
        ]
    });
});

/**
 * @route   GET /api/resources/:id
 * @desc    Get resource by ID
 * @access  Public
 */
router.get('/:id', idParamValidation, asyncHandler(async (req, res) => {
    const resource = await resourceService.getResourceById(req.params.id);
    
    res.json({
        success: true,
        data: resource
    });
}));

/**
 * @route   PUT /api/resources/:id
 * @desc    Update a resource
 * @access  Private (Admin only)
 */
router.put('/:id', authenticate, authorize('admin'), idParamValidation, asyncHandler(async (req, res) => {
    const resource = await resourceService.updateResource(req.params.id, req.body, req.user);
    
    res.json({
        success: true,
        message: 'Resource updated successfully',
        data: resource
    });
}));

/**
 * @route   DELETE /api/resources/:id
 * @desc    Deactivate a resource (soft delete)
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, authorize('admin'), idParamValidation, asyncHandler(async (req, res) => {
    const resource = await resourceService.deactivateResource(req.params.id, req.user);
    
    res.json({
        success: true,
        message: 'Resource deactivated successfully',
        data: resource
    });
}));

/**
 * @route   GET /api/resources/:id/availability
 * @desc    Get availability slots for a resource
 * @access  Public
 */
router.get('/:id/availability', idParamValidation, asyncHandler(async (req, res) => {
    const slots = await resourceService.getAvailabilitySlots(req.params.id);
    
    res.json({
        success: true,
        data: slots
    });
}));

/**
 * @route   POST /api/resources/:id/availability
 * @desc    Add availability slot to a resource
 * @access  Private (Admin only)
 */
router.post('/:id/availability', authenticate, authorize('admin'), idParamValidation, asyncHandler(async (req, res) => {
    const slot = await resourceService.addAvailabilitySlot(req.params.id, req.body, req.user);
    
    res.status(201).json({
        success: true,
        message: 'Availability slot added',
        data: slot
    });
}));

/**
 * @route   DELETE /api/resources/:id/availability/:slotId
 * @desc    Delete availability slot
 * @access  Private (Admin only)
 */
router.delete('/:id/availability/:slotId', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
    await resourceService.deleteAvailabilitySlot(req.params.slotId, req.user);
    
    res.json({
        success: true,
        message: 'Availability slot deleted'
    });
}));

/**
 * @route   GET /api/resources/:id/slots
 * @desc    Get available time slots for a specific date
 * @access  Private
 */
router.get('/:id/slots', authenticate, idParamValidation, asyncHandler(async (req, res) => {
    const { date } = req.query;
    
    if (!date) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Date query parameter is required'
            }
        });
    }
    
    const slots = await bookingService.getAvailableSlots(req.params.id, date);
    
    res.json({
        success: true,
        data: slots
    });
}));

/**
 * @route   GET /api/resources/:id/utilization
 * @desc    Get resource utilization statistics
 * @access  Private (Admin, Faculty)
 */
router.get('/:id/utilization', authenticate, authorize('admin', 'faculty'), idParamValidation, asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'startDate and endDate query parameters are required'
            }
        });
    }
    
    const utilization = await resourceService.getResourceUtilization(
        req.params.id, 
        startDate, 
        endDate
    );
    
    res.json({
        success: true,
        data: utilization
    });
}));

module.exports = router;
