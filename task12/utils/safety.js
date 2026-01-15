/**
 * Safety Layer System
 * SOS alerts, ride sharing, emergency contacts
 */

const crypto = require('crypto');

/**
 * Generate a shareable ride tracking link
 */
function generateRideShareLink(rideId, riderId) {
    const token = crypto.randomBytes(16).toString('hex');
    const link = `/track/${rideId}/${token}`;
    return { token, link };
}

/**
 * Store ride share token
 */
function storeRideShareToken(db, rideId, riderId, token, expiresAt) {
    db.prepare(`
        INSERT INTO ride_share_tokens (id, ride_id, rider_id, token, expires_at)
        VALUES (?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), rideId, riderId, token, expiresAt);
}

/**
 * Validate ride share token
 */
function validateRideShareToken(db, rideId, token) {
    const record = db.prepare(`
        SELECT * FROM ride_share_tokens 
        WHERE ride_id = ? AND token = ? AND expires_at > datetime('now')
    `).get(rideId, token);
    return !!record;
}

/**
 * Create SOS alert
 */
function createSOSAlert(db, rideId, userId, location, message) {
    const id = crypto.randomUUID();
    
    db.prepare(`
        INSERT INTO sos_alerts (id, ride_id, user_id, latitude, longitude, message, status)
        VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(id, rideId, userId, location.lat, location.lng, message);
    
    // Get emergency contacts
    const contacts = db.prepare(`
        SELECT * FROM emergency_contacts WHERE user_id = ?
    `).all(userId);
    
    // Get ride details for context
    const ride = db.prepare(`
        SELECT r.*, u.name as driver_name, u.phone as driver_phone,
               u.vehicle_make, u.vehicle_model, u.vehicle_color, u.vehicle_plate
        FROM rides r
        JOIN users u ON r.driver_id = u.id
        WHERE r.id = ?
    `).get(rideId);
    
    return {
        alertId: id,
        contacts,
        rideDetails: ride,
        location
    };
}

/**
 * Add emergency contact
 */
function addEmergencyContact(db, userId, name, phone, relationship) {
    const id = crypto.randomUUID();
    
    // Max 3 emergency contacts
    const count = db.prepare(`
        SELECT COUNT(*) as count FROM emergency_contacts WHERE user_id = ?
    `).get(userId);
    
    if (count.count >= 3) {
        throw new Error('Maximum 3 emergency contacts allowed');
    }
    
    db.prepare(`
        INSERT INTO emergency_contacts (id, user_id, name, phone, relationship)
        VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, name, phone, relationship);
    
    return { id, name, phone, relationship };
}

/**
 * Get emergency contacts
 */
function getEmergencyContacts(db, userId) {
    return db.prepare(`
        SELECT id, name, phone, relationship 
        FROM emergency_contacts 
        WHERE user_id = ?
    `).all(userId);
}

/**
 * Remove emergency contact
 */
function removeEmergencyContact(db, contactId, userId) {
    const result = db.prepare(`
        DELETE FROM emergency_contacts WHERE id = ? AND user_id = ?
    `).run(contactId, userId);
    return result.changes > 0;
}

/**
 * Verify driver information
 */
function verifyDriverInfo(db, driverId) {
    const driver = db.prepare(`
        SELECT 
            id, name, email, phone, university, department,
            vehicle_make, vehicle_model, vehicle_color, vehicle_plate,
            average_rating, total_ratings, rides_completed, behavior_score,
            profile_verified, created_at
        FROM users 
        WHERE id = ? AND role IN ('driver', 'both')
    `).get(driverId);
    
    if (!driver) return null;
    
    // Calculate trust score
    const trustScore = calculateTrustScore(driver);
    
    // Get recent reviews
    const reviews = db.prepare(`
        SELECT r.rating, r.comment, r.created_at, u.name as reviewer_name
        FROM ratings r
        JOIN users u ON r.rater_id = u.id
        WHERE r.rated_user_id = ?
        ORDER BY r.created_at DESC
        LIMIT 5
    `).all(driverId);
    
    return {
        ...driver,
        trustScore,
        recentReviews: reviews,
        vehicleInfo: {
            make: driver.vehicle_make,
            model: driver.vehicle_model,
            color: driver.vehicle_color,
            plate: driver.vehicle_plate
        }
    };
}

/**
 * Calculate driver trust score
 */
function calculateTrustScore(driver) {
    let score = 50; // Base score
    
    // Rating contribution (up to 25 points)
    if (driver.average_rating && driver.total_ratings >= 3) {
        score += (driver.average_rating / 5) * 25;
    }
    
    // Behavior score contribution (up to 15 points)
    if (driver.behavior_score) {
        score += (driver.behavior_score / 100) * 15;
    }
    
    // Experience contribution (up to 10 points)
    const experienceBonus = Math.min(driver.rides_completed / 10, 1) * 10;
    score += experienceBonus;
    
    // Profile verified bonus
    if (driver.profile_verified) {
        score += 5;
    }
    
    // Vehicle info completeness bonus
    if (driver.vehicle_make && driver.vehicle_model && driver.vehicle_color && driver.vehicle_plate) {
        score += 5;
    }
    
    return Math.min(100, Math.round(score));
}

/**
 * Get safety tips based on context
 */
function getSafetyTips(isDriver, time) {
    const tips = {
        general: [
            'Share your ride details with a trusted contact',
            'Verify the vehicle details before getting in',
            'Sit in the back seat for personal space',
            'Keep your phone charged during the ride',
            'Trust your instincts - cancel if uncomfortable'
        ],
        driver: [
            'Verify passenger identity before starting the ride',
            'Keep emergency contact numbers handy',
            'Plan your route before starting',
            'Keep your vehicle well-maintained',
            'Report any suspicious behavior immediately'
        ],
        nightTime: [
            'Prefer well-lit pickup/dropoff points',
            'Share live location with family',
            'Avoid isolated routes',
            'Keep windows slightly open',
            'Stay alert and avoid distractions'
        ],
        peakHours: [
            'Allow extra time for traffic',
            'Stay patient with delays',
            'Keep water and snacks handy',
            'Use this time to network with fellow students'
        ]
    };
    
    let selectedTips = [...tips.general];
    
    if (isDriver) {
        selectedTips = [...selectedTips, ...tips.driver];
    }
    
    const hour = parseInt(time?.split(':')[0]) || new Date().getHours();
    
    if (hour < 6 || hour > 20) {
        selectedTips = [...selectedTips, ...tips.nightTime];
    }
    
    if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
        selectedTips = [...selectedTips, ...tips.peakHours];
    }
    
    // Return 3 random tips
    return selectedTips.sort(() => 0.5 - Math.random()).slice(0, 3);
}

/**
 * Check for safety warnings
 */
function checkSafetyWarnings(db, driverId, riderId) {
    const warnings = [];
    
    // Check driver behavior score
    const driver = db.prepare(`
        SELECT behavior_score, cancellation_count, no_show_count 
        FROM users WHERE id = ?
    `).get(driverId);
    
    if (driver) {
        if (driver.behavior_score < 70) {
            warnings.push({
                type: 'behavior',
                severity: 'medium',
                message: 'Driver has a lower than average reliability score'
            });
        }
        
        if (driver.cancellation_count > 3) {
            warnings.push({
                type: 'cancellation',
                severity: 'low',
                message: 'Driver has cancelled multiple rides recently'
            });
        }
    }
    
    // Check if it's rider's first ride
    if (riderId) {
        const rider = db.prepare(`
            SELECT rides_completed FROM users WHERE id = ?
        `).get(riderId);
        
        if (rider && rider.rides_completed === 0) {
            warnings.push({
                type: 'new_user',
                severity: 'info',
                message: 'Remember to share your ride details with a trusted contact'
            });
        }
    }
    
    return warnings;
}

module.exports = {
    generateRideShareLink,
    storeRideShareToken,
    validateRideShareToken,
    createSOSAlert,
    addEmergencyContact,
    getEmergencyContacts,
    removeEmergencyContact,
    verifyDriverInfo,
    calculateTrustScore,
    getSafetyTips,
    checkSafetyWarnings
};
