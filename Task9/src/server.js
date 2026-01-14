/**
 * Main Express Server - MongoDB Version
 * Entry point for the Campus Resource Optimization Platform API
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

require('dotenv').config();

const config = require('./config');
const { logger } = require('./utils/logger');
const { connectDB, healthCheck, closeConnection } = require('./database/connection');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const resourceRoutes = require('./routes/resources');
const adminRoutes = require('./routes/admin');

// Import new feature routes
const analyticsRoutes = require('./routes/analyticsRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const checkInRoutes = require('./routes/checkInRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

// Helmet for security headers
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Request-Id'],
    credentials: true,
    maxAge: 86400 // 24 hours
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.maxRequests,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.'
        }
    },
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts. Please try again in 15 minutes.'
        }
    }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ============================================================
// REQUEST PARSING & TRACKING
// ============================================================

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req, res, next) => {
    req.id = req.headers['x-request-id'] || uuidv4();
    res.setHeader('X-Request-Id', req.id);
    next();
});

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        
        logger.info('Request completed', {
            requestId: req.id,
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: `${duration}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip
        });
    });
    
    next();
});

// ============================================================
// API ROUTES
// ============================================================

// Health check endpoint
app.get('/health', async (req, res) => {
    const dbHealth = await healthCheck();
    
    res.status(dbHealth.connected ? 200 : 503).json({
        status: dbHealth.connected ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.env,
        database: dbHealth
    });
});

// API documentation endpoint
app.get('/api', (req, res) => {
    res.json({
        name: 'Campus Resource Optimization Platform API',
        version: '2.0.0',
        description: 'Intelligent booking and resource management system for campus facilities with MongoDB',
        documentation: '/api/docs',
        endpoints: {
            auth: {
                'POST /api/auth/register': 'Register new user',
                'POST /api/auth/login': 'User login',
                'POST /api/auth/refresh': 'Refresh access token',
                'POST /api/auth/logout': 'User logout',
                'POST /api/auth/change-password': 'Change password',
                'GET /api/auth/me': 'Get current user'
            },
            bookings: {
                'POST /api/bookings': 'Create booking',
                'GET /api/bookings': 'List bookings',
                'GET /api/bookings/my': 'My bookings',
                'GET /api/bookings/pending': 'Pending approvals',
                'GET /api/bookings/:id': 'Get booking',
                'GET /api/bookings/:id/history': 'Booking history',
                'POST /api/bookings/:id/approve': 'Approve booking',
                'POST /api/bookings/:id/decline': 'Decline booking',
                'POST /api/bookings/:id/cancel': 'Cancel booking',
                'POST /api/bookings/:id/complete': 'Mark complete',
                'POST /api/bookings/:id/no-show': 'Mark no-show'
            },
            resources: {
                'POST /api/resources': 'Create resource',
                'GET /api/resources': 'List resources',
                'GET /api/resources/types': 'Resource types',
                'GET /api/resources/:id': 'Get resource',
                'PUT /api/resources/:id': 'Update resource',
                'DELETE /api/resources/:id': 'Deactivate resource',
                'GET /api/resources/:id/availability': 'Get availability',
                'POST /api/resources/:id/availability': 'Add availability slot',
                'GET /api/resources/:id/slots': 'Available time slots',
                'GET /api/resources/:id/utilization': 'Utilization stats'
            },
            admin: {
                'GET /api/admin/dashboard': 'Dashboard stats',
                'GET /api/admin/audit-logs': 'Audit logs',
                'GET /api/admin/approval-rules': 'List rules',
                'POST /api/admin/approval-rules': 'Create rule',
                'PUT /api/admin/approval-rules/:id': 'Update rule',
                'GET /api/admin/departments': 'List departments',
                'POST /api/admin/departments': 'Create department',
                'GET /api/admin/users': 'List users',
                'PUT /api/admin/users/:id': 'Update user'
            },
            analytics: {
                'GET /api/analytics/utilization/:resourceId': 'Resource utilization',
                'GET /api/analytics/heatmap/:resourceId': 'Availability heatmap',
                'GET /api/analytics/dashboard': 'Analytics dashboard',
                'GET /api/analytics/idle-time': 'Idle time analysis',
                'GET /api/analytics/peak-usage': 'Peak usage analysis'
            },
            recommendations: {
                'GET /api/recommendations/slots/:resourceId': 'Smart slot recommendations',
                'GET /api/recommendations/alternatives': 'Alternative slots',
                'GET /api/recommendations/demand/:resourceId': 'Demand level',
                'POST /api/recommendations/refresh': 'Refresh recommendations'
            },
            calendar: {
                'GET /api/calendar/booking/:bookingId/ics': 'Download booking ICS',
                'GET /api/calendar/bookings/ics': 'Download all bookings ICS',
                'GET /api/calendar/resource/:resourceId/ics': 'Resource schedule ICS',
                'GET /api/calendar/booking/:bookingId/links': 'All calendar links',
                'GET /api/calendar/subscription-url': 'Calendar subscription URL'
            },
            checkin: {
                'GET /api/checkin/qr/:bookingId': 'Generate check-in QR',
                'POST /api/checkin/process': 'Process check-in',
                'POST /api/checkin/location': 'Location-based check-in',
                'GET /api/checkin/resource-qr/:resourceId': 'Resource QR code',
                'GET /api/checkin/stats': 'Check-in statistics',
                'POST /api/checkin/manual': 'Manual check-in',
                'POST /api/checkin/trigger-auto-release': 'Trigger auto-release'
            },
            notifications: {
                'GET /api/notifications': 'Get notifications',
                'PUT /api/notifications/:id/read': 'Mark as read',
                'PUT /api/notifications/read-all': 'Mark all as read',
                'GET /api/notifications/unread-count': 'Unread count'
            }
        }
    });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/admin', adminRoutes);

// Mount new feature routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/checkin', checkInRoutes);
app.use('/api/notifications', notificationRoutes);

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================================
// SERVER STARTUP
// ============================================================

const PORT = config.port;

async function startServer() {
    try {
        // Connect to MongoDB
        await connectDB();
        logger.info('✅ Connected to MongoDB');
        
        const server = app.listen(PORT, () => {
            logger.info(`🚀 Server started`, {
                port: PORT,
                environment: config.env,
                timezone: config.timezone
            });
            
            console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🏫 Campus Resource Optimization Platform v2.0               ║
║                                                               ║
║   Server running on: http://localhost:${PORT}                   ║
║   Environment: ${config.env.padEnd(44)}║
║   Database: MongoDB                                           ║
║   API Documentation: http://localhost:${PORT}/api               ║
║                                                               ║
║   New Features:                                               ║
║   - Smart Slot Recommendations                                ║
║   - Availability Heatmaps                                     ║
║   - Priority-Based Conflict Resolution                        ║
║   - QR Check-In / Auto-Release                                ║
║   - Calendar Integration (ICS/Google)                         ║
║   - Smart Notifications                                       ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
            `);
        });
        
        // Graceful shutdown
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received. Shutting down gracefully...');
            server.close(async () => {
                await closeConnection();
                logger.info('Server closed');
                process.exit(0);
            });
        });
        
        process.on('SIGINT', async () => {
            logger.info('SIGINT received. Shutting down gracefully...');
            server.close(async () => {
                await closeConnection();
                logger.info('Server closed');
                process.exit(0);
            });
        });
        
    } catch (error) {
        logger.error('Failed to start server', { error: error.message });
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    process.exit(1);
});

// Start the server
startServer();

module.exports = app;
