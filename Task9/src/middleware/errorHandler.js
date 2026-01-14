/**
 * Global Error Handler Middleware
 * Centralized error handling with consistent response format
 */

const { AppError } = require('../utils/errors');
const { logger } = require('../utils/logger');
const config = require('../config');

/**
 * Handle known PostgreSQL errors
 */
function handleDatabaseError(error) {
    switch (error.code) {
        case '23505': // Unique violation
            return {
                statusCode: 409,
                code: 'DUPLICATE_ENTRY',
                message: extractDuplicateField(error)
            };
        case '23503': // Foreign key violation
            return {
                statusCode: 400,
                code: 'INVALID_REFERENCE',
                message: 'Referenced record does not exist'
            };
        case '23514': // Check violation
            return {
                statusCode: 400,
                code: 'CONSTRAINT_VIOLATION',
                message: error.message || 'Data validation failed'
            };
        case '23P01': // Exclusion violation (double booking!)
            return {
                statusCode: 409,
                code: 'BOOKING_CONFLICT',
                message: 'The requested time slot conflicts with an existing booking'
            };
        case '40001': // Serialization failure
            return {
                statusCode: 409,
                code: 'CONCURRENT_MODIFICATION',
                message: 'Resource was modified by another request. Please try again.'
            };
        case '55P03': // Lock not available
            return {
                statusCode: 423,
                code: 'RESOURCE_LOCKED',
                message: 'Resource is currently being modified. Please try again.'
            };
        default:
            return null;
    }
}

/**
 * Extract field name from PostgreSQL unique violation error
 */
function extractDuplicateField(error) {
    const match = error.detail?.match(/Key \((.+?)\)=/);
    if (match) {
        const field = match[1];
        return `A record with this ${field} already exists`;
    }
    return 'Duplicate entry detected';
}

/**
 * Error response formatter
 */
function formatErrorResponse(error, includeStack = false) {
    const response = {
        success: false,
        error: {
            code: error.code || 'INTERNAL_ERROR',
            message: error.message || 'An unexpected error occurred'
        }
    };
    
    // Include validation details if present
    if (error.details) {
        response.error.details = error.details;
    }
    
    // Include conflicting bookings for booking conflicts
    if (error.conflictingBookings) {
        response.error.conflictingBookings = error.conflictingBookings;
    }
    
    // Include stack trace in development
    if (includeStack && error.stack) {
        response.error.stack = error.stack.split('\n');
    }
    
    return response;
}

/**
 * Main error handler middleware
 */
function errorHandler(error, req, res, next) {
    // Log error
    logger.error('Error occurred', {
        error: error.message,
        code: error.code,
        stack: error.stack,
        requestId: req.id,
        path: req.path,
        method: req.method,
        userId: req.user?.id
    });
    
    // Handle known app errors
    if (error instanceof AppError) {
        return res.status(error.statusCode).json(
            formatErrorResponse(error, config.env === 'development')
        );
    }
    
    // Handle database errors
    const dbError = handleDatabaseError(error);
    if (dbError) {
        return res.status(dbError.statusCode).json(
            formatErrorResponse(dbError, config.env === 'development')
        );
    }
    
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError') {
        return res.status(401).json(formatErrorResponse({
            code: 'INVALID_TOKEN',
            message: 'Invalid authentication token'
        }));
    }
    
    if (error.name === 'TokenExpiredError') {
        return res.status(401).json(formatErrorResponse({
            code: 'TOKEN_EXPIRED',
            message: 'Authentication token has expired'
        }));
    }
    
    // Handle syntax errors (invalid JSON)
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json(formatErrorResponse({
            code: 'INVALID_JSON',
            message: 'Invalid JSON in request body'
        }));
    }
    
    // Unknown errors - don't leak internal details in production
    const unknownError = {
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: config.env === 'production' 
            ? 'An unexpected error occurred' 
            : error.message
    };
    
    if (config.env !== 'production') {
        unknownError.stack = error.stack;
    }
    
    return res.status(500).json(formatErrorResponse(unknownError, config.env === 'development'));
}

/**
 * 404 handler for undefined routes
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: {
            code: 'NOT_FOUND',
            message: `Route ${req.method} ${req.path} not found`
        }
    });
}

/**
 * Async route wrapper to catch errors
 * Eliminates need for try-catch in every route handler
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = {
    errorHandler,
    notFoundHandler,
    asyncHandler
};
