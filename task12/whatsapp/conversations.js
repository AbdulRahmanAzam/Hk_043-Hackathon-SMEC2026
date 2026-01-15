/**
 * Conversational Flows for WhatsApp Bot
 * UniRide Karachi
 * 
 * Handles multi-step interactions like posting rides
 */

const config = require('./config');
const maps = require('./maps');
const { parseTime, parseSeats } = require('./commands');

// In-memory conversation state storage
const conversationState = new Map();

// Conversation flow definitions
const FLOWS = {
    POST_RIDE: {
        steps: ['source', 'destination', 'date', 'time', 'seats', 'price', 'confirm'],
        timeout: 10 * 60 * 1000 // 10 minutes
    },
    CANCEL_RIDE: {
        steps: ['select', 'confirm'],
        timeout: 5 * 60 * 1000
    }
};

/**
 * Start a new conversation flow
 */
function startFlow(phoneNumber, flowType, initialData = {}) {
    const flow = FLOWS[flowType];
    if (!flow) {
        return { success: false, message: 'Invalid flow type' };
    }
    
    conversationState.set(phoneNumber, {
        flowType,
        currentStep: 0,
        data: initialData,
        startedAt: Date.now(),
        expiresAt: Date.now() + flow.timeout
    });
    
    return getNextPrompt(phoneNumber);
}

/**
 * Process input for current conversation step
 */
function processFlowInput(phoneNumber, input) {
    const state = conversationState.get(phoneNumber);
    
    if (!state) {
        return { 
            inFlow: false, 
            message: null 
        };
    }
    
    // Check expiry
    if (Date.now() > state.expiresAt) {
        conversationState.delete(phoneNumber);
        return {
            inFlow: false,
            message: '⏰ Conversation timed out. Please start again.'
        };
    }
    
    const flow = FLOWS[state.flowType];
    const currentStep = flow.steps[state.currentStep];
    
    // Process based on flow type and step
    switch (state.flowType) {
        case 'POST_RIDE':
            return processPostRideStep(phoneNumber, state, currentStep, input);
        case 'CANCEL_RIDE':
            return processCancelRideStep(phoneNumber, state, currentStep, input);
        default:
            return { inFlow: false, message: null };
    }
}

/**
 * Process step input for POST_RIDE flow
 */
function processPostRideStep(phoneNumber, state, step, input) {
    const text = input.trim().toLowerCase();
    
    // Check for cancel
    if (text === 'cancel' || text === 'stop' || text === 'exit') {
        conversationState.delete(phoneNumber);
        return {
            inFlow: false,
            message: '❌ Ride posting cancelled. Type *post ride* to start again.'
        };
    }
    
    switch (step) {
        case 'source':
            const parsedSource = maps.parseLocation(input);
            if (!parsedSource.found) {
                return {
                    inFlow: true,
                    message: `📍 I couldn't find "${input}" in Karachi.

Try areas like: gulshan, clifton, fast, iba, saddar, dha

Or type a specific landmark.`
                };
            }
            state.data.source = parsedSource;
            state.data.sourceInput = input;
            state.currentStep++;
            break;
            
        case 'destination':
            const parsedDest = maps.parseLocation(input);
            if (!parsedDest.found) {
                return {
                    inFlow: true,
                    message: `📍 I couldn't find "${input}" in Karachi.

Try universities: fast, iba, ned, ku, dow
Or areas: gulshan, johar, clifton, saddar`
                };
            }
            state.data.destination = parsedDest;
            state.data.destinationInput = input;
            state.currentStep++;
            break;
            
        case 'date':
            if (text.includes('today') || text.includes('aaj') || text === '1') {
                state.data.date = new Date().toISOString().split('T')[0];
                state.data.dateDisplay = 'Today';
            } else if (text.includes('tomorrow') || text.includes('kal') || text === '2') {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                state.data.date = tomorrow.toISOString().split('T')[0];
                state.data.dateDisplay = 'Tomorrow';
            } else {
                // Try to parse date
                const dateMatch = input.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
                if (dateMatch) {
                    const day = parseInt(dateMatch[1]);
                    const month = parseInt(dateMatch[2]) - 1;
                    const year = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();
                    const date = new Date(year, month, day);
                    state.data.date = date.toISOString().split('T')[0];
                    state.data.dateDisplay = date.toLocaleDateString('en-PK');
                } else {
                    return {
                        inFlow: true,
                        message: `📅 Please enter a valid date.

Reply with:
• *today* or *1*
• *tomorrow* or *2*
• Date like *15/01* or *15-01-2026*`
                    };
                }
            }
            state.currentStep++;
            break;
            
        case 'time':
            const parsedTime = parseTime(input);
            if (!parsedTime) {
                return {
                    inFlow: true,
                    message: `🕐 Please enter a valid time.

Examples:
• 8am, 8:30am
• 14:00, 2pm
• 7:45 am`
                };
            }
            state.data.time = parsedTime.formatted;
            state.data.timeDisplay = formatTime12(parsedTime.formatted);
            state.currentStep++;
            break;
            
        case 'seats':
            const seats = parseInt(input);
            if (isNaN(seats) || seats < 1 || seats > 6) {
                return {
                    inFlow: true,
                    message: `💺 Please enter seats between 1-6.

How many seats are you offering?`
                };
            }
            state.data.seats = seats;
            state.currentStep++;
            break;
            
        case 'price':
            const price = parseInt(input.replace(/[^\d]/g, ''));
            if (isNaN(price) || price < 0) {
                return {
                    inFlow: true,
                    message: `💰 Please enter a valid price in PKR.

Examples: 100, 200, 0 (free ride)`
                };
            }
            state.data.price = price;
            state.currentStep++;
            break;
            
        case 'confirm':
            if (text === 'yes' || text === 'y' || text === 'confirm' || text === 'haan') {
                // Move to completion
                conversationState.delete(phoneNumber);
                return {
                    inFlow: false,
                    complete: true,
                    flowType: 'POST_RIDE',
                    data: state.data
                };
            } else if (text === 'no' || text === 'n' || text === 'edit' || text === 'nahi') {
                // Start over
                conversationState.delete(phoneNumber);
                return {
                    inFlow: false,
                    message: '❌ Cancelled. Type *post ride* to start again.'
                };
            } else {
                return {
                    inFlow: true,
                    message: `Please confirm your ride.

Reply *yes* to post or *no* to cancel.`
                };
            }
    }
    
    // Update state and get next prompt
    conversationState.set(phoneNumber, state);
    return getNextPrompt(phoneNumber);
}

/**
 * Process step input for CANCEL_RIDE flow
 */
function processCancelRideStep(phoneNumber, state, step, input) {
    const text = input.trim().toLowerCase();
    
    switch (step) {
        case 'select':
            const rideNum = parseInt(input);
            if (isNaN(rideNum) || rideNum < 1) {
                return {
                    inFlow: true,
                    message: 'Please enter a valid ride number.'
                };
            }
            state.data.rideNumber = rideNum;
            state.currentStep++;
            conversationState.set(phoneNumber, state);
            return {
                inFlow: true,
                message: `Are you sure you want to cancel ride #${rideNum}?

⚠️ This action cannot be undone.

Reply *yes* to confirm or *no* to keep the ride.`
            };
            
        case 'confirm':
            if (text === 'yes' || text === 'y' || text === 'confirm') {
                conversationState.delete(phoneNumber);
                return {
                    inFlow: false,
                    complete: true,
                    flowType: 'CANCEL_RIDE',
                    data: state.data
                };
            } else {
                conversationState.delete(phoneNumber);
                return {
                    inFlow: false,
                    message: '✅ Ride cancellation aborted. Your ride is still active.'
                };
            }
    }
}

/**
 * Get the prompt for current step
 */
function getNextPrompt(phoneNumber) {
    const state = conversationState.get(phoneNumber);
    if (!state) {
        return { inFlow: false, message: null };
    }
    
    const flow = FLOWS[state.flowType];
    const currentStep = flow.steps[state.currentStep];
    
    switch (state.flowType) {
        case 'POST_RIDE':
            return getPostRidePrompt(state, currentStep);
        case 'CANCEL_RIDE':
            return getCancelRidePrompt(state, currentStep);
        default:
            return { inFlow: true, message: 'Continue...' };
    }
}

/**
 * Get prompt for POST_RIDE flow step
 */
function getPostRidePrompt(state, step) {
    const progressBar = getProgressBar(state.currentStep, FLOWS.POST_RIDE.steps.length - 1);
    
    switch (step) {
        case 'source':
            return {
                inFlow: true,
                message: `🚗 *Post a New Ride*

${progressBar}

📍 *Step 1: Starting Point*

Where will you start from?

_Type an area like: gulshan, clifton, fast, iba_`
            };
            
        case 'destination':
            return {
                inFlow: true,
                message: `${progressBar}

📍 *Step 2: Destination*

Starting from: *${state.data.source.name}*

Where are you going?

_Type your destination_`
            };
            
        case 'date':
            return {
                inFlow: true,
                message: `${progressBar}

📅 *Step 3: Date*

Route: ${state.data.source.name} → ${state.data.destination.name}

When is this ride?

Reply:
• *today* or *1*
• *tomorrow* or *2*
• Or enter date (15/01)`
            };
            
        case 'time':
            return {
                inFlow: true,
                message: `${progressBar}

🕐 *Step 4: Departure Time*

Date: *${state.data.dateDisplay}*

What time will you leave?

_Examples: 8am, 8:30am, 14:00_`
            };
            
        case 'seats':
            return {
                inFlow: true,
                message: `${progressBar}

💺 *Step 5: Available Seats*

How many seats are you offering? (1-6)`
            };
            
        case 'price':
            return {
                inFlow: true,
                message: `${progressBar}

💰 *Step 6: Price per Seat*

How much per seat? (in PKR)

_Enter 0 for free ride_`
            };
            
        case 'confirm':
            const distance = maps.calculateDistance(
                state.data.source.lat, state.data.source.lng,
                state.data.destination.lat, state.data.destination.lng
            );
            const eta = maps.estimateETA(distance, state.data.time);
            const mapLink = maps.generateDirectionsLink(
                state.data.source,
                state.data.destination
            );
            
            return {
                inFlow: true,
                message: `✅ *Confirm Your Ride*

*Route:*
📍 From: ${state.data.source.name}
📍 To: ${state.data.destination.name}
📏 Distance: ${distance.toFixed(1)} km
⏱️ Est. Time: ${eta.formatted}

*Schedule:*
📅 Date: ${state.data.dateDisplay}
🕐 Time: ${state.data.timeDisplay}

*Details:*
💺 Seats: ${state.data.seats}
💰 Price: Rs. ${state.data.price}/seat

🗺️ *Route Preview:*
${mapLink}

Reply *yes* to post or *no* to cancel.`
            };
    }
}

/**
 * Get prompt for CANCEL_RIDE flow step
 */
function getCancelRidePrompt(state, step) {
    switch (step) {
        case 'select':
            return {
                inFlow: true,
                message: `Which ride would you like to cancel?

Enter the ride number:`
            };
    }
}

/**
 * Generate progress bar
 */
function getProgressBar(current, total) {
    const filled = '▓';
    const empty = '░';
    const progress = Math.round((current / total) * 10);
    return `[${filled.repeat(progress)}${empty.repeat(10 - progress)}] ${current}/${total}`;
}

/**
 * Format time to 12-hour format
 */
function formatTime12(time24) {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Check if user is in a conversation flow
 */
function isInFlow(phoneNumber) {
    const state = conversationState.get(phoneNumber);
    if (!state) return false;
    if (Date.now() > state.expiresAt) {
        conversationState.delete(phoneNumber);
        return false;
    }
    return true;
}

/**
 * Get current flow state
 */
function getFlowState(phoneNumber) {
    return conversationState.get(phoneNumber) || null;
}

/**
 * Cancel current flow
 */
function cancelFlow(phoneNumber) {
    conversationState.delete(phoneNumber);
}

module.exports = {
    startFlow,
    processFlowInput,
    isInFlow,
    getFlowState,
    cancelFlow,
    FLOWS
};
