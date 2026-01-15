# 🚀 UniRide Karachi - Complete Startup Guide

## ✅ System Status Overview

### Currently Running Services:

1. **✅ Web Server** - Running on http://localhost:3000
2. **✅ WhatsApp Bot** - Connected and ready to receive messages
3. **✅ Database** - Initialized with all tables and sample data

---

## 🎯 Quick Start (Already Running!)

Your system is **LIVE** and ready! Here's what you can do now:

### 1️⃣ Access the Website
- **URL**: http://localhost:3000
- **Status**: ✅ Running
- **Features Available**:
  - User registration with university email
  - Post rides as a driver
  - Search and book rides
  - View carbon dashboard
  - Check gamification stats
  - Access safety features

### 2️⃣ Use WhatsApp Bot
- **Status**: ✅ Connected
- **Session**: Active (already authenticated)
- **How to Test**:
  1. Open WhatsApp on your phone
  2. Send message to the linked number
  3. Try: `help` to see all commands

### 3️⃣ Test the Platform

**Via Website:**
```
1. Go to http://localhost:3000
2. Click "Sign Up"
3. Use any @xyz.edu.pk email
4. Create password
5. Start posting/searching rides!
```

**Via WhatsApp:**
```
1. Send: link account
2. Enter your registered email
3. Enter OTP shown in terminal
4. Send: find ride from gulshan to fast
5. Send: book ride 1
```

---

## 📁 Project Structure Quick Reference

```
task12/
├── ✅ server.js              Running on port 3000
├── ✅ database.sqlite        Initialized with data
│
├── whatsapp/
│   ├── ✅ bot.js             Connected to WhatsApp
│   └── sessions/            WhatsApp session active
│
├── public/
│   ├── premium.html         Main website
│   ├── css/premium.css      Styles
│   └── js/premium-app.js    Frontend logic
│
└── routes/
    ├── auth.js              /api/auth/*
    ├── rides.js             /api/rides/*
    ├── bookings.js          /api/bookings/*
    └── safety.js            /api/safety/*
```

---

## 🔄 Restart Commands (If Needed)

### Stop All Services
```powershell
Get-Process -Name node | Stop-Process -Force
```

### Start Web Server Only
```bash
cd "C:\Users\azama\VS Code\PROJECTS\Hk_043-Hackathon-SMEC2026\task12"
node server.js
```

### Start WhatsApp Bot Only
```bash
cd "C:\Users\azama\VS Code\PROJECTS\Hk_043-Hackathon-SMEC2026\task12"
npm run whatsapp
```

### Start Both (Recommended for Demo)
```bash
# Terminal 1
node server.js

# Terminal 2 (new terminal)
npm run whatsapp
```

---

## 🧪 Testing Scenarios

### Scenario 1: Complete User Journey (Web)
```
1. Register new user (student@fast.edu.pk)
2. Post a ride from Gulshan to FAST at 8 AM
3. Login as different user
4. Search rides from Gulshan to FAST
5. See match scores displayed
6. Book the ride
7. Check "My Rides" section
8. View carbon dashboard
9. Check badges earned
```

### Scenario 2: WhatsApp Bot Demo
```
1. Send: help
2. Send: link account
3. Enter: student@fast.edu.pk
4. Enter OTP from terminal
5. Send: find ride from gulshan to fast at 8am
6. Send: book ride 1
7. Send: my rides
8. Send: my stats
9. Send: sos (test emergency)
```

### Scenario 3: Smart Matching Demo
```
1. Create 3 users from same department
2. Post rides with overlapping routes
3. Search as 4th user
4. Observe match scores:
   - "Perfect Match" (85+%)
   - "Great Match" (70-84%)
   - "Good Match" (50-69%)
```

---

## 🎮 Demo Script for Presentation

### Part 1: Introduction (1 min)
```
"UniRide Karachi is Pakistan's first smart carpooling platform 
designed specifically for university students. It combines 
AI-powered matching, environmental impact tracking, and 
seamless WhatsApp integration."
```

### Part 2: Website Demo (3 mins)
```
1. Show registration with university email
2. Navigate to "Search Rides"
3. Demonstrate map interface
4. Show smart match scores
5. Book a ride and show confirmation
6. Navigate to Carbon Dashboard
7. Show gamification badges
8. Demonstrate SOS safety feature
```

### Part 3: WhatsApp Bot Demo (3 mins)
```
1. Show WhatsApp chat on screen
2. Type: help
3. Explain account linking process
4. Type: find ride from gulshan to fast
5. Show natural language understanding
6. Type: book ride 1
7. Show booking confirmation with map link
8. Type: my stats
9. Show environmental impact
```

### Part 4: Smart Features (2 mins)
```
1. Explain smart matching algorithm:
   - Route similarity
   - Time overlap
   - Department matching
   - Rating & behavior score

2. Show carbon impact:
   - Real-time CO₂ savings
   - Trees equivalent
   - Money saved in PKR

3. Demonstrate gamification:
   - Achievement badges
   - Streak system
   - Leaderboards
```

### Part 5: Conclusion (1 min)
```
"UniRide Karachi solves real problems for Pakistani students:
✅ Reduces commute costs
✅ Decreases traffic congestion
✅ Lowers carbon emissions
✅ Builds trust through ratings
✅ Accessible via WhatsApp for everyone

Perfect for Karachi's university ecosystem!"
```

---

## 📊 Key Metrics to Highlight

### Technical Excellence
- **12+ database tables** with smart schema design
- **90-second seat locking** prevents double booking
- **Real-time notifications** via WhatsApp
- **0-100 match scoring** with 5 weighted factors
- **Traffic-aware ETA** based on Karachi patterns

### User Experience
- **Map-first interface** with Mapbox integration
- **Glass morphism design** with dark mode
- **Natural language** WhatsApp commands
- **Bottom sheet modals** for native app feel
- **One-tap booking** with instant confirmation

### Social Impact
- **Environmental tracking** per ride and platform-wide
- **Safety features** with SOS and live sharing
- **Community building** through gamification
- **Trust system** with peer ratings
- **Pakistan-specific** calculations and locations

---

## 🐛 Common Issues & Solutions

### Issue 1: Port 3000 Already in Use
```powershell
# Solution:
Get-Process -Name node | Stop-Process -Force
# Wait 2 seconds
node server.js
```

### Issue 2: WhatsApp Bot Not Connecting
```bash
# Solution:
1. Delete sessions folder
2. Restart bot
3. Scan new QR code

rm -rf whatsapp/sessions
npm run whatsapp
```

### Issue 3: Database Locked
```bash
# Solution:
1. Stop all Node processes
2. Delete database
3. Reinitialize

Get-Process -Name node | Stop-Process -Force
rm database.sqlite
npm run init-db
```

### Issue 4: Website Not Loading
```bash
# Solution:
1. Check server is running
2. Clear browser cache
3. Try incognito mode
4. Check console for errors
```

---

## 🎯 Feature Checklist for Demo

### Core Features ✅
- [x] User registration with university email
- [x] Driver can post rides
- [x] Rider can search rides
- [x] Smart match scoring (0-100)
- [x] Real-time seat booking
- [x] Ride cancellation
- [x] Rating system
- [x] Ride history

### Smart Features ✅
- [x] AI-powered matching algorithm
- [x] Carbon impact dashboard
- [x] Gamification & badges
- [x] Streak tracking
- [x] Leaderboards (3 types)
- [x] Behavior scoring
- [x] Dynamic pickup suggestions

### Safety Features ✅
- [x] SOS emergency button
- [x] Emergency contacts
- [x] Live ride sharing
- [x] Driver verification
- [x] Trust score calculation
- [x] Safety tips

### WhatsApp Bot ✅
- [x] Account linking with OTP
- [x] Natural language parsing
- [x] Ride search
- [x] Ride booking
- [x] Conversational ride posting
- [x] Status commands
- [x] Google Maps integration
- [x] Push notifications
- [x] Emergency SOS

### UI/UX ✅
- [x] Premium glass morphism design
- [x] Dark mode support
- [x] Responsive mobile-first
- [x] Map-first interface
- [x] Bottom sheet modals
- [x] Toast notifications
- [x] Loading states
- [x] Smooth animations

---

## 📱 WhatsApp Bot Command Examples

### Account Management
```
link account
→ Starts account linking flow

my profile
→ Shows profile with ratings

my stats
→ Environmental impact stats

unlink
→ Removes WhatsApp link
```

### Ride Operations
```
find ride from gulshan to fast
→ Searches with smart matching

find ride from clifton to iba at 8am
→ Time-specific search

book ride 1
→ Books the first ride from results

post ride
→ Starts conversational posting flow
```

### Status & Management
```
my rides
→ Shows all active rides

today rides
→ Today's schedule

cancel ride 2
→ Cancels specific ride

help
→ Shows all commands
```

### Safety Features
```
sos
→ Triggers emergency alert

share ride
→ Generates tracking link
```

---

## 🎨 UI Color Codes (For Reference)

### Primary Colors
```css
--primary: #6366f1;      /* Indigo - Main brand */
--success: #10b981;      /* Green - Success states */
--warning: #f59e0b;      /* Amber - Warnings */
--danger: #ef4444;       /* Red - Errors */
--eco: #059669;          /* Emerald - Environmental */
```

### Semantic Colors
```css
--background: #0f172a;   /* Dark background */
--surface: #1e293b;      /* Card background */
--text-primary: #f1f5f9; /* Main text */
--text-secondary: #94a3b8; /* Secondary text */
--border: #334155;       /* Borders */
```

---

## 🔗 Important URLs

### Local Development
- **Website**: http://localhost:3000
- **API Health**: http://localhost:3000/api/health
- **Mapbox Docs**: https://docs.mapbox.com/
- **Baileys Docs**: https://whiskeysockets.github.io/

### API Endpoints
- Auth: `/api/auth/*`
- Rides: `/api/rides/*`
- Bookings: `/api/bookings/*`
- Safety: `/api/safety/*`

---

## 💡 Pro Tips for Demo

1. **Prepare Sample Data**: Register 3-4 users and post rides before demo
2. **Test WhatsApp First**: Link account before presenting
3. **Clear Notifications**: Clear terminal and browser console
4. **Full Screen**: Show browser in full screen mode
5. **Zoom In**: Increase font size for visibility
6. **Mobile View**: Show responsive design
7. **Network Tab**: Keep it closed to avoid distractions
8. **Bookmark URLs**: Quick access to important pages

---

## 🎬 Presentation Tips

### Opening Hook
"What if every student in Karachi could save 40% on commute costs while helping the environment? UniRide Karachi makes this possible through smart carpooling."

### Problem Statement
"Pakistani students face:
- High transport costs (500-1000 PKR/day)
- Traffic congestion (2-3 hours daily)
- Environmental pollution
- Safety concerns
- Limited trust in strangers"

### Our Solution
"UniRide Karachi uses:
- AI matching to find perfect ride partners
- WhatsApp for easy access (no app install needed)
- Real-time safety features
- Environmental impact tracking
- Gamification to build community"

### Closing Impact
"In just one semester, if 1000 students use UniRide:
- 50,000 kg CO₂ saved
- 500,000 PKR saved collectively
- 2,381 trees equivalent
- Safer, faster commutes for all"

---

## ✅ Pre-Demo Checklist

- [ ] Server running (green checkmark in terminal)
- [ ] WhatsApp bot connected
- [ ] Browser cache cleared
- [ ] Sample users registered
- [ ] Sample rides posted
- [ ] Terminal font size increased
- [ ] Browser zoom set to 125%
- [ ] Dark mode enabled (matches brand)
- [ ] Network tab closed
- [ ] WhatsApp chat prepared
- [ ] Backup plan if internet fails
- [ ] Screenshots ready

---

## 🚀 You're All Set!

Everything is running perfectly. Just:

1. Open http://localhost:3000 ✅
2. Test WhatsApp commands ✅
3. Show the judges how it works ✅

**Good luck with your presentation! 🎉**

---

**Questions? Check the main README.md for detailed documentation.**
