const db = require('../config/database');

function initializeDatabase() {
    console.log('Initializing database...');

    // Users table with enhanced fields for behavior scoring and gamification
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            university TEXT NOT NULL,
            department TEXT,
            semester INTEGER,
            gender TEXT CHECK(gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
            show_gender INTEGER DEFAULT 0,
            role TEXT CHECK(role IN ('driver', 'rider', 'both')) DEFAULT 'rider',
            phone TEXT,
            profile_picture TEXT,
            average_rating REAL DEFAULT 0,
            total_ratings INTEGER DEFAULT 0,
            rides_completed INTEGER DEFAULT 0,
            rides_cancelled INTEGER DEFAULT 0,
            no_shows INTEGER DEFAULT 0,
            late_arrivals INTEGER DEFAULT 0,
            behavior_score REAL DEFAULT 100,
            current_streak INTEGER DEFAULT 0,
            longest_streak INTEGER DEFAULT 0,
            total_distance_km REAL DEFAULT 0,
            total_co2_saved REAL DEFAULT 0,
            is_verified INTEGER DEFAULT 0,
            is_restricted INTEGER DEFAULT 0,
            restriction_reason TEXT,
            emergency_contact TEXT,
            vehicle_make TEXT,
            vehicle_model TEXT,
            vehicle_color TEXT,
            vehicle_plate TEXT,
            profile_verified INTEGER DEFAULT 0,
            whatsapp_number TEXT UNIQUE,
            whatsapp_linked_at TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Migration: Add WhatsApp columns if they don't exist
    try {
        db.exec(`ALTER TABLE users ADD COLUMN whatsapp_number TEXT`);
    } catch (e) {
        // Column already exists, ignore
    }
    try {
        db.exec(`ALTER TABLE users ADD COLUMN whatsapp_linked_at TEXT`);
    } catch (e) {
        // Column already exists, ignore
    }

    // Create index for WhatsApp number lookup (will enforce uniqueness for lookups)
    try {
        db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_whatsapp ON users(whatsapp_number)`);
    } catch (e) {
        // Index may already exist
    }

    // User badges table
    db.exec(`
        CREATE TABLE IF NOT EXISTS user_badges (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            badge_type TEXT NOT NULL,
            badge_name TEXT NOT NULL,
            earned_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, badge_type)
        )
    `);

    // Pickup suggestions cache
    db.exec(`
        CREATE TABLE IF NOT EXISTS popular_pickups (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            usage_count INTEGER DEFAULT 0,
            category TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Active rides for live tracking
    db.exec(`
        CREATE TABLE IF NOT EXISTS active_rides (
            id TEXT PRIMARY KEY,
            ride_id TEXT NOT NULL,
            share_token TEXT UNIQUE NOT NULL,
            driver_lat REAL,
            driver_lng REAL,
            status TEXT DEFAULT 'waiting',
            started_at TEXT,
            sos_triggered INTEGER DEFAULT 0,
            sos_triggered_at TEXT,
            last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE
        )
    `);

    // Carbon impact tracking
    db.exec(`
        CREATE TABLE IF NOT EXISTS carbon_impact (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            ride_id TEXT,
            distance_km REAL NOT NULL,
            passengers INTEGER DEFAULT 1,
            fuel_saved_liters REAL,
            co2_saved_kg REAL,
            trees_equivalent REAL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE SET NULL
        )
    `);

    // Emergency contacts table
    db.exec(`
        CREATE TABLE IF NOT EXISTS emergency_contacts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            relationship TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // SOS alerts table
    db.exec(`
        CREATE TABLE IF NOT EXISTS sos_alerts (
            id TEXT PRIMARY KEY,
            ride_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            latitude REAL,
            longitude REAL,
            message TEXT,
            status TEXT CHECK(status IN ('active', 'responded', 'resolved', 'false_alarm')) DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            resolved_at TEXT,
            FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Ride share tokens for live tracking
    db.exec(`
        CREATE TABLE IF NOT EXISTS ride_share_tokens (
            id TEXT PRIMARY KEY,
            ride_id TEXT NOT NULL,
            rider_id TEXT NOT NULL,
            token TEXT UNIQUE NOT NULL,
            expires_at TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
            FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Rides table
    db.exec(`
        CREATE TABLE IF NOT EXISTS rides (
            id TEXT PRIMARY KEY,
            driver_id TEXT NOT NULL,
            source_address TEXT NOT NULL,
            source_lat REAL NOT NULL,
            source_lng REAL NOT NULL,
            destination_address TEXT NOT NULL,
            destination_lat REAL NOT NULL,
            destination_lng REAL NOT NULL,
            departure_date TEXT NOT NULL,
            departure_time TEXT NOT NULL,
            total_seats INTEGER NOT NULL CHECK(total_seats >= 1),
            available_seats INTEGER NOT NULL CHECK(available_seats >= 0),
            fuel_split_price REAL,
            ride_rules TEXT,
            distance_km REAL,
            estimated_duration_minutes INTEGER,
            route_polyline TEXT,
            status TEXT CHECK(status IN ('active', 'in_progress', 'completed', 'cancelled')) DEFAULT 'active',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Bookings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS bookings (
            id TEXT PRIMARY KEY,
            ride_id TEXT NOT NULL,
            rider_id TEXT NOT NULL,
            seats_booked INTEGER DEFAULT 1,
            status TEXT CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')) DEFAULT 'pending',
            booking_time TEXT DEFAULT CURRENT_TIMESTAMP,
            confirmation_time TEXT,
            cancellation_time TEXT,
            cancellation_reason TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
            FOREIGN KEY (rider_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(ride_id, rider_id)
        )
    `);

    // Seat locks table (for 90-second reservation)
    db.exec(`
        CREATE TABLE IF NOT EXISTS seat_locks (
            id TEXT PRIMARY KEY,
            ride_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            seats_locked INTEGER DEFAULT 1,
            locked_at TEXT DEFAULT CURRENT_TIMESTAMP,
            expires_at TEXT NOT NULL,
            status TEXT CHECK(status IN ('active', 'confirmed', 'expired')) DEFAULT 'active',
            FOREIGN KEY (ride_id) REFERENCES rides(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Ratings table
    db.exec(`
        CREATE TABLE IF NOT EXISTS ratings (
            id TEXT PRIMARY KEY,
            booking_id TEXT NOT NULL,
            rater_id TEXT NOT NULL,
            rated_id TEXT NOT NULL,
            rating INTEGER CHECK(rating >= 1 AND rating <= 5) NOT NULL,
            comment TEXT,
            rating_type TEXT CHECK(rating_type IN ('driver_to_rider', 'rider_to_driver')) NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
            FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (rated_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(booking_id, rater_id, rated_id)
        )
    `);

    // Create indexes for better performance
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id);
        CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
        CREATE INDEX IF NOT EXISTS idx_rides_departure ON rides(departure_date, departure_time);
        CREATE INDEX IF NOT EXISTS idx_bookings_ride ON bookings(ride_id);
        CREATE INDEX IF NOT EXISTS idx_bookings_rider ON bookings(rider_id);
        CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
        CREATE INDEX IF NOT EXISTS idx_seat_locks_ride ON seat_locks(ride_id);
        CREATE INDEX IF NOT EXISTS idx_seat_locks_expires ON seat_locks(expires_at);
        CREATE INDEX IF NOT EXISTS idx_ratings_rated ON ratings(rated_id);
        CREATE INDEX IF NOT EXISTS idx_user_badges ON user_badges(user_id);
        CREATE INDEX IF NOT EXISTS idx_carbon_impact_user ON carbon_impact(user_id);
        CREATE INDEX IF NOT EXISTS idx_active_rides ON active_rides(ride_id);
        CREATE INDEX IF NOT EXISTS idx_sos_alerts ON sos_alerts(ride_id, status);
        CREATE INDEX IF NOT EXISTS idx_emergency_contacts ON emergency_contacts(user_id);
        CREATE INDEX IF NOT EXISTS idx_ride_share_tokens ON ride_share_tokens(ride_id, token);
    `);

    // Insert popular pickup points in Karachi
    const popularPickups = [
        { name: 'FAST-NUCES Main Gate', address: 'National Stadium Rd, Karachi', lat: 24.8534, lng: 67.0623, category: 'university' },
        { name: 'IBA Main Campus', address: 'University Road, Karachi', lat: 24.8256, lng: 67.0012, category: 'university' },
        { name: 'NED University Gate', address: 'University Road, Karachi', lat: 24.9338, lng: 67.1106, category: 'university' },
        { name: 'Karachi University Point', address: 'Main University Road', lat: 24.9422, lng: 67.1208, category: 'university' },
        { name: 'Dolmen Mall Clifton', address: 'Block 4, Clifton', lat: 24.8093, lng: 67.0311, category: 'mall' },
        { name: 'Forum Mall', address: 'Clifton Block 9', lat: 24.8138, lng: 67.0284, category: 'mall' },
        { name: 'Saddar Metro Station', address: 'Saddar, Karachi', lat: 24.8608, lng: 67.0104, category: 'transit' },
        { name: 'Numaish Chowrangi', address: 'MA Jinnah Road', lat: 24.8754, lng: 67.0453, category: 'transit' },
        { name: 'Clifton Beach Parking', address: 'Seaview, Clifton', lat: 24.7937, lng: 67.0326, category: 'landmark' },
        { name: 'Tariq Road Signal', address: 'PECHS', lat: 24.8710, lng: 67.0672, category: 'transit' },
        { name: 'Gulshan Chowrangi', address: 'Gulshan-e-Iqbal', lat: 24.9234, lng: 67.0923, category: 'transit' },
        { name: 'Johar Chowrangi', address: 'Gulistan-e-Johar', lat: 24.9156, lng: 67.1312, category: 'transit' }
    ];

    const insertPickup = db.prepare(`
        INSERT OR IGNORE INTO popular_pickups (id, name, address, lat, lng, category)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    popularPickups.forEach((p, i) => {
        insertPickup.run(`pickup-${i}`, p.name, p.address, p.lat, p.lng, p.category);
    });

    console.log('Database initialized successfully!');
}

// Run if called directly
if (require.main === module) {
    initializeDatabase();
    process.exit(0);
}

module.exports = initializeDatabase;
