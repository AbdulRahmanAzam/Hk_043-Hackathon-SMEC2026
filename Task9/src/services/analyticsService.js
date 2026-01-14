/**
 * Analytics Service
 * 
 * Provides comprehensive analytics including:
 * - Resource utilization metrics
 * - Heatmap data for visualization
 * - Peak usage detection
 * - Idle time analysis
 * - Underutilization alerts
 */

const { Booking, BookingAnalytics, Resource, SlotRecommendation } = require('../database/models');
const { logger } = require('../utils/logger');
const { DateTime } = require('luxon');

/**
 * Get utilization statistics for a resource
 * 
 * @param {string} resourceId - Resource ID
 * @param {Date} startDate - Analysis start date
 * @param {Date} endDate - Analysis end date
 */
async function getResourceUtilization(resourceId, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const bookings = await Booking.find({
        resourceId,
        startTime: { $gte: start },
        endTime: { $lte: end },
        status: { $in: ['completed', 'approved', 'no_show'] }
    });
    
    const resource = await Resource.findById(resourceId);
    if (!resource) {
        return { error: 'Resource not found' };
    }
    
    // Calculate total available hours
    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    let totalAvailableMinutes = 0;
    
    // Sum up availability slots
    for (let i = 0; i < totalDays; i++) {
        const date = DateTime.fromJSDate(start).plus({ days: i });
        const dayOfWeek = date.weekday % 7;
        
        const daySlots = resource.availabilitySlots.filter(
            s => s.dayOfWeek === dayOfWeek && s.isAvailable
        );
        
        for (const slot of daySlots) {
            const [startH, startM] = slot.startTime.split(':').map(Number);
            const [endH, endM] = slot.endTime.split(':').map(Number);
            totalAvailableMinutes += (endH * 60 + endM) - (startH * 60 + startM);
        }
    }
    
    // Calculate booked time
    let totalBookedMinutes = 0;
    let completedCount = 0;
    let cancelledCount = 0;
    let noShowCount = 0;
    const hourlyUsage = Array(24).fill(0);
    const dailyUsage = Array(7).fill(0);
    
    for (const booking of bookings) {
        const duration = (booking.endTime - booking.startTime) / (1000 * 60);
        const startHour = new Date(booking.startTime).getHours();
        const dayOfWeek = new Date(booking.startTime).getDay();
        
        if (booking.status === 'completed' || booking.status === 'approved') {
            totalBookedMinutes += duration;
            hourlyUsage[startHour] += duration;
            dailyUsage[dayOfWeek] += duration;
        }
        
        if (booking.status === 'completed') completedCount++;
        else if (booking.status === 'cancelled') cancelledCount++;
        else if (booking.status === 'no_show') noShowCount++;
    }
    
    // Calculate utilization percentage
    const utilizationPercentage = totalAvailableMinutes > 0 
        ? Math.round((totalBookedMinutes / totalAvailableMinutes) * 100) 
        : 0;
    
    // Find peak hours (top 3)
    const peakHours = hourlyUsage
        .map((usage, hour) => ({ hour, usage }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 3)
        .map(h => h.hour);
    
    // Find idle hours (bottom 3 with some availability)
    const idleHours = hourlyUsage
        .map((usage, hour) => ({ hour, usage }))
        .filter(h => h.usage === 0)
        .slice(0, 5)
        .map(h => h.hour);
    
    // Detect underutilization
    const isUnderutilized = utilizationPercentage < 30;
    
    return {
        resourceId,
        resourceName: resource.name,
        period: { startDate: start, endDate: end, totalDays },
        utilization: {
            totalAvailableHours: Math.round(totalAvailableMinutes / 60),
            totalBookedHours: Math.round(totalBookedMinutes / 60),
            utilizationPercentage,
            isUnderutilized,
            underutilizationThreshold: 30
        },
        bookingStats: {
            total: bookings.length,
            completed: completedCount,
            cancelled: cancelledCount,
            noShows: noShowCount,
            completionRate: bookings.length > 0 
                ? Math.round((completedCount / bookings.length) * 100) 
                : 0,
            noShowRate: bookings.length > 0 
                ? Math.round((noShowCount / bookings.length) * 100) 
                : 0
        },
        patterns: {
            peakHours: peakHours.map(h => `${h}:00`),
            idleHours: idleHours.map(h => `${h}:00`),
            busiestDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
                dailyUsage.indexOf(Math.max(...dailyUsage))
            ],
            quietestDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
                dailyUsage.indexOf(Math.min(...dailyUsage))
            ]
        }
    };
}

/**
 * Get heatmap data for availability visualization
 * 
 * @param {string} resourceId - Resource ID
 * @param {Date} weekStartDate - Start date of the week to analyze
 */
async function getAvailabilityHeatmap(resourceId, weekStartDate) {
    const start = DateTime.fromJSDate(new Date(weekStartDate)).startOf('week');
    const end = start.plus({ days: 7 });
    
    const resource = await Resource.findById(resourceId);
    if (!resource) {
        return { error: 'Resource not found' };
    }
    
    // Get bookings for the week
    const bookings = await Booking.find({
        resourceId,
        startTime: { $gte: start.toJSDate(), $lt: end.toJSDate() },
        status: { $in: ['pending', 'approved'] }
    });
    
    // Get historical data for demand coloring
    const recommendations = await SlotRecommendation.find({ resourceId });
    const recMap = {};
    recommendations.forEach(r => {
        recMap[`${r.dayOfWeek}-${r.hourSlot}`] = r;
    });
    
    // Build heatmap grid (7 days x 24 hours)
    const heatmap = [];
    
    for (let day = 0; day < 7; day++) {
        const currentDate = start.plus({ days: day });
        const dayOfWeek = currentDate.weekday % 7;
        const dayData = {
            date: currentDate.toISODate(),
            dayName: currentDate.toFormat('cccc'),
            dayOfWeek,
            hours: []
        };
        
        // Check availability for this day
        const daySlots = resource.availabilitySlots.filter(
            s => s.dayOfWeek === dayOfWeek && s.isAvailable
        );
        
        for (let hour = 0; hour < 24; hour++) {
            const slotStart = currentDate.set({ hour, minute: 0 });
            const slotEnd = slotStart.plus({ hours: 1 });
            
            // Check if within availability
            let isAvailable = daySlots.some(slot => {
                const [startH] = slot.startTime.split(':').map(Number);
                const [endH] = slot.endTime.split(':').map(Number);
                return hour >= startH && hour < endH;
            });
            
            // If no slots defined, assume available during business hours
            if (daySlots.length === 0) {
                isAvailable = hour >= 8 && hour < 18;
            }
            
            // Check if booked
            const slotBookings = bookings.filter(b => {
                return slotStart.toJSDate() < b.endTime && slotEnd.toJSDate() > b.startTime;
            });
            
            const isBooked = slotBookings.length > 0;
            
            // Get demand level from recommendations
            const rec = recMap[`${dayOfWeek}-${hour}`];
            
            // Calculate density (0-100)
            let density = 0;
            if (!isAvailable) {
                density = -1; // Not available
            } else if (isBooked) {
                density = 100; // Fully booked
            } else if (rec) {
                density = rec.historicalUtilization || 0;
            }
            
            dayData.hours.push({
                hour,
                timeLabel: `${hour.toString().padStart(2, '0')}:00`,
                isAvailable,
                isBooked,
                bookingCount: slotBookings.length,
                density,
                demandLevel: rec?.demandLevel || 'medium',
                booking: isBooked ? {
                    id: slotBookings[0]._id,
                    title: slotBookings[0].title,
                    user: slotBookings[0].userId
                } : null
            });
        }
        
        heatmap.push(dayData);
    }
    
    return {
        resourceId,
        resourceName: resource.name,
        weekStart: start.toISODate(),
        weekEnd: end.toISODate(),
        heatmap,
        legend: {
            notAvailable: { density: -1, color: '#e0e0e0', label: 'Not Available' },
            free: { density: 0, color: '#4caf50', label: 'Free' },
            lowDemand: { density: 30, color: '#8bc34a', label: 'Low Demand' },
            mediumDemand: { density: 60, color: '#ffeb3b', label: 'Medium Demand' },
            highDemand: { density: 85, color: '#ff9800', label: 'High Demand' },
            booked: { density: 100, color: '#f44336', label: 'Booked' }
        }
    };
}

/**
 * Get platform-wide analytics dashboard
 */
async function getDashboardAnalytics(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Overall booking statistics
    const bookingStats = await Booking.aggregate([
        {
            $match: {
                startTime: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);
    
    const statusCounts = {};
    bookingStats.forEach(s => { statusCounts[s._id] = s.count; });
    
    // Resource utilization rankings
    const resourceStats = await Booking.aggregate([
        {
            $match: {
                startTime: { $gte: start, $lte: end },
                status: { $in: ['completed', 'approved'] }
            }
        },
        {
            $group: {
                _id: '$resourceId',
                bookingCount: { $sum: 1 },
                totalMinutes: {
                    $sum: {
                        $divide: [
                            { $subtract: ['$endTime', '$startTime'] },
                            60000
                        ]
                    }
                }
            }
        },
        { $sort: { totalMinutes: -1 } },
        { $limit: 10 }
    ]);
    
    // Enrich with resource names
    const resourceIds = resourceStats.map(r => r._id);
    const resources = await Resource.find({ _id: { $in: resourceIds } }).select('name type');
    const resourceMap = {};
    resources.forEach(r => { resourceMap[r._id] = r; });
    
    const topResources = resourceStats.map(r => ({
        resourceId: r._id,
        resourceName: resourceMap[r._id]?.name || 'Unknown',
        resourceType: resourceMap[r._id]?.type || 'Unknown',
        bookingCount: r.bookingCount,
        totalHours: Math.round(r.totalMinutes / 60)
    }));
    
    // Purpose breakdown
    const purposeStats = await Booking.aggregate([
        {
            $match: {
                startTime: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: '$purpose',
                count: { $sum: 1 }
            }
        }
    ]);
    
    // Hourly distribution
    const hourlyStats = await Booking.aggregate([
        {
            $match: {
                startTime: { $gte: start, $lte: end },
                status: { $in: ['completed', 'approved'] }
            }
        },
        {
            $group: {
                _id: { $hour: '$startTime' },
                count: { $sum: 1 }
            }
        },
        { $sort: { '_id': 1 } }
    ]);
    
    // Find underutilized resources
    const allResources = await Resource.find({ isActive: true });
    const underutilized = [];
    
    for (const resource of allResources.slice(0, 20)) { // Limit for performance
        const stats = await getResourceUtilization(resource._id, start, end);
        if (stats.utilization && stats.utilization.isUnderutilized) {
            underutilized.push({
                resourceId: resource._id,
                resourceName: resource.name,
                utilizationPercentage: stats.utilization.utilizationPercentage
            });
        }
    }
    
    return {
        period: { startDate: start, endDate: end },
        overview: {
            totalBookings: Object.values(statusCounts).reduce((a, b) => a + b, 0),
            completed: statusCounts.completed || 0,
            pending: statusCounts.pending || 0,
            cancelled: statusCounts.cancelled || 0,
            noShows: statusCounts.no_show || 0,
            approved: statusCounts.approved || 0
        },
        topResources,
        purposeBreakdown: purposeStats.map(p => ({
            purpose: p._id,
            count: p.count
        })),
        hourlyDistribution: hourlyStats.map(h => ({
            hour: h._id,
            timeLabel: `${h._id.toString().padStart(2, '0')}:00`,
            bookings: h.count
        })),
        alerts: {
            underutilizedResources: underutilized,
            highNoShowRate: (statusCounts.no_show || 0) > (statusCounts.completed || 1) * 0.1
        }
    };
}

/**
 * Get idle time analysis for a resource
 */
async function getIdleTimeAnalysis(resourceId, startDate, endDate) {
    const start = DateTime.fromJSDate(new Date(startDate));
    const end = DateTime.fromJSDate(new Date(endDate));
    
    const resource = await Resource.findById(resourceId);
    if (!resource) {
        return { error: 'Resource not found' };
    }
    
    const bookings = await Booking.find({
        resourceId,
        startTime: { $gte: start.toJSDate(), $lte: end.toJSDate() },
        status: { $in: ['completed', 'approved'] }
    }).sort({ startTime: 1 });
    
    const idleGaps = [];
    let totalIdleMinutes = 0;
    
    // Analyze gaps between bookings
    for (let i = 0; i < bookings.length - 1; i++) {
        const currentEnd = DateTime.fromJSDate(bookings[i].endTime);
        const nextStart = DateTime.fromJSDate(bookings[i + 1].startTime);
        
        // Only count gaps on the same day
        if (currentEnd.hasSame(nextStart, 'day')) {
            const gapMinutes = nextStart.diff(currentEnd, 'minutes').minutes;
            
            if (gapMinutes >= 30) { // Only count gaps of 30+ minutes
                idleGaps.push({
                    date: currentEnd.toISODate(),
                    startTime: currentEnd.toFormat('HH:mm'),
                    endTime: nextStart.toFormat('HH:mm'),
                    durationMinutes: gapMinutes
                });
                totalIdleMinutes += gapMinutes;
            }
        }
    }
    
    // Analyze by hour
    const hourlyIdle = Array(24).fill(0);
    idleGaps.forEach(gap => {
        const startHour = parseInt(gap.startTime.split(':')[0]);
        hourlyIdle[startHour] += gap.durationMinutes;
    });
    
    return {
        resourceId,
        resourceName: resource.name,
        period: { startDate: start.toISODate(), endDate: end.toISODate() },
        summary: {
            totalIdleMinutes,
            totalIdleHours: Math.round(totalIdleMinutes / 60),
            gapCount: idleGaps.length,
            averageGapMinutes: idleGaps.length > 0 
                ? Math.round(totalIdleMinutes / idleGaps.length) 
                : 0
        },
        largestGaps: idleGaps.sort((a, b) => b.durationMinutes - a.durationMinutes).slice(0, 5),
        hourlyIdleDistribution: hourlyIdle.map((minutes, hour) => ({
            hour,
            timeLabel: `${hour.toString().padStart(2, '0')}:00`,
            idleMinutes: minutes
        })),
        recommendations: generateIdleTimeRecommendations(idleGaps, hourlyIdle)
    };
}

/**
 * Generate recommendations based on idle time analysis
 */
function generateIdleTimeRecommendations(gaps, hourlyIdle) {
    const recommendations = [];
    
    // Check for consistently idle hours
    const consistentlyIdle = hourlyIdle
        .map((minutes, hour) => ({ hour, minutes }))
        .filter(h => h.minutes > 120) // More than 2 hours idle
        .sort((a, b) => b.minutes - a.minutes);
    
    if (consistentlyIdle.length > 0) {
        recommendations.push({
            type: 'schedule_adjustment',
            severity: 'medium',
            message: `Consider reducing availability during hours ${consistentlyIdle.map(h => h.hour).join(', ')} which are consistently underutilized`,
            potentialSavings: Math.round(consistentlyIdle.reduce((a, b) => a + b.minutes, 0) / 60) + ' hours/period'
        });
    }
    
    // Check for short gaps that could be consolidated
    const shortGaps = gaps.filter(g => g.durationMinutes >= 30 && g.durationMinutes <= 60);
    if (shortGaps.length > 5) {
        recommendations.push({
            type: 'booking_consolidation',
            severity: 'low',
            message: 'Multiple short gaps detected between bookings. Consider minimum booking durations or gap policies.',
            gapCount: shortGaps.length
        });
    }
    
    return recommendations;
}

/**
 * Get peak usage analysis
 */
async function getPeakUsageAnalysis(resourceId = null, startDate, endDate) {
    const match = {
        startTime: { $gte: new Date(startDate), $lte: new Date(endDate) },
        status: { $in: ['completed', 'approved'] }
    };
    
    if (resourceId) {
        match.resourceId = resourceId;
    }
    
    // Hourly analysis
    const hourlyPeaks = await Booking.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $hour: '$startTime' },
                count: { $sum: 1 },
                totalMinutes: {
                    $sum: {
                        $divide: [
                            { $subtract: ['$endTime', '$startTime'] },
                            60000
                        ]
                    }
                }
            }
        },
        { $sort: { count: -1 } }
    ]);
    
    // Daily analysis
    const dailyPeaks = await Booking.aggregate([
        { $match: match },
        {
            $group: {
                _id: { $dayOfWeek: '$startTime' },
                count: { $sum: 1 }
            }
        },
        { $sort: { count: -1 } }
    ]);
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    return {
        period: { startDate, endDate },
        resourceId: resourceId || 'all',
        hourlyPeaks: hourlyPeaks.map(h => ({
            hour: h._id,
            timeLabel: `${h._id.toString().padStart(2, '0')}:00`,
            bookingCount: h.count,
            totalHours: Math.round(h.totalMinutes / 60),
            isPeak: h.count === hourlyPeaks[0].count
        })),
        dailyPeaks: dailyPeaks.map(d => ({
            dayOfWeek: d._id,
            dayName: dayNames[d._id - 1] || 'Unknown',
            bookingCount: d.count,
            isPeak: d.count === dailyPeaks[0].count
        })),
        summary: {
            peakHour: hourlyPeaks[0]?._id,
            peakDay: dayNames[(dailyPeaks[0]?._id || 1) - 1],
            quietestHour: hourlyPeaks[hourlyPeaks.length - 1]?._id,
            quietestDay: dayNames[(dailyPeaks[dailyPeaks.length - 1]?._id || 1) - 1]
        }
    };
}

module.exports = {
    getResourceUtilization,
    getAvailabilityHeatmap,
    getDashboardAnalytics,
    getIdleTimeAnalysis,
    getPeakUsageAnalysis
};
