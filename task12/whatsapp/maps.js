/**
 * Google Maps Integration for WhatsApp Bot
 * UniRide Karachi
 */

const config = require('./config');

/**
 * Generate Google Maps directions link
 */
function generateDirectionsLink(source, destination) {
    const sourceStr = typeof source === 'string' 
        ? source 
        : `${source.lat},${source.lng}`;
    const destStr = typeof destination === 'string' 
        ? destination 
        : `${destination.lat},${destination.lng}`;
    
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(sourceStr)}&destination=${encodeURIComponent(destStr)}&travelmode=driving`;
}

/**
 * Generate Google Maps location pin link
 */
function generateLocationLink(lat, lng, label = '') {
    if (label) {
        return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(label)}`;
    }
    return `https://www.google.com/maps?q=${lat},${lng}`;
}

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * Estimate travel time based on Karachi traffic conditions
 */
function estimateETA(distanceKm, departureTime) {
    // Average speeds in Karachi by time of day (km/h)
    const hour = parseInt(departureTime.split(':')[0]) || new Date().getHours();
    
    let avgSpeed;
    if (hour >= 7 && hour <= 10) {
        // Morning rush hour
        avgSpeed = 15;
    } else if (hour >= 17 && hour <= 20) {
        // Evening rush hour  
        avgSpeed = 12;
    } else if (hour >= 23 || hour <= 5) {
        // Night time
        avgSpeed = 35;
    } else {
        // Normal traffic
        avgSpeed = 25;
    }
    
    const timeHours = distanceKm / avgSpeed;
    const timeMinutes = Math.round(timeHours * 60);
    
    return {
        minutes: timeMinutes,
        formatted: formatDuration(timeMinutes),
        trafficLevel: getTrafficLevel(hour)
    };
}

/**
 * Format duration in minutes to human readable
 */
function formatDuration(minutes) {
    if (minutes < 60) {
        return `${minutes} mins`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Get traffic level for current time
 */
function getTrafficLevel(hour) {
    if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) {
        return { level: 'heavy', emoji: '🔴', text: 'Heavy Traffic' };
    } else if (hour >= 23 || hour <= 5) {
        return { level: 'light', emoji: '🟢', text: 'Light Traffic' };
    } else {
        return { level: 'moderate', emoji: '🟡', text: 'Moderate Traffic' };
    }
}

/**
 * Parse location from user input using fuzzy matching
 */
function parseLocation(input) {
    const normalized = input.toLowerCase().trim();
    
    // Check known locations
    for (const [key, location] of Object.entries(config.KNOWN_LOCATIONS)) {
        if (normalized.includes(key)) {
            return {
                found: true,
                name: location.name,
                lat: location.lat,
                lng: location.lng,
                confidence: 'high'
            };
        }
    }
    
    // Check for partial matches
    const words = normalized.split(/\s+/);
    for (const word of words) {
        if (word.length >= 3) {
            for (const [key, location] of Object.entries(config.KNOWN_LOCATIONS)) {
                if (key.includes(word) || word.includes(key)) {
                    return {
                        found: true,
                        name: location.name,
                        lat: location.lat,
                        lng: location.lng,
                        confidence: 'medium'
                    };
                }
            }
        }
    }
    
    // Location not found
    return {
        found: false,
        original: input,
        confidence: 'none'
    };
}

/**
 * Validate if coordinates are within Karachi
 */
function isInKarachi(lat, lng) {
    return lat >= config.KARACHI_BOUNDS.minLat &&
           lat <= config.KARACHI_BOUNDS.maxLat &&
           lng >= config.KARACHI_BOUNDS.minLng &&
           lng <= config.KARACHI_BOUNDS.maxLng;
}

/**
 * Find nearest known location to coordinates
 */
function findNearestLocation(lat, lng) {
    let nearest = null;
    let minDistance = Infinity;
    
    for (const [key, location] of Object.entries(config.KNOWN_LOCATIONS)) {
        const distance = calculateDistance(lat, lng, location.lat, location.lng);
        if (distance < minDistance) {
            minDistance = distance;
            nearest = { ...location, key, distance };
        }
    }
    
    return nearest;
}

/**
 * Format ride route information for WhatsApp
 */
function formatRouteInfo(ride) {
    const distance = ride.distance_km || calculateDistance(
        ride.source_lat, ride.source_lng,
        ride.destination_lat, ride.destination_lng
    );
    
    const eta = estimateETA(distance, ride.departure_time);
    const mapLink = generateDirectionsLink(
        { lat: ride.source_lat, lng: ride.source_lng },
        { lat: ride.destination_lat, lng: ride.destination_lng }
    );
    
    return {
        distance: distance.toFixed(1),
        eta: eta.formatted,
        traffic: eta.trafficLevel,
        mapLink,
        sourcePin: generateLocationLink(ride.source_lat, ride.source_lng, ride.source_address),
        destPin: generateLocationLink(ride.destination_lat, ride.destination_lng, ride.destination_address)
    };
}

/**
 * Get suggested pickup points near a location
 */
function getSuggestedPickups(lat, lng, limit = 3) {
    const locations = Object.entries(config.KNOWN_LOCATIONS);
    const nearby = locations
        .map(([key, loc]) => ({
            ...loc,
            key,
            distance: calculateDistance(lat, lng, loc.lat, loc.lng)
        }))
        .filter(loc => loc.distance <= 5) // Within 5km
        .sort((a, b) => a.distance - b.distance)
        .slice(0, limit);
    
    return nearby;
}

/**
 * Format address for display
 */
function formatAddress(address, maxLength = 30) {
    if (!address) return 'Unknown Location';
    if (address.length <= maxLength) return address;
    return address.substring(0, maxLength - 3) + '...';
}

module.exports = {
    generateDirectionsLink,
    generateLocationLink,
    calculateDistance,
    estimateETA,
    formatDuration,
    getTrafficLevel,
    parseLocation,
    isInKarachi,
    findNearestLocation,
    formatRouteInfo,
    getSuggestedPickups,
    formatAddress
};
