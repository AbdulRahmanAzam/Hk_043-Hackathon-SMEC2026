require('dotenv').config();

/**
 * Check if email belongs to an allowed university domain
 */
function isValidUniversityEmail(email) {
    if (!email || typeof email !== 'string') {
        return { valid: false, message: 'Email is required' };
    }

    const emailLower = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(emailLower)) {
        return { valid: false, message: 'Invalid email format' };
    }

    const domain = emailLower.split('@')[1];
    const allowedDomains = (process.env.ALLOWED_EMAIL_DOMAINS || '').split(',').map(d => d.trim().toLowerCase());

    if (!allowedDomains.includes(domain)) {
        return { 
            valid: false, 
            message: `Only university emails are allowed. Accepted domains: ${allowedDomains.join(', ')}`,
            domain: domain
        };
    }

    // Extract university name from domain
    const universityMap = {
        'nu.edu.pk': 'FAST-NUCES',
        'fast.edu.pk': 'FAST-NUCES',
        'iba.edu.pk': 'IBA Karachi',
        'nust.edu.pk': 'NUST',
        'lums.edu.pk': 'LUMS',
        'szabist.edu.pk': 'SZABIST',
        'bahria.edu.pk': 'Bahria University',
        'uok.edu.pk': 'University of Karachi',
        'ned.edu.pk': 'NED University',
        'aku.edu': 'Aga Khan University'
    };

    return { 
        valid: true, 
        university: universityMap[domain] || domain.split('.')[0].toUpperCase(),
        domain: domain
    };
}

/**
 * Generate a standardized API response
 */
function apiResponse(res, status, success, message, data = null) {
    const response = { success, message };
    if (data !== null) {
        response.data = data;
    }
    return res.status(status).json(response);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * Validate coordinates are within Karachi bounds
 */
function isWithinKarachi(lat, lng) {
    // Approximate bounding box for Karachi
    const bounds = {
        north: 25.6,
        south: 24.7,
        east: 67.6,
        west: 66.7
    };

    return lat >= bounds.south && lat <= bounds.north && 
           lng >= bounds.west && lng <= bounds.east;
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PK', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format time for display
 */
function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Check if a datetime is in the future
 */
function isFutureDateTime(dateString, timeString) {
    const dateTime = new Date(`${dateString}T${timeString}`);
    return dateTime > new Date();
}

/**
 * Generate ISO timestamp for seat lock expiry
 */
function getSeatLockExpiry() {
    const lockDuration = parseInt(process.env.SEAT_LOCK_DURATION) || 90;
    const expiry = new Date(Date.now() + lockDuration * 1000);
    return expiry.toISOString();
}

module.exports = {
    isValidUniversityEmail,
    apiResponse,
    calculateHaversineDistance,
    isWithinKarachi,
    formatDate,
    formatTime,
    isFutureDateTime,
    getSeatLockExpiry
};
