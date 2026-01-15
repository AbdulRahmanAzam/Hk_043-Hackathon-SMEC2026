const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { apiResponse, getSeatLockExpiry } = require('../utils/helpers');
require('dotenv').config();

/**
 * Clean up expired seat locks and restore available seats
 */
function cleanupExpiredLocks() {
    const expiredLocks = db.prepare(`
        SELECT * FROM seat_locks 
        WHERE status = 'active' AND expires_at < datetime('now')
    `).all();

    expiredLocks.forEach(lock => {
        // Restore seats to the ride
        db.prepare(`
            UPDATE rides SET available_seats = available_seats + ? WHERE id = ?
        `).run(lock.seats_locked, lock.ride_id);

        // Mark lock as expired
        db.prepare(`
            UPDATE seat_locks SET status = 'expired' WHERE id = ?
        `).run(lock.id);
    });

    return expiredLocks.length;
}

/**
 * Lock a seat (Step 1 of booking - 90 second reservation)
 */
exports.lockSeat = async (req, res) => {
    try {
        // Clean up expired locks first
        cleanupExpiredLocks();

        const { ride_id } = req.body;
        const userId = req.user.id;

        // Get the ride
        const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(ride_id);

        if (!ride) {
            return apiResponse(res, 404, false, 'Ride not found');
        }

        if (ride.status !== 'active') {
            return apiResponse(res, 400, false, 'This ride is no longer available');
        }

        // Check if user is the driver
        if (ride.driver_id === userId) {
            return apiResponse(res, 400, false, 'You cannot book your own ride');
        }

        // Check if user already has a booking for this ride
        const existingBooking = db.prepare(`
            SELECT * FROM bookings 
            WHERE ride_id = ? AND rider_id = ? AND status IN ('pending', 'confirmed')
        `).get(ride_id, userId);

        if (existingBooking) {
            return apiResponse(res, 400, false, 'You already have a booking for this ride');
        }

        // Check if user already has an active lock for this ride
        const existingLock = db.prepare(`
            SELECT * FROM seat_locks 
            WHERE ride_id = ? AND user_id = ? AND status = 'active' AND expires_at > datetime('now')
        `).get(ride_id, userId);

        if (existingLock) {
            const expiresAt = new Date(existingLock.expires_at);
            const remainingSeconds = Math.ceil((expiresAt - new Date()) / 1000);
            
            return apiResponse(res, 200, true, 'You already have a seat locked', {
                lock_id: existingLock.id,
                expires_at: existingLock.expires_at,
                remaining_seconds: remainingSeconds
            });
        }

        // Check available seats
        if (ride.available_seats < 1) {
            return apiResponse(res, 400, false, 'No seats available for this ride');
        }

        // Create seat lock
        const lockId = uuidv4();
        const expiresAt = getSeatLockExpiry();

        // Use transaction for atomicity
        const transaction = db.transaction(() => {
            // Decrement available seats
            db.prepare(`
                UPDATE rides SET available_seats = available_seats - 1 WHERE id = ? AND available_seats > 0
            `).run(ride_id);

            // Create lock record
            db.prepare(`
                INSERT INTO seat_locks (id, ride_id, user_id, seats_locked, expires_at)
                VALUES (?, ?, ?, 1, ?)
            `).run(lockId, ride_id, userId, expiresAt);

            // Create pending booking
            const bookingId = uuidv4();
            db.prepare(`
                INSERT INTO bookings (id, ride_id, rider_id, status)
                VALUES (?, ?, ?, 'pending')
            `).run(bookingId, ride_id, userId);

            return bookingId;
        });

        const bookingId = transaction();

        const lockDuration = parseInt(process.env.SEAT_LOCK_DURATION) || 90;

        return apiResponse(res, 201, true, `Seat locked for ${lockDuration} seconds. Please confirm your booking.`, {
            lock_id: lockId,
            booking_id: bookingId,
            expires_at: expiresAt,
            remaining_seconds: lockDuration
        });

    } catch (error) {
        console.error('Lock seat error:', error);
        return apiResponse(res, 500, false, 'Failed to lock seat. Please try again.');
    }
};

/**
 * Confirm booking (Step 2 of booking - within 90 seconds)
 */
exports.confirmBooking = async (req, res) => {
    try {
        // Clean up expired locks first
        cleanupExpiredLocks();

        const bookingId = req.params.id;
        const userId = req.user.id;

        // Get the booking
        const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);

        if (!booking) {
            return apiResponse(res, 404, false, 'Booking not found');
        }

        if (booking.rider_id !== userId) {
            return apiResponse(res, 403, false, 'You can only confirm your own bookings');
        }

        if (booking.status !== 'pending') {
            return apiResponse(res, 400, false, `Booking is already ${booking.status}`);
        }

        // Check if seat lock is still active
        const lock = db.prepare(`
            SELECT * FROM seat_locks 
            WHERE ride_id = ? AND user_id = ? AND status = 'active' AND expires_at > datetime('now')
        `).get(booking.ride_id, userId);

        if (!lock) {
            // Lock expired, cancel the booking and restore seat
            db.prepare(`
                UPDATE bookings SET status = 'cancelled', cancellation_reason = 'Seat lock expired'
                WHERE id = ?
            `).run(bookingId);

            return apiResponse(res, 400, false, 'Your seat reservation has expired. Please try booking again.');
        }

        // Confirm the booking
        const transaction = db.transaction(() => {
            // Update booking to confirmed
            db.prepare(`
                UPDATE bookings 
                SET status = 'confirmed', confirmation_time = datetime('now'), updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(bookingId);

            // Update lock to confirmed
            db.prepare(`
                UPDATE seat_locks SET status = 'confirmed' WHERE id = ?
            `).run(lock.id);
        });

        transaction();

        // Get updated booking with ride info
        const confirmedBooking = db.prepare(`
            SELECT b.*, r.source_address, r.destination_address, 
                   r.departure_date, r.departure_time, r.fuel_split_price,
                   u.name as driver_name, u.phone as driver_phone
            FROM bookings b
            JOIN rides r ON b.ride_id = r.id
            JOIN users u ON r.driver_id = u.id
            WHERE b.id = ?
        `).get(bookingId);

        return apiResponse(res, 200, true, 'Booking confirmed successfully!', { booking: confirmedBooking });

    } catch (error) {
        console.error('Confirm booking error:', error);
        return apiResponse(res, 500, false, 'Failed to confirm booking');
    }
};

/**
 * Cancel booking
 */
exports.cancelBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const userId = req.user.id;
        const { reason } = req.body;

        const booking = db.prepare(`
            SELECT b.*, r.driver_id, r.departure_date, r.departure_time
            FROM bookings b
            JOIN rides r ON b.ride_id = r.id
            WHERE b.id = ?
        `).get(bookingId);

        if (!booking) {
            return apiResponse(res, 404, false, 'Booking not found');
        }

        // Allow cancellation by rider or driver
        if (booking.rider_id !== userId && booking.driver_id !== userId) {
            return apiResponse(res, 403, false, 'You can only cancel your own bookings');
        }

        if (booking.status === 'cancelled') {
            return apiResponse(res, 400, false, 'Booking is already cancelled');
        }

        if (booking.status === 'completed') {
            return apiResponse(res, 400, false, 'Cannot cancel a completed booking');
        }

        // Cancel the booking and restore seat
        const transaction = db.transaction(() => {
            db.prepare(`
                UPDATE bookings 
                SET status = 'cancelled', 
                    cancellation_time = datetime('now'),
                    cancellation_reason = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(reason || 'Cancelled by user', bookingId);

            // Restore the seat
            db.prepare(`
                UPDATE rides SET available_seats = available_seats + 1 WHERE id = ?
            `).run(booking.ride_id);

            // Update cancelled count for the one who cancelled
            db.prepare(`
                UPDATE users SET rides_cancelled = rides_cancelled + 1 WHERE id = ?
            `).run(userId);
        });

        transaction();

        return apiResponse(res, 200, true, 'Booking cancelled successfully');

    } catch (error) {
        console.error('Cancel booking error:', error);
        return apiResponse(res, 500, false, 'Failed to cancel booking');
    }
};

/**
 * Get my bookings
 */
exports.getMyBookings = async (req, res) => {
    try {
        const { status, type } = req.query;

        let query = `
            SELECT b.*, 
                   r.source_address, r.destination_address,
                   r.source_lat, r.source_lng, r.destination_lat, r.destination_lng,
                   r.departure_date, r.departure_time, r.fuel_split_price,
                   r.distance_km, r.estimated_duration_minutes,
                   u.name as driver_name, u.average_rating as driver_rating,
                   u.university as driver_university
            FROM bookings b
            JOIN rides r ON b.ride_id = r.id
            JOIN users u ON r.driver_id = u.id
            WHERE b.rider_id = ?
        `;
        const params = [req.user.id];

        if (status) {
            query += ' AND b.status = ?';
            params.push(status);
        }

        if (type === 'upcoming') {
            query += ` AND b.status IN ('pending', 'confirmed') 
                       AND (r.departure_date > date('now') OR 
                            (r.departure_date = date('now') AND r.departure_time > time('now')))`;
        } else if (type === 'past') {
            query += ` AND (b.status IN ('completed', 'cancelled', 'no_show') OR
                           (r.departure_date < date('now') OR 
                            (r.departure_date = date('now') AND r.departure_time < time('now'))))`;
        }

        query += ' ORDER BY r.departure_date DESC, r.departure_time DESC';

        const bookings = db.prepare(query).all(...params);

        return apiResponse(res, 200, true, 'Bookings retrieved successfully', { bookings });

    } catch (error) {
        console.error('Get my bookings error:', error);
        return apiResponse(res, 500, false, 'Failed to retrieve bookings');
    }
};

/**
 * Get booking by ID
 */
exports.getBookingById = async (req, res) => {
    try {
        const booking = db.prepare(`
            SELECT b.*, 
                   r.source_address, r.destination_address,
                   r.source_lat, r.source_lng, r.destination_lat, r.destination_lng,
                   r.departure_date, r.departure_time, r.fuel_split_price,
                   r.distance_km, r.estimated_duration_minutes, r.route_polyline,
                   r.ride_rules, r.driver_id,
                   u.name as driver_name, u.average_rating as driver_rating,
                   u.university as driver_university, u.phone as driver_phone
            FROM bookings b
            JOIN rides r ON b.ride_id = r.id
            JOIN users u ON r.driver_id = u.id
            WHERE b.id = ?
        `).get(req.params.id);

        if (!booking) {
            return apiResponse(res, 404, false, 'Booking not found');
        }

        // Only allow viewing own bookings or if user is the driver
        if (booking.rider_id !== req.user.id && booking.driver_id !== req.user.id) {
            return apiResponse(res, 403, false, 'Access denied');
        }

        // Check if rating exists
        const rating = db.prepare(`
            SELECT * FROM ratings WHERE booking_id = ? AND rater_id = ?
        `).get(req.params.id, req.user.id);

        booking.has_rated = !!rating;

        return apiResponse(res, 200, true, 'Booking retrieved successfully', { booking });

    } catch (error) {
        console.error('Get booking error:', error);
        return apiResponse(res, 500, false, 'Failed to retrieve booking');
    }
};

/**
 * Rate ride
 */
exports.rateRide = async (req, res) => {
    try {
        const { rating, comment } = req.body;
        const bookingId = req.params.id;
        const raterId = req.user.id;

        const booking = db.prepare(`
            SELECT b.*, r.driver_id 
            FROM bookings b
            JOIN rides r ON b.ride_id = r.id
            WHERE b.id = ?
        `).get(bookingId);

        if (!booking) {
            return apiResponse(res, 404, false, 'Booking not found');
        }

        if (booking.status !== 'completed') {
            return apiResponse(res, 400, false, 'Can only rate completed rides');
        }

        // Determine who is rating whom
        let ratedId, ratingType;
        if (raterId === booking.rider_id) {
            ratedId = booking.driver_id;
            ratingType = 'rider_to_driver';
        } else if (raterId === booking.driver_id) {
            ratedId = booking.rider_id;
            ratingType = 'driver_to_rider';
        } else {
            return apiResponse(res, 403, false, 'You are not part of this booking');
        }

        // Check if already rated
        const existingRating = db.prepare(`
            SELECT * FROM ratings 
            WHERE booking_id = ? AND rater_id = ? AND rated_id = ?
        `).get(bookingId, raterId, ratedId);

        if (existingRating) {
            return apiResponse(res, 400, false, 'You have already rated this ride');
        }

        // Create rating and update user average
        const transaction = db.transaction(() => {
            const ratingId = uuidv4();
            
            db.prepare(`
                INSERT INTO ratings (id, booking_id, rater_id, rated_id, rating, comment, rating_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(ratingId, bookingId, raterId, ratedId, rating, comment || null, ratingType);

            // Update average rating
            const ratedUser = db.prepare('SELECT average_rating, total_ratings FROM users WHERE id = ?').get(ratedId);
            const newTotalRatings = ratedUser.total_ratings + 1;
            const newAverageRating = ((ratedUser.average_rating * ratedUser.total_ratings) + rating) / newTotalRatings;

            db.prepare(`
                UPDATE users SET average_rating = ?, total_ratings = ? WHERE id = ?
            `).run(Math.round(newAverageRating * 10) / 10, newTotalRatings, ratedId);
        });

        transaction();

        return apiResponse(res, 201, true, 'Rating submitted successfully');

    } catch (error) {
        console.error('Rate ride error:', error);
        return apiResponse(res, 500, false, 'Failed to submit rating');
    }
};

/**
 * Mark rider as no-show
 */
exports.markNoShow = async (req, res) => {
    try {
        const bookingId = req.params.id;
        const driverId = req.user.id;

        const booking = db.prepare(`
            SELECT b.*, r.driver_id, r.departure_date, r.departure_time
            FROM bookings b
            JOIN rides r ON b.ride_id = r.id
            WHERE b.id = ?
        `).get(bookingId);

        if (!booking) {
            return apiResponse(res, 404, false, 'Booking not found');
        }

        if (booking.driver_id !== driverId) {
            return apiResponse(res, 403, false, 'Only the driver can mark no-shows');
        }

        if (booking.status !== 'confirmed') {
            return apiResponse(res, 400, false, 'Can only mark confirmed bookings as no-show');
        }

        // Check if departure time has passed
        const departureDateTime = new Date(`${booking.departure_date}T${booking.departure_time}`);
        if (departureDateTime > new Date()) {
            return apiResponse(res, 400, false, 'Cannot mark no-show before departure time');
        }

        // Update booking and user stats
        const transaction = db.transaction(() => {
            db.prepare(`
                UPDATE bookings SET status = 'no_show', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(bookingId);

            db.prepare(`
                UPDATE users SET no_shows = no_shows + 1 WHERE id = ?
            `).run(booking.rider_id);

            // Restore seat
            db.prepare(`
                UPDATE rides SET available_seats = available_seats + 1 WHERE id = ?
            `).run(booking.ride_id);
        });

        transaction();

        return apiResponse(res, 200, true, 'Rider marked as no-show');

    } catch (error) {
        console.error('Mark no-show error:', error);
        return apiResponse(res, 500, false, 'Failed to mark no-show');
    }
};

// Export cleanup function for scheduled use
exports.cleanupExpiredLocks = cleanupExpiredLocks;
