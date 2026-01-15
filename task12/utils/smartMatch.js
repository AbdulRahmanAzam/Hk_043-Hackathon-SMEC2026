/**
 * Smart Ride Matching Algorithm
 * Calculates match score based on multiple factors
 */

const { calculateHaversineDistance } = require('./helpers');

/**
 * Calculate match score between rider and ride
 * @returns {Object} { score: number, breakdown: object, badge: string }
 */
function calculateMatchScore(ride, rider, riderLocation = null) {
    const breakdown = {
        routeSimilarity: 0,
        timeOverlap: 0,
        departmentMatch: 0,
        ratingScore: 0,
        behaviorScore: 0
    };

    // 1. Route Similarity (0-35 points)
    if (riderLocation) {
        const { sourceLat, sourceLng, destLat, destLng } = riderLocation;
        
        // Distance from rider's source to ride's source
        const sourceDistance = calculateHaversineDistance(
            sourceLat, sourceLng,
            ride.source_lat, ride.source_lng
        );
        
        // Distance from rider's destination to ride's destination
        const destDistance = destLat && destLng ? calculateHaversineDistance(
            destLat, destLng,
            ride.destination_lat, ride.destination_lng
        ) : 0;
        
        // Score based on proximity (closer = higher score)
        const sourceScore = Math.max(0, 20 - (sourceDistance * 4)); // Max 20 points, -4 per km
        const destScore = destLat ? Math.max(0, 15 - (destDistance * 3)) : 15; // Max 15 points
        
        breakdown.routeSimilarity = Math.round(sourceScore + destScore);
    } else {
        breakdown.routeSimilarity = 25; // Default if no location provided
    }

    // 2. Time Overlap (0-25 points)
    if (rider.preferredTime) {
        const rideTime = parseTimeToMinutes(ride.departure_time);
        const preferredTime = parseTimeToMinutes(rider.preferredTime);
        const timeDiff = Math.abs(rideTime - preferredTime);
        
        // Full points if within 15 mins, decreasing after
        breakdown.timeOverlap = Math.max(0, 25 - Math.floor(timeDiff / 3));
    } else {
        breakdown.timeOverlap = 20; // Default
    }

    // 3. Department Match (0-15 points)
    if (rider.department && ride.driver_department) {
        if (rider.department.toLowerCase() === ride.driver_department.toLowerCase()) {
            breakdown.departmentMatch = 15;
        } else if (areSimilarDepartments(rider.department, ride.driver_department)) {
            breakdown.departmentMatch = 10;
        } else {
            breakdown.departmentMatch = 5; // Same university bonus
        }
    } else {
        breakdown.departmentMatch = 5;
    }

    // 4. Driver Rating Score (0-15 points)
    const driverRating = ride.driver_rating || 3;
    breakdown.ratingScore = Math.round((driverRating / 5) * 15);

    // 5. Behavior Score (0-10 points)
    const behaviorScore = ride.driver_behavior_score || 100;
    breakdown.behaviorScore = Math.round((behaviorScore / 100) * 10);

    // Calculate total score
    const totalScore = Object.values(breakdown).reduce((a, b) => a + b, 0);
    
    // Determine badge
    let badge = '';
    if (totalScore >= 90) badge = 'perfect';
    else if (totalScore >= 75) badge = 'great';
    else if (totalScore >= 60) badge = 'good';
    else if (totalScore >= 40) badge = 'fair';

    return {
        score: totalScore,
        breakdown,
        badge
    };
}

/**
 * Parse time string to minutes
 */
function parseTimeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Check if departments are in similar fields
 */
function areSimilarDepartments(dept1, dept2) {
    const techDepts = ['computer science', 'cs', 'software engineering', 'se', 'it', 'information technology', 'data science', 'ai', 'electrical engineering', 'ee'];
    const bizDepts = ['bba', 'mba', 'business', 'finance', 'economics', 'accounting', 'marketing'];
    const sciDepts = ['physics', 'chemistry', 'mathematics', 'biology', 'environmental science'];
    
    const d1 = dept1.toLowerCase();
    const d2 = dept2.toLowerCase();
    
    const inSameGroup = (group) => group.some(d => d1.includes(d)) && group.some(d => d2.includes(d));
    
    return inSameGroup(techDepts) || inSameGroup(bizDepts) || inSameGroup(sciDepts);
}

/**
 * Find nearby pickup suggestions along the route
 */
function findNearbyPickups(routeCoords, popularPickups, maxDistance = 0.5) {
    const suggestions = [];
    
    popularPickups.forEach(pickup => {
        // Find closest point on route to this pickup
        let minDistance = Infinity;
        let closestRoutePoint = null;
        
        routeCoords.forEach((coord, index) => {
            const distance = calculateHaversineDistance(
                pickup.lat, pickup.lng,
                coord[1], coord[0]
            );
            if (distance < minDistance) {
                minDistance = distance;
                closestRoutePoint = { lat: coord[1], lng: coord[0], index };
            }
        });
        
        if (minDistance <= maxDistance) {
            suggestions.push({
                ...pickup,
                distanceFromRoute: Math.round(minDistance * 1000), // in meters
                walkingTime: Math.round(minDistance * 12), // ~5km/h walking speed
                routeDeviation: Math.round(minDistance * 2 * 1000) // meters added to driver's route
            });
        }
    });
    
    // Sort by walking time
    return suggestions.sort((a, b) => a.walkingTime - b.walkingTime).slice(0, 5);
}

/**
 * Calculate behavior score for a user
 */
function calculateBehaviorScore(user) {
    let score = 100;
    
    // Deductions
    const cancellationRate = user.rides_completed > 0 
        ? user.rides_cancelled / (user.rides_completed + user.rides_cancelled) 
        : 0;
    score -= cancellationRate * 30; // Max -30 for high cancellation rate
    
    const noShowRate = user.rides_completed > 0
        ? user.no_shows / user.rides_completed
        : 0;
    score -= noShowRate * 40; // Max -40 for no-shows (more severe)
    
    const lateRate = user.rides_completed > 0
        ? (user.late_arrivals || 0) / user.rides_completed
        : 0;
    score -= lateRate * 15; // Max -15 for late arrivals
    
    // Bonuses
    if (user.average_rating >= 4.5) score += 5;
    if (user.rides_completed >= 10) score += 3;
    if (user.rides_completed >= 50) score += 5;
    if (user.current_streak >= 5) score += 2;
    
    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Check if user should be restricted
 */
function shouldRestrictUser(user) {
    const behaviorScore = calculateBehaviorScore(user);
    
    if (behaviorScore < 30) {
        return { restrict: true, reason: 'Very low behavior score' };
    }
    
    if (user.no_shows >= 5) {
        return { restrict: true, reason: 'Too many no-shows' };
    }
    
    if (user.rides_cancelled >= 10 && user.rides_completed < 5) {
        return { restrict: true, reason: 'Excessive cancellations' };
    }
    
    return { restrict: false };
}

module.exports = {
    calculateMatchScore,
    findNearbyPickups,
    calculateBehaviorScore,
    shouldRestrictUser
};
