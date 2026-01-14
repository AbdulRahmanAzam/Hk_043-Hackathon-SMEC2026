/**
 * Application Configuration - MongoDB Version
 * Centralized configuration management with validation
 */

require('dotenv').config();

const config = {
    // Server
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 3000,
    
    // MongoDB Configuration
    mongo: {
        uri: process.env.MONGO_URI || 'mongodb://localhost:27017/campus_resource_db',
        host: process.env.MONGO_HOST || 'localhost',
        port: parseInt(process.env.MONGO_PORT, 10) || 27017,
        name: process.env.MONGO_DB || 'campus_resource_db',
        user: process.env.MONGO_USER,
        password: process.env.MONGO_PASSWORD,
        standalone: process.env.MONGO_STANDALONE === 'true'
    },
    
    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'default_secret_key_for_development_only_32_chars',
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },
    
    // Timezone
    timezone: process.env.DEFAULT_TIMEZONE || 'UTC',
    
    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100
    },
    
    // Booking Constraints
    booking: {
        maxDurationHours: parseInt(process.env.MAX_BOOKING_DURATION_HOURS, 10) || 8,
        minDurationMinutes: parseInt(process.env.MIN_BOOKING_DURATION_MINUTES, 10) || 30,
        advanceBookingDays: parseInt(process.env.ADVANCE_BOOKING_DAYS, 10) || 30,
        cancellationNoticeHours: parseInt(process.env.CANCELLATION_NOTICE_HOURS, 10) || 2
    },
    
    // Auto-Approval Rules
    autoApproval: {
        maxDurationHours: parseInt(process.env.AUTO_APPROVE_MAX_DURATION_HOURS, 10) || 2,
        allowedHoursStart: process.env.AUTO_APPROVE_ALLOWED_HOURS_START || '08:00',
        allowedHoursEnd: process.env.AUTO_APPROVE_ALLOWED_HOURS_END || '18:00'
    },
    
    // Check-In Configuration
    checkIn: {
        windowBeforeMinutes: parseInt(process.env.CHECK_IN_WINDOW_BEFORE_MINUTES, 10) || 15,
        windowAfterMinutes: parseInt(process.env.CHECK_IN_WINDOW_AFTER_MINUTES, 10) || 15,
        autoReleaseNoShowMinutes: parseInt(process.env.AUTO_RELEASE_NO_SHOW_MINUTES, 10) || 15
    },
    
    // App URL
    appUrl: process.env.APP_URL || 'http://localhost:3000'
};

// Validate critical configuration
function validateConfig() {
    const errors = [];
    
    if (!config.jwt.secret || config.jwt.secret.length < 32) {
        if (config.env === 'production') {
            errors.push('JWT_SECRET must be at least 32 characters');
        }
    }
    
    if (errors.length > 0) {
        console.error('❌ Configuration errors:');
        errors.forEach(e => console.error(`   - ${e}`));
        
        if (config.env === 'production') {
            process.exit(1);
        }
    }
}

validateConfig();

module.exports = config;
