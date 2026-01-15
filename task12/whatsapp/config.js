/**
 * WhatsApp Bot Configuration
 * UniRide Karachi - Smart University Carpooling Platform
 */

module.exports = {
    // Bot settings
    BOT_NAME: 'UniRide Karachi',
    BOT_PREFIX: '🚗',
    
    // Session settings
    SESSION_DIR: './whatsapp/sessions',
    SESSION_NAME: 'uniride-session',
    
    // Rate limiting
    RATE_LIMIT: {
        MAX_MESSAGES_PER_MINUTE: 10,
        COOLDOWN_SECONDS: 60,
        BAN_THRESHOLD: 50 // Ban after this many violations
    },
    
    // OTP settings
    OTP_LENGTH: 6,
    OTP_EXPIRY_MINUTES: 5,
    OTP_MAX_ATTEMPTS: 3,
    
    // API settings
    API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000/api',
    
    // Karachi bounds for validation
    KARACHI_BOUNDS: {
        minLat: 24.7,
        maxLat: 25.6,
        minLng: 66.7,
        maxLng: 67.6
    },
    
    // Common locations in Karachi for fuzzy matching
    KNOWN_LOCATIONS: {
        // Universities
        'fast': { name: 'FAST-NUCES', lat: 24.8534, lng: 67.0623 },
        'nuces': { name: 'FAST-NUCES', lat: 24.8534, lng: 67.0623 },
        'iba': { name: 'IBA Main Campus', lat: 24.8256, lng: 67.0012 },
        'ned': { name: 'NED University', lat: 24.9338, lng: 67.1106 },
        'ku': { name: 'Karachi University', lat: 24.9422, lng: 67.1208 },
        'uok': { name: 'Karachi University', lat: 24.9422, lng: 67.1208 },
        'dow': { name: 'DOW Medical', lat: 24.8888, lng: 67.0625 },
        'nust': { name: 'NUST Karachi', lat: 24.8935, lng: 67.0282 },
        'szabist': { name: 'SZABIST', lat: 24.8167, lng: 67.0276 },
        'aku': { name: 'Aga Khan University', lat: 24.8905, lng: 67.0748 },
        'lums': { name: 'LUMS Karachi', lat: 24.8612, lng: 67.0013 },
        'habib': { name: 'Habib University', lat: 24.8578, lng: 67.0689 },
        
        // Areas
        'gulshan': { name: 'Gulshan-e-Iqbal', lat: 24.9234, lng: 67.0923 },
        'johar': { name: 'Gulistan-e-Johar', lat: 24.9156, lng: 67.1312 },
        'clifton': { name: 'Clifton', lat: 24.8093, lng: 67.0311 },
        'dha': { name: 'Defence', lat: 24.8009, lng: 67.0482 },
        'defence': { name: 'Defence', lat: 24.8009, lng: 67.0482 },
        'saddar': { name: 'Saddar', lat: 24.8608, lng: 67.0104 },
        'pechs': { name: 'PECHS', lat: 24.8710, lng: 67.0672 },
        'tariq road': { name: 'Tariq Road', lat: 24.8710, lng: 67.0672 },
        'nazimabad': { name: 'Nazimabad', lat: 24.9175, lng: 67.0336 },
        'north nazimabad': { name: 'North Nazimabad', lat: 24.9420, lng: 67.0362 },
        'fb area': { name: 'FB Area', lat: 24.9235, lng: 67.0595 },
        'korangi': { name: 'Korangi', lat: 24.8380, lng: 67.1312 },
        'malir': { name: 'Malir', lat: 24.8908, lng: 67.1923 },
        'landhi': { name: 'Landhi', lat: 24.8567, lng: 67.2251 },
        'shah faisal': { name: 'Shah Faisal Colony', lat: 24.8778, lng: 67.1123 },
        'seaview': { name: 'Seaview', lat: 24.7937, lng: 67.0326 },
        'bahria town': { name: 'Bahria Town', lat: 24.9456, lng: 67.3234 },
        'scheme 33': { name: 'Scheme 33', lat: 24.9567, lng: 67.1456 },
        'airport': { name: 'Jinnah Airport', lat: 24.9065, lng: 67.1608 },
        
        // Landmarks
        'dolmen': { name: 'Dolmen Mall Clifton', lat: 24.8093, lng: 67.0311 },
        'forum': { name: 'Forum Mall', lat: 24.8138, lng: 67.0284 },
        'ocean mall': { name: 'Ocean Mall', lat: 24.8092, lng: 67.0375 },
        'lucky one': { name: 'Lucky One Mall', lat: 24.9234, lng: 67.0978 },
        'numaish': { name: 'Numaish Chowrangi', lat: 24.8754, lng: 67.0453 },
        'tower': { name: 'Tower', lat: 24.8536, lng: 67.0181 }
    },
    
    // Message templates
    MESSAGES: {
        WELCOME: `🚗 *Welcome to UniRide Karachi!*

Pakistan's smartest university carpooling platform.

*Commands you can use:*
📍 *find ride* - Search for rides
   _Example: find ride from gulshan to fast at 8am_

🎫 *book ride [number]* - Book a ride
   _Example: book ride 1_

🚘 *post ride* - Post a new ride (drivers)

📋 *my rides* - View your rides
📅 *today rides* - Today's rides
❌ *cancel ride [number]* - Cancel a ride

🔗 *link account* - Link your WhatsApp to UniRide
❓ *help* - Show this help message

Let's make Karachi traffic better together! 🌱`,

        HELP: `📚 *UniRide WhatsApp Help*

*Searching Rides:*
• find ride from [source] to [destination]
• find ride from gulshan to fast at 8am
• find ride to iba tomorrow

*Booking:*
• book ride 1
• book seat on ride 2

*For Drivers:*
• post ride (starts a conversation)
• my posted rides
• cancel my ride 3

*Status:*
• my rides
• my bookings
• today rides

*Safety:*
• sos (emergency alert)
• share ride (get tracking link)

*Account:*
• link account
• my profile
• my stats

Need help? Reply with your question!`,

        NOT_LINKED: `⚠️ *Account Not Linked*

To use UniRide via WhatsApp, please link your account first.

Reply with *link account* to start the linking process.

Don't have an account? Download the app or visit:
🌐 https://uniride.pk`,

        LINK_START: `🔗 *Link Your UniRide Account*

Please enter the email address you registered with:`,

        OTP_SENT: `📱 *OTP Sent!*

We've sent a 6-digit code to your UniRide app.
Please enter the code here to verify:

⏰ Code expires in 5 minutes.`,

        LINK_SUCCESS: `✅ *Account Linked Successfully!*

Welcome to UniRide on WhatsApp, {{name}}! 🎉

You can now:
• Search and book rides
• Post rides (if you're a driver)
• Get notifications
• Use SOS features

Type *help* to see all commands.`,

        NO_RIDES_FOUND: `😔 *No Rides Found*

We couldn't find rides matching your search.

Try:
• Different time
• Nearby areas
• Broader search

Or post your own ride as a driver! 🚗`,

        RATE_LIMITED: `⏳ *Slow Down!*

You're sending messages too quickly.
Please wait {{seconds}} seconds before trying again.

If you're having issues, please try the app at:
🌐 https://uniride.pk`,

        ERROR: `❌ *Something went wrong*

We couldn't process your request. Please try again.

If the problem persists, use the UniRide app or contact support.`,

        INVALID_COMMAND: `🤔 *I didn't understand that*

Try commands like:
• find ride from gulshan to fast
• book ride 1
• my rides
• help

Type *help* for all commands.`,

        BOOKING_CONFIRMED: `✅ *Booking Confirmed!*

*Ride Details:*
🚗 Driver: {{driverName}}
📍 From: {{source}}
📍 To: {{destination}}
🕐 Time: {{time}}
💰 Price: Rs. {{price}}

*Driver Contact:* {{driverPhone}}

📍 *Route Map:*
{{mapLink}}

Have a safe ride! 🙏`,

        RIDE_POSTED: `✅ *Ride Posted Successfully!*

*Your Ride:*
📍 From: {{source}}
📍 To: {{destination}}
🕐 Time: {{time}}
💺 Seats: {{seats}}
💰 Price: Rs. {{price}}/seat

Riders can now find and book your ride!

🌱 *Estimated Impact:*
CO₂ Saved: {{co2}} kg
Trees Equivalent: {{trees}}`
    }
};
