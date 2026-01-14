/**
 * Scheduler - Automated Tasks
 * Handles scheduled jobs like auto-release, reminders, and analytics updates
 */

const cron = require('node-cron');
const { connectDB, closeConnection } = require('../database/connection');
const { logger } = require('../utils/logger');
const checkInService = require('../services/checkInService');
const notificationService = require('../services/notificationService');
const recommendationService = require('../services/recommendationService');

// Track running state
let isRunning = false;

/**
 * Auto-release bookings without check-in
 * Runs every 5 minutes
 */
const autoReleaseTask = cron.schedule('*/5 * * * *', async () => {
    if (!isRunning) return;
    
    try {
        logger.info('[Scheduler] Running auto-release check...');
        const released = await checkInService.checkAndAutoRelease();
        
        if (released.length > 0) {
            logger.info(`[Scheduler] Auto-released ${released.length} bookings`, {
                bookingIds: released.map(b => b._id)
            });
        }
    } catch (error) {
        logger.error('[Scheduler] Auto-release task failed', { error: error.message });
    }
}, { scheduled: false });

/**
 * Send check-in reminders
 * Runs every minute to catch upcoming bookings
 */
const checkInReminderTask = cron.schedule('* * * * *', async () => {
    if (!isRunning) return;
    
    try {
        await checkInService.sendCheckInReminders();
    } catch (error) {
        logger.error('[Scheduler] Check-in reminder task failed', { error: error.message });
    }
}, { scheduled: false });

/**
 * Update slot recommendations
 * Runs every hour
 */
const updateRecommendationsTask = cron.schedule('0 * * * *', async () => {
    if (!isRunning) return;
    
    try {
        logger.info('[Scheduler] Updating slot recommendations...');
        await recommendationService.analyzeAndUpdateRecommendations();
        logger.info('[Scheduler] Slot recommendations updated');
    } catch (error) {
        logger.error('[Scheduler] Recommendations update failed', { error: error.message });
    }
}, { scheduled: false });

/**
 * Send booking reminders (day before)
 * Runs at 9 AM daily
 */
const bookingReminderTask = cron.schedule('0 9 * * *', async () => {
    if (!isRunning) return;
    
    try {
        logger.info('[Scheduler] Sending booking reminders...');
        await notificationService.sendBookingReminders();
        logger.info('[Scheduler] Booking reminders sent');
    } catch (error) {
        logger.error('[Scheduler] Booking reminder task failed', { error: error.message });
    }
}, { scheduled: false });

/**
 * Start the scheduler
 */
async function start() {
    try {
        // Connect to MongoDB
        await connectDB();
        logger.info('[Scheduler] Connected to MongoDB');
        
        isRunning = true;
        
        // Start all tasks
        autoReleaseTask.start();
        checkInReminderTask.start();
        updateRecommendationsTask.start();
        bookingReminderTask.start();
        
        logger.info('[Scheduler] All scheduled tasks started');
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   📅 Campus Resource Optimization - Scheduler                 ║
║                                                               ║
║   Running tasks:                                              ║
║   - Auto-release check: every 5 minutes                       ║
║   - Check-in reminders: every minute                          ║
║   - Recommendations update: every hour                        ║
║   - Booking reminders: daily at 9 AM                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
        `);
        
    } catch (error) {
        logger.error('[Scheduler] Failed to start', { error: error.message });
        process.exit(1);
    }
}

/**
 * Stop the scheduler
 */
async function stop() {
    isRunning = false;
    
    autoReleaseTask.stop();
    checkInReminderTask.stop();
    updateRecommendationsTask.stop();
    bookingReminderTask.stop();
    
    await closeConnection();
    logger.info('[Scheduler] Stopped');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('[Scheduler] SIGTERM received. Shutting down...');
    await stop();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('[Scheduler] SIGINT received. Shutting down...');
    await stop();
    process.exit(0);
});

// Start if run directly
if (require.main === module) {
    start();
}

module.exports = { start, stop };
