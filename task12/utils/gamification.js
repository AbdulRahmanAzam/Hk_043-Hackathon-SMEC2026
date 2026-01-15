/**
 * Gamification System
 * Badges, streaks, and achievements
 */

const BADGES = {
    // Eco badges
    ECO_STARTER: { type: 'eco_starter', name: 'Eco Starter', icon: '🌱', description: 'Completed first carpool ride', requirement: 1 },
    ECO_WARRIOR: { type: 'eco_warrior', name: 'Eco Warrior', icon: '🌍', description: 'Saved 50kg CO₂', requirement: 50 },
    TREE_PLANTER: { type: 'tree_planter', name: 'Tree Planter', icon: '🌳', description: 'Equivalent of planting 5 trees', requirement: 5 },
    CARBON_CHAMPION: { type: 'carbon_champion', name: 'Carbon Champion', icon: '♻️', description: 'Saved 500kg CO₂', requirement: 500 },
    
    // Reliability badges
    RELIABLE_RIDER: { type: 'reliable_rider', name: 'Reliable Rider', icon: '⭐', description: '10 completed rides without cancellation', requirement: 10 },
    TRUSTED_DRIVER: { type: 'trusted_driver', name: 'Trusted Driver', icon: '🚗', description: '20 rides as driver with 4+ rating', requirement: 20 },
    PUNCTUAL_STAR: { type: 'punctual_star', name: 'Punctual Star', icon: '⏰', description: '15 on-time arrivals in a row', requirement: 15 },
    
    // Social badges
    COMMUNITY_BUILDER: { type: 'community_builder', name: 'Community Builder', icon: '🤝', description: 'Shared 50 rides', requirement: 50 },
    CAMPUS_CONNECTOR: { type: 'campus_connector', name: 'Campus Connector', icon: '🎓', description: 'Rides with 5 different universities', requirement: 5 },
    
    // Activity badges
    EARLY_BIRD: { type: 'early_bird', name: 'Early Bird', icon: '🌅', description: '10 rides before 8 AM', requirement: 10 },
    NIGHT_OWL: { type: 'night_owl', name: 'Night Owl', icon: '🦉', description: '10 rides after 8 PM', requirement: 10 },
    PEAK_HOUR_HERO: { type: 'peak_hour_hero', name: 'Peak Hour Hero', icon: '🦸', description: '25 rides during peak hours', requirement: 25 },
    
    // Streak badges
    WEEKLY_WARRIOR: { type: 'weekly_warrior', name: 'Weekly Warrior', icon: '📅', description: '7 day streak', requirement: 7 },
    MONTHLY_MASTER: { type: 'monthly_master', name: 'Monthly Master', icon: '🏆', description: '30 day streak', requirement: 30 },
    
    // Rating badges
    FIVE_STAR: { type: 'five_star', name: 'Five Star', icon: '🌟', description: 'Maintained 5.0 rating for 10 rides', requirement: 10 },
    TOP_RATED: { type: 'top_rated', name: 'Top Rated', icon: '👑', description: 'Average rating above 4.8 with 50+ reviews', requirement: 50 }
};

/**
 * Check and award badges to a user
 */
function checkAndAwardBadges(db, userId) {
    const user = db.prepare(`
        SELECT * FROM users WHERE id = ?
    `).get(userId);
    
    if (!user) return [];
    
    const existingBadges = db.prepare(`
        SELECT badge_type FROM user_badges WHERE user_id = ?
    `).all(userId).map(b => b.badge_type);
    
    const newBadges = [];
    const { v4: uuidv4 } = require('uuid');
    
    // Check eco badges
    if (!existingBadges.includes('eco_starter') && user.rides_completed >= 1) {
        awardBadge(db, uuidv4(), userId, BADGES.ECO_STARTER);
        newBadges.push(BADGES.ECO_STARTER);
    }
    
    if (!existingBadges.includes('eco_warrior') && user.total_co2_saved >= 50) {
        awardBadge(db, uuidv4(), userId, BADGES.ECO_WARRIOR);
        newBadges.push(BADGES.ECO_WARRIOR);
    }
    
    if (!existingBadges.includes('carbon_champion') && user.total_co2_saved >= 500) {
        awardBadge(db, uuidv4(), userId, BADGES.CARBON_CHAMPION);
        newBadges.push(BADGES.CARBON_CHAMPION);
    }
    
    // Check reliability badges
    const recentCancellations = db.prepare(`
        SELECT COUNT(*) as count FROM bookings 
        WHERE rider_id = ? AND status = 'cancelled' 
        AND created_at > datetime('now', '-30 days')
    `).get(userId);
    
    if (!existingBadges.includes('reliable_rider') && 
        user.rides_completed >= 10 && 
        recentCancellations.count === 0) {
        awardBadge(db, uuidv4(), userId, BADGES.RELIABLE_RIDER);
        newBadges.push(BADGES.RELIABLE_RIDER);
    }
    
    // Check driver badges
    if (user.role !== 'rider') {
        const driverRides = db.prepare(`
            SELECT COUNT(*) as count FROM rides 
            WHERE driver_id = ? AND status = 'completed'
        `).get(userId);
        
        if (!existingBadges.includes('trusted_driver') && 
            driverRides.count >= 20 && 
            user.average_rating >= 4) {
            awardBadge(db, uuidv4(), userId, BADGES.TRUSTED_DRIVER);
            newBadges.push(BADGES.TRUSTED_DRIVER);
        }
    }
    
    // Check community badges
    if (!existingBadges.includes('community_builder') && user.rides_completed >= 50) {
        awardBadge(db, uuidv4(), userId, BADGES.COMMUNITY_BUILDER);
        newBadges.push(BADGES.COMMUNITY_BUILDER);
    }
    
    // Check streak badges
    if (!existingBadges.includes('weekly_warrior') && user.current_streak >= 7) {
        awardBadge(db, uuidv4(), userId, BADGES.WEEKLY_WARRIOR);
        newBadges.push(BADGES.WEEKLY_WARRIOR);
    }
    
    if (!existingBadges.includes('monthly_master') && user.longest_streak >= 30) {
        awardBadge(db, uuidv4(), userId, BADGES.MONTHLY_MASTER);
        newBadges.push(BADGES.MONTHLY_MASTER);
    }
    
    // Check rating badges
    if (!existingBadges.includes('five_star') && 
        user.average_rating === 5 && 
        user.total_ratings >= 10) {
        awardBadge(db, uuidv4(), userId, BADGES.FIVE_STAR);
        newBadges.push(BADGES.FIVE_STAR);
    }
    
    if (!existingBadges.includes('top_rated') && 
        user.average_rating >= 4.8 && 
        user.total_ratings >= 50) {
        awardBadge(db, uuidv4(), userId, BADGES.TOP_RATED);
        newBadges.push(BADGES.TOP_RATED);
    }
    
    // Check peak hour badge
    const peakHourRides = db.prepare(`
        SELECT COUNT(*) as count FROM bookings b
        JOIN rides r ON b.ride_id = r.id
        WHERE b.rider_id = ? AND b.status = 'completed'
        AND (
            (CAST(substr(r.departure_time, 1, 2) AS INTEGER) BETWEEN 7 AND 9)
            OR (CAST(substr(r.departure_time, 1, 2) AS INTEGER) BETWEEN 17 AND 19)
        )
    `).get(userId);
    
    if (!existingBadges.includes('peak_hour_hero') && peakHourRides.count >= 25) {
        awardBadge(db, uuidv4(), userId, BADGES.PEAK_HOUR_HERO);
        newBadges.push(BADGES.PEAK_HOUR_HERO);
    }
    
    return newBadges;
}

function awardBadge(db, id, userId, badge) {
    db.prepare(`
        INSERT OR IGNORE INTO user_badges (id, user_id, badge_type, badge_name)
        VALUES (?, ?, ?, ?)
    `).run(id, userId, badge.type, badge.name);
}

/**
 * Get user's badges
 */
function getUserBadges(db, userId) {
    const badges = db.prepare(`
        SELECT badge_type, badge_name, earned_at 
        FROM user_badges 
        WHERE user_id = ?
        ORDER BY earned_at DESC
    `).all(userId);
    
    return badges.map(b => ({
        ...BADGES[b.badge_type.toUpperCase()] || { type: b.badge_type, name: b.badge_name },
        earnedAt: b.earned_at
    }));
}

/**
 * Update user streak
 */
function updateUserStreak(db, userId) {
    const lastRide = db.prepare(`
        SELECT MAX(r.departure_date) as last_date
        FROM bookings b
        JOIN rides r ON b.ride_id = r.id
        WHERE b.rider_id = ? AND b.status = 'completed'
    `).get(userId);
    
    if (!lastRide || !lastRide.last_date) return;
    
    const today = new Date().toISOString().split('T')[0];
    const lastDate = lastRide.last_date;
    const daysDiff = Math.floor((new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24));
    
    const user = db.prepare(`SELECT current_streak, longest_streak FROM users WHERE id = ?`).get(userId);
    
    if (daysDiff === 0 || daysDiff === 1) {
        // Continue streak
        const newStreak = user.current_streak + 1;
        const longestStreak = Math.max(newStreak, user.longest_streak);
        
        db.prepare(`
            UPDATE users SET current_streak = ?, longest_streak = ? WHERE id = ?
        `).run(newStreak, longestStreak, userId);
    } else if (daysDiff > 1) {
        // Reset streak
        db.prepare(`UPDATE users SET current_streak = 1 WHERE id = ?`).run(userId);
    }
}

/**
 * Get leaderboard
 */
function getLeaderboard(db, type = 'co2', limit = 10) {
    let query;
    
    switch (type) {
        case 'co2':
            query = `
                SELECT id, name, university, total_co2_saved as value, 'kg CO₂' as unit
                FROM users
                WHERE total_co2_saved > 0
                ORDER BY total_co2_saved DESC
                LIMIT ?
            `;
            break;
        case 'rides':
            query = `
                SELECT id, name, university, rides_completed as value, 'rides' as unit
                FROM users
                WHERE rides_completed > 0
                ORDER BY rides_completed DESC
                LIMIT ?
            `;
            break;
        case 'rating':
            query = `
                SELECT id, name, university, average_rating as value, '★' as unit
                FROM users
                WHERE total_ratings >= 5
                ORDER BY average_rating DESC, total_ratings DESC
                LIMIT ?
            `;
            break;
        case 'streak':
            query = `
                SELECT id, name, university, longest_streak as value, 'days' as unit
                FROM users
                WHERE longest_streak > 0
                ORDER BY longest_streak DESC
                LIMIT ?
            `;
            break;
        default:
            query = `
                SELECT id, name, university, rides_completed as value, 'rides' as unit
                FROM users
                ORDER BY rides_completed DESC
                LIMIT ?
            `;
    }
    
    return db.prepare(query).all(limit);
}

module.exports = {
    BADGES,
    checkAndAwardBadges,
    getUserBadges,
    updateUserStreak,
    getLeaderboard
};
