const express = require('express');
const { body, param } = require('express-validator');
const safetyController = require('../controllers/safetyController');
const validate = require('../middleware/validate');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Emergency contact validation
const contactValidation = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Contact name is required')
        .isLength({ max: 100 }),
    body('phone')
        .matches(/^(\+92|0)?[0-9]{10}$/)
        .withMessage('Valid Pakistani phone number required'),
    body('relationship')
        .optional()
        .trim()
        .isLength({ max: 50 })
];

// SOS validation
const sosValidation = [
    body('lat')
        .isFloat({ min: 24.7, max: 25.6 })
        .withMessage('Invalid location'),
    body('lng')
        .isFloat({ min: 66.7, max: 67.6 })
        .withMessage('Invalid location'),
    body('message')
        .optional()
        .trim()
        .isLength({ max: 500 })
];

// Location update validation
const locationValidation = [
    body('lat')
        .isFloat({ min: 24.7, max: 25.6 }),
    body('lng')
        .isFloat({ min: 66.7, max: 67.6 })
];

// Emergency contacts routes
router.get('/emergency-contacts', authMiddleware, safetyController.getEmergencyContacts);
router.post('/emergency-contacts', authMiddleware, contactValidation, validate, safetyController.addEmergencyContact);
router.delete('/emergency-contacts/:id', authMiddleware, safetyController.removeEmergencyContact);

// Ride sharing routes
router.post('/rides/:rideId/share', authMiddleware, safetyController.generateShareLink);
router.get('/track/:rideId/:token', safetyController.trackRide);

// SOS routes
router.post('/rides/:rideId/sos', authMiddleware, sosValidation, validate, safetyController.triggerSOS);

// Driver verification
router.get('/driver/:driverId', safetyController.getDriverInfo);

// Live location
router.post('/rides/:rideId/location', authMiddleware, locationValidation, validate, safetyController.updateLiveLocation);

// Safety tips
router.get('/tips', safetyController.getSafetyTips);

module.exports = router;
