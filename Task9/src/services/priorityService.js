/**
 * Priority-Based Conflict Resolution Service
 * 
 * Handles booking conflicts with intelligent priority weighting:
 * - Department-based priority
 * - Academic vs Event vs External logic
 * - User role hierarchy
 * - Advance booking consideration
 */

const { Booking, Resource, User, Department } = require('../database/models');
const { logger } = require('../utils/logger');
const { DateTime } = require('luxon');

/**
 * Priority weights for different factors
 * Higher weight = higher priority
 */
const PRIORITY_WEIGHTS = {
    // Purpose-based weights
    purpose: {
        examination: 100,
        academic: 80,
        research: 70,
        workshop: 60,
        meeting: 50,
        event: 40,
        maintenance: 30
    },
    
    // Role-based weights
    role: {
        admin: 100,
        faculty: 70,
        student: 40
    },
    
    // Priority level multipliers
    priorityLevel: {
        critical: 2.0,
        high: 1.5,
        normal: 1.0,
        low: 0.5
    },
    
    // Advance booking bonus (earlier bookings get priority)
    advanceBookingFactor: 0.1, // 10% bonus per day in advance
    
    // Department match bonus
    departmentMatchBonus: 20,
    
    // Recurring booking bonus
    recurringBonus: 15
};

/**
 * Calculate priority score for a booking
 * 
 * @param {Object} booking - Booking document
 * @param {Object} user - User making the booking
 * @param {Object} resource - Resource being booked
 * @returns {number} Priority score (0-200+)
 */
async function calculatePriorityScore(booking, user, resource) {
    let score = 0;
    
    // 1. Purpose-based score
    score += PRIORITY_WEIGHTS.purpose[booking.purpose] || 50;
    
    // 2. Role-based score
    score += PRIORITY_WEIGHTS.role[user.role] || 40;
    
    // 3. Priority level multiplier
    const multiplier = PRIORITY_WEIGHTS.priorityLevel[booking.priority] || 1.0;
    score *= multiplier;
    
    // 4. Department match bonus
    if (resource.departmentId && user.departmentId === resource.departmentId) {
        score += PRIORITY_WEIGHTS.departmentMatchBonus;
    }
    
    // 5. Department priority weight (some departments have higher priority)
    if (user.departmentId) {
        const dept = await Department.findById(user.departmentId);
        if (dept && dept.priorityWeight) {
            score *= (1 + dept.priorityWeight / 10); // Up to 2x multiplier
        }
    }
    
    // 6. Advance booking factor (reward early bookers)
    const daysInAdvance = Math.max(0, 
        Math.ceil((new Date(booking.startTime) - new Date(booking.createdAt || Date.now())) / (1000 * 60 * 60 * 24))
    );
    score += daysInAdvance * PRIORITY_WEIGHTS.advanceBookingFactor * 10;
    
    // 7. Recurring booking bonus
    if (booking.parentBookingId || booking.recurrenceRule) {
        score += PRIORITY_WEIGHTS.recurringBonus;
    }
    
    // 8. External participants penalty (prefer internal bookings)
    if (booking.purposeDetails?.externalParticipants) {
        score *= 0.9; // 10% reduction
    }
    
    return Math.round(score);
}

/**
 * Resolve conflicts between bookings based on priority
 * 
 * @param {Array} conflictingBookings - Array of conflicting booking IDs
 * @param {Object} newBooking - New booking attempting to be created
 * @param {Object} user - User making the new booking
 * @param {Object} resource - Resource being booked
 * @returns {Object} Resolution result
 */
async function resolveConflict(conflictingBookings, newBooking, user, resource) {
    // Fetch full booking details with user info
    const conflicts = await Promise.all(
        conflictingBookings.map(async (bookingId) => {
            const booking = await Booking.findById(bookingId);
            if (!booking) return null;
            
            const bookingUser = await User.findById(booking.userId);
            const score = await calculatePriorityScore(booking, bookingUser || {}, resource);
            
            return {
                booking,
                user: bookingUser,
                priorityScore: score
            };
        })
    );
    
    const validConflicts = conflicts.filter(c => c !== null);
    
    // Calculate new booking's priority
    const newBookingScore = await calculatePriorityScore(newBooking, user, resource);
    
    // Find highest priority existing booking
    const highestExisting = validConflicts.reduce(
        (max, c) => c.priorityScore > max.priorityScore ? c : max,
        { priorityScore: 0 }
    );
    
    // Resolution logic
    const result = {
        newBookingScore,
        highestExistingScore: highestExisting.priorityScore,
        canOverride: false,
        requiresAdminApproval: false,
        suggestedAction: 'reject',
        reason: '',
        conflictDetails: validConflicts.map(c => ({
            bookingId: c.booking._id,
            bookingReference: c.booking.bookingReference,
            userId: c.booking.userId,
            userName: c.user ? `${c.user.firstName} ${c.user.lastName}` : 'Unknown',
            priorityScore: c.priorityScore,
            purpose: c.booking.purpose,
            status: c.booking.status
        }))
    };
    
    // Priority difference threshold for automatic override
    const OVERRIDE_THRESHOLD = 50;
    const ADMIN_REVIEW_THRESHOLD = 20;
    
    const scoreDifference = newBookingScore - highestExisting.priorityScore;
    
    if (scoreDifference > OVERRIDE_THRESHOLD) {
        result.canOverride = true;
        result.suggestedAction = 'override';
        result.reason = `New booking has significantly higher priority (${newBookingScore} vs ${highestExisting.priorityScore})`;
    } else if (scoreDifference > ADMIN_REVIEW_THRESHOLD) {
        result.requiresAdminApproval = true;
        result.suggestedAction = 'admin_review';
        result.reason = `Priority scores are close, admin review recommended`;
    } else if (user.role === 'admin') {
        // Admins can always override
        result.canOverride = true;
        result.suggestedAction = 'admin_override';
        result.reason = 'Admin override available';
    } else {
        result.suggestedAction = 'reject';
        result.reason = `Existing booking has higher or equal priority (${highestExisting.priorityScore} vs ${newBookingScore})`;
    }
    
    return result;
}

/**
 * Check if a booking can be bumped (cancelled/moved) by a higher priority booking
 * 
 * @param {string} existingBookingId - Existing booking ID
 * @param {Object} newBooking - New higher priority booking
 * @param {Object} newUser - User making new booking
 */
async function canBumpBooking(existingBookingId, newBooking, newUser) {
    const existing = await Booking.findById(existingBookingId);
    if (!existing) return { canBump: false, reason: 'Booking not found' };
    
    const existingUser = await User.findById(existing.userId);
    const resource = await Resource.findById(existing.resourceId);
    
    const existingScore = await calculatePriorityScore(existing, existingUser || {}, resource);
    const newScore = await calculatePriorityScore(newBooking, newUser, resource);
    
    // Minimum score difference required to bump
    const BUMP_THRESHOLD = 40;
    
    // Minimum advance notice required (in hours)
    const MIN_NOTICE_HOURS = 24;
    const hoursUntilStart = (new Date(existing.startTime) - new Date()) / (1000 * 60 * 60);
    
    if (hoursUntilStart < MIN_NOTICE_HOURS && newUser.role !== 'admin') {
        return {
            canBump: false,
            reason: `Cannot bump bookings less than ${MIN_NOTICE_HOURS} hours before start time`,
            existingScore,
            newScore
        };
    }
    
    if (newScore - existingScore >= BUMP_THRESHOLD) {
        return {
            canBump: true,
            reason: 'New booking has significantly higher priority',
            existingScore,
            newScore,
            scoreDifference: newScore - existingScore,
            requiresNotification: true
        };
    }
    
    return {
        canBump: false,
        reason: 'Priority difference not sufficient for bump',
        existingScore,
        newScore,
        scoreDifference: newScore - existingScore,
        requiredDifference: BUMP_THRESHOLD
    };
}

/**
 * Execute a booking bump (cancel existing, notify user)
 * Only admins or system can execute this
 * 
 * @param {string} existingBookingId - Booking to bump
 * @param {Object} newBooking - New booking data
 * @param {Object} executor - User/system executing the bump
 */
async function executeBump(existingBookingId, newBooking, executor) {
    const existing = await Booking.findById(existingBookingId);
    if (!existing) {
        throw new Error('Existing booking not found');
    }
    
    // Store bump info for notification
    const bumpInfo = {
        originalBookingId: existing._id,
        originalBookingRef: existing.bookingReference,
        originalUserId: existing.userId,
        bumpedBy: executor.id,
        bumpReason: 'Higher priority booking',
        bumpedAt: new Date()
    };
    
    // Update existing booking to cancelled
    existing.status = 'cancelled';
    existing.cancelledBy = executor.id;
    existing.cancelledAt = new Date();
    existing.cancellationReason = `Bumped by higher priority booking. Original booking reference: ${existing.bookingReference}`;
    await existing.save();
    
    logger.info('Booking bumped by higher priority', {
        bumpedBookingId: existingBookingId,
        bumpedBy: executor.id
    });
    
    return bumpInfo;
}

/**
 * Get priority breakdown for a booking
 * Useful for transparency and debugging
 */
async function getPriorityBreakdown(bookingId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) return null;
    
    const user = await User.findById(booking.userId);
    const resource = await Resource.findById(booking.resourceId);
    const dept = user?.departmentId ? await Department.findById(user.departmentId) : null;
    
    const breakdown = {
        bookingId,
        bookingReference: booking.bookingReference,
        components: {
            purposeScore: PRIORITY_WEIGHTS.purpose[booking.purpose] || 50,
            roleScore: PRIORITY_WEIGHTS.role[user?.role] || 40,
            priorityMultiplier: PRIORITY_WEIGHTS.priorityLevel[booking.priority] || 1.0,
            departmentMatchBonus: (resource?.departmentId && user?.departmentId === resource.departmentId) 
                ? PRIORITY_WEIGHTS.departmentMatchBonus : 0,
            departmentWeight: dept?.priorityWeight || 1,
            recurringBonus: (booking.parentBookingId || booking.recurrenceRule) 
                ? PRIORITY_WEIGHTS.recurringBonus : 0,
            externalPenalty: booking.purposeDetails?.externalParticipants ? '-10%' : 'none'
        },
        finalScore: booking.priorityScore || await calculatePriorityScore(booking, user || {}, resource)
    };
    
    return breakdown;
}

/**
 * Suggest best time slots considering priority and conflicts
 * For high priority bookings, may suggest slots that could bump existing bookings
 */
async function suggestPriorityAwareSlots(resourceId, startDate, endDate, user, purpose, priority = 'normal') {
    const resource = await Resource.findById(resourceId);
    if (!resource) return [];
    
    // Get all bookings in range
    const existingBookings = await Booking.find({
        resourceId,
        startTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
        status: { $in: ['pending', 'approved'] }
    });
    
    // Calculate what our priority score would be
    const mockBooking = { purpose, priority, startTime: new Date(startDate), createdAt: new Date() };
    const ourScore = await calculatePriorityScore(mockBooking, user, resource);
    
    const suggestions = [];
    
    // Check each existing booking
    for (const existing of existingBookings) {
        const existingUser = await User.findById(existing.userId);
        const existingScore = await calculatePriorityScore(existing, existingUser || {}, resource);
        
        if (ourScore - existingScore >= 40) { // Could potentially bump
            suggestions.push({
                slot: {
                    startTime: existing.startTime,
                    endTime: existing.endTime
                },
                type: 'bumpable',
                existingBooking: {
                    id: existing._id,
                    reference: existing.bookingReference,
                    priorityScore: existingScore
                },
                ourPriorityScore: ourScore,
                scoreDifference: ourScore - existingScore,
                message: 'This slot could be made available by bumping a lower priority booking'
            });
        }
    }
    
    return suggestions;
}

module.exports = {
    calculatePriorityScore,
    resolveConflict,
    canBumpBooking,
    executeBump,
    getPriorityBreakdown,
    suggestPriorityAwareSlots,
    PRIORITY_WEIGHTS
};
