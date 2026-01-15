/**
 * WhatsApp Account Linking & OTP Authentication
 * UniRide Karachi
 */

const db = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const config = require('./config');

// In-memory OTP storage (in production, use Redis)
const otpStore = new Map();
const linkingState = new Map();

/**
 * Generate a random OTP
 */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Check if a WhatsApp number is already linked
 */
function isNumberLinked(phoneNumber) {
    const normalizedPhone = normalizePhone(phoneNumber);
    
    const user = db.prepare(`
        SELECT id, name, email, role FROM users 
        WHERE whatsapp_number = ? OR phone = ?
    `).get(normalizedPhone, normalizedPhone);
    
    return user || null;
}

/**
 * Normalize phone number to standard format
 */
function normalizePhone(phone) {
    // Remove all non-digits
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle Pakistani numbers
    if (cleaned.startsWith('92')) {
        cleaned = cleaned.substring(2);
    } else if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    
    // Add country code
    return `92${cleaned}`;
}

/**
 * Start the account linking process
 */
function startLinking(phoneNumber) {
    const normalizedPhone = normalizePhone(phoneNumber);
    
    // Check if already linked
    const existingUser = isNumberLinked(normalizedPhone);
    if (existingUser) {
        return {
            success: false,
            alreadyLinked: true,
            user: existingUser,
            message: `This number is already linked to ${existingUser.name} (${existingUser.email})`
        };
    }
    
    // Set linking state to awaiting email
    linkingState.set(normalizedPhone, {
        step: 'awaiting_email',
        startedAt: Date.now()
    });
    
    return {
        success: true,
        step: 'awaiting_email',
        message: config.MESSAGES.LINK_START
    };
}

/**
 * Process email input during linking
 */
function processLinkingEmail(phoneNumber, email) {
    const normalizedPhone = normalizePhone(phoneNumber);
    const state = linkingState.get(normalizedPhone);
    
    if (!state || state.step !== 'awaiting_email') {
        return {
            success: false,
            message: 'Please start the linking process first. Reply with "link account"'
        };
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            success: false,
            message: '❌ Invalid email format. Please enter a valid email address.'
        };
    }
    
    // Find user by email
    const user = db.prepare(`
        SELECT id, name, email, role FROM users WHERE email = ?
    `).get(email.toLowerCase().trim());
    
    if (!user) {
        return {
            success: false,
            message: `❌ No UniRide account found with email: ${email}\n\nPlease register on the UniRide app first, then link your WhatsApp.`
        };
    }
    
    // Check if user already has WhatsApp linked
    const existingLink = db.prepare(`
        SELECT whatsapp_number FROM users WHERE id = ? AND whatsapp_number IS NOT NULL
    `).get(user.id);
    
    if (existingLink && existingLink.whatsapp_number) {
        return {
            success: false,
            message: `⚠️ This account already has a WhatsApp linked.\n\nContact support if you need to change it.`
        };
    }
    
    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + (config.OTP_EXPIRY_MINUTES * 60 * 1000);
    
    // Store OTP
    otpStore.set(normalizedPhone, {
        otp,
        userId: user.id,
        email: user.email,
        name: user.name,
        attempts: 0,
        expiresAt
    });
    
    // Update linking state
    linkingState.set(normalizedPhone, {
        step: 'awaiting_otp',
        userId: user.id,
        email: user.email,
        startedAt: Date.now()
    });
    
    // In production, send OTP via push notification or SMS
    // For now, we'll store it and show in logs
    console.log(`[WhatsApp OTP] ${normalizedPhone}: ${otp}`);
    
    return {
        success: true,
        step: 'awaiting_otp',
        otp, // Remove in production - only for testing
        message: `📱 *OTP Sent!*\n\nHi ${user.name}! We've generated a verification code.\n\n🔐 Your OTP: *${otp}*\n\nPlease enter this code to verify your identity.\n\n⏰ Code expires in ${config.OTP_EXPIRY_MINUTES} minutes.`
    };
}

/**
 * Verify OTP and complete linking
 */
function verifyOTP(phoneNumber, inputOTP) {
    const normalizedPhone = normalizePhone(phoneNumber);
    const otpData = otpStore.get(normalizedPhone);
    const state = linkingState.get(normalizedPhone);
    
    if (!state || state.step !== 'awaiting_otp' || !otpData) {
        return {
            success: false,
            message: 'Session expired. Please start the linking process again with "link account"'
        };
    }
    
    // Check expiry
    if (Date.now() > otpData.expiresAt) {
        otpStore.delete(normalizedPhone);
        linkingState.delete(normalizedPhone);
        return {
            success: false,
            message: '⏰ OTP expired. Please start the linking process again with "link account"'
        };
    }
    
    // Check attempts
    if (otpData.attempts >= config.OTP_MAX_ATTEMPTS) {
        otpStore.delete(normalizedPhone);
        linkingState.delete(normalizedPhone);
        return {
            success: false,
            message: '❌ Too many failed attempts. Please start again with "link account"'
        };
    }
    
    // Verify OTP
    if (inputOTP.trim() !== otpData.otp) {
        otpData.attempts++;
        otpStore.set(normalizedPhone, otpData);
        return {
            success: false,
            message: `❌ Incorrect OTP. ${config.OTP_MAX_ATTEMPTS - otpData.attempts} attempts remaining.`
        };
    }
    
    // OTP verified - link the account
    try {
        db.prepare(`
            UPDATE users SET 
                whatsapp_number = ?,
                whatsapp_linked_at = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `).run(normalizedPhone, otpData.userId);
        
        // Cleanup
        otpStore.delete(normalizedPhone);
        linkingState.delete(normalizedPhone);
        
        const successMessage = config.MESSAGES.LINK_SUCCESS.replace('{{name}}', otpData.name);
        
        return {
            success: true,
            user: {
                id: otpData.userId,
                name: otpData.name,
                email: otpData.email
            },
            message: successMessage
        };
    } catch (error) {
        console.error('[WhatsApp Auth] Linking error:', error);
        return {
            success: false,
            message: config.MESSAGES.ERROR
        };
    }
}

/**
 * Get user by WhatsApp number
 */
function getUserByWhatsApp(phoneNumber) {
    const normalizedPhone = normalizePhone(phoneNumber);
    
    const user = db.prepare(`
        SELECT id, name, email, role, university, department,
               average_rating, rides_completed, behavior_score,
               current_streak, total_co2_saved,
               vehicle_make, vehicle_model, vehicle_color, vehicle_plate
        FROM users 
        WHERE whatsapp_number = ?
    `).get(normalizedPhone);
    
    return user || null;
}

/**
 * Unlink WhatsApp account
 */
function unlinkAccount(phoneNumber) {
    const normalizedPhone = normalizePhone(phoneNumber);
    
    try {
        db.prepare(`
            UPDATE users SET 
                whatsapp_number = NULL,
                whatsapp_linked_at = NULL,
                updated_at = CURRENT_TIMESTAMP
            WHERE whatsapp_number = ?
        `).run(normalizedPhone);
        
        return {
            success: true,
            message: '✅ WhatsApp unlinked from your UniRide account.'
        };
    } catch (error) {
        console.error('[WhatsApp Auth] Unlink error:', error);
        return {
            success: false,
            message: config.MESSAGES.ERROR
        };
    }
}

/**
 * Get current linking state for a number
 */
function getLinkingState(phoneNumber) {
    const normalizedPhone = normalizePhone(phoneNumber);
    return linkingState.get(normalizedPhone) || null;
}

/**
 * Cancel linking process
 */
function cancelLinking(phoneNumber) {
    const normalizedPhone = normalizePhone(phoneNumber);
    linkingState.delete(normalizedPhone);
    otpStore.delete(normalizedPhone);
    return {
        success: true,
        message: 'Linking process cancelled. Reply "link account" to start again.'
    };
}

module.exports = {
    generateOTP,
    normalizePhone,
    isNumberLinked,
    startLinking,
    processLinkingEmail,
    verifyOTP,
    getUserByWhatsApp,
    unlinkAccount,
    getLinkingState,
    cancelLinking
};
