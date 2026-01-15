# 🚗 UniRide Karachi - Smart University Carpooling Platform

**Pakistan's First AI-Powered University Carpooling Platform with WhatsApp Integration**

A comprehensive carpooling solution designed specifically for university students in Karachi, Pakistan, featuring smart ride matching, carbon impact tracking, gamification, safety features, and seamless WhatsApp bot integration.

---

## 🌟 Key Features

### 🎯 Core Platform Features
- **Smart Ride Matching Algorithm** - AI-powered matching with 0-100 score based on:
  - Route similarity (35 points)
  - Time overlap (25 points)
  - Department matching (15 points)
  - Driver rating (15 points)
  - Behavior score (10 points)

- **Real-time Seat Locking** - 90-second reservation system prevents double booking
- **Karachi-Specific Maps** - Mapbox integration with local landmarks and bounds validation
- **University Email Verification** - Secure registration with .edu.pk domains
- **Live Ride Tracking** - Real-time location sharing with emergency contacts

### 🌱 Environmental Impact
- **Carbon Dashboard** - Track CO₂ savings, trees equivalent, money saved
- **Platform-wide Impact** - See collective environmental contribution
- **Pakistani Fuel Calculations** - Based on 12 km/L, 280 PKR/L, 2.31 kg CO₂/L

### 🏆 Gamification System
- **15+ Achievement Badges**: Eco Starter, Carbon Champion, Trusted Driver, Perfect Navigator, etc.
- **Streak Tracking**: Daily ride streaks with current and longest records
- **3 Leaderboard Types**: Weekly, Monthly, All-time
- **Badge Categories**: Environmental, Trust, Reliability, Social

### 🛡️ Safety Layer
- **SOS Emergency Button** - Instant alerts to emergency contacts
- **Live Ride Sharing** - Generate 24-hour tracking links
- **Driver Verification** - Trust score (0-100) based on:
  - Average rating (25 points)
  - Behavior score (15 points)
  - Experience level (10 points)
  - Verified profile (5 points)
  - Vehicle information (5 points)

### 📱 WhatsApp Bot Integration
Full carpooling functionality via WhatsApp using Baileys API:

**Natural Language Commands:**
```
find ride from gulshan to fast at 8am
book ride 1
post ride
my rides
today rides
cancel ride 2
help
sos
```

**Features:**
- Account linking with OTP verification
- Conversational ride posting flow
- Smart location parsing for Karachi areas
- Google Maps route links
- Real-time notifications
- Emergency SOS via WhatsApp

---

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- SQLite3
- Mapbox API key (free tier available)

### Installation

1. **Clone and Install**
```bash
cd task12
npm install
```

2. **Configure Environment**
Create `.env` file:
```env
PORT=3000
JWT_SECRET=your_jwt_secret_key_change_in_production
SESSION_SECRET=your_session_secret_key_change_in_production
MAPBOX_ACCESS_TOKEN=your_mapbox_token
API_BASE_URL=http://localhost:3000/api
```

3. **Initialize Database**
```bash
npm run init-db
```

### Running the Platform

**Option 1: Run Web Server Only**
```bash
npm start
```
Access at: http://localhost:3000

**Option 2: Run Web Server + WhatsApp Bot**
```bash
# Terminal 1 - Web Server
npm start

# Terminal 2 - WhatsApp Bot
npm run whatsapp
```

**Option 3: Auto-start Both (Optional)**
```bash
ENABLE_WHATSAPP_BOT=true npm start
```

---

## 📱 WhatsApp Bot Setup

### Quick Start

1. **Start the bot:**
```bash
npm run whatsapp
```

2. **Scan QR Code:**
   - A QR code will appear in your terminal
   - Open WhatsApp on your phone
   - Go to Settings > Linked Devices > Link a Device
   - Scan the QR code

3. **Link Your Account:**
```
User: link account
Bot: Please enter your email...
User: student@fast.edu.pk
Bot: OTP sent! Enter the code...
User: 123456
Bot: ✅ Account linked successfully!
```

4. **Start Using:**
```
find ride from gulshan to fast
book ride 1
my rides
```

### WhatsApp Commands Reference

| Command | Example | Description |
|---------|---------|-------------|
| `help` | `help` | Show all commands |
| `find ride` | `find ride from gulshan to fast at 8am` | Search for rides |
| `book ride` | `book ride 1` | Book a ride |
| `post ride` | `post ride` | Start ride posting flow |
| `my rides` | `my rides` | View your rides |
| `today rides` | `today rides` | Today's schedule |
| `cancel ride` | `cancel ride 2` | Cancel a ride |
| `my profile` | `my profile` | View profile stats |
| `my stats` | `my stats` | Environmental impact |
| `sos` | `sos` | Emergency alert |
| `share ride` | `share ride` | Get tracking link |

### Supported Karachi Locations

**Universities:**
- FAST-NUCES, IBA, NED, KU, DOW, NUST, SZABIST, AKU, LUMS, Habib

**Popular Areas:**
- Gulshan, Johar, Clifton, DHA, Saddar, PECHS, Nazimabad, FB Area, Korangi

**Landmarks:**
- Dolmen Mall, Forum Mall, Ocean Mall, Lucky One, Numaish, Airport

---

## 🏗️ Project Structure

```
task12/
├── server.js                 # Express server entry point
├── package.json              # Dependencies and scripts
├── database.sqlite           # SQLite database (auto-created)
│
├── config/
│   └── database.js           # Database connection
│
├── scripts/
│   └── init-db.js           # Database initialization
│
├── controllers/              # API request handlers
│   ├── authController.js    # Authentication
│   ├── rideController.js    # Ride operations
│   ├── bookingController.js # Booking management
│   └── safetyController.js  # Safety features
│
├── routes/                   # API route definitions
│   ├── auth.js
│   ├── rides.js
│   ├── bookings.js
│   └── safety.js
│
├── utils/                    # Utility modules
│   ├── smartMatch.js        # Matching algorithm
│   ├── carbonImpact.js      # Environmental calculations
│   ├── gamification.js      # Badges & achievements
│   └── safety.js            # Safety utilities
│
├── whatsapp/                 # WhatsApp bot module
│   ├── bot.js               # Main bot entry
│   ├── auth.js              # Account linking
│   ├── commands.js          # Command parser
│   ├── conversations.js     # Multi-step flows
│   ├── maps.js              # Location intelligence
│   ├── rides.js             # Ride operations
│   ├── notifications.js     # Push notifications
│   ├── config.js            # Bot configuration
│   └── sessions/            # WhatsApp sessions
│
└── public/                   # Frontend files
    ├── premium.html         # Main SPA
    ├── css/
    │   └── premium.css      # Premium UI styles
    └── js/
        ├── premium-app.js   # Main app logic
        └── api.js           # API wrapper
```

---

## 🗄️ Database Schema

### Core Tables
- **users** - User accounts with gamification fields
- **rides** - Posted rides with route info
- **bookings** - Ride bookings with status tracking
- **seat_locks** - 90-second seat reservations
- **ratings** - Peer-to-peer ratings

### Smart Features Tables
- **user_badges** - Achievement badges
- **popular_pickups** - Common pickup points
- **active_rides** - Live tracking data
- **carbon_impact** - Environmental impact records
- **emergency_contacts** - Safety contacts
- **sos_alerts** - Emergency alerts
- **ride_share_tokens** - Tracking links

---

## 🎨 UI/UX Features

### Premium Design System
- **Glass Morphism Effects** - Modern frosted glass aesthetics
- **Dark Mode Support** - Theme toggle with system preference
- **Responsive Mobile-First** - Optimized for all devices
- **Map-First Interface** - Mapbox GL JS integration
- **Bottom Sheet Modals** - Native app-like interactions
- **Toast Notifications** - Elegant feedback system
- **Loading States** - Skeleton screens and shimmer effects
- **Custom Animations** - Smooth transitions and micro-interactions

### Color Palette
- Primary: `#6366f1` (Indigo)
- Success: `#10b981` (Green)
- Warning: `#f59e0b` (Amber)
- Danger: `#ef4444` (Red)
- Eco: `#059669` (Emerald)

---

## 🔐 Security Features

- **JWT Authentication** - 7-day token expiry
- **bcrypt Password Hashing** - Secure credential storage
- **Helmet.js** - Security headers
- **Input Validation** - express-validator on all endpoints
- **Rate Limiting** - WhatsApp bot rate limits (10 msg/min)
- **OTP Verification** - 6-digit codes with 5-min expiry
- **Unique Constraints** - Prevent duplicate accounts
- **SQL Injection Protection** - Parameterized queries

---

## 🧪 Testing

### Manual Testing

**1. Web Platform:**
```bash
npm start
# Open http://localhost:3000
# Register with university email
# Post and search for rides
# Test booking flow
```

**2. WhatsApp Bot:**
```bash
npm run whatsapp
# Scan QR code
# Send: link account
# Send: find ride from gulshan to fast
# Send: book ride 1
```

### API Health Check
```bash
curl http://localhost:3000/api/health
```

---

## 📊 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Rides
- `GET /api/rides` - Search rides
- `POST /api/rides` - Post new ride
- `GET /api/rides/:id` - Get ride details
- `PUT /api/rides/:id` - Update ride
- `DELETE /api/rides/:id` - Cancel ride
- `GET /api/rides/pickup-points` - Get popular pickups
- `GET /api/rides/carbon-dashboard` - Carbon stats
- `GET /api/rides/gamification` - Badges & leaderboard

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings/my-bookings` - User's bookings
- `PUT /api/bookings/:id` - Update booking status
- `POST /api/bookings/lock-seat` - Lock seats

### Safety
- `GET /api/safety/emergency-contacts` - Get contacts
- `POST /api/safety/emergency-contacts` - Add contact
- `POST /api/safety/rides/:id/sos` - Trigger SOS
- `POST /api/safety/rides/:id/share` - Generate share link

---

## 🌍 Karachi-Specific Features

### Known Locations Database
- 12+ universities
- 15+ popular areas
- 10+ major landmarks and malls
- Transit points and metro stations

### Karachi Bounds Validation
```javascript
{
  minLat: 24.7,
  maxLat: 25.6,
  minLng: 66.7,
  maxLng: 67.6
}
```

### Traffic-Aware ETA
- Morning rush: 7-10 AM (15 km/h)
- Evening rush: 5-8 PM (12 km/h)
- Night time: 11 PM-5 AM (35 km/h)
- Normal: 25 km/h average

---

## 🏆 Gamification Details

### Badge Categories

**Environmental:**
- 🌱 Eco Starter (5 rides)
- 🌿 Eco Warrior (25 rides)
- 🌳 Carbon Champion (50 CO₂ saved)
- 🌎 Planet Saver (100 CO₂ saved)

**Trust & Reliability:**
- ⭐ Trusted Driver (4.5+ rating, 10 rides)
- 💎 VIP Driver (4.8+ rating, 25 rides)
- 🎯 Reliable Rider (No no-shows, 20 rides)

**Social:**
- 🤝 Team Player (10 different passengers)
- 👥 Community Builder (25 different riders)

**Achievement:**
- 🔥 Week Streak (7-day streak)
- ⚡ Month Streak (30-day streak)
- 🏅 Century Club (100 rides)

### Leaderboard Types
1. **Weekly** - Reset every Monday
2. **Monthly** - Reset 1st of month
3. **All-Time** - Lifetime stats

---

## 📈 Environmental Impact Calculations

### Formulas
```javascript
// Fuel saved (liters)
fuelSaved = distance / 12 * (passengers / (passengers + 1))

// CO₂ saved (kg)
co2Saved = fuelSaved * 2.31

// Trees equivalent (per year)
treesEquivalent = co2Saved / 21

// Money saved (PKR)
moneySaved = fuelSaved * 280
```

### Constants
- Average fuel consumption: **12 km/L**
- CO₂ per liter of fuel: **2.31 kg**
- CO₂ absorbed per tree/year: **21 kg**
- Fuel price in Pakistan: **280 PKR/L** (as of Jan 2026)

---

## 🔧 Configuration

### Mapbox Setup
1. Sign up at https://mapbox.com
2. Get free access token
3. Add to `.env`:
```env
MAPBOX_ACCESS_TOKEN=pk.eyJ1...
```

### WhatsApp Bot Configuration
Edit `whatsapp/config.js`:
```javascript
RATE_LIMIT: {
  MAX_MESSAGES_PER_MINUTE: 10,
  COOLDOWN_SECONDS: 60,
  BAN_THRESHOLD: 50
},

OTP_LENGTH: 6,
OTP_EXPIRY_MINUTES: 5,
OTP_MAX_ATTEMPTS: 3
```

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill existing Node processes
Get-Process -Name node | Stop-Process -Force

# Or use different port
PORT=3001 npm start
```

### WhatsApp QR Code Not Showing
```bash
# Delete sessions and retry
rm -rf whatsapp/sessions
npm run whatsapp
```

### Database Errors
```bash
# Reinitialize database
rm database.sqlite
npm run init-db
```

### Mapbox Not Loading
- Check API token in `.env`
- Verify Helmet.js CSP allows Mapbox domains
- Check browser console for errors

---

## 📦 Dependencies

### Backend
- **express** ^4.18.2 - Web framework
- **better-sqlite3** ^9.4.3 - Database
- **bcryptjs** ^2.4.3 - Password hashing
- **jsonwebtoken** ^9.0.2 - JWT auth
- **express-validator** ^7.0.1 - Input validation
- **helmet** ^7.1.0 - Security headers
- **cors** ^2.8.5 - CORS support
- **uuid** ^9.0.1 - Unique IDs
- **dotenv** ^16.4.1 - Environment config

### WhatsApp Bot
- **@whiskeysockets/baileys** ^6.7.16 - WhatsApp API
- **qrcode-terminal** ^0.12.0 - QR code display
- **pino** ^9.6.0 - Logging
- **pino-pretty** (dev) - Pretty logs

---

## 🎯 Future Enhancements

### Planned Features
- [ ] Admin analytics dashboard
- [ ] Push notifications (FCM)
- [ ] SMS fallback for OTP
- [ ] Payment integration (EasyPaisa/JazzCash)
- [ ] Route optimization algorithm
- [ ] Chat between driver and riders
- [ ] Ride scheduling (recurring rides)
- [ ] Female-only rides option
- [ ] Corporate partnerships
- [ ] Mobile apps (React Native)

### WhatsApp Bot Enhancements
- [ ] Voice message support
- [ ] Image location sharing
- [ ] Group ride coordination
- [ ] Automated reminders
- [ ] Live location tracking
- [ ] Payment via WhatsApp

---

## 🤝 Contributing

This is a hackathon project for **SMEC 2026**. For issues or suggestions:
1. Document the bug/feature
2. Create detailed reproduction steps
3. Include environment details
4. Submit via GitHub Issues

---

## 📄 License

MIT License - Created for SMEC 2026 Hackathon

---

## 👥 Team

**UniRide Karachi Development Team**
- Smart carpooling for Pakistani students
- Built with ❤️ in Karachi

---

## 📞 Support

For technical support or questions:
- Platform issues: Check logs in console
- WhatsApp bot: Check terminal output
- Database: Run `npm run init-db`

---

## 🏁 Quick Start Checklist

- [ ] Install Node.js 16+
- [ ] Clone repository
- [ ] Run `npm install`
- [ ] Create `.env` file with Mapbox token
- [ ] Run `npm run init-db`
- [ ] Start server: `npm start`
- [ ] Optional: Start WhatsApp bot: `npm run whatsapp`
- [ ] Open http://localhost:3000
- [ ] Register with university email
- [ ] Start carpooling!

---

**Made for SMEC 2026 Hackathon | UniRide Karachi 🚗🇵🇰**

*Let's make Karachi traffic better, together!*
