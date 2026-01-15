require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Initialize database
const initializeDatabase = require('./scripts/init-db');
initializeDatabase();

// Import routes
const authRoutes = require('./routes/auth');
const rideRoutes = require('./routes/rides');
const bookingRoutes = require('./routes/bookings');
const safetyRoutes = require('./routes/safety');

// Import cleanup function
const { cleanupExpiredLocks } = require('./controllers/bookingController');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://api.mapbox.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://api.mapbox.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://api.mapbox.com", "blob:"],
            connectSrc: ["'self'", "https://api.mapbox.com", "https://events.mapbox.com"],
            workerSrc: ["'self'", "blob:"]
        }
    }
}));

// CORS
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/safety', safetyRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Karachi University Carpool API is running',
        timestamp: new Date().toISOString()
    });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'premium.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'An unexpected error occurred. Please try again.'
    });
});

// Cleanup expired seat locks every 30 seconds
setInterval(() => {
    try {
        const cleaned = cleanupExpiredLocks();
        if (cleaned > 0) {
            console.log(`Cleaned up ${cleaned} expired seat locks`);
        }
    } catch (error) {
        console.error('Seat lock cleanup error:', error);
    }
}, 30000);

// Start server
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   🚗 UniRide Karachi - Smart University Carpooling Platform     ║
║                                                                  ║
║   ✅ Server running on: http://localhost:${PORT}                   ║
║   ✅ API Health: http://localhost:${PORT}/api/health               ║
║                                                                  ║
║   🌟 Premium Features Active:                                    ║
║      • Smart Ride Matching Algorithm                             ║
║      • Carbon Impact Dashboard                                   ║
║      • Gamification & Badges                                     ║
║      • Safety Layer with SOS                                     ║
║      • Real-time Seat Locking                                    ║
║      • WhatsApp Bot Integration                                  ║
║                                                                  ║
║   📱 Start WhatsApp Bot: npm run whatsapp                        ║
║                                                                  ║
║   Ready to accept connections! 🎓                                ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
    `);
});

// Optional: Start WhatsApp bot if environment variable is set
if (process.env.ENABLE_WHATSAPP_BOT === 'true') {
    try {
        const { startBot } = require('./whatsapp');
        startBot().catch(err => {
            console.error('WhatsApp bot failed to start:', err);
        });
    } catch (error) {
        console.error('WhatsApp module not loaded:', error.message);
    }
}

module.exports = app;
