/**
 * Carbon Impact Calculator
 * Calculates environmental impact of carpooling
 */

// Average car fuel consumption in Pakistan: ~12 km/liter
const AVG_FUEL_CONSUMPTION_KM_PER_LITER = 12;

// CO2 emission per liter of petrol: 2.31 kg
const CO2_PER_LITER_KG = 2.31;

// Average CO2 absorbed by a tree per year: 21 kg
const CO2_PER_TREE_PER_YEAR_KG = 21;

/**
 * Calculate carbon impact for a shared ride
 * @param {number} distanceKm - Distance traveled in km
 * @param {number} passengers - Number of passengers sharing the ride
 * @returns {Object} Impact metrics
 */
function calculateCarbonImpact(distanceKm, passengers = 1) {
    // Without carpooling, each person would drive separately
    // With carpooling, only one car is used
    
    // Cars saved = passengers (as they didn't need their own cars)
    const carsSaved = passengers;
    
    // Distance that would have been driven by separate cars
    const distanceSaved = distanceKm * passengers;
    
    // Fuel saved (liters)
    const fuelSaved = distanceSaved / AVG_FUEL_CONSUMPTION_KM_PER_LITER;
    
    // CO2 saved (kg)
    const co2Saved = fuelSaved * CO2_PER_LITER_KG;
    
    // Tree equivalent (yearly absorption capacity)
    const treesEquivalent = co2Saved / CO2_PER_TREE_PER_YEAR_KG;
    
    // Money saved (PKR) - Avg fuel price ~300 PKR/liter
    const moneySaved = fuelSaved * 300;
    
    return {
        distanceKm,
        passengers,
        distanceSaved: Math.round(distanceSaved * 10) / 10,
        fuelSavedLiters: Math.round(fuelSaved * 100) / 100,
        co2SavedKg: Math.round(co2Saved * 100) / 100,
        treesEquivalent: Math.round(treesEquivalent * 1000) / 1000,
        moneySavedPKR: Math.round(moneySaved)
    };
}

/**
 * Get aggregated carbon stats for a user
 * @param {Object} db - Database instance
 * @param {string} userId - User ID
 * @returns {Object} Aggregated stats
 */
function getUserCarbonStats(db, userId) {
    const stats = db.prepare(`
        SELECT 
            COUNT(*) as total_rides,
            COALESCE(SUM(distance_km), 0) as total_distance,
            COALESCE(SUM(fuel_saved_liters), 0) as total_fuel_saved,
            COALESCE(SUM(co2_saved_kg), 0) as total_co2_saved,
            COALESCE(SUM(trees_equivalent), 0) as total_trees
        FROM carbon_impact
        WHERE user_id = ?
    `).get(userId);
    
    // Monthly stats
    const monthlyStats = db.prepare(`
        SELECT 
            strftime('%Y-%m', created_at) as month,
            COUNT(*) as rides,
            COALESCE(SUM(co2_saved_kg), 0) as co2_saved
        FROM carbon_impact
        WHERE user_id = ?
        GROUP BY strftime('%Y-%m', created_at)
        ORDER BY month DESC
        LIMIT 12
    `).all(userId);
    
    return {
        lifetime: {
            totalRides: stats.total_rides,
            totalDistanceKm: Math.round(stats.total_distance * 10) / 10,
            fuelSavedLiters: Math.round(stats.total_fuel_saved * 10) / 10,
            co2SavedKg: Math.round(stats.total_co2_saved * 10) / 10,
            treesEquivalent: Math.round(stats.total_trees * 100) / 100,
            moneySavedPKR: Math.round(stats.total_fuel_saved * 300)
        },
        monthly: monthlyStats
    };
}

/**
 * Get platform-wide carbon statistics
 * @param {Object} db - Database instance
 * @returns {Object} Platform stats
 */
function getPlatformCarbonStats(db) {
    const stats = db.prepare(`
        SELECT 
            COUNT(*) as total_rides,
            COUNT(DISTINCT user_id) as total_users,
            COALESCE(SUM(distance_km), 0) as total_distance,
            COALESCE(SUM(fuel_saved_liters), 0) as total_fuel_saved,
            COALESCE(SUM(co2_saved_kg), 0) as total_co2_saved,
            COALESCE(SUM(trees_equivalent), 0) as total_trees
        FROM carbon_impact
    `).get();
    
    // Daily stats for last 30 days
    const dailyStats = db.prepare(`
        SELECT 
            date(created_at) as date,
            COUNT(*) as rides,
            COALESCE(SUM(co2_saved_kg), 0) as co2_saved
        FROM carbon_impact
        WHERE created_at >= date('now', '-30 days')
        GROUP BY date(created_at)
        ORDER BY date DESC
    `).all();
    
    // Top contributors
    const topContributors = db.prepare(`
        SELECT 
            c.user_id,
            u.name,
            u.university,
            SUM(c.co2_saved_kg) as total_co2
        FROM carbon_impact c
        JOIN users u ON c.user_id = u.id
        GROUP BY c.user_id
        ORDER BY total_co2 DESC
        LIMIT 10
    `).all();
    
    return {
        totals: {
            totalRides: stats.total_rides,
            totalUsers: stats.total_users,
            totalDistanceKm: Math.round(stats.total_distance),
            fuelSavedLiters: Math.round(stats.total_fuel_saved),
            co2SavedKg: Math.round(stats.total_co2_saved),
            treesEquivalent: Math.round(stats.total_trees * 10) / 10
        },
        dailyStats,
        topContributors
    };
}

/**
 * Record carbon impact for a completed ride
 */
function recordCarbonImpact(db, userId, rideId, distanceKm, passengers) {
    const impact = calculateCarbonImpact(distanceKm, passengers);
    const { v4: uuidv4 } = require('uuid');
    
    db.prepare(`
        INSERT INTO carbon_impact (id, user_id, ride_id, distance_km, passengers, fuel_saved_liters, co2_saved_kg, trees_equivalent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        uuidv4(),
        userId,
        rideId,
        distanceKm,
        passengers,
        impact.fuelSavedLiters,
        impact.co2SavedKg,
        impact.treesEquivalent
    );
    
    // Update user's total CO2 saved
    db.prepare(`
        UPDATE users SET total_co2_saved = total_co2_saved + ? WHERE id = ?
    `).run(impact.co2SavedKg, userId);
    
    return impact;
}

module.exports = {
    calculateCarbonImpact,
    getUserCarbonStats,
    getPlatformCarbonStats,
    recordCarbonImpact
};
