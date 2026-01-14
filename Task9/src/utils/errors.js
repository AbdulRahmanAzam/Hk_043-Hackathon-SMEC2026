/**
 * Custom Error Classes
 * Standardized error handling across the application
 */

class AppError extends Error {
    constructor(message, statusCode, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message, details = []) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}

class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}

class AuthorizationError extends AppError {
    constructor(message = 'You do not have permission to perform this action') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource conflict', details = null) {
        super(message, 409, 'CONFLICT_ERROR');
        this.details = details;
    }
}

class BookingConflictError extends ConflictError {
    constructor(conflictingBookings = []) {
        super('The requested time slot conflicts with existing bookings');
        this.code = 'BOOKING_CONFLICT';
        this.conflictingBookings = conflictingBookings;
    }
}

class RateLimitError extends AppError {
    constructor(retryAfter = 60) {
        super('Too many requests. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
        this.retryAfter = retryAfter;
    }
}

class DatabaseError extends AppError {
    constructor(message = 'Database operation failed') {
        super(message, 500, 'DATABASE_ERROR');
    }
}

module.exports = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    BookingConflictError,
    RateLimitError,
    DatabaseError
};
