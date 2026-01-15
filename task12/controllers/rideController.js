const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { apiResponse, calculateHaversineDistance, isFutureDateTime } = require('../utils/helpers');
const { calculateMatchScore, findNearbyPickups, calculateBehaviorScore } = require('../utils/smartMatch');
const { calculateCarbonImpact, recordCarbonImpact } = require('../utils/carbonImpact');
const { checkAndAwardBadges, updateUserStreak, getUserBadges } = require('../utils/gamification');
const { verifyDriverInfo, getSafetyTips, checkSafetyWarnings, generateRideShareLink } = require('../utils/safety');

/**
 * Create a new ride
 */
exports.createRide = async (req, res) => {
    try {
        const {
            source_address, source_lat, source_lng,
            destination_address, destination_lat, destination_lng,
            departure_date, departure_time, total_seats,
            fuel_split_price, ride_rules, distance_km,
            estimated_duration_minutes, route_polyline
        } = req.body;

        // Validate source ≠ destination
        if (source_lat === destination_lat && source_lng === destination_lng) {
            return apiResponse(res, 400, false, 'Source and destination cannot be the same location');
        }

        // Validate departure is in the future
        if (!isFutureDateTime(departure_date, departure_time)) {
            return apiResponse(res, 400, false, 'Departure time must be in the future');
        }

        // Check if driver has overlapping rides
        const overlappingRide = db.prepare(`
            SELECT id FROM rides 
            WHERE driver_id = ? 
            AND departure_date = ? 
            AND status = 'active'
            AND ABS(
                (CAST(substr(departure_time, 1, 2) AS INTEGER) * 60 + CAST(substr(departure_time, 4, 2) AS INTEGER)) -
                (CAST(substr(?, 1, 2) AS INTEGER) * 60 + CAST(substr(?, 4, 2) AS INTEGER))
            ) < 60
        `).get(req.user.id, departure_date, departure_time, departure_time);

        if (overlappingRide) {
            return apiResponse(res, 400, false, 'You already have a ride scheduled around this time');
        }

        const rideId = uuidv4();
        
        const insertRide = db.prepare(`
            INSERT INTO rides (
                id, driver_id, source_address, source_lat, source_lng,
                destination_address, destination_lat, destination_lng,
                departure_date, departure_time, total_seats, available_seats,
                fuel_split_price, ride_rules, distance_km, estimated_duration_minutes, route_polyline
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        insertRide.run(
            rideId, req.user.id,
            source_address, source_lat, source_lng,
            destination_address, destination_lat, destination_lng,
            departure_date, departure_time, total_seats, total_seats,
            fuel_split_price || null, ride_rules || null,
            distance_km || null, estimated_duration_minutes || null, route_polyline || null
        );

        const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(rideId);

        return apiResponse(res, 201, true, 'Ride created successfully', { ride });

    } catch (error) {
        console.error('Create ride error:', error);
        return apiResponse(res, 500, false, 'Failed to create ride. Please try again.');
    }
};

/**
 * Search for rides with smart matching
 */
exports.searchRides = async (req, res) => {
    try {
        const {
            source_lat, source_lng,
            destination_lat, destination_lng,
            date, time_from, time_to,
            radius = 3 // Default 3km radius
        } = req.query;

        let query = `
            SELECT r.*, 
                   u.name as driver_name, 
                   u.university as driver_university,
                   u.department as driver_department,
                   u.average_rating as driver_rating,
                   u.rides_completed as driver_rides_completed,
                   u.behavior_score as driver_behavior_score,
                   u.vehicle_make, u.vehicle_model, u.vehicle_color, u.vehicle_plate
            FROM rides r
            JOIN users u ON r.driver_id = u.id
            WHERE r.status = 'active' 
            AND r.available_seats > 0
            AND (r.departure_date > date('now') OR 
                 (r.departure_date = date('now') AND r.departure_time > time('now')))
        `;

        const params = [];

        // Filter by date
        if (date) {
            query += ' AND r.departure_date = ?';
            params.push(date);
        }

        // Filter by time range
        if (time_from) {
            query += ' AND r.departure_time >= ?';
            params.push(time_from);
        }
        if (time_to) {
            query += ' AND r.departure_time <= ?';
            params.push(time_to);
        }

        query += ' ORDER BY r.departure_date, r.departure_time';

        let rides = db.prepare(query).all(...params);

        // Get current user for smart matching
        const currentUser = req.user ? db.prepare(`SELECT * FROM users WHERE id = ?`).get(req.user.id) : null;

        // Filter by proximity if coordinates provided
        if (source_lat && source_lng) {
            rides = rides.filter(ride => {
                const distance = calculateHaversineDistance(
                    parseFloat(source_lat), parseFloat(source_lng),
                    ride.source_lat, ride.source_lng
                );
                ride.source_distance_km = Math.round(distance * 10) / 10;
                return distance <= parseFloat(radius);
            });
        }

        if (destination_lat && destination_lng) {
            rides = rides.filter(ride => {
                const distance = calculateHaversineDistance(
                    parseFloat(destination_lat), parseFloat(destination_lng),
                    ride.destination_lat, ride.destination_lng
                );
                ride.destination_distance_km = Math.round(distance * 10) / 10;
                return distance <= parseFloat(radius);
            });
        }

        // Calculate smart match scores for each ride
        rides = rides.map(ride => {
            const searchParams = {
                source: source_lat && source_lng ? { lat: parseFloat(source_lat), lng: parseFloat(source_lng) } : null,
                destination: destination_lat && destination_lng ? { lat: parseFloat(destination_lat), lng: parseFloat(destination_lng) } : null,
                time: time_from || null,
                date: date || null,
                department: currentUser?.department || null
            };

            const driver = {
                department: ride.driver_department,
                rating: ride.driver_rating,
                behaviorScore: ride.driver_behavior_score,
                completedRides: ride.driver_rides_completed
            };

            const matchResult = calculateMatchScore(ride, searchParams, driver);
            
            // Calculate estimated carbon savings
            const carbonImpact = ride.distance_km ? calculateCarbonImpact(ride.distance_km, 2) : null;
            
            return {
                ...ride,
                matchScore: matchResult.score,
                matchBadge: matchResult.badge,
                matchBreakdown: matchResult.breakdown,
                carbonImpact: carbonImpact ? {
                    co2Saved: carbonImpact.co2Saved,
                    treesEquivalent: carbonImpact.treesEquivalent
                } : null
            };
        });

        // Sort by match score (highest first), then by departure time
        rides.sort((a, b) => {
            if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
            return (a.source_distance_km || 0) - (b.source_distance_km || 0);
        });

        // Get nearby pickup suggestions
        let pickupSuggestions = [];
        if (source_lat && source_lng) {
            pickupSuggestions = findNearbyPickups(db, parseFloat(source_lat), parseFloat(source_lng), 2);
        }

        return apiResponse(res, 200, true, `Found ${rides.length} rides`, { 
            rides,
            pickupSuggestions,
            searchTips: rides.length === 0 ? [
                'Try increasing the search radius',
                'Check rides for nearby dates',
                'Set up a ride alert to be notified of new matching rides'
            ] : []
        });

    } catch (error) {
        console.error('Search rides error:', error);
        return apiResponse(res, 500, false, 'Failed to search rides');
    }
};

/**
 * Get ride by ID with enhanced driver info and safety features
 */
exports.getRideById = async (req, res) => {
    try {
        const ride = db.prepare(`
            SELECT r.*, 
                   u.name as driver_name, 
                   u.university as driver_university,
                   u.department as driver_department,
                   u.average_rating as driver_rating,
                   u.rides_completed as driver_rides_completed,
                   u.behavior_score as driver_behavior_score,
                   u.gender as driver_gender,
                   u.show_gender as driver_show_gender,
                   u.vehicle_make, u.vehicle_model, u.vehicle_color, u.vehicle_plate,
                   u.profile_verified as driver_verified
            FROM rides r
            JOIN users u ON r.driver_id = u.id
            WHERE r.id = ?
        `).get(req.params.id);

        if (!ride) {
            return apiResponse(res, 404, false, 'Ride not found');
        }

        // Hide driver gender if they chose not to show it
        if (!ride.driver_show_gender) {
            delete ride.driver_gender;
        }
        delete ride.driver_show_gender;

        // Get bookings for this ride
        const bookings = db.prepare(`
            SELECT b.id, b.status, b.seats_booked,
                   u.name as rider_name, u.university as rider_university
            FROM bookings b
            JOIN users u ON b.rider_id = u.id
            WHERE b.ride_id = ? AND b.status IN ('pending', 'confirmed')
        `).all(req.params.id);

        ride.bookings = bookings;

        // Calculate carbon impact for this ride
        if (ride.distance_km) {
            const passengerCount = bookings.filter(b => b.status === 'confirmed').length + 1;
            ride.carbonImpact = calculateCarbonImpact(ride.distance_km, passengerCount);
        }

        // Get driver trust info
        ride.driverTrustInfo = verifyDriverInfo(db, ride.driver_id);

        // Get safety tips based on ride context
        ride.safetyTips = getSafetyTips(false, ride.departure_time);

        // Check for any safety warnings
        if (req.user) {
            ride.safetyWarnings = checkSafetyWarnings(db, ride.driver_id, req.user.id);
        }

        // Vehicle info
        ride.vehicleInfo = {
            make: ride.vehicle_make,
            model: ride.vehicle_model,
            color: ride.vehicle_color,
            plate: ride.vehicle_plate
        };

        return apiResponse(res, 200, true, 'Ride retrieved successfully', { ride });

    } catch (error) {
        console.error('Get ride error:', error);
        return apiResponse(res, 500, false, 'Failed to retrieve ride');
    }
};

/**
 * Get my rides (as driver)
 */
exports.getMyRides = async (req, res) => {
    try {
        const { status } = req.query;

        let query = `
            SELECT r.*, 
                   (SELECT COUNT(*) FROM bookings WHERE ride_id = r.id AND status IN ('pending', 'confirmed')) as total_bookings
            FROM rides r
            WHERE r.driver_id = ?
        `;
        const params = [req.user.id];

        if (status) {
            query += ' AND r.status = ?';
            params.push(status);
        }

        query += ' ORDER BY r.departure_date DESC, r.departure_time DESC';

        const rides = db.prepare(query).all(...params);

        return apiResponse(res, 200, true, 'Rides retrieved successfully', { rides });

    } catch (error) {
        console.error('Get my rides error:', error);
        return apiResponse(res, 500, false, 'Failed to retrieve rides');
    }
};

/**
 * Update ride
 */
exports.updateRide = async (req, res) => {
    try {
        const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(req.params.id);

        if (!ride) {
            return apiResponse(res, 404, false, 'Ride not found');
        }

        if (ride.driver_id !== req.user.id) {
            return apiResponse(res, 403, false, 'You can only update your own rides');
        }

        if (ride.status !== 'active') {
            return apiResponse(res, 400, false, 'Cannot update a ride that is not active');
        }

        // Check if ride has confirmed bookings
        const confirmedBookings = db.prepare(`
            SELECT COUNT(*) as count FROM bookings 
            WHERE ride_id = ? AND status = 'confirmed'
        `).get(req.params.id);

        if (confirmedBookings.count > 0) {
            // Only allow updating certain fields if there are bookings
            const { ride_rules, fuel_split_price } = req.body;
            
            db.prepare(`
                UPDATE rides SET ride_rules = ?, fuel_split_price = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(ride_rules || ride.ride_rules, fuel_split_price || ride.fuel_split_price, req.params.id);
        } else {
            // Allow full update if no bookings
            const {
                source_address, source_lat, source_lng,
                destination_address, destination_lat, destination_lng,
                departure_date, departure_time, total_seats,
                fuel_split_price, ride_rules, distance_km,
                estimated_duration_minutes, route_polyline
            } = req.body;

            db.prepare(`
                UPDATE rides SET
                    source_address = COALESCE(?, source_address),
                    source_lat = COALESCE(?, source_lat),
                    source_lng = COALESCE(?, source_lng),
                    destination_address = COALESCE(?, destination_address),
                    destination_lat = COALESCE(?, destination_lat),
                    destination_lng = COALESCE(?, destination_lng),
                    departure_date = COALESCE(?, departure_date),
                    departure_time = COALESCE(?, departure_time),
                    total_seats = COALESCE(?, total_seats),
                    available_seats = COALESCE(?, available_seats),
                    fuel_split_price = ?,
                    ride_rules = ?,
                    distance_km = ?,
                    estimated_duration_minutes = ?,
                    route_polyline = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(
                source_address, source_lat, source_lng,
                destination_address, destination_lat, destination_lng,
                departure_date, departure_time, total_seats, total_seats,
                fuel_split_price, ride_rules, distance_km,
                estimated_duration_minutes, route_polyline,
                req.params.id
            );
        }

        const updatedRide = db.prepare('SELECT * FROM rides WHERE id = ?').get(req.params.id);

        return apiResponse(res, 200, true, 'Ride updated successfully', { ride: updatedRide });

    } catch (error) {
        console.error('Update ride error:', error);
        return apiResponse(res, 500, false, 'Failed to update ride');
    }
};

/**
 * Cancel ride
 */
exports.cancelRide = async (req, res) => {
    try {
        const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(req.params.id);

        if (!ride) {
            return apiResponse(res, 404, false, 'Ride not found');
        }

        if (ride.driver_id !== req.user.id) {
            return apiResponse(res, 403, false, 'You can only cancel your own rides');
        }

        if (ride.status === 'cancelled') {
            return apiResponse(res, 400, false, 'Ride is already cancelled');
        }

        if (ride.status === 'completed') {
            return apiResponse(res, 400, false, 'Cannot cancel a completed ride');
        }

        // Cancel all bookings for this ride
        db.prepare(`
            UPDATE bookings SET status = 'cancelled', cancellation_reason = 'Ride cancelled by driver', updated_at = CURRENT_TIMESTAMP
            WHERE ride_id = ? AND status IN ('pending', 'confirmed')
        `).run(req.params.id);

        // Cancel the ride
        db.prepare(`
            UPDATE rides SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(req.params.id);

        // Update driver's cancelled rides count
        db.prepare(`
            UPDATE users SET rides_cancelled = rides_cancelled + 1 WHERE id = ?
        `).run(req.user.id);

        return apiResponse(res, 200, true, 'Ride cancelled successfully');

    } catch (error) {
        console.error('Cancel ride error:', error);
        return apiResponse(res, 500, false, 'Failed to cancel ride');
    }
};

/**
 * Complete ride with carbon tracking and gamification
 */
exports.completeRide = async (req, res) => {
    try {
        const ride = db.prepare('SELECT * FROM rides WHERE id = ?').get(req.params.id);

        if (!ride) {
            return apiResponse(res, 404, false, 'Ride not found');
        }

        if (ride.driver_id !== req.user.id) {
            return apiResponse(res, 403, false, 'You can only complete your own rides');
        }

        if (ride.status !== 'active' && ride.status !== 'in_progress') {
            return apiResponse(res, 400, false, 'Ride cannot be completed in current state');
        }

        // Get confirmed bookings
        const confirmedBookings = db.prepare(`
            SELECT b.*, u.id as rider_id FROM bookings b
            JOIN users u ON b.rider_id = u.id
            WHERE b.ride_id = ? AND b.status = 'confirmed'
        `).all(req.params.id);

        const passengerCount = confirmedBookings.length;

        // Update ride status
        db.prepare(`
            UPDATE rides SET status = 'completed', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(req.params.id);

        // Update confirmed bookings to completed
        db.prepare(`
            UPDATE bookings SET status = 'completed', updated_at = CURRENT_TIMESTAMP
            WHERE ride_id = ? AND status = 'confirmed'
        `).run(req.params.id);

        // Track carbon impact
        if (ride.distance_km && passengerCount > 0) {
            const carbonData = calculateCarbonImpact(ride.distance_km, passengerCount + 1);
            
            // Record for driver
            recordCarbonImpact(db, req.user.id, req.params.id, ride.distance_km, passengerCount + 1);
            
            // Record for each rider
            confirmedBookings.forEach(booking => {
                recordCarbonImpact(db, booking.rider_id, req.params.id, ride.distance_km, passengerCount + 1);
            });

            // Update user stats
            const co2PerPerson = carbonData.co2Saved / (passengerCount + 1);
            const distancePerPerson = ride.distance_km;

            db.prepare(`
                UPDATE users SET 
                    rides_completed = rides_completed + 1,
                    total_distance_km = total_distance_km + ?,
                    total_co2_saved = total_co2_saved + ?
                WHERE id = ?
            `).run(distancePerPerson, co2PerPerson, req.user.id);

            confirmedBookings.forEach(booking => {
                db.prepare(`
                    UPDATE users SET 
                        rides_completed = rides_completed + 1,
                        total_distance_km = total_distance_km + ?,
                        total_co2_saved = total_co2_saved + ?
                    WHERE id = ?
                `).run(distancePerPerson, co2PerPerson, booking.rider_id);
            });
        } else {
            // Update driver's completed rides count only
            db.prepare(`
                UPDATE users SET rides_completed = rides_completed + 1 WHERE id = ?
            `).run(req.user.id);

            // Update riders' completed rides count
            confirmedBookings.forEach(booking => {
                db.prepare(`
                    UPDATE users SET rides_completed = rides_completed + 1 WHERE id = ?
                `).run(booking.rider_id);
            });
        }

        // Update streaks
        updateUserStreak(db, req.user.id);
        confirmedBookings.forEach(booking => {
            updateUserStreak(db, booking.rider_id);
        });

        // Check and award badges
        const driverBadges = checkAndAwardBadges(db, req.user.id);
        const allNewBadges = [...driverBadges];
        
        confirmedBookings.forEach(booking => {
            const riderBadges = checkAndAwardBadges(db, booking.rider_id);
            allNewBadges.push(...riderBadges);
        });

        return apiResponse(res, 200, true, 'Ride completed successfully', {
            newBadges: driverBadges,
            carbonImpact: ride.distance_km ? calculateCarbonImpact(ride.distance_km, passengerCount + 1) : null
        });

    } catch (error) {
        console.error('Complete ride error:', error);
        return apiResponse(res, 500, false, 'Failed to complete ride');
    }
};

/**
 * Get popular pickup points
 */
exports.getPickupPoints = async (req, res) => {
    try {
        const { lat, lng, category } = req.query;
        
        let pickups;
        
        if (lat && lng) {
            pickups = findNearbyPickups(db, parseFloat(lat), parseFloat(lng), 5, category);
        } else {
            let query = 'SELECT * FROM popular_pickups';
            const params = [];
            
            if (category) {
                query += ' WHERE category = ?';
                params.push(category);
            }
            
            query += ' ORDER BY usage_count DESC LIMIT 20';
            pickups = db.prepare(query).all(...params);
        }
        
        return apiResponse(res, 200, true, 'Pickup points retrieved', { pickups });
    } catch (error) {
        console.error('Get pickup points error:', error);
        return apiResponse(res, 500, false, 'Failed to get pickup points');
    }
};

/**
 * Get user's carbon dashboard
 */
exports.getCarbonDashboard = async (req, res) => {
    try {
        const { getUserCarbonStats, getPlatformCarbonStats } = require('../utils/carbonImpact');
        
        const userStats = getUserCarbonStats(db, req.user.id);
        const platformStats = getPlatformCarbonStats(db);
        
        // Get user's rank
        const rank = db.prepare(`
            SELECT COUNT(*) + 1 as rank FROM users 
            WHERE total_co2_saved > (SELECT total_co2_saved FROM users WHERE id = ?)
        `).get(req.user.id);
        
        // Get recent carbon savings
        const recentSavings = db.prepare(`
            SELECT c.*, r.source_address, r.destination_address, r.departure_date
            FROM carbon_impact c
            LEFT JOIN rides r ON c.ride_id = r.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
            LIMIT 10
        `).all(req.user.id);
        
        return apiResponse(res, 200, true, 'Carbon dashboard retrieved', {
            userStats: {
                ...userStats,
                rank: rank.rank
            },
            platformStats,
            recentSavings,
            insights: generateCarbonInsights(userStats)
        });
    } catch (error) {
        console.error('Get carbon dashboard error:', error);
        return apiResponse(res, 500, false, 'Failed to get carbon dashboard');
    }
};

/**
 * Generate carbon insights for user
 */
function generateCarbonInsights(userStats) {
    const insights = [];
    
    if (userStats.totalCo2Saved >= 100) {
        insights.push({
            type: 'achievement',
            icon: '🌍',
            message: `Amazing! You've saved ${userStats.totalCo2Saved.toFixed(1)}kg of CO₂`
        });
    }
    
    if (userStats.treesEquivalent >= 1) {
        insights.push({
            type: 'impact',
            icon: '🌳',
            message: `Your impact equals ${userStats.treesEquivalent.toFixed(1)} trees planted!`
        });
    }
    
    if (userStats.moneySaved >= 1000) {
        insights.push({
            type: 'savings',
            icon: '💰',
            message: `You've saved PKR ${userStats.moneySaved.toFixed(0)} on fuel`
        });
    }
    
    if (userStats.totalRides >= 10) {
        insights.push({
            type: 'milestone',
            icon: '🎯',
            message: `${userStats.totalRides} eco-friendly rides completed!`
        });
    }
    
    return insights;
}

/**
 * Get user gamification stats
 */
exports.getGamificationStats = async (req, res) => {
    try {
        const { getLeaderboard } = require('../utils/gamification');
        
        const user = db.prepare(`
            SELECT id, name, current_streak, longest_streak, rides_completed, 
                   total_co2_saved, average_rating, total_ratings, behavior_score
            FROM users WHERE id = ?
        `).get(req.user.id);
        
        const badges = getUserBadges(db, req.user.id);
        
        const leaderboards = {
            co2: getLeaderboard(db, 'co2', 5),
            rides: getLeaderboard(db, 'rides', 5),
            streak: getLeaderboard(db, 'streak', 5)
        };
        
        // Find user's position in leaderboards
        const userRanks = {
            co2: db.prepare(`SELECT COUNT(*) + 1 as rank FROM users WHERE total_co2_saved > ?`).get(user.total_co2_saved).rank,
            rides: db.prepare(`SELECT COUNT(*) + 1 as rank FROM users WHERE rides_completed > ?`).get(user.rides_completed).rank
        };
        
        return apiResponse(res, 200, true, 'Gamification stats retrieved', {
            user: {
                currentStreak: user.current_streak,
                longestStreak: user.longest_streak,
                ridesCompleted: user.rides_completed,
                co2Saved: user.total_co2_saved,
                rating: user.average_rating,
                behaviorScore: user.behavior_score
            },
            badges,
            leaderboards,
            userRanks,
            nextMilestones: getNextMilestones(user, badges)
        });
    } catch (error) {
        console.error('Get gamification stats error:', error);
        return apiResponse(res, 500, false, 'Failed to get gamification stats');
    }
};

/**
 * Calculate next milestones for user
 */
function getNextMilestones(user, badges) {
    const milestones = [];
    const earnedTypes = badges.map(b => b.type);
    
    if (!earnedTypes.includes('eco_starter') && user.rides_completed < 1) {
        milestones.push({
            badge: 'Eco Starter',
            icon: '🌱',
            progress: 0,
            target: 1,
            description: 'Complete your first ride'
        });
    }
    
    if (!earnedTypes.includes('eco_warrior') && user.total_co2_saved < 50) {
        milestones.push({
            badge: 'Eco Warrior',
            icon: '🌍',
            progress: user.total_co2_saved,
            target: 50,
            description: 'Save 50kg CO₂'
        });
    }
    
    if (!earnedTypes.includes('weekly_warrior') && user.current_streak < 7) {
        milestones.push({
            badge: 'Weekly Warrior',
            icon: '📅',
            progress: user.current_streak,
            target: 7,
            description: 'Maintain a 7-day streak'
        });
    }
    
    if (!earnedTypes.includes('community_builder') && user.rides_completed < 50) {
        milestones.push({
            badge: 'Community Builder',
            icon: '🤝',
            progress: user.rides_completed,
            target: 50,
            description: 'Complete 50 rides'
        });
    }
    
    return milestones.slice(0, 3);
}
