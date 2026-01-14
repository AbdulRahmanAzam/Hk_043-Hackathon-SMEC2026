/**
 * Smart Slot Recommendation Engine
 * 
 * Analyzes historical booking data to:
 * - Label slots as Low/Medium/High Demand or Recommended
 * - Provide intelligent slot suggestions
 * - Learn from booking patterns
 */

const { Booking, BookingAnalytics, SlotRecommendation, Resource } = require('../database/models');
const { logger } = require('../utils/logger');
const { DateTime } = require('luxon');

/**
 * Demand level thresholds (configurable)
 */
const DEMAND_THRESHOLDS = {
    LOW: 0.3,      // < 30% utilization
    MEDIUM: 0.6,   // 30-60% utilization
    HIGH: 0.85,    // 60-85% utilization
    RECOMMENDED: 0.5 // Sweet spot for recommendations
};

/**
 * Analyze historical data and update slot recommendations
 * Should be run periodically (e.g., daily via cron)
 * 
 * @param {string} resourceId - Optional: specific resource to analyze
 * @param {number} daysBack - Number of days of historical data to analyze
 */
async function analyzeAndUpdateRecommendations(resourceId = null, daysBack = 30) {
    try {
        logger.info('Starting slot recommendation analysis', { resourceId, daysBack });
        
        const query = resourceId ? { resourceId } : {};
        const startDate = DateTime.now().minus({ days: daysBack }).toJSDate();
        
        // Get resources to analyze
        const resources = resourceId 
            ? [await Resource.findById(resourceId)]
            : await Resource.find({ isActive: true });
        
        for (const resource of resources) {
            if (!resource) continue;
            
            await analyzeResourceSlots(resource._id, startDate);
        }
        
        logger.info('Slot recommendation analysis completed');
        return { success: true, analyzedResources: resources.length };
        
    } catch (error) {
        logger.error('Error in slot recommendation analysis', { error: error.message });
        throw error;
    }
}

/**
 * Analyze slots for a specific resource
 */
async function analyzeResourceSlots(resourceId, startDate) {
    // Get historical bookings
    const bookings = await Booking.find({
        resourceId,
        startTime: { $gte: startDate },
        status: { $in: ['completed', 'approved', 'no_show'] }
    });
    
    // Aggregate by day of week and hour
    const slotStats = {};
    
    for (const booking of bookings) {
        const start = DateTime.fromJSDate(booking.startTime);
        const dayOfWeek = start.weekday % 7; // Convert to 0-6 (Sunday=0)
        const hourSlot = start.hour;
        const duration = (booking.endTime - booking.startTime) / (1000 * 60); // in minutes
        
        const key = `${dayOfWeek}-${hourSlot}`;
        
        if (!slotStats[key]) {
            slotStats[key] = {
                dayOfWeek,
                hourSlot,
                totalBookings: 0,
                completedBookings: 0,
                noShows: 0,
                totalDuration: 0,
                conflictAttempts: 0
            };
        }
        
        slotStats[key].totalBookings++;
        slotStats[key].totalDuration += duration;
        
        if (booking.status === 'completed') {
            slotStats[key].completedBookings++;
        } else if (booking.status === 'no_show') {
            slotStats[key].noShows++;
        }
    }
    
    // Calculate demand levels and update recommendations
    const totalWeeks = Math.ceil((Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const availableMinutesPerSlot = 60 * totalWeeks; // 1 hour per slot per week
    
    for (const [key, stats] of Object.entries(slotStats)) {
        const utilizationRate = stats.totalDuration / availableMinutesPerSlot;
        const avgDuration = stats.totalDuration / Math.max(stats.totalBookings, 1);
        const noShowRate = stats.noShows / Math.max(stats.totalBookings, 1);
        
        // Calculate demand level
        let demandLevel;
        if (utilizationRate < DEMAND_THRESHOLDS.LOW) {
            demandLevel = 'low';
        } else if (utilizationRate < DEMAND_THRESHOLDS.MEDIUM) {
            demandLevel = 'medium';
        } else if (utilizationRate < DEMAND_THRESHOLDS.HIGH) {
            demandLevel = 'high';
        } else {
            demandLevel = 'high';
        }
        
        // Calculate recommendation score
        // Higher score = better recommendation
        // Factors: low conflict probability, good historical completion rate, reasonable demand
        const completionRate = stats.completedBookings / Math.max(stats.totalBookings, 1);
        const conflictProbability = Math.min(utilizationRate, 1);
        
        let recommendationScore = 0;
        
        // Prefer slots with moderate demand (not too empty, not too full)
        if (utilizationRate > 0.2 && utilizationRate < 0.6) {
            recommendationScore += 30;
        }
        
        // Good completion rate
        recommendationScore += completionRate * 40;
        
        // Low conflict probability
        recommendationScore += (1 - conflictProbability) * 20;
        
        // Low no-show rate
        recommendationScore += (1 - noShowRate) * 10;
        
        // Mark as recommended if score is high enough
        if (recommendationScore >= 70 && demandLevel === 'medium') {
            demandLevel = 'recommended';
        }
        
        // Upsert recommendation
        await SlotRecommendation.findOneAndUpdate(
            { resourceId, dayOfWeek: stats.dayOfWeek, hourSlot: stats.hourSlot },
            {
                demandLevel,
                recommendationScore,
                historicalUtilization: Math.round(utilizationRate * 100),
                averageBookingDuration: Math.round(avgDuration),
                conflictProbability: Math.round(conflictProbability * 100),
                calculatedAt: new Date(),
                dataPointCount: stats.totalBookings
            },
            { upsert: true, new: true }
        );
    }
}

/**
 * Get smart slot recommendations for a resource
 * 
 * @param {string} resourceId - Resource ID
 * @param {Date} date - Target date
 * @param {number} durationMinutes - Desired booking duration
 * @returns {Array} Recommended time slots
 */
async function getSmartRecommendations(resourceId, date, durationMinutes = 60) {
    const targetDate = DateTime.fromJSDate(new Date(date));
    const dayOfWeek = targetDate.weekday % 7;
    
    // Get recommendations for this day
    const recommendations = await SlotRecommendation.find({
        resourceId,
        dayOfWeek
    }).sort({ recommendationScore: -1 });
    
    // Get existing bookings for the date
    const startOfDay = targetDate.startOf('day').toJSDate();
    const endOfDay = targetDate.endOf('day').toJSDate();
    
    const existingBookings = await Booking.find({
        resourceId,
        startTime: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['pending', 'approved'] }
    }).select('startTime endTime');
    
    // Build available slots
    const resource = await Resource.findById(resourceId);
    if (!resource) {
        return [];
    }
    
    const slots = [];
    
    for (const rec of recommendations) {
        const slotStart = targetDate.set({ hour: rec.hourSlot, minute: 0 });
        const slotEnd = slotStart.plus({ minutes: durationMinutes });
        
        // Check if slot is in the future
        if (slotStart.toJSDate() <= new Date()) {
            continue;
        }
        
        // Check for conflicts
        const hasConflict = existingBookings.some(booking => {
            const bookingStart = new Date(booking.startTime);
            const bookingEnd = new Date(booking.endTime);
            return (slotStart.toJSDate() < bookingEnd && slotEnd.toJSDate() > bookingStart);
        });
        
        if (!hasConflict) {
            slots.push({
                startTime: slotStart.toISO(),
                endTime: slotEnd.toISO(),
                demandLevel: rec.demandLevel,
                recommendationScore: rec.recommendationScore,
                conflictProbability: rec.conflictProbability,
                isRecommended: rec.demandLevel === 'recommended',
                historicalUtilization: rec.historicalUtilization
            });
        }
    }
    
    return slots.slice(0, 10); // Return top 10 recommendations
}

/**
 * Get alternative slot suggestions when a conflict occurs
 * 
 * @param {string} resourceId - Resource ID
 * @param {Date} preferredStart - User's preferred start time
 * @param {Date} preferredEnd - User's preferred end time
 * @param {number} maxSuggestions - Maximum suggestions to return
 */
async function getAlternativeSlots(resourceId, preferredStart, preferredEnd, maxSuggestions = 5) {
    const duration = (new Date(preferredEnd) - new Date(preferredStart)) / (1000 * 60);
    const preferredDate = DateTime.fromJSDate(new Date(preferredStart));
    
    const alternatives = [];
    
    // Check slots on the same day
    const sameDaySlots = await findAvailableSlots(
        resourceId, 
        preferredDate.toJSDate(), 
        duration
    );
    
    for (const slot of sameDaySlots) {
        const slotStart = DateTime.fromISO(slot.startTime);
        const timeDiff = Math.abs(slotStart.hour - preferredDate.hour);
        
        alternatives.push({
            ...slot,
            sameDay: true,
            timeDifference: timeDiff,
            reason: timeDiff <= 2 ? 'Similar time' : 'Same day'
        });
    }
    
    // Check adjacent days if not enough
    if (alternatives.length < maxSuggestions) {
        for (let dayOffset = 1; dayOffset <= 3; dayOffset++) {
            const nextDate = preferredDate.plus({ days: dayOffset });
            const nextDaySlots = await findAvailableSlots(
                resourceId,
                nextDate.toJSDate(),
                duration
            );
            
            for (const slot of nextDaySlots) {
                alternatives.push({
                    ...slot,
                    sameDay: false,
                    dayOffset,
                    reason: `${dayOffset} day(s) later`
                });
            }
            
            if (alternatives.length >= maxSuggestions * 2) break;
        }
    }
    
    // Sort by recommendation score and return top suggestions
    return alternatives
        .sort((a, b) => {
            if (a.sameDay !== b.sameDay) return a.sameDay ? -1 : 1;
            return b.recommendationScore - a.recommendationScore;
        })
        .slice(0, maxSuggestions);
}

/**
 * Find available slots for a given date and duration
 */
async function findAvailableSlots(resourceId, date, durationMinutes) {
    const targetDate = DateTime.fromJSDate(new Date(date));
    const dayOfWeek = targetDate.weekday % 7;
    
    // Get resource availability
    const resource = await Resource.findById(resourceId);
    if (!resource) return [];
    
    const daySlots = resource.availabilitySlots.filter(s => s.dayOfWeek === dayOfWeek && s.isAvailable);
    
    // Get existing bookings
    const startOfDay = targetDate.startOf('day').toJSDate();
    const endOfDay = targetDate.endOf('day').toJSDate();
    
    const existingBookings = await Booking.find({
        resourceId,
        startTime: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['pending', 'approved'] }
    });
    
    // Get recommendations
    const recommendations = await SlotRecommendation.find({
        resourceId,
        dayOfWeek
    });
    
    const recMap = {};
    recommendations.forEach(r => { recMap[r.hourSlot] = r; });
    
    const slots = [];
    
    for (const availSlot of daySlots) {
        const [startHour, startMin] = availSlot.startTime.split(':').map(Number);
        const [endHour, endMin] = availSlot.endTime.split(':').map(Number);
        
        // Generate possible slots
        for (let hour = startHour; hour < endHour; hour++) {
            const slotStart = targetDate.set({ hour, minute: 0, second: 0 });
            const slotEnd = slotStart.plus({ minutes: durationMinutes });
            
            // Skip past slots
            if (slotStart.toJSDate() <= new Date()) continue;
            
            // Skip if exceeds availability
            if (slotEnd.hour > endHour) continue;
            
            // Check conflicts
            const hasConflict = existingBookings.some(b => {
                return slotStart.toJSDate() < b.endTime && slotEnd.toJSDate() > b.startTime;
            });
            
            if (!hasConflict) {
                const rec = recMap[hour] || {};
                slots.push({
                    startTime: slotStart.toISO(),
                    endTime: slotEnd.toISO(),
                    demandLevel: rec.demandLevel || 'medium',
                    recommendationScore: rec.recommendationScore || 50,
                    conflictProbability: rec.conflictProbability || 0
                });
            }
        }
    }
    
    return slots.sort((a, b) => b.recommendationScore - a.recommendationScore);
}

/**
 * Get demand label for a specific slot
 */
async function getSlotDemandLevel(resourceId, startTime) {
    const date = DateTime.fromJSDate(new Date(startTime));
    const dayOfWeek = date.weekday % 7;
    const hourSlot = date.hour;
    
    const recommendation = await SlotRecommendation.findOne({
        resourceId,
        dayOfWeek,
        hourSlot
    });
    
    if (!recommendation) {
        return { demandLevel: 'medium', message: 'Insufficient historical data' };
    }
    
    return {
        demandLevel: recommendation.demandLevel,
        recommendationScore: recommendation.recommendationScore,
        historicalUtilization: recommendation.historicalUtilization,
        conflictProbability: recommendation.conflictProbability
    };
}

/**
 * Record a booking event for analytics
 * Called after booking creation/completion/cancellation
 */
async function recordBookingEvent(booking, eventType) {
    try {
        const date = DateTime.fromJSDate(booking.startTime);
        const dayOfWeek = date.weekday % 7;
        const hourSlot = date.hour;
        const dateOnly = date.startOf('day').toJSDate();
        
        const update = { $inc: {} };
        
        switch (eventType) {
            case 'created':
                update.$inc.requestCount = 1;
                update.$inc.totalBookings = 1;
                break;
            case 'completed':
                update.$inc.completedBookings = 1;
                break;
            case 'cancelled':
                update.$inc.cancelledBookings = 1;
                break;
            case 'no_show':
                update.$inc.noShowBookings = 1;
                break;
            case 'conflict':
                update.$inc.conflictCount = 1;
                update.$inc.requestCount = 1;
                break;
        }
        
        const duration = (booking.endTime - booking.startTime) / (1000 * 60);
        if (eventType === 'created' || eventType === 'completed') {
            update.$inc.totalBookedMinutes = duration;
        }
        
        await BookingAnalytics.findOneAndUpdate(
            { resourceId: booking.resourceId, date: dateOnly, hourSlot },
            {
                ...update,
                dayOfWeek,
                $setOnInsert: { resourceId: booking.resourceId, date: dateOnly, hourSlot, dayOfWeek }
            },
            { upsert: true }
        );
        
    } catch (error) {
        // Don't fail the main operation for analytics
        logger.error('Error recording booking event for analytics', { error: error.message });
    }
}

module.exports = {
    analyzeAndUpdateRecommendations,
    getSmartRecommendations,
    getAlternativeSlots,
    findAvailableSlots,
    getSlotDemandLevel,
    recordBookingEvent,
    DEMAND_THRESHOLDS
};
