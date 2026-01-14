/**
 * Authentication Routes
 * Handles user registration, login, and token management
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authenticate } = require('../middleware/auth');
const { loginValidation, registerValidation } = require('../middleware/validation');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerValidation, asyncHandler(async (req, res) => {
    const userData = req.body;
    const result = await authService.register(userData);
    
    res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result
    });
}));

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get tokens
 * @access  Public
 */
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    
    const result = await authService.login(email, password, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    
    res.json({
        success: true,
        message: 'Login successful',
        data: result
    });
}));

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'MISSING_TOKEN',
                message: 'Refresh token is required'
            }
        });
    }
    
    const tokens = await authService.refreshAccessToken(refreshToken);
    
    res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: tokens
    });
}));

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and revoke tokens
 * @access  Private
 */
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    
    await authService.logout(req.user.id, refreshToken);
    
    res.json({
        success: true,
        message: 'Logout successful'
    });
}));

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticate, asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({
            success: false,
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Current password and new password are required'
            }
        });
    }
    
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    
    res.json({
        success: true,
        message: 'Password changed successfully. Please login again.'
    });
}));

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, asyncHandler(async (req, res) => {
    res.json({
        success: true,
        data: {
            user: req.user
        }
    });
}));

module.exports = router;
