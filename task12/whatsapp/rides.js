/**
 * Ride Operations for WhatsApp Bot
 * UniRide Karachi
 * 
 * Handles searching, booking, and posting rides
 */

const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const maps = require('./maps');
const { calculateMatchScore } = require('../utils/smartMatch');
const { calculateCarbonImpact } = require('../utils/carbonImpact');

/**
 * Search for rides
 */
function searchRides(userId, searchParams) {
    const { source, destination, date, time } = searchParams;
    
    // Build query based on available params
    let query = `
        SELECT 
            r.*,
            u.name as driver_name,
            u.average_rating as driver_rating,
            u.phone as driver_phone,
            u.rides_completed as driver_rides,
            u.behavior_score as driver_behavior_score,
            u.department as driver_department,
            u.vehicle_make,
            u.vehicle_model,
            u.vehicle_color,
            u.vehicle_plate
        FROM rides r
        JOIN users u ON r.driver_id = u.id
        WHERE r.status = 'active'
        AND r.available_seats > 0
        AND r.driver_id != ?
    `;
    const params = [userId];
    
    // Add date filter
    if (date) {
        query += ` AND r.departure_date = ?`;
        params.push(date);
    } else {
        query += ` AND r.departure_date >= date('now')`;
    }
    
    // Add time filter (within 2 hours)
    if (time) {
        query += ` AND r.departure_time BETWEEN time(?, '-2 hours') AND time(?, '+2 hours')`;
        params.push(time, time);
    }
    
    query += ` ORDER BY r.departure_date, r.departure_time LIMIT 10`;
    
    const rides = db.prepare(query).all(...params);
    
    // Get user info for matching
    const user = db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId);
    
    // Calculate match scores and distances
    const ridesWithScores = rides.map((ride, index) => {
        // Calculate distance from search location to ride pickup
        let pickupDistance = null;
        let dropoffDistance = null;
        
        if (source?.parsed?.found) {
            pickupDistance = maps.calculateDistance(
                source.parsed.lat, source.parsed.lng,
                ride.source_lat, ride.source_lng
            );
        }
        
        if (destination?.parsed?.found) {
            dropoffDistance = maps.calculateDistance(
                destination.parsed.lat, destination.parsed.lng,
                ride.destination_lat, ride.destination_lng
            );
        }
        
        // Calculate match score
        let matchScore = 0;
        let matchBadge = '';
        
        if (user && source?.parsed?.found && destination?.parsed?.found) {
            const matchResult = calculateMatchScore(user, ride, {
                source: {
                    lat: source.parsed.lat,
                    lng: source.parsed.lng
                },
                destination: {
                    lat: destination.parsed.lat,
                    lng: destination.parsed.lng
                }
            });
            matchScore = matchResult.total;
            
            if (matchScore >= 85) matchBadge = '🌟 Perfect';
            else if (matchScore >= 70) matchBadge = '✨ Great';
            else if (matchScore >= 50) matchBadge = '👍 Good';
            else matchBadge = '🔍 Match';
        }
        
        // Get route info
        const routeInfo = maps.formatRouteInfo(ride);
        
        // Calculate carbon impact
        const carbonImpact = calculateCarbonImpact(
            ride.distance_km || maps.calculateDistance(
                ride.source_lat, ride.source_lng,
                ride.destination_lat, ride.destination_lng
            ),
            ride.total_seats - ride.available_seats + 1
        );
        
        return {
            ...ride,
            displayNumber: index + 1,
            matchScore,
            matchBadge,
            pickupDistance: pickupDistance ? pickupDistance.toFixed(1) : null,
            dropoffDistance: dropoffDistance ? dropoffDistance.toFixed(1) : null,
            routeInfo,
            carbonImpact
        };
    });
    
    // Sort by match score
    ridesWithScores.sort((a, b) => b.matchScore - a.matchScore);
    
    // Re-number after sorting
    ridesWithScores.forEach((ride, index) => {
        ride.displayNumber = index + 1;
    });
    
    return ridesWithScores;
}

/**
 * Format rides for WhatsApp display
 */
function formatRidesForWhatsApp(rides, searchParams) {
    if (rides.length === 0) {
        return {
            message: `😔 *No Rides Found*

We couldn't find rides from ${searchParams.source?.input || 'your location'} to ${searchParams.destination?.input || 'your destination'}${searchParams.time ? ` at ${searchParams.rawTime}` : ''}.

*Try:*
• Different time
• Nearby pickup points
• Tomorrow's rides

Or become a driver and post your own ride! 🚗`,
            rides: []
        };
    }
    
    let message = `🚗 *${rides.length} Ride${rides.length > 1 ? 's' : ''} Found*\n\n`;
    
    if (searchParams.source?.parsed?.found && searchParams.destination?.parsed?.found) {
        message += `📍 ${searchParams.source.parsed.name} → ${searchParams.destination.parsed.name}\n`;
    }
    
    if (searchParams.time) {
        message += `🕐 Around ${formatTime12(searchParams.time.formatted)}\n`;
    }
    
    message += `\n${'─'.repeat(25)}\n\n`;
    
    rides.forEach(ride => {
        const stars = getStarRating(ride.driver_rating);
        const priceText = ride.fuel_split_price > 0 
            ? `Rs. ${ride.fuel_split_price}` 
            : '🆓 Free';
        
        message += `*${ride.displayNumber}. ${ride.matchBadge || '🚗'}* (${ride.matchScore}% match)\n`;
        message += `👤 ${ride.driver_name} ${stars}\n`;
        message += `📍 ${maps.formatAddress(ride.source_address, 25)}\n`;
        message += `📍 ${maps.formatAddress(ride.destination_address, 25)}\n`;
        message += `🕐 ${formatTime12(ride.departure_time)} • 💺 ${ride.available_seats} seats\n`;
        message += `💰 ${priceText} • 🌱 ${ride.carbonImpact.co2Saved.toFixed(1)}kg CO₂\n`;
        
        if (ride.vehicle_model) {
            message += `🚙 ${ride.vehicle_color || ''} ${ride.vehicle_model}\n`;
        }
        
        message += `\n`;
    });
    
    message += `${'─'.repeat(25)}\n\n`;
    message += `📍 *View Route:*\n`;
    
    // Add first ride's map link as default
    if (rides.length > 0) {
        message += `${rides[0].routeInfo.mapLink}\n\n`;
    }
    
    message += `To book, reply:\n*book ride 1* (or ride number)`;
    
    return { message, rides };
}

/**
 * Book a ride
 */
function bookRide(userId, rideId, seats = 1) {
    // Start transaction
    const transaction = db.transaction(() => {
        // Check ride availability
        const ride = db.prepare(`
            SELECT r.*, u.name as driver_name, u.phone as driver_phone
            FROM rides r
            JOIN users u ON r.driver_id = u.id
            WHERE r.id = ?
        `).get(rideId);
        
        if (!ride) {
            return { success: false, message: '❌ Ride not found.' };
        }
        
        if (ride.status !== 'active') {
            return { success: false, message: '❌ This ride is no longer available.' };
        }
        
        if (ride.available_seats < seats) {
            return { 
                success: false, 
                message: `❌ Only ${ride.available_seats} seat(s) available.` 
            };
        }
        
        if (ride.driver_id === userId) {
            return { success: false, message: "❌ You can't book your own ride." };
        }
        
        // Check for existing booking
        const existing = db.prepare(`
            SELECT id FROM bookings 
            WHERE ride_id = ? AND rider_id = ? AND status NOT IN ('cancelled')
        `).get(rideId, userId);
        
        if (existing) {
            return { success: false, message: '⚠️ You already have a booking for this ride.' };
        }
        
        // Create booking
        const bookingId = uuidv4();
        db.prepare(`
            INSERT INTO bookings (id, ride_id, rider_id, seats_booked, status, confirmation_time)
            VALUES (?, ?, ?, ?, 'confirmed', CURRENT_TIMESTAMP)
        `).run(bookingId, rideId, userId, seats);
        
        // Update available seats
        db.prepare(`
            UPDATE rides 
            SET available_seats = available_seats - ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(seats, rideId);
        
        // Get rider info
        const rider = db.prepare(`SELECT name, phone FROM users WHERE id = ?`).get(userId);
        
        // Get route info
        const routeInfo = maps.formatRouteInfo(ride);
        
        return {
            success: true,
            booking: {
                id: bookingId,
                ride,
                seats,
                routeInfo
            },
            rider,
            driver: {
                name: ride.driver_name,
                phone: ride.driver_phone
            }
        };
    });
    
    return transaction();
}

/**
 * Post a new ride
 */
function postRide(userId, rideData) {
    const { source, destination, date, time, seats, price } = rideData;
    
    // Calculate distance
    const distance = maps.calculateDistance(
        source.lat, source.lng,
        destination.lat, destination.lng
    );
    
    // Estimate duration
    const eta = maps.estimateETA(distance, time);
    
    const rideId = uuidv4();
    
    try {
        db.prepare(`
            INSERT INTO rides (
                id, driver_id,
                source_address, source_lat, source_lng,
                destination_address, destination_lat, destination_lng,
                departure_date, departure_time,
                total_seats, available_seats,
                fuel_split_price, distance_km, estimated_duration_minutes,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
        `).run(
            rideId, userId,
            source.name, source.lat, source.lng,
            destination.name, destination.lat, destination.lng,
            date, time,
            seats, seats,
            price, distance, eta.minutes
        );
        
        // Get driver info
        const driver = db.prepare(`SELECT name FROM users WHERE id = ?`).get(userId);
        
        // Calculate carbon impact
        const carbonImpact = calculateCarbonImpact(distance, seats);
        
        // Get route info
        const routeInfo = maps.formatRouteInfo({
            source_lat: source.lat,
            source_lng: source.lng,
            destination_lat: destination.lat,
            destination_lng: destination.lng,
            source_address: source.name,
            destination_address: destination.name,
            departure_time: time,
            distance_km: distance
        });
        
        return {
            success: true,
            ride: {
                id: rideId,
                source,
                destination,
                date,
                time,
                seats,
                price,
                distance,
                eta
            },
            driver,
            routeInfo,
            carbonImpact
        };
    } catch (error) {
        console.error('[WhatsApp Rides] Post error:', error);
        return {
            success: false,
            message: '❌ Failed to post ride. Please try again.'
        };
    }
}

/**
 * Get user's rides (as driver or rider)
 */
function getUserRides(userId, options = {}) {
    const { type = 'all', status = 'active', limit = 5 } = options;
    
    const results = {
        asDriver: [],
        asRider: []
    };
    
    // Get rides as driver
    if (type === 'all' || type === 'driver') {
        results.asDriver = db.prepare(`
            SELECT r.*, 
                   (SELECT COUNT(*) FROM bookings WHERE ride_id = r.id AND status = 'confirmed') as bookings_count
            FROM rides r
            WHERE r.driver_id = ?
            AND r.status = ?
            AND r.departure_date >= date('now')
            ORDER BY r.departure_date, r.departure_time
            LIMIT ?
        `).all(userId, status, limit);
    }
    
    // Get rides as rider
    if (type === 'all' || type === 'rider') {
        results.asRider = db.prepare(`
            SELECT r.*, 
                   b.id as booking_id, 
                   b.seats_booked,
                   b.status as booking_status,
                   u.name as driver_name,
                   u.phone as driver_phone,
                   u.average_rating as driver_rating
            FROM bookings b
            JOIN rides r ON b.ride_id = r.id
            JOIN users u ON r.driver_id = u.id
            WHERE b.rider_id = ?
            AND b.status NOT IN ('cancelled')
            AND r.departure_date >= date('now')
            ORDER BY r.departure_date, r.departure_time
            LIMIT ?
        `).all(userId, limit);
    }
    
    return results;
}

/**
 * Get today's rides for a user
 */
function getTodayRides(userId) {
    const today = new Date().toISOString().split('T')[0];
    
    // As driver
    const asDriver = db.prepare(`
        SELECT r.*, 
               (SELECT COUNT(*) FROM bookings WHERE ride_id = r.id AND status = 'confirmed') as bookings_count,
               (SELECT GROUP_CONCAT(u.name, ', ') 
                FROM bookings b JOIN users u ON b.rider_id = u.id 
                WHERE b.ride_id = r.id AND b.status = 'confirmed') as passenger_names
        FROM rides r
        WHERE r.driver_id = ? AND r.departure_date = ? AND r.status = 'active'
        ORDER BY r.departure_time
    `).all(userId, today);
    
    // As rider
    const asRider = db.prepare(`
        SELECT r.*, b.seats_booked, b.status as booking_status,
               u.name as driver_name, u.phone as driver_phone
        FROM bookings b
        JOIN rides r ON b.ride_id = r.id
        JOIN users u ON r.driver_id = u.id
        WHERE b.rider_id = ? AND r.departure_date = ? AND b.status = 'confirmed'
        ORDER BY r.departure_time
    `).all(userId, today);
    
    return { asDriver, asRider, date: today };
}

/**
 * Cancel a ride or booking
 */
function cancelRide(userId, rideId, reason = 'Cancelled via WhatsApp') {
    // Check if user is driver
    const ride = db.prepare(`SELECT * FROM rides WHERE id = ? AND driver_id = ?`).get(rideId, userId);
    
    if (ride) {
        // Cancel as driver
        const transaction = db.transaction(() => {
            db.prepare(`
                UPDATE rides SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `).run(rideId);
            
            // Cancel all bookings
            const bookings = db.prepare(`
                SELECT b.id, b.rider_id, u.whatsapp_number
                FROM bookings b
                JOIN users u ON b.rider_id = u.id
                WHERE b.ride_id = ? AND b.status = 'confirmed'
            `).all(rideId);
            
            db.prepare(`
                UPDATE bookings 
                SET status = 'cancelled', cancellation_time = CURRENT_TIMESTAMP, cancellation_reason = ?
                WHERE ride_id = ? AND status = 'confirmed'
            `).run(reason, rideId);
            
            return {
                success: true,
                type: 'driver',
                affectedRiders: bookings,
                message: `✅ *Ride Cancelled*

Your ride from ${maps.formatAddress(ride.source_address)} to ${maps.formatAddress(ride.destination_address)} has been cancelled.

${bookings.length > 0 ? `⚠️ ${bookings.length} passenger(s) will be notified.` : ''}`
            };
        });
        
        return transaction();
    }
    
    // Check if user is rider
    const booking = db.prepare(`
        SELECT b.*, r.source_address, r.destination_address
        FROM bookings b
        JOIN rides r ON b.ride_id = r.id
        WHERE b.ride_id = ? AND b.rider_id = ? AND b.status = 'confirmed'
    `).get(rideId, userId);
    
    if (booking) {
        // Cancel booking as rider
        db.prepare(`
            UPDATE bookings 
            SET status = 'cancelled', cancellation_time = CURRENT_TIMESTAMP, cancellation_reason = ?
            WHERE id = ?
        `).run(reason, booking.id);
        
        // Restore seats
        db.prepare(`
            UPDATE rides SET available_seats = available_seats + ? WHERE id = ?
        `).run(booking.seats_booked, rideId);
        
        return {
            success: true,
            type: 'rider',
            message: `✅ *Booking Cancelled*

Your booking for the ride from ${maps.formatAddress(booking.source_address)} to ${maps.formatAddress(booking.destination_address)} has been cancelled.

💺 ${booking.seats_booked} seat(s) released.`
        };
    }
    
    return {
        success: false,
        message: '❌ Ride not found or you do not have permission to cancel it.'
    };
}

/**
 * Format user rides for WhatsApp
 */
function formatUserRidesForWhatsApp(rides, userId) {
    const { asDriver, asRider } = rides;
    
    if (asDriver.length === 0 && asRider.length === 0) {
        return `📋 *No Active Rides*

You don't have any upcoming rides.

*To get started:*
• Search for rides: *find ride from gulshan to fast*
• Post a ride: *post ride*`;
    }
    
    let message = `📋 *Your Rides*\n\n`;
    
    if (asDriver.length > 0) {
        message += `🚗 *As Driver:*\n\n`;
        asDriver.forEach((ride, i) => {
            message += `*${i + 1}.* ${maps.formatAddress(ride.source_address, 20)} → ${maps.formatAddress(ride.destination_address, 20)}\n`;
            message += `   📅 ${ride.departure_date} at ${formatTime12(ride.departure_time)}\n`;
            message += `   💺 ${ride.available_seats}/${ride.total_seats} seats • 👥 ${ride.bookings_count} booked\n\n`;
        });
    }
    
    if (asRider.length > 0) {
        message += `🎫 *As Passenger:*\n\n`;
        asRider.forEach((ride, i) => {
            message += `*${i + 1}.* ${maps.formatAddress(ride.source_address, 20)} → ${maps.formatAddress(ride.destination_address, 20)}\n`;
            message += `   📅 ${ride.departure_date} at ${formatTime12(ride.departure_time)}\n`;
            message += `   👤 Driver: ${ride.driver_name}\n`;
            message += `   📞 ${ride.driver_phone || 'Contact via app'}\n\n`;
        });
    }
    
    return message;
}

/**
 * Helper: Format time to 12-hour
 */
function formatTime12(time24) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Helper: Get star rating emoji
 */
function getStarRating(rating) {
    if (!rating || rating === 0) return '☆☆☆☆☆';
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    return '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(5 - fullStars - (halfStar ? 1 : 0));
}

module.exports = {
    searchRides,
    formatRidesForWhatsApp,
    bookRide,
    postRide,
    getUserRides,
    getTodayRides,
    cancelRide,
    formatUserRidesForWhatsApp
};
