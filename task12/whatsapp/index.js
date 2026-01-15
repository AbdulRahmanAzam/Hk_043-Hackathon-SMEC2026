/**
 * WhatsApp Bot Module Index
 * UniRide Karachi
 */

const { startBot } = require('./bot');
const config = require('./config');
const auth = require('./auth');
const commands = require('./commands');
const conversations = require('./conversations');
const maps = require('./maps');
const notifications = require('./notifications');
const rides = require('./rides');

module.exports = {
    // Main bot starter
    startBot,
    
    // Configuration
    config,
    
    // Authentication & Linking
    auth,
    getUserByWhatsApp: auth.getUserByWhatsApp,
    isNumberLinked: auth.isNumberLinked,
    
    // Command parsing
    parseCommand: commands.parseCommand,
    
    // Conversation flows
    isInFlow: conversations.isInFlow,
    startFlow: conversations.startFlow,
    
    // Maps & Location
    maps,
    parseLocation: maps.parseLocation,
    generateDirectionsLink: maps.generateDirectionsLink,
    
    // Notifications
    notifications,
    notifyBookingConfirmed: notifications.notifyBookingConfirmed,
    notifyRideCancelled: notifications.notifyRideCancelled,
    sendRideReminder: notifications.sendRideReminder,
    
    // Ride operations
    rides,
    searchRides: rides.searchRides,
    bookRide: rides.bookRide,
    postRide: rides.postRide
};
