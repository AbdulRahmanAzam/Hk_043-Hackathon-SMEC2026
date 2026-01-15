/**
 * Command Parser for WhatsApp Bot
 * UniRide Karachi
 * 
 * Parses natural language commands from WhatsApp messages
 */

const config = require('./config');
const maps = require('./maps');

// Command patterns with regex
const COMMAND_PATTERNS = {
    // Ride search patterns
    FIND_RIDE: [
        /(?:find|search|get|show|need)\s*(?:a\s*)?ride\s*(?:from\s*)?([\w\s-]+?)(?:\s*to\s*)([\w\s-]+?)(?:\s*(?:at|@)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?\s*(?:tomorrow|today)?/i,
        /ride\s*(?:from\s*)?([\w\s-]+?)\s*to\s*([\w\s-]+)/i,
        /(?:going|traveling)\s*(?:from\s*)?([\w\s-]+?)\s*to\s*([\w\s-]+)/i,
        /(?:need|want)\s*(?:to\s*go\s*)?(?:from\s*)?([\w\s-]+?)\s*to\s*([\w\s-]+)/i
    ],
    
    // Booking patterns
    BOOK_RIDE: [
        /book\s*(?:ride|seat)?\s*(?:#|number|no\.?)?\s*(\d+)/i,
        /confirm\s*(?:ride|booking)?\s*(?:#|number|no\.?)?\s*(\d+)/i,
        /take\s*(?:ride)?\s*(?:#|number|no\.?)?\s*(\d+)/i,
        /select\s*(?:ride)?\s*(?:#|number|no\.?)?\s*(\d+)/i
    ],
    
    // Cancel patterns
    CANCEL: [
        /cancel\s*(?:my\s*)?(?:ride|booking)?\s*(?:#|number|no\.?)?\s*(\d+)?/i,
        /(?:don't|dont)\s*want\s*(?:ride|booking)?\s*(?:#|number|no\.?)?\s*(\d+)?/i
    ],
    
    // Status patterns
    MY_RIDES: /(?:my|show\s*my)\s*(?:rides|bookings|trips)/i,
    TODAY_RIDES: /(?:today|today's)\s*rides/i,
    RIDE_STATUS: /(?:status|track)\s*(?:of\s*)?(?:ride|booking)?\s*(?:#|number|no\.?)?\s*(\d+)?/i,
    
    // Post ride patterns
    POST_RIDE: /(?:post|create|add|offer|give)\s*(?:a\s*)?ride/i,
    
    // Account patterns
    LINK_ACCOUNT: /link\s*(?:my\s*)?account/i,
    MY_PROFILE: /(?:my|show)\s*profile/i,
    MY_STATS: /(?:my|show)\s*(?:stats|statistics|impact)/i,
    UNLINK: /unlink\s*(?:my\s*)?(?:account|whatsapp)/i,
    
    // Help patterns
    HELP: /^(?:help|commands|menu|start|\?)$/i,
    
    // Safety patterns
    SOS: /^(?:sos|emergency|help\s*me|danger)$/i,
    SHARE_RIDE: /share\s*(?:my\s*)?(?:ride|location|tracking)/i,
    
    // Yes/No for conversations
    YES: /^(?:yes|y|ok|okay|confirm|sure|haan|ji|han)$/i,
    NO: /^(?:no|n|nahi|cancel|stop|nope)$/i
};

/**
 * Parse a message and identify the command
 */
function parseCommand(message) {
    const text = message.trim();
    
    // Check for empty message
    if (!text) {
        return { command: 'UNKNOWN', data: {} };
    }
    
    // Check SOS first (highest priority)
    if (COMMAND_PATTERNS.SOS.test(text)) {
        return { command: 'SOS', data: {} };
    }
    
    // Check help
    if (COMMAND_PATTERNS.HELP.test(text)) {
        return { command: 'HELP', data: {} };
    }
    
    // Check yes/no (for conversation flows)
    if (COMMAND_PATTERNS.YES.test(text)) {
        return { command: 'YES', data: {} };
    }
    if (COMMAND_PATTERNS.NO.test(text)) {
        return { command: 'NO', data: {} };
    }
    
    // Check account linking
    if (COMMAND_PATTERNS.LINK_ACCOUNT.test(text)) {
        return { command: 'LINK_ACCOUNT', data: {} };
    }
    if (COMMAND_PATTERNS.UNLINK.test(text)) {
        return { command: 'UNLINK', data: {} };
    }
    
    // Check profile/stats
    if (COMMAND_PATTERNS.MY_PROFILE.test(text)) {
        return { command: 'MY_PROFILE', data: {} };
    }
    if (COMMAND_PATTERNS.MY_STATS.test(text)) {
        return { command: 'MY_STATS', data: {} };
    }
    
    // Check ride status queries
    if (COMMAND_PATTERNS.MY_RIDES.test(text)) {
        return { command: 'MY_RIDES', data: {} };
    }
    if (COMMAND_PATTERNS.TODAY_RIDES.test(text)) {
        return { command: 'TODAY_RIDES', data: {} };
    }
    
    // Check ride status
    const statusMatch = text.match(COMMAND_PATTERNS.RIDE_STATUS);
    if (statusMatch) {
        return { 
            command: 'RIDE_STATUS', 
            data: { rideNumber: statusMatch[1] ? parseInt(statusMatch[1]) : null } 
        };
    }
    
    // Check post ride
    if (COMMAND_PATTERNS.POST_RIDE.test(text)) {
        return { command: 'POST_RIDE', data: {} };
    }
    
    // Check share ride
    if (COMMAND_PATTERNS.SHARE_RIDE.test(text)) {
        return { command: 'SHARE_RIDE', data: {} };
    }
    
    // Check booking
    for (const pattern of COMMAND_PATTERNS.BOOK_RIDE) {
        const match = text.match(pattern);
        if (match) {
            return { 
                command: 'BOOK_RIDE', 
                data: { rideNumber: parseInt(match[1]) } 
            };
        }
    }
    
    // Check cancellation
    for (const pattern of COMMAND_PATTERNS.CANCEL) {
        const match = text.match(pattern);
        if (match) {
            return { 
                command: 'CANCEL', 
                data: { rideNumber: match[1] ? parseInt(match[1]) : null } 
            };
        }
    }
    
    // Check ride search (most complex, check last)
    for (const pattern of COMMAND_PATTERNS.FIND_RIDE) {
        const match = text.match(pattern);
        if (match) {
            const source = match[1]?.trim();
            const destination = match[2]?.trim();
            const time = match[3]?.trim();
            
            // Parse locations
            const parsedSource = maps.parseLocation(source);
            const parsedDest = maps.parseLocation(destination);
            
            return {
                command: 'FIND_RIDE',
                data: {
                    source: {
                        input: source,
                        parsed: parsedSource
                    },
                    destination: {
                        input: destination,
                        parsed: parsedDest
                    },
                    time: time ? parseTime(time) : null,
                    rawTime: time
                }
            };
        }
    }
    
    // Check if it looks like an email (for linking flow)
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) {
        return { command: 'EMAIL_INPUT', data: { email: text } };
    }
    
    // Check if it's a 6-digit OTP
    if (/^\d{6}$/.test(text)) {
        return { command: 'OTP_INPUT', data: { otp: text } };
    }
    
    // Check if it's just a number (could be for various contexts)
    if (/^\d+$/.test(text)) {
        return { command: 'NUMBER_INPUT', data: { number: parseInt(text) } };
    }
    
    // Unknown command
    return { 
        command: 'UNKNOWN', 
        data: { originalText: text } 
    };
}

/**
 * Parse time string to 24h format
 */
function parseTime(timeStr) {
    if (!timeStr) return null;
    
    const cleaned = timeStr.toLowerCase().trim();
    let hours = 0;
    let minutes = 0;
    
    // Match patterns like "8am", "8:30am", "14:00"
    const match12 = cleaned.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
    const match24 = cleaned.match(/(\d{1,2}):(\d{2})/);
    
    if (match12) {
        hours = parseInt(match12[1]);
        minutes = match12[2] ? parseInt(match12[2]) : 0;
        
        if (match12[3] === 'pm' && hours !== 12) {
            hours += 12;
        } else if (match12[3] === 'am' && hours === 12) {
            hours = 0;
        }
    } else if (match24) {
        hours = parseInt(match24[1]);
        minutes = parseInt(match24[2]);
    } else {
        // Try to parse just a number as hours
        const hourOnly = cleaned.match(/(\d{1,2})/);
        if (hourOnly) {
            hours = parseInt(hourOnly[1]);
            // Assume AM if less than 12, PM if single digit and common commute time
            if (hours >= 1 && hours <= 6) {
                hours += 12; // Assume PM for 1-6
            }
        }
    }
    
    // Validate
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
    }
    
    return {
        hours,
        minutes,
        formatted: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    };
}

/**
 * Parse date from message
 */
function parseDate(text) {
    const cleaned = text.toLowerCase().trim();
    const today = new Date();
    
    if (cleaned.includes('today') || cleaned.includes('aaj')) {
        return formatDate(today);
    }
    
    if (cleaned.includes('tomorrow') || cleaned.includes('kal')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return formatDate(tomorrow);
    }
    
    // Default to today
    return formatDate(today);
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

/**
 * Extract seat count from message
 */
function parseSeats(text) {
    const match = text.match(/(\d+)\s*seats?/i);
    if (match) {
        const seats = parseInt(match[1]);
        return seats >= 1 && seats <= 6 ? seats : 1;
    }
    return 1;
}

/**
 * Generate clarification request for ambiguous input
 */
function getClarificationRequest(command, data) {
    switch (command) {
        case 'FIND_RIDE':
            if (!data.source?.parsed?.found && !data.destination?.parsed?.found) {
                return `🤔 I couldn't recognize those locations.

Try using common Karachi areas like:
• gulshan, johar, clifton, dha, saddar
• fast, iba, ned, ku, dow
• dolmen, forum, numaish

Example: *find ride from gulshan to fast*`;
            }
            if (!data.source?.parsed?.found) {
                return `📍 I didn't recognize "${data.source.input}".

Did you mean one of these?
• Gulshan-e-Iqbal
• Gulistan-e-Johar  
• North Nazimabad
• FB Area

Or type a specific area name.`;
            }
            if (!data.destination?.parsed?.found) {
                return `📍 I didn't recognize "${data.destination.input}".

Common destinations:
• FAST, IBA, NED, KU
• Clifton, DHA, Saddar
• Dolmen, Forum Mall

Please specify the destination.`;
            }
            break;
            
        case 'CANCEL':
            if (!data.rideNumber) {
                return `Which ride would you like to cancel?

Reply with *cancel ride [number]*

To see your rides, type *my rides*`;
            }
            break;
    }
    
    return null;
}

module.exports = {
    parseCommand,
    parseTime,
    parseDate,
    parseSeats,
    getClarificationRequest,
    COMMAND_PATTERNS
};
