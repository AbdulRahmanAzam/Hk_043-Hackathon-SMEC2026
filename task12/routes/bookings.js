const express = require('express');
const { body, param } = require('express-validator');
const bookingController = require('../controllers/bookingController');
const validate = require('../middleware/validate');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Book ride validation
const bookRideValidation = [
    body('ride_id')
        .notEmpty()
        .isUUID()
        .withMessage('Valid ride ID is required')
];

// Confirm booking validation
const confirmBookingValidation = [
    param('id')
        .isUUID()
        .withMessage('Valid booking ID is required')
];

// Rating validation
const ratingValidation = [
    body('rating')
        .isInt({ min: 1, max: 5 })
        .withMessage('Rating must be between 1 and 5'),
    body('comment')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Comment must be less than 500 characters')
];

// Routes
router.post('/lock-seat', authMiddleware, bookRideValidation, validate, bookingController.lockSeat);
router.post('/confirm/:id', authMiddleware, confirmBookingValidation, validate, bookingController.confirmBooking);
router.post('/cancel/:id', authMiddleware, bookingController.cancelBooking);
router.get('/my-bookings', authMiddleware, bookingController.getMyBookings);
router.get('/:id', authMiddleware, bookingController.getBookingById);
router.post('/:id/rate', authMiddleware, ratingValidation, validate, bookingController.rateRide);
router.post('/:id/no-show', authMiddleware, bookingController.markNoShow);

module.exports = router;
