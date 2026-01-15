/**
 * WhatsApp Bot - Main Entry Point
 * UniRide Karachi - Smart University Carpooling Platform
 * 
 * Uses Baileys WhatsApp Web API for WhatsApp integration
 */

const makeWASocket = require('@whiskeysockets/baileys').default;
const { 
    useMultiFileAuthState, 
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');

// Import modules
const config = require('./config');
const auth = require('./auth');
const { parseCommand, getClarificationRequest } = require('./commands');
const { isInFlow, processFlowInput, startFlow } = require('./conversations');
const rides = require('./rides');
const notifications = require('./notifications');
const maps = require('./maps');

// Rate limiting storage
const rateLimits = new Map();
const searchResults = new Map(); // Store search results per user for booking

// Logger
const logger = pino({ 
    level: process.env.LOG_LEVEL || 'warn',
    transport: {
        target: 'pino-pretty',
        options: { colorize: true }
    }
});

// Session directory
const SESSION_DIR = path.join(__dirname, 'sessions');

/**
 * Initialize WhatsApp Bot
 */
async function startBot() {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   📱 UniRide Karachi WhatsApp Bot                               ║
║                                                                  ║
║   Initializing Baileys connection...                            ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
    `);

    // Ensure session directory exists
    if (!fs.existsSync(SESSION_DIR)) {
        fs.mkdirSync(SESSION_DIR, { recursive: true });
    }

    // Load auth state
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
    
    // Get latest Baileys version
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`Using Baileys v${version.join('.')} (Latest: ${isLatest})`);

    // Create socket
    const sock = makeWASocket({
        version,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger)
        },
        printQRInTerminal: true,
        logger,
        generateHighQualityLinkPreview: true,
        markOnlineOnConnect: true,
        syncFullHistory: false
    });

    // Set send function for notifications
    notifications.setSendFunction(async (phone, message) => {
        const jid = formatJid(phone);
        await sock.sendMessage(jid, { text: message });
    });

    // Handle connection updates
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n📱 Scan this QR code with WhatsApp:');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            
            console.log('Connection closed:', lastDisconnect?.error?.message);
            
            if (shouldReconnect) {
                console.log('Reconnecting...');
                await startBot();
            } else {
                console.log('Logged out. Please delete sessions folder and restart.');
            }
        }

        if (connection === 'open') {
            console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   ✅ WhatsApp Bot Connected!                                    ║
║                                                                  ║
║   Bot is now ready to receive messages.                         ║
║   Send a message to test!                                       ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
            `);
        }
    });

    // Save credentials on update
    sock.ev.on('creds.update', saveCreds);

    // Handle incoming messages
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        for (const msg of messages) {
            await handleMessage(sock, msg);
        }
    });

    return sock;
}

/**
 * Handle incoming message
 */
async function handleMessage(sock, msg) {
    try {
        // Ignore messages from self or non-text messages
        if (msg.key.fromMe) return;
        if (!msg.message) return;

        // Get message content
        const messageContent = msg.message.conversation || 
                              msg.message.extendedTextMessage?.text ||
                              msg.message.imageMessage?.caption ||
                              '';
        
        if (!messageContent.trim()) return;

        const senderJid = msg.key.remoteJid;
        const phoneNumber = senderJid.replace('@s.whatsapp.net', '');
        
        console.log(`[Message] From ${phoneNumber}: ${messageContent}`);

        // Check rate limit
        if (!checkRateLimit(phoneNumber)) {
            await sendReply(sock, senderJid, config.MESSAGES.RATE_LIMITED.replace('{{seconds}}', '60'));
            return;
        }

        // Process message
        const response = await processMessage(phoneNumber, messageContent);
        
        // Send response
        if (response) {
            await sendReply(sock, senderJid, response);
        }

    } catch (error) {
        console.error('[Message Handler] Error:', error);
        await sendReply(sock, msg.key.remoteJid, config.MESSAGES.ERROR);
    }
}

/**
 * Process incoming message and generate response
 */
async function processMessage(phoneNumber, text) {
    // Check if user is in a conversation flow
    if (isInFlow(phoneNumber)) {
        const flowResult = processFlowInput(phoneNumber, text);
        
        if (flowResult.complete) {
            // Handle flow completion
            return await handleFlowCompletion(phoneNumber, flowResult);
        }
        
        return flowResult.message;
    }

    // Check linking state
    const linkingState = auth.getLinkingState(phoneNumber);
    if (linkingState) {
        return await handleLinkingInput(phoneNumber, text, linkingState);
    }

    // Parse command
    const { command, data } = parseCommand(text);
    
    // Check if user is linked (required for most commands)
    const user = auth.getUserByWhatsApp(phoneNumber);
    
    // Commands that don't require linking
    if (command === 'HELP') {
        return config.MESSAGES.HELP;
    }
    
    if (command === 'LINK_ACCOUNT') {
        const result = auth.startLinking(phoneNumber);
        if (result.alreadyLinked) {
            return `✅ Your WhatsApp is already linked to *${result.user.name}*!\n\nType *help* to see available commands.`;
        }
        return result.message;
    }

    // All other commands require linked account
    if (!user) {
        return config.MESSAGES.NOT_LINKED;
    }

    // Route command
    return await routeCommand(command, data, user, phoneNumber);
}

/**
 * Route command to appropriate handler
 */
async function routeCommand(command, data, user, phoneNumber) {
    switch (command) {
        case 'FIND_RIDE':
            return await handleFindRide(user, data, phoneNumber);
            
        case 'BOOK_RIDE':
            return await handleBookRide(user, data, phoneNumber);
            
        case 'POST_RIDE':
            const flowResult = startFlow(phoneNumber, 'POST_RIDE', {});
            return flowResult.message;
            
        case 'MY_RIDES':
            return await handleMyRides(user);
            
        case 'TODAY_RIDES':
            return await handleTodayRides(user);
            
        case 'CANCEL':
            return await handleCancel(user, data, phoneNumber);
            
        case 'RIDE_STATUS':
            return await handleRideStatus(user, data);
            
        case 'MY_PROFILE':
            return formatUserProfile(user);
            
        case 'MY_STATS':
            return formatUserStats(user);
            
        case 'UNLINK':
            const unlinkResult = auth.unlinkAccount(phoneNumber);
            return unlinkResult.message;
            
        case 'SOS':
            return await handleSOS(user, phoneNumber);
            
        case 'SHARE_RIDE':
            return await handleShareRide(user, phoneNumber);
            
        case 'EMAIL_INPUT':
        case 'OTP_INPUT':
            // These should be handled by linking state
            return config.MESSAGES.INVALID_COMMAND;
            
        case 'UNKNOWN':
        default:
            // Check for clarification needs
            const clarification = getClarificationRequest(command, data);
            if (clarification) return clarification;
            
            return config.MESSAGES.INVALID_COMMAND;
    }
}

/**
 * Handle ride search
 */
async function handleFindRide(user, data, phoneNumber) {
    // Check if locations are parsed
    if (!data.source?.parsed?.found || !data.destination?.parsed?.found) {
        const clarification = getClarificationRequest('FIND_RIDE', data);
        return clarification || config.MESSAGES.INVALID_COMMAND;
    }
    
    // Get today's date if not specified
    const searchDate = data.date || new Date().toISOString().split('T')[0];
    
    // Search for rides
    const searchParams = {
        source: data.source,
        destination: data.destination,
        date: searchDate,
        time: data.time?.formatted || null,
        rawTime: data.rawTime
    };
    
    const foundRides = rides.searchRides(user.id, searchParams);
    const result = rides.formatRidesForWhatsApp(foundRides, searchParams);
    
    // Store search results for booking reference
    if (foundRides.length > 0) {
        searchResults.set(phoneNumber, {
            rides: foundRides,
            timestamp: Date.now(),
            searchParams
        });
    }
    
    return result.message;
}

/**
 * Handle ride booking
 */
async function handleBookRide(user, data, phoneNumber) {
    const rideNumber = data.rideNumber;
    
    if (!rideNumber || rideNumber < 1) {
        return `Please specify which ride to book.

Example: *book ride 1*

To see available rides, search first:
*find ride from gulshan to fast*`;
    }
    
    // Get stored search results
    const cached = searchResults.get(phoneNumber);
    
    if (!cached || Date.now() - cached.timestamp > 30 * 60 * 1000) {
        return `⚠️ Your search results have expired.

Please search again:
*find ride from [source] to [destination]*`;
    }
    
    const selectedRide = cached.rides[rideNumber - 1];
    
    if (!selectedRide) {
        return `❌ Ride #${rideNumber} not found in your search results.

Available rides: 1-${cached.rides.length}`;
    }
    
    // Attempt booking
    const result = rides.bookRide(user.id, selectedRide.id, 1);
    
    if (!result.success) {
        return result.message;
    }
    
    // Notify driver
    notifications.notifyDriverNewBooking(result, { name: user.name, phone: user.phone });
    
    // Format confirmation
    const ride = result.booking.ride;
    const routeInfo = result.booking.routeInfo;
    
    return `✅ *Booking Confirmed!*

*Ride Details:*
👤 Driver: ${result.driver.name}
📞 Phone: ${result.driver.phone || 'Contact via app'}

📍 *From:* ${maps.formatAddress(ride.source_address)}
📍 *To:* ${maps.formatAddress(ride.destination_address)}

📅 Date: ${ride.departure_date}
🕐 Time: ${formatTime12(ride.departure_time)}
💰 Price: Rs. ${ride.fuel_split_price || 0}

${ride.vehicle_model ? `🚙 Vehicle: ${ride.vehicle_color || ''} ${ride.vehicle_model}` : ''}

📍 *Route Map:*
${routeInfo.mapLink}

Have a safe journey! 🙏`;
}

/**
 * Handle my rides request
 */
async function handleMyRides(user) {
    const userRides = rides.getUserRides(user.id, { status: 'active' });
    return rides.formatUserRidesForWhatsApp(userRides, user.id);
}

/**
 * Handle today's rides
 */
async function handleTodayRides(user) {
    const todayRides = rides.getTodayRides(user.id);
    
    if (todayRides.asDriver.length === 0 && todayRides.asRider.length === 0) {
        return `📅 *Today's Rides*

You have no rides scheduled for today.

*Find a ride:*
find ride from gulshan to fast`;
    }
    
    let message = `📅 *Today's Rides* (${todayRides.date})\n\n`;
    
    if (todayRides.asDriver.length > 0) {
        message += `🚗 *You're Driving:*\n\n`;
        todayRides.asDriver.forEach((ride, i) => {
            message += `*${i + 1}.* ${maps.formatAddress(ride.source_address, 20)} → ${maps.formatAddress(ride.destination_address, 20)}\n`;
            message += `   🕐 ${formatTime12(ride.departure_time)}\n`;
            message += `   👥 Passengers: ${ride.passenger_names || 'None yet'}\n\n`;
        });
    }
    
    if (todayRides.asRider.length > 0) {
        message += `🎫 *You're Riding:*\n\n`;
        todayRides.asRider.forEach((ride, i) => {
            message += `*${i + 1}.* ${maps.formatAddress(ride.source_address, 20)} → ${maps.formatAddress(ride.destination_address, 20)}\n`;
            message += `   🕐 ${formatTime12(ride.departure_time)}\n`;
            message += `   👤 Driver: ${ride.driver_name}\n`;
            message += `   📞 ${ride.driver_phone || 'Contact via app'}\n\n`;
        });
    }
    
    return message;
}

/**
 * Handle cancellation
 */
async function handleCancel(user, data, phoneNumber) {
    if (!data.rideNumber) {
        // Start cancel flow
        return `Which ride would you like to cancel?

Reply with the ride number or type *my rides* to see your rides.`;
    }
    
    // Get user's rides to find the correct one
    const userRides = rides.getUserRides(user.id, { type: 'all' });
    const allRides = [...userRides.asDriver, ...userRides.asRider];
    
    if (allRides.length === 0) {
        return `❌ You have no active rides to cancel.`;
    }
    
    const rideToCancel = allRides[data.rideNumber - 1];
    
    if (!rideToCancel) {
        return `❌ Ride #${data.rideNumber} not found.\n\nYou have ${allRides.length} active ride(s). Type *my rides* to see them.`;
    }
    
    const result = rides.cancelRide(user.id, rideToCancel.id);
    
    if (result.success && result.type === 'driver' && result.affectedRiders?.length > 0) {
        // Notify affected riders
        notifications.notifyRideCancelled(rideToCancel, result.affectedRiders, 'driver');
    }
    
    return result.message;
}

/**
 * Handle ride status query
 */
async function handleRideStatus(user, data) {
    // Get today's rides
    const todayRides = rides.getTodayRides(user.id);
    
    // If no specific ride number, show today's rides
    if (!data.rideNumber) {
        return handleTodayRides(user);
    }
    
    // For specific ride status - would need more implementation
    return `For detailed ride status, please check the app.`;
}

/**
 * Handle SOS emergency
 */
async function handleSOS(user, phoneNumber) {
    // Get current active ride for user
    const todayRides = rides.getTodayRides(user.id);
    const currentRide = todayRides.asRider[0] || todayRides.asDriver[0];
    
    // Send SOS notifications
    const contactsNotified = notifications.sendSOSAlert(user, currentRide, null);
    
    return `🆘 *EMERGENCY ALERT SENT*

Your emergency contacts have been notified.

${contactsNotified > 0 
    ? `✅ ${contactsNotified} contact(s) alerted.`
    : '⚠️ No emergency contacts set. Add them in the app.'}

If you're in immediate danger:
📞 Police: 15
📞 Rescue: 115
📞 Edhi: 115

Stay safe. Help is on the way.`;
}

/**
 * Handle share ride request
 */
async function handleShareRide(user, phoneNumber) {
    // Get current active ride
    const todayRides = rides.getTodayRides(user.id);
    const currentRide = todayRides.asRider[0] || todayRides.asDriver[0];
    
    if (!currentRide) {
        return `📍 *Share Your Ride*

You don't have an active ride right now.

Book a ride first, then you can share your location with contacts.`;
    }
    
    // Generate tracking link
    const routeInfo = maps.formatRouteInfo(currentRide);
    
    return `📍 *Share Your Ride*

Share this link with friends/family:

🗺️ *Route Map:*
${routeInfo.mapLink}

They can track your journey on the map.

_For live tracking, use the UniRide app._`;
}

/**
 * Handle linking input (email or OTP)
 */
async function handleLinkingInput(phoneNumber, text, state) {
    if (state.step === 'awaiting_email') {
        // Process email
        const result = auth.processLinkingEmail(phoneNumber, text.trim());
        return result.message;
    }
    
    if (state.step === 'awaiting_otp') {
        // Process OTP
        const result = auth.verifyOTP(phoneNumber, text.trim());
        return result.message;
    }
    
    return config.MESSAGES.ERROR;
}

/**
 * Handle conversation flow completion
 */
async function handleFlowCompletion(phoneNumber, flowResult) {
    if (flowResult.flowType === 'POST_RIDE') {
        // Get user
        const user = auth.getUserByWhatsApp(phoneNumber);
        if (!user) return config.MESSAGES.NOT_LINKED;
        
        // Post the ride
        const result = rides.postRide(user.id, flowResult.data);
        
        if (!result.success) {
            return result.message;
        }
        
        return `✅ *Ride Posted Successfully!*

*Your Ride:*
📍 From: ${result.ride.source.name}
📍 To: ${result.ride.destination.name}
📏 Distance: ${result.ride.distance.toFixed(1)} km
⏱️ Duration: ${result.ride.eta.formatted}

📅 Date: ${flowResult.data.dateDisplay}
🕐 Time: ${flowResult.data.timeDisplay}
💺 Seats: ${result.ride.seats}
💰 Price: Rs. ${result.ride.price}/seat

🗺️ *Route:*
${result.routeInfo.mapLink}

🌱 *Potential Impact:*
💨 CO₂ Saved: ${result.carbonImpact.co2Saved.toFixed(1)} kg
🌳 Trees: ${result.carbonImpact.treesEquivalent.toFixed(2)}/year

Riders can now book your ride! 🎉`;
    }
    
    if (flowResult.flowType === 'CANCEL_RIDE') {
        const user = auth.getUserByWhatsApp(phoneNumber);
        if (!user) return config.MESSAGES.NOT_LINKED;
        
        // This would need the actual ride ID
        return `Ride cancellation processed.`;
    }
    
    return flowResult.message;
}

/**
 * Format user profile for display
 */
function formatUserProfile(user) {
    const stars = getStarRating(user.average_rating);
    
    return `👤 *Your Profile*

*${user.name}*
📧 ${user.email}
🎓 ${user.university}${user.department ? ` - ${user.department}` : ''}

${stars} (${user.average_rating?.toFixed(1) || 0}/5)

🚗 Role: ${user.role === 'driver' ? 'Driver' : user.role === 'both' ? 'Driver & Rider' : 'Rider'}
✅ Rides Completed: ${user.rides_completed || 0}
🔥 Current Streak: ${user.current_streak || 0} days

${user.vehicle_model ? `🚙 Vehicle: ${user.vehicle_color || ''} ${user.vehicle_make || ''} ${user.vehicle_model}` : ''}
${user.vehicle_plate ? `📋 Plate: ${user.vehicle_plate}` : ''}

Edit profile in the app for more details.`;
}

/**
 * Format user stats for display
 */
function formatUserStats(user) {
    return `📊 *Your UniRide Stats*

🚗 *Rides:*
✅ Completed: ${user.rides_completed || 0}
🔥 Current Streak: ${user.current_streak || 0} days
🏆 Longest Streak: ${user.longest_streak || 0} days

⭐ *Rating:*
${getStarRating(user.average_rating)} ${user.average_rating?.toFixed(1) || 'N/A'}/5
💚 Behavior Score: ${user.behavior_score?.toFixed(0) || 100}/100

🌱 *Environmental Impact:*
💨 Total CO₂ Saved: ${user.total_co2_saved?.toFixed(1) || 0} kg
🚗 Total Distance: ${user.total_distance_km?.toFixed(0) || 0} km

Keep riding, keep saving! 🌍`;
}

/**
 * Rate limiting check
 */
function checkRateLimit(phoneNumber) {
    const now = Date.now();
    const userLimit = rateLimits.get(phoneNumber) || { count: 0, windowStart: now };
    
    // Reset window if expired
    if (now - userLimit.windowStart > 60000) {
        userLimit.count = 0;
        userLimit.windowStart = now;
    }
    
    userLimit.count++;
    rateLimits.set(phoneNumber, userLimit);
    
    return userLimit.count <= config.RATE_LIMIT.MAX_MESSAGES_PER_MINUTE;
}

/**
 * Send reply message
 */
async function sendReply(sock, jid, text) {
    try {
        await sock.sendMessage(jid, { text });
    } catch (error) {
        console.error('[Send] Error:', error);
    }
}

/**
 * Format phone to JID
 */
function formatJid(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return `${cleaned}@s.whatsapp.net`;
}

/**
 * Format time to 12-hour
 */
function formatTime12(time24) {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get star rating emoji
 */
function getStarRating(rating) {
    if (!rating || rating === 0) return '☆☆☆☆☆';
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    return '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(5 - fullStars - (halfStar ? 1 : 0));
}

// Start bot if run directly
if (require.main === module) {
    startBot().catch(console.error);
}

module.exports = { startBot };
