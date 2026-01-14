/**
 * Resource Service - MongoDB Version
 * Handles CRUD operations for campus resources
 */

const { Resource, Department, Booking } = require('../database/models');
const { NotFoundError, ValidationError, AuthorizationError, ConflictError } = require('../utils/errors');
const { logAuditEvent, AuditActions } = require('./auditService');

/**
 * Create a new resource
 */
async function createResource(resourceData, admin) {
    if (admin.role !== 'admin') {
        throw new AuthorizationError('Only admins can create resources');
    }
    
    const {
        code,
        name,
        type,
        departmentId,
        description,
        location,
        building,
        floor,
        capacity,
        attributes,
        minBookingDurationMinutes,
        maxBookingDurationMinutes,
        advanceBookingDays,
        requiresApproval,
        allowedRoles,
        restrictedToDepartment
    } = resourceData;
    
    // Validate department if provided
    if (departmentId) {
        const dept = await Department.findOne({ _id: departmentId, isActive: true });
        if (!dept) {
            throw new ValidationError('Invalid department ID');
        }
    }
    
    const resource = new Resource({
        code,
        name,
        type,
        departmentId: departmentId || null,
        description: description || null,
        location: location || null,
        building: building || null,
        floor: floor || null,
        capacity: capacity || null,
        attributes: attributes || {},
        minBookingDurationMinutes: minBookingDurationMinutes || 30,
        maxBookingDurationMinutes: maxBookingDurationMinutes || 480,
        advanceBookingDays: advanceBookingDays || 30,
        requiresApproval: requiresApproval !== false,
        allowedRoles: allowedRoles || ['student', 'faculty', 'admin'],
        restrictedToDepartment: restrictedToDepartment || false
    });
    
    await resource.save();
    
    await logAuditEvent({
        action: AuditActions.RESOURCE_CREATED,
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        entityType: 'resource',
        entityId: resource._id,
        newValues: { code, name, type }
    });
    
    return formatResourceResponse(resource);
}

/**
 * Get resource by ID
 */
async function getResourceById(resourceId) {
    const resource = await Resource.findById(resourceId)
        .populate('departmentId', 'name code');
    
    if (!resource) {
        throw new NotFoundError('Resource');
    }
    
    return formatResourceResponse(resource);
}

/**
 * Get all resources with filters
 */
async function getResources(filters = {}) {
    const {
        type,
        departmentId,
        isActive,
        search,
        page = 1,
        limit = 20
    } = filters;
    
    const query = {};
    
    if (type) query.type = type;
    if (departmentId) query.departmentId = departmentId;
    if (isActive !== undefined) query.isActive = isActive;
    
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { code: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } }
        ];
    }
    
    const skip = (page - 1) * limit;
    
    const [resources, total] = await Promise.all([
        Resource.find(query)
            .populate('departmentId', 'name code')
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit),
        Resource.countDocuments(query)
    ]);
    
    return {
        resources: resources.map(formatResourceResponse),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

/**
 * Update a resource
 */
async function updateResource(resourceId, updates, admin) {
    if (admin.role !== 'admin') {
        throw new AuthorizationError('Only admins can update resources');
    }
    
    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
        throw new NotFoundError('Resource');
    }
    
    const oldValues = resource.toObject();
    
    const allowedFields = [
        'name', 'description', 'location', 'building', 'floor', 'capacity',
        'attributes', 'minBookingDurationMinutes', 'maxBookingDurationMinutes',
        'advanceBookingDays', 'requiresApproval', 'allowedRoles',
        'restrictedToDepartment', 'isActive'
    ];
    
    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
            resource[key] = value;
        }
    }
    
    await resource.save();
    
    await logAuditEvent({
        action: AuditActions.RESOURCE_UPDATED,
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        entityType: 'resource',
        entityId: resourceId,
        oldValues,
        newValues: updates
    });
    
    return formatResourceResponse(resource);
}

/**
 * Deactivate a resource (soft delete)
 */
async function deactivateResource(resourceId, admin) {
    if (admin.role !== 'admin') {
        throw new AuthorizationError('Only admins can deactivate resources');
    }
    
    // Check for pending or approved future bookings
    const bookingsCount = await Booking.countDocuments({
        resourceId,
        status: { $in: ['pending', 'approved'] },
        endTime: { $gt: new Date() }
    });
    
    if (bookingsCount > 0) {
        throw new ConflictError(
            'Cannot deactivate resource with active future bookings. Please cancel or reassign them first.'
        );
    }
    
    const resource = await Resource.findByIdAndUpdate(
        resourceId,
        { isActive: false },
        { new: true }
    );
    
    if (!resource) {
        throw new NotFoundError('Resource');
    }
    
    await logAuditEvent({
        action: AuditActions.RESOURCE_DELETED,
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        entityType: 'resource',
        entityId: resourceId
    });
    
    return formatResourceResponse(resource);
}

/**
 * Add availability slot to a resource
 */
async function addAvailabilitySlot(resourceId, slotData, admin) {
    if (admin.role !== 'admin') {
        throw new AuthorizationError('Only admins can manage availability slots');
    }
    
    const resource = await Resource.findById(resourceId);
    if (!resource) {
        throw new NotFoundError('Resource');
    }
    
    const {
        dayOfWeek,
        startTime,
        endTime,
        specificDate,
        isAvailable,
        effectiveFrom,
        effectiveUntil,
        notes
    } = slotData;
    
    const slot = {
        dayOfWeek,
        startTime,
        endTime,
        specificDate: specificDate || null,
        isAvailable: isAvailable !== false,
        effectiveFrom: effectiveFrom || new Date(),
        effectiveUntil: effectiveUntil || null,
        notes: notes || null
    };
    
    resource.availabilitySlots.push(slot);
    await resource.save();
    
    const addedSlot = resource.availabilitySlots[resource.availabilitySlots.length - 1];
    
    await logAuditEvent({
        action: AuditActions.AVAILABILITY_CREATED,
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        entityType: 'availability_slot',
        entityId: addedSlot._id,
        newValues: slotData
    });
    
    return addedSlot;
}

/**
 * Get availability slots for a resource
 */
async function getAvailabilitySlots(resourceId) {
    const resource = await Resource.findById(resourceId).select('availabilitySlots');
    
    if (!resource) {
        throw new NotFoundError('Resource');
    }
    
    return resource.availabilitySlots.sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.startTime.localeCompare(b.startTime);
    });
}

/**
 * Delete availability slot
 */
async function deleteAvailabilitySlot(resourceId, slotId, admin) {
    if (admin.role !== 'admin') {
        throw new AuthorizationError('Only admins can delete availability slots');
    }
    
    const resource = await Resource.findById(resourceId);
    
    if (!resource) {
        throw new NotFoundError('Resource');
    }
    
    const slot = resource.availabilitySlots.id(slotId);
    
    if (!slot) {
        throw new NotFoundError('Availability slot');
    }
    
    slot.deleteOne();
    await resource.save();
    
    await logAuditEvent({
        action: AuditActions.AVAILABILITY_DELETED,
        userId: admin.id,
        userEmail: admin.email,
        userRole: admin.role,
        entityType: 'availability_slot',
        entityId: slotId
    });
    
    return { deleted: true };
}

/**
 * Get resource utilization statistics
 */
async function getResourceUtilization(resourceId, startDate, endDate) {
    const stats = await Booking.aggregate([
        {
            $match: {
                resourceId: require('mongoose').Types.ObjectId.createFromHexString(resourceId),
                startTime: { $gte: new Date(startDate) },
                endTime: { $lte: new Date(endDate) }
            }
        },
        {
            $group: {
                _id: null,
                totalBookings: { $sum: 1 },
                completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                noShows: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } },
                upcoming: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
                totalHours: {
                    $sum: {
                        $cond: [
                            { $in: ['$status', ['completed', 'approved']] },
                            { $divide: [{ $subtract: ['$endTime', '$startTime'] }, 3600000] },
                            0
                        ]
                    }
                },
                activeDays: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } } }
            }
        }
    ]);
    
    const result = stats[0] || {
        totalBookings: 0,
        completed: 0,
        cancelled: 0,
        noShows: 0,
        upcoming: 0,
        totalHours: 0,
        activeDays: []
    };
    
    const totalDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    const utilizationRate = totalDays > 0
        ? (result.totalHours / (totalDays * 8) * 100).toFixed(2)
        : 0;
    
    return {
        resourceId,
        period: { startDate, endDate },
        totalBookings: result.totalBookings,
        completed: result.completed,
        cancelled: result.cancelled,
        noShows: result.noShows,
        upcoming: result.upcoming,
        totalBookedHours: result.totalHours.toFixed(2),
        activeDays: result.activeDays.length,
        utilizationRate: `${utilizationRate}%`
    };
}

/**
 * Format resource for API response
 */
function formatResourceResponse(resource) {
    const dept = resource.departmentId;
    
    return {
        id: resource._id,
        code: resource.code,
        name: resource.name,
        type: resource.type,
        department: dept ? {
            id: typeof dept === 'object' ? dept._id : dept,
            name: dept.name,
            code: dept.code
        } : null,
        description: resource.description,
        location: resource.location,
        building: resource.building,
        floor: resource.floor,
        capacity: resource.capacity,
        attributes: resource.attributes,
        bookingConstraints: {
            minDurationMinutes: resource.minBookingDurationMinutes,
            maxDurationMinutes: resource.maxBookingDurationMinutes,
            advanceBookingDays: resource.advanceBookingDays,
            requiresApproval: resource.requiresApproval
        },
        accessControl: {
            allowedRoles: resource.allowedRoles,
            restrictedToDepartment: resource.restrictedToDepartment
        },
        isActive: resource.isActive,
        createdAt: resource.createdAt,
        updatedAt: resource.updatedAt
    };
}

module.exports = {
    createResource,
    getResourceById,
    getResources,
    updateResource,
    deactivateResource,
    addAvailabilitySlot,
    getAvailabilitySlots,
    deleteAvailabilitySlot,
    getResourceUtilization
};
