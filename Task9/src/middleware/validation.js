/**
 * Request Validation Middleware
 * Uses express-validator for comprehensive input validation
 */

const { validationResult, body, param, query: queryValidator } = require('express-validator');
const { ValidationError } = require('../utils/errors');
const { isValidISO } = require('../utils/datetime');

/**
 * Process validation results
 * Throws ValidationError if validation fails
 */
function validate(req, res, next) {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        const errorDetails = errors.array().map(err => ({
            field: err.path,
            message: err.msg,
            value: err.value
        }));
        
        throw new ValidationError('Validation failed', errorDetails);
    }
    
    next();
}

/**
 * Custom validator for ISO 8601 date strings
 */
const isISO8601 = (value) => {
    if (!isValidISO(value)) {
        throw new Error('Invalid ISO 8601 date format. Expected format: YYYY-MM-DDTHH:mm:ss.sssZ');
    }
    return true;
};

/**
 * Custom validator for UUIDs
 */
const isUUID = (value) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
        throw new Error('Invalid UUID format');
    }
    return true;
};

// ============================================================
// AUTH VALIDATORS
// ============================================================

const loginValidation = [
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required'),
    validate
];

const registerValidation = [
    body('email')
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must include uppercase, lowercase, number, and special character'),
    body('firstName')
        .trim()
        .notEmpty()
        .isLength({ max: 100 })
        .withMessage('First name is required (max 100 characters)'),
    body('lastName')
        .trim()
        .notEmpty()
        .isLength({ max: 100 })
        .withMessage('Last name is required (max 100 characters)'),
    body('role')
        .optional()
        .isIn(['student', 'faculty'])
        .withMessage('Role must be student or faculty'),
    body('departmentId')
        .optional()
        .custom(isUUID)
        .withMessage('Invalid department ID'),
    body('employeeId')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Employee ID must be max 50 characters'),
    validate
];

// ============================================================
// BOOKING VALIDATORS
// ============================================================

const createBookingValidation = [
    body('resourceId')
        .notEmpty()
        .custom(isUUID)
        .withMessage('Valid resource ID is required'),
    body('startTime')
        .notEmpty()
        .custom(isISO8601)
        .withMessage('Valid start time in ISO 8601 format is required'),
    body('endTime')
        .notEmpty()
        .custom(isISO8601)
        .withMessage('Valid end time in ISO 8601 format is required'),
    body('purpose')
        .notEmpty()
        .isIn(['academic', 'research', 'event', 'maintenance', 'examination', 'workshop', 'meeting'])
        .withMessage('Valid purpose is required (academic, research, event, maintenance, examination, workshop, meeting)'),
    body('title')
        .trim()
        .notEmpty()
        .isLength({ max: 255 })
        .withMessage('Title is required (max 255 characters)'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 2000 })
        .withMessage('Description must be max 2000 characters'),
    body('purposeDetails')
        .optional()
        .isObject()
        .withMessage('Purpose details must be an object'),
    body('expectedAttendees')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Expected attendees must be a positive integer'),
    validate
];

const updateBookingValidation = [
    param('id')
        .custom(isUUID)
        .withMessage('Valid booking ID is required'),
    body('startTime')
        .optional()
        .custom(isISO8601)
        .withMessage('Valid start time in ISO 8601 format is required'),
    body('endTime')
        .optional()
        .custom(isISO8601)
        .withMessage('Valid end time in ISO 8601 format is required'),
    body('title')
        .optional()
        .trim()
        .isLength({ max: 255 })
        .withMessage('Title must be max 255 characters'),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 2000 }),
    validate
];

const approveBookingValidation = [
    param('id')
        .custom(isUUID)
        .withMessage('Valid booking ID is required'),
    body('notes')
        .optional()
        .trim()
        .isLength({ max: 1000 })
        .withMessage('Notes must be max 1000 characters'),
    validate
];

const cancelBookingValidation = [
    param('id')
        .custom(isUUID)
        .withMessage('Valid booking ID is required'),
    body('reason')
        .trim()
        .notEmpty()
        .isLength({ max: 500 })
        .withMessage('Cancellation reason is required (max 500 characters)'),
    validate
];

// ============================================================
// RESOURCE VALIDATORS
// ============================================================

const createResourceValidation = [
    body('code')
        .trim()
        .notEmpty()
        .isLength({ max: 50 })
        .withMessage('Resource code is required (max 50 characters)'),
    body('name')
        .trim()
        .notEmpty()
        .isLength({ max: 255 })
        .withMessage('Resource name is required (max 255 characters)'),
    body('type')
        .notEmpty()
        .isIn(['lab', 'hall', 'equipment', 'meeting_room', 'sports_facility'])
        .withMessage('Valid resource type is required'),
    body('departmentId')
        .optional()
        .custom(isUUID)
        .withMessage('Invalid department ID'),
    body('location')
        .optional()
        .trim()
        .isLength({ max: 255 }),
    body('capacity')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Capacity must be a positive integer'),
    body('minBookingDurationMinutes')
        .optional()
        .isInt({ min: 15 })
        .withMessage('Min booking duration must be at least 15 minutes'),
    body('maxBookingDurationMinutes')
        .optional()
        .isInt({ max: 1440 })
        .withMessage('Max booking duration must be at most 1440 minutes (24 hours)'),
    body('requiresApproval')
        .optional()
        .isBoolean()
        .withMessage('Requires approval must be a boolean'),
    body('attributes')
        .optional()
        .isObject()
        .withMessage('Attributes must be an object'),
    validate
];

// ============================================================
// QUERY VALIDATORS
// ============================================================

const paginationValidation = [
    queryValidator('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    queryValidator('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    validate
];

const dateRangeValidation = [
    queryValidator('startDate')
        .optional()
        .custom(isISO8601)
        .withMessage('Invalid start date format'),
    queryValidator('endDate')
        .optional()
        .custom(isISO8601)
        .withMessage('Invalid end date format'),
    validate
];

const idParamValidation = [
    param('id')
        .custom(isUUID)
        .withMessage('Invalid ID format'),
    validate
];

module.exports = {
    validate,
    isISO8601,
    isUUID,
    
    // Auth
    loginValidation,
    registerValidation,
    
    // Booking
    createBookingValidation,
    updateBookingValidation,
    approveBookingValidation,
    cancelBookingValidation,
    
    // Resource
    createResourceValidation,
    
    // Common
    paginationValidation,
    dateRangeValidation,
    idParamValidation
};
