/**
 * Authentication Service - MongoDB Version
 * Handles user registration, login, and token management
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User, Department, RefreshToken } = require('../database/models');
const { withTransaction } = require('../database/connection');
const config = require('../config');
const { AuthenticationError, ValidationError, ConflictError } = require('../utils/errors');
const { logAuditEvent, AuditActions } = require('./auditService');
const { logger } = require('../utils/logger');

const SALT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 30;

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Object} Created user and tokens
 */
async function register(userData) {
    const { email, password, firstName, lastName, role = 'student', departmentId, employeeId } = userData;
    
    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    
    if (existingUser) {
        throw new ConflictError('An account with this email already exists');
    }
    
    // Check if employee ID already exists
    if (employeeId) {
        const existingEmployee = await User.findOne({ employeeId });
        
        if (existingEmployee) {
            throw new ConflictError('An account with this employee ID already exists');
        }
    }
    
    // Validate department exists if provided
    if (departmentId) {
        const dept = await Department.findOne({ _id: departmentId, isActive: true });
        
        if (!dept) {
            throw new ValidationError('Invalid department ID');
        }
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Create user
    const user = new User({
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        role,
        departmentId,
        employeeId,
        passwordChangedAt: new Date()
    });
    
    await user.save();
    
    // Generate tokens
    const tokens = generateTokens(user);
    
    // Store refresh token
    await storeRefreshToken(user._id, tokens.refreshToken);
    
    // Audit log
    await logAuditEvent({
        action: AuditActions.USER_CREATED,
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        entityType: 'user',
        entityId: user._id,
        newValues: { email: user.email, role: user.role }
    });
    
    return {
        user: formatUserResponse(user),
        ...tokens
    };
}

/**
 * Authenticate user and return tokens
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} requestInfo - Request metadata (IP, user agent)
 * @returns {Object} User and tokens
 */
async function login(email, password, requestInfo = {}) {
    // Get user with security fields
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
        throw new AuthenticationError('Invalid email or password');
    }
    
    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(user.lockedUntil) - new Date()) / 60000);
        throw new AuthenticationError(
            `Account is temporarily locked. Please try again in ${remainingMinutes} minutes.`
        );
    }
    
    // Check if account is active
    if (!user.isActive) {
        throw new AuthenticationError('Account has been deactivated');
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
        // Increment failed attempts
        await handleFailedLogin(user);
        throw new AuthenticationError('Invalid email or password');
    }
    
    // Reset failed attempts and update last login
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    await user.save();
    
    // Generate tokens
    const tokens = generateTokens(user);
    
    // Store refresh token
    await storeRefreshToken(user._id, tokens.refreshToken, requestInfo);
    
    // Audit log
    await logAuditEvent({
        action: AuditActions.USER_LOGIN,
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        entityType: 'user',
        entityId: user._id,
        ipAddress: requestInfo.ip,
        userAgent: requestInfo.userAgent
    });
    
    return {
        user: formatUserResponse(user),
        ...tokens
    };
}

/**
 * Handle failed login attempt
 */
async function handleFailedLogin(user) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    
    // Lock account after max attempts
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60000);
        
        logger.warn('Account locked due to failed login attempts', {
            userId: user._id,
            email: user.email,
            attempts: user.failedLoginAttempts
        });
    }
    
    await user.save();
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} New tokens
 */
async function refreshAccessToken(refreshToken) {
    // Verify refresh token
    let decoded;
    try {
        decoded = jwt.verify(refreshToken, config.jwt.secret);
    } catch (err) {
        throw new AuthenticationError('Invalid or expired refresh token');
    }
    
    if (decoded.type !== 'refresh') {
        throw new AuthenticationError('Invalid token type');
    }
    
    // Check if token exists in database and is not revoked
    const tokenHash = hashToken(refreshToken);
    const tokenRecord = await RefreshToken.findOne({
        tokenHash,
        revokedAt: null,
        expiresAt: { $gt: new Date() }
    });
    
    if (!tokenRecord) {
        throw new AuthenticationError('Refresh token not found or revoked');
    }
    
    const user = await User.findById(tokenRecord.userId);
    
    if (!user || !user.isActive) {
        throw new AuthenticationError('User account is deactivated');
    }
    
    // Generate new tokens
    const tokens = generateTokens(user);
    
    // Revoke old refresh token and store new one (token rotation)
    tokenRecord.revokedAt = new Date();
    await tokenRecord.save();
    
    await storeRefreshToken(user._id, tokens.refreshToken);
    
    return tokens;
}

/**
 * Logout user by revoking refresh token
 * @param {string} userId - User ID
 * @param {string} refreshToken - Refresh token to revoke (optional, revokes all if not provided)
 */
async function logout(userId, refreshToken = null) {
    if (refreshToken) {
        const tokenHash = hashToken(refreshToken);
        await RefreshToken.updateOne(
            { userId, tokenHash },
            { revokedAt: new Date() }
        );
    } else {
        // Revoke all refresh tokens for user
        await RefreshToken.updateMany(
            { userId, revokedAt: null },
            { revokedAt: new Date() }
        );
    }
    
    await logAuditEvent({
        action: AuditActions.USER_LOGOUT,
        userId: userId,
        entityType: 'user',
        entityId: userId
    });
}

/**
 * Change user password
 */
async function changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId);
    
    if (!user) {
        throw new AuthenticationError('User not found');
    }
    
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    
    if (!isValid) {
        throw new AuthenticationError('Current password is incorrect');
    }
    
    user.passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.passwordChangedAt = new Date();
    await user.save();
    
    // Revoke all refresh tokens to force re-login
    await RefreshToken.updateMany(
        { userId },
        { revokedAt: new Date() }
    );
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Generate access and refresh tokens
 */
function generateTokens(user) {
    const userId = user._id || user.id;
    
    const accessToken = jwt.sign(
        {
            userId,
            email: user.email,
            role: user.role,
            type: 'access'
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
    );
    
    const refreshToken = jwt.sign(
        {
            userId,
            type: 'refresh'
        },
        config.jwt.secret,
        { expiresIn: config.jwt.refreshExpiresIn }
    );
    
    return {
        accessToken,
        refreshToken,
        expiresIn: config.jwt.expiresIn
    };
}

/**
 * Store refresh token hash in database
 */
async function storeRefreshToken(userId, refreshToken, deviceInfo = {}) {
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + parseDuration(config.jwt.refreshExpiresIn));
    
    await RefreshToken.create({
        userId,
        tokenHash,
        expiresAt,
        deviceInfo
    });
}

/**
 * Hash token for storage
 */
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Parse duration string to milliseconds
 */
function parseDuration(duration) {
    const match = duration.match(/^(\d+)([hdwm])$/);
    if (!match) return 86400000; // Default 24h
    
    const value = parseInt(match[1], 10);
    const unit = match[2];
    
    const multipliers = {
        h: 3600000,      // hours
        d: 86400000,     // days
        w: 604800000,    // weeks
        m: 2592000000    // months (30 days)
    };
    
    return value * (multipliers[unit] || 86400000);
}

/**
 * Format user object for API response
 */
function formatUserResponse(user) {
    return {
        id: user._id || user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        departmentId: user.departmentId,
        createdAt: user.createdAt
    };
}

module.exports = {
    register,
    login,
    refreshAccessToken,
    logout,
    changePassword
};
