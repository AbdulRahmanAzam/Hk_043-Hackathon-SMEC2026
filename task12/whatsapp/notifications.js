/**
 * WhatsApp Notification System
 * UniRide Karachi
 * 
 * Handles outbound notifications to users
 */

const db = require('../config/database');
const maps = require('./maps');

// Notification queue (in production, use Redis/message queue)
const notificationQueue = [];

// Bot send function reference (set by bot.js)
let sendMessage = null;

/**
 * Set the send message function from bot
 */
function setSendFunction(fn) {
    sendMessage = fn;
}

/**
 * Queue a notification
 */
function queueNotification(phoneNumber, message, priority = 'normal') {
    notificationQueue.push({
        phoneNumber,
        message,
        priority,
        createdAt: Date.now(),
        attempts: 0
    });
}

/**
 * Process notification queue
 */
async function processQueue() {
    if (!sendMessage || notificationQueue.length === 0) return;
    
    // Sort by priority
    notificationQueue.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    
    const notification = notificationQueue.shift();
    
    try {
        await sendMessage(notification.phoneNumber, notification.message);
        console.log(`[Notification] Sent to ${notification.phoneNumber}`);
    } catch (error) {
        console.error(`[Notification] Failed for ${notification.phoneNumber}:`, error);
        
        // Retry logic
        if (notification.attempts < 3) {
            notification.attempts++;
            notificationQueue.push(notification);
        }
    }
}

// Process queue every 5 seconds
setInterval(processQueue, 5000);

/**
 * Notify rider of booking confirmation
 */
function notifyBookingConfirmed(booking) {
    const { ride, rider, driver, routeInfo } = booking;
    
    // Get rider's WhatsApp
    const riderUser = db.prepare(`
        SELECT whatsapp_number FROM users WHERE id = ?
    `).get(booking.booking.rider_id || rider?.id);
    
    if (!riderUser?.whatsapp_number) return;
    
    const message = `✅ *Booking Confirmed!*

*Your Ride Details:*
👤 Driver: ${driver.name}
📞 Phone: ${driver.phone || 'Contact via app'}

📍 *From:* ${maps.formatAddress(ride.source_address)}
📍 *To:* ${maps.formatAddress(ride.destination_address)}

📅 Date: ${ride.departure_date}
🕐 Time: ${formatTime12(ride.departure_time)}
💰 Price: Rs. ${ride.fuel_split_price || 0}

🚙 Vehicle: ${ride.vehicle_color || ''} ${ride.vehicle_model || 'See app for details'}

📍 *Route Map:*
${routeInfo.mapLink}

Have a safe journey! 🙏`;

    queueNotification(riderUser.whatsapp_number, message, 'high');
}

/**
 * Notify driver of new booking
 */
function notifyDriverNewBooking(booking, riderInfo) {
    const { ride } = booking;
    
    // Get driver's WhatsApp
    const driverUser = db.prepare(`
        SELECT whatsapp_number, name FROM users WHERE id = ?
    `).get(ride.driver_id);
    
    if (!driverUser?.whatsapp_number) return;
    
    const message = `🎫 *New Booking!*

${riderInfo.name} has booked a seat on your ride.

📍 ${maps.formatAddress(ride.source_address)} → ${maps.formatAddress(ride.destination_address)}
📅 ${ride.departure_date} at ${formatTime12(ride.departure_time)}

💺 Seats remaining: ${ride.available_seats - 1}

📞 Rider: ${riderInfo.phone || 'Contact via app'}

Open the app for full details.`;

    queueNotification(driverUser.whatsapp_number, message, 'high');
}

/**
 * Notify users when a ride is cancelled
 */
function notifyRideCancelled(ride, affectedUsers, cancelledBy) {
    const baseMessage = `❌ *Ride Cancelled*

The ride from ${maps.formatAddress(ride.source_address)} to ${maps.formatAddress(ride.destination_address)} on ${ride.departure_date} has been cancelled${cancelledBy === 'driver' ? ' by the driver' : ''}.

We apologize for the inconvenience. Please search for another ride.

🔍 Try: *find ride to ${ride.destination_address.split(',')[0]}*`;

    affectedUsers.forEach(user => {
        if (user.whatsapp_number) {
            queueNotification(user.whatsapp_number, baseMessage, 'high');
        }
    });
}

/**
 * Send ride reminder (30 minutes before)
 */
function sendRideReminder(ride, users) {
    const routeInfo = maps.formatRouteInfo(ride);
    
    users.forEach(user => {
        if (!user.whatsapp_number) return;
        
        let message;
        
        if (user.isDriver) {
            message = `⏰ *Ride Reminder*

Your ride starts in *30 minutes*!

📍 Pickup: ${maps.formatAddress(ride.source_address)}
📍 Drop: ${maps.formatAddress(ride.destination_address)}
🕐 Time: ${formatTime12(ride.departure_time)}

👥 Passengers: ${ride.bookings_count}

📍 *Navigation:*
${routeInfo.mapLink}

Drive safe! 🚗`;
        } else {
            message = `⏰ *Ride Reminder*

Your ride is in *30 minutes*!

👤 Driver: ${ride.driver_name}
📞 Phone: ${ride.driver_phone}

📍 Pickup: ${maps.formatAddress(ride.source_address)}
🕐 Time: ${formatTime12(ride.departure_time)}

📍 *Pickup Location:*
${maps.generateLocationLink(ride.source_lat, ride.source_lng)}

Be ready! 🎒`;
        }
        
        queueNotification(user.whatsapp_number, message, 'high');
    });
}

/**
 * Notify when driver is arriving
 */
function notifyDriverArriving(ride, riders) {
    const message = `🚗 *Driver Arriving!*

${ride.driver_name} is almost at the pickup point.

📍 ${maps.formatAddress(ride.source_address)}

Please be ready! 🎒`;

    riders.forEach(rider => {
        if (rider.whatsapp_number) {
            queueNotification(rider.whatsapp_number, message, 'high');
        }
    });
}

/**
 * Notify when ride starts
 */
function notifyRideStarted(ride, users) {
    const routeInfo = maps.formatRouteInfo(ride);
    
    users.forEach(user => {
        if (!user.whatsapp_number) return;
        
        const message = `🚀 *Ride Started!*

You're on your way to ${maps.formatAddress(ride.destination_address)}.

⏱️ ETA: ${routeInfo.eta}
📏 Distance: ${routeInfo.distance} km

🔗 *Share your ride:*
_Reply "share ride" to get a tracking link_

Have a safe journey! 🙏`;

        queueNotification(user.whatsapp_number, message, 'normal');
    });
}

/**
 * Notify when ride is completed
 */
function notifyRideCompleted(ride, carbonImpact, users) {
    users.forEach(user => {
        if (!user.whatsapp_number) return;
        
        const message = `✅ *Ride Completed!*

Thanks for riding with UniRide Karachi! 🎉

🌱 *Your Impact:*
🚗 Distance: ${ride.distance_km?.toFixed(1) || '?'} km
💨 CO₂ Saved: ${carbonImpact.co2Saved.toFixed(1)} kg
🌳 Trees: ${carbonImpact.treesEquivalent.toFixed(2)} trees/year
💰 Saved: Rs. ${carbonImpact.moneySaved.toFixed(0)}

⭐ *Please rate your ride* in the app!

See you next time! 👋`;

        queueNotification(user.whatsapp_number, message, 'normal');
    });
}

/**
 * Send SOS alert to emergency contacts
 */
function sendSOSAlert(user, ride, location) {
    // Get emergency contacts
    const contacts = db.prepare(`
        SELECT * FROM emergency_contacts WHERE user_id = ?
    `).all(user.id);
    
    const locationLink = location 
        ? maps.generateLocationLink(location.lat, location.lng)
        : 'Location unavailable';
    
    const message = `🆘 *EMERGENCY ALERT*

${user.name} has triggered an SOS during their UniRide journey.

${ride ? `📍 Route: ${maps.formatAddress(ride.source_address)} → ${maps.formatAddress(ride.destination_address)}` : ''}

📍 *Current Location:*
${locationLink}

Please check on them immediately.

This is an automated emergency alert from UniRide Karachi.`;

    contacts.forEach(contact => {
        // In production, send SMS to emergency contacts
        console.log(`[SOS] Alert to ${contact.name}: ${contact.phone}`);
        
        // If contact has WhatsApp linked
        if (contact.whatsapp_number) {
            queueNotification(contact.whatsapp_number, message, 'high');
        }
    });
    
    return contacts.length;
}

/**
 * Send ride share link
 */
function sendRideShareLink(ride, shareToken, recipientPhone) {
    const trackingLink = `https://uniride.pk/track/${shareToken}`;
    const routeInfo = maps.formatRouteInfo(ride);
    
    const message = `📍 *Live Ride Tracking*

Someone is sharing their ride with you:

👤 Rider is traveling from:
📍 ${maps.formatAddress(ride.source_address)}
📍 To: ${maps.formatAddress(ride.destination_address)}

🔗 *Track Live:*
${trackingLink}

📍 *Route Map:*
${routeInfo.mapLink}

_Link expires in 24 hours_`;

    queueNotification(recipientPhone, message, 'high');
}

/**
 * Helper: Format time to 12-hour
 */
function formatTime12(time24) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get pending notifications count
 */
function getPendingCount() {
    return notificationQueue.length;
}

module.exports = {
    setSendFunction,
    queueNotification,
    notifyBookingConfirmed,
    notifyDriverNewBooking,
    notifyRideCancelled,
    sendRideReminder,
    notifyDriverArriving,
    notifyRideStarted,
    notifyRideCompleted,
    sendSOSAlert,
    sendRideShareLink,
    getPendingCount
};
