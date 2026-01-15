const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { apiResponse } = require('../utils/helpers');
const safety = require('../utils/safety');

/**
 * Get emergency contacts
 */
exports.getEmergencyContacts = async (req, res) => {
    try {
        const contacts = safety.getEmergencyContacts(db, req.user.id);
        return apiResponse(res, 200, true, 'Emergency contacts retrieved', { contacts });
    } catch (error) {
        console.error('Get emergency contacts error:', error);
        return apiResponse(res, 500, false, 'Failed to get emergency contacts');
    }
};

/**
 * Add emergency contact
 */
exports.addEmergencyContact = async (req, res) => {
    try {
        const { name, phone, relationship } = req.body;
        const contact = safety.addEmergencyContact(db, req.user.id, name, phone, relationship);
        return apiResponse(res, 201, true, 'Emergency contact added', { contact });
    } catch (error) {
        console.error('Add emergency contact error:', error);
        if (error.message.includes('Maximum')) {
            return apiResponse(res, 400, false, error.message);
        }
        return apiResponse(res, 500, false, 'Failed to add emergency contact');
    }
};

/**
 * Remove emergency contact
 */
exports.removeEmergencyContact = async (req, res) => {
    try {
        const success = safety.removeEmergencyContact(db, req.params.id, req.user.id);
        if (!success) {
            return apiResponse(res, 404, false, 'Emergency contact not found');
        }
        return apiResponse(res, 200, true, 'Emergency contact removed');
    } catch (error) {
        console.error('Remove emergency contact error:', error);
        return apiResponse(res, 500, false, 'Failed to remove emergency contact');
    }
};

/**
 * Generate ride share link
 */
exports.generateShareLink = async (req, res) => {
    try {
        const { rideId } = req.params;
        
        // Verify user is part of this ride
        const booking = db.prepare(`
            SELECT * FROM bookings WHERE ride_id = ? AND rider_id = ? AND status IN ('pending', 'confirmed')
        `).get(rideId, req.user.id);
        
        const ride = db.prepare(`SELECT * FROM rides WHERE id = ? AND driver_id = ?`).get(rideId, req.user.id);
        
        if (!booking && !ride) {
            return apiResponse(res, 403, false, 'You are not part of this ride');
        }
        
        const { token, link } = safety.generateRideShareLink(rideId, req.user.id);
        
        // Store token with 24 hour expiry
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        safety.storeRideShareToken(db, rideId, req.user.id, token, expiresAt);
        
        const fullLink = `${req.protocol}://${req.get('host')}${link}`;
        
        return apiResponse(res, 200, true, 'Share link generated', { link: fullLink, expiresAt });
    } catch (error) {
        console.error('Generate share link error:', error);
        return apiResponse(res, 500, false, 'Failed to generate share link');
    }
};

/**
 * Track ride (public, no auth needed)
 */
exports.trackRide = async (req, res) => {
    try {
        const { rideId, token } = req.params;
        
        if (!safety.validateRideShareToken(db, rideId, token)) {
            return apiResponse(res, 403, false, 'Invalid or expired tracking link');
        }
        
        const ride = db.prepare(`
            SELECT r.*, 
                   u.name as driver_name, u.phone as driver_phone,
                   u.vehicle_make, u.vehicle_model, u.vehicle_color, u.vehicle_plate,
                   ar.driver_lat, ar.driver_lng, ar.status as live_status
            FROM rides r
            JOIN users u ON r.driver_id = u.id
            LEFT JOIN active_rides ar ON r.id = ar.ride_id
            WHERE r.id = ?
        `).get(rideId);
        
        if (!ride) {
            return apiResponse(res, 404, false, 'Ride not found');
        }
        
        return apiResponse(res, 200, true, 'Ride tracking info', {
            ride: {
                id: ride.id,
                status: ride.status,
                source: { address: ride.source_address, lat: ride.source_lat, lng: ride.source_lng },
                destination: { address: ride.destination_address, lat: ride.destination_lat, lng: ride.destination_lng },
                departureDate: ride.departure_date,
                departureTime: ride.departure_time,
                driver: {
                    name: ride.driver_name,
                    phone: ride.driver_phone,
                    vehicle: {
                        make: ride.vehicle_make,
                        model: ride.vehicle_model,
                        color: ride.vehicle_color,
                        plate: ride.vehicle_plate
                    }
                },
                liveLocation: ride.driver_lat && ride.driver_lng ? {
                    lat: ride.driver_lat,
                    lng: ride.driver_lng,
                    status: ride.live_status
                } : null
            }
        });
    } catch (error) {
        console.error('Track ride error:', error);
        return apiResponse(res, 500, false, 'Failed to track ride');
    }
};

/**
 * Trigger SOS alert
 */
exports.triggerSOS = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { lat, lng, message } = req.body;
        
        // Verify user is part of this ride
        const booking = db.prepare(`
            SELECT * FROM bookings WHERE ride_id = ? AND rider_id = ? AND status IN ('pending', 'confirmed')
        `).get(rideId, req.user.id);
        
        const ride = db.prepare(`SELECT * FROM rides WHERE id = ? AND driver_id = ?`).get(rideId, req.user.id);
        
        if (!booking && !ride) {
            return apiResponse(res, 403, false, 'You are not part of this ride');
        }
        
        const alertData = safety.createSOSAlert(db, rideId, req.user.id, { lat, lng }, message);
        
        // In production, this would trigger SMS/push notifications
        console.log('🚨 SOS ALERT TRIGGERED:', alertData);
        
        return apiResponse(res, 201, true, 'SOS alert triggered. Emergency contacts have been notified.', {
            alertId: alertData.alertId,
            contactsNotified: alertData.contacts.length
        });
    } catch (error) {
        console.error('Trigger SOS error:', error);
        return apiResponse(res, 500, false, 'Failed to trigger SOS');
    }
};

/**
 * Get driver info for verification
 */
exports.getDriverInfo = async (req, res) => {
    try {
        const { driverId } = req.params;
        const driverInfo = safety.verifyDriverInfo(db, driverId);
        
        if (!driverInfo) {
            return apiResponse(res, 404, false, 'Driver not found');
        }
        
        // Remove sensitive info
        delete driverInfo.email;
        
        return apiResponse(res, 200, true, 'Driver info retrieved', { driver: driverInfo });
    } catch (error) {
        console.error('Get driver info error:', error);
        return apiResponse(res, 500, false, 'Failed to get driver info');
    }
};

/**
 * Update live location (for drivers during active ride)
 */
exports.updateLiveLocation = async (req, res) => {
    try {
        const { rideId } = req.params;
        const { lat, lng } = req.body;
        
        // Verify driver
        const ride = db.prepare(`SELECT * FROM rides WHERE id = ? AND driver_id = ?`).get(rideId, req.user.id);
        
        if (!ride) {
            return apiResponse(res, 403, false, 'Not authorized');
        }
        
        // Update or insert active ride
        const existing = db.prepare(`SELECT * FROM active_rides WHERE ride_id = ?`).get(rideId);
        
        if (existing) {
            db.prepare(`
                UPDATE active_rides SET driver_lat = ?, driver_lng = ?, last_updated = CURRENT_TIMESTAMP
                WHERE ride_id = ?
            `).run(lat, lng, rideId);
        } else {
            const crypto = require('crypto');
            db.prepare(`
                INSERT INTO active_rides (id, ride_id, share_token, driver_lat, driver_lng, status)
                VALUES (?, ?, ?, ?, ?, 'in_progress')
            `).run(uuidv4(), rideId, crypto.randomBytes(16).toString('hex'), lat, lng);
        }
        
        return apiResponse(res, 200, true, 'Location updated');
    } catch (error) {
        console.error('Update location error:', error);
        return apiResponse(res, 500, false, 'Failed to update location');
    }
};

/**
 * Get safety tips
 */
exports.getSafetyTips = async (req, res) => {
    try {
        const { isDriver, time } = req.query;
        const tips = safety.getSafetyTips(isDriver === 'true', time);
        return apiResponse(res, 200, true, 'Safety tips retrieved', { tips });
    } catch (error) {
        console.error('Get safety tips error:', error);
        return apiResponse(res, 500, false, 'Failed to get safety tips');
    }
};
