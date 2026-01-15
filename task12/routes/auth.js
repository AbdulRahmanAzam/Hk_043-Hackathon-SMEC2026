const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Signup validation rules
const signupValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain uppercase, lowercase, and number'),
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('department')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Department must be less than 100 characters'),
    body('semester')
        .optional()
        .isInt({ min: 1, max: 12 })
        .withMessage('Semester must be between 1 and 12'),
    body('gender')
        .optional()
        .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
        .withMessage('Invalid gender value'),
    body('role')
        .optional()
        .isIn(['driver', 'rider', 'both'])
        .withMessage('Role must be driver, rider, or both'),
    body('phone')
        .optional()
        .matches(/^(\+92|0)?[0-9]{10,11}$/)
        .withMessage('Please provide a valid Pakistani phone number')
];

// Login validation rules
const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

// Profile update validation
const profileUpdateValidation = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must be between 2 and 100 characters'),
    body('department')
        .optional()
        .trim()
        .isLength({ max: 100 }),
    body('semester')
        .optional()
        .isInt({ min: 1, max: 12 }),
    body('gender')
        .optional()
        .isIn(['male', 'female', 'other', 'prefer_not_to_say']),
    body('show_gender')
        .optional()
        .isBoolean(),
    body('role')
        .optional()
        .isIn(['driver', 'rider', 'both']),
    body('phone')
        .optional()
        .matches(/^(\+92|0)?[0-9]{10,11}$/)
];

// Routes
router.post('/signup', signupValidation, validate, authController.signup);
router.post('/login', loginValidation, validate, authController.login);
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, profileUpdateValidation, validate, authController.updateProfile);
router.get('/stats', authMiddleware, authController.getUserStats);

module.exports = router;
