/**
 * Winston Logger Configuration
 * Structured logging with different levels and transports
 */

const winston = require('winston');
const path = require('path');
const config = require('../config');

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// Custom log format for console
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    
    return msg;
});

// Create logger instance
const logger = winston.createLogger({
    level: config.env === 'development' ? 'debug' : 'info',
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        json()
    ),
    defaultMeta: { service: 'campus-resource-platform' },
    transports: [
        // Error logs
        new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // Combined logs
        new winston.transports.File({
            filename: path.join('logs', 'combined.log'),
            maxsize: 5242880,
            maxFiles: 5
        })
    ],
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join('logs', 'exceptions.log')
        })
    ],
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join('logs', 'rejections.log')
        })
    ]
});

// Console transport for development
if (config.env !== 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            colorize(),
            timestamp({ format: 'HH:mm:ss.SSS' }),
            consoleFormat
        )
    }));
}

// Create audit logger for security-critical events
const auditLogger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
        json()
    ),
    defaultMeta: { type: 'audit' },
    transports: [
        new winston.transports.File({
            filename: path.join('logs', 'audit.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 10
        })
    ]
});

/**
 * Log an audit event
 * @param {string} action - Action type
 * @param {Object} details - Event details
 */
function logAudit(action, details) {
    auditLogger.info(action, {
        ...details,
        timestamp: new Date().toISOString()
    });
}

/**
 * Create a child logger with request context
 * @param {Object} req - Express request object
 * @returns {Logger} Child logger with context
 */
function createRequestLogger(req) {
    return logger.child({
        requestId: req.id,
        userId: req.user?.id,
        method: req.method,
        path: req.path
    });
}

module.exports = {
    logger,
    auditLogger,
    logAudit,
    createRequestLogger
};
