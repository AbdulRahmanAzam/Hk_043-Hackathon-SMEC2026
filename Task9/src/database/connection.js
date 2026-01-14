/**
 * MongoDB Database Connection
 * 
 * Implements connection management with:
 * - Automatic reconnection
 * - Connection pooling
 * - Session support for transactions
 */

const mongoose = require('mongoose');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';

// MongoDB connection options
const connectionOptions = {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    family: 4
};

// Build connection URI
const getConnectionURI = () => {
    const host = process.env.MONGO_HOST || 'localhost';
    const port = process.env.MONGO_PORT || '27017';
    const database = process.env.MONGO_DB || 'campus_resource_db';
    const user = process.env.MONGO_USER;
    const password = process.env.MONGO_PASSWORD;
    
    if (user && password) {
        return `mongodb://${user}:${password}@${host}:${port}/${database}?authSource=admin`;
    }
    
    return `mongodb://${host}:${port}/${database}`;
};

// Connection state
let isConnected = false;

/**
 * Connect to MongoDB
 */
async function connectDB() {
    if (isConnected) {
        console.log('Using existing MongoDB connection');
        return;
    }
    
    try {
        const uri = process.env.MONGO_URI || getConnectionURI();
        
        await mongoose.connect(uri, connectionOptions);
        
        isConnected = true;
        console.log('✅ MongoDB connected successfully');
        
        // Event handlers
        mongoose.connection.on('error', (err) => {
            console.error('MongoDB connection error:', err);
        });
        
        mongoose.connection.on('disconnected', () => {
            console.log('MongoDB disconnected');
            isConnected = false;
        });
        
        mongoose.connection.on('reconnected', () => {
            console.log('MongoDB reconnected');
            isConnected = true;
        });
        
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        throw error;
    }
}

/**
 * Execute a function within a transaction
 * MongoDB transactions require replica set or sharded cluster
 * Falls back gracefully for standalone MongoDB
 * 
 * @param {Function} fn - Async function to execute
 * @returns {Promise<any>} Result of the function
 */
async function withTransaction(fn) {
    // For standalone MongoDB (development), skip transactions
    if (process.env.MONGO_STANDALONE === 'true') {
        return await fn(null);
    }
    
    const session = await mongoose.startSession();
    
    try {
        session.startTransaction();
        const result = await fn(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
}

/**
 * Execute function with retry logic for conflict handling
 * @param {Function} fn - Async function to execute
 * @param {number} maxRetries - Maximum retry attempts
 */
async function withRetry(fn, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            // Retry on write conflicts (MongoDB error code 112)
            if (error.code === 112 && attempt < maxRetries) {
                const delay = Math.pow(2, attempt) * 100; // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            
            throw error;
        }
    }
    
    throw lastError;
}

/**
 * Check database connectivity
 * @returns {Promise<Object>} Health check result
 */
async function healthCheck() {
    try {
        if (!mongoose.connection || mongoose.connection.readyState !== 1) {
            return {
                connected: false,
                error: 'Not connected to database'
            };
        }
        
        const adminDb = mongoose.connection.db.admin();
        await adminDb.ping();
        
        return {
            connected: true,
            timestamp: new Date().toISOString(),
            database: mongoose.connection.name,
            host: mongoose.connection.host,
            readyState: mongoose.connection.readyState
        };
    } catch (error) {
        return {
            connected: false,
            error: error.message
        };
    }
}

/**
 * Close database connection
 */
async function closeConnection() {
    await mongoose.connection.close();
    isConnected = false;
    console.log('MongoDB connection closed');
}

/**
 * Get native MongoDB client for advanced operations
 */
function getNativeClient() {
    return mongoose.connection.getClient();
}

module.exports = {
    connectDB,
    withTransaction,
    withRetry,
    healthCheck,
    closeConnection,
    getNativeClient,
    mongoose
};
