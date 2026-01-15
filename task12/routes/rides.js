const express = require('express');
const { body, query } = require('express-validator');
const rideController = require('../controllers/rideController');
const validate = require('../middleware/validate');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Create ride validation
const createRideValidation = [
    body('source_address')
        .trim()
        .notEmpty()
        .withMessage('Source address is required'),
    body('source_lat')
        .isFloat({ min: 24.7, max: 25.6 })
        .withMessage('Source must be within Karachi (invalid latitude)'),
    body('source_lng')
        .isFloat({ min: 66.7, max: 67.6 })
        .withMessage('Source must be within Karachi (invalid longitude)'),
    body('destination_address')
        .trim()
        .notEmpty()
        .withMessage('Destination address is required'),
    body('destination_lat')
        .isFloat({ min: 24.7, max: 25.6 })
        .withMessage('Destination must be within Karachi (invalid latitude)'),
    body('destination_lng')
        .isFloat({ min: 66.7, max: 67.6 })
        .withMessage('Destination must be within Karachi (invalid longitude)'),
    body('departure_date')
        .isDate()
        .withMessage('Valid departure date is required (YYYY-MM-DD)'),
    body('departure_time')
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('Valid departure time is required (HH:MM)'),
    body('total_seats')
        .isInt({ min: 1, max: 7 })
        .withMessage('Seats must be between 1 and 7'),
    body('fuel_split_price')
        .optional()
        .isFloat({ min: 0, max: 5000 })
        .withMessage('Fuel price must be between 0 and 5000 PKR'),
    body('ride_rules')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Ride rules must be less than 500 characters'),
    body('distance_km')
        .optional()
        .isFloat({ min: 0 }),
    body('estimated_duration_minutes')
        .optional()
        .isInt({ min: 0 }),
    body('route_polyline')
        .optional()
        .isString()
];

// Search rides validation
const searchRideValidation = [
    query('source_lat')
        .optional()
        .isFloat({ min: 24.7, max: 25.6 }),
    query('source_lng')
        .optional()
        .isFloat({ min: 66.7, max: 67.6 }),
    query('destination_lat')
        .optional()
        .isFloat({ min: 24.7, max: 25.6 }),
    query('destination_lng')
        .optional()
        .isFloat({ min: 66.7, max: 67.6 }),
    query('date')
        .optional()
        .isDate(),
    query('time_from')
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    query('time_to')
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    query('radius')
        .optional()
        .isFloat({ min: 0.5, max: 10 })
        .withMessage('Search radius must be between 0.5 and 10 km')
];

// Routes
router.post('/', authMiddleware, requireRole('driver', 'both'), createRideValidation, validate, rideController.createRide);
router.get('/search', searchRideValidation, validate, rideController.searchRides);
router.get('/my-rides', authMiddleware, rideController.getMyRides);
router.get('/pickup-points', rideController.getPickupPoints);
router.get('/carbon-dashboard', authMiddleware, rideController.getCarbonDashboard);
router.get('/gamification', authMiddleware, rideController.getGamificationStats);
router.get('/:id', rideController.getRideById);
router.put('/:id', authMiddleware, rideController.updateRide);
router.delete('/:id', authMiddleware, rideController.cancelRide);
router.post('/:id/complete', authMiddleware, rideController.completeRide);

module.exports = router;
