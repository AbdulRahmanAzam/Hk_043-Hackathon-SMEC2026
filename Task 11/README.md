# 🎓 BidYourSkill

**The Premier Student Gig Marketplace**

BidYourSkill is a full-stack TypeScript platform connecting students who need help with peers who can provide services. Built with React, Node.js, PostgreSQL, and Socket.IO, it features real-time task updates, competitive bidding, automated portfolios, and comprehensive notifications.

**Current Status**: ~85% Complete

---

## 🚀 Key Features

### 1. Real-Time Task Management
- **Live Updates**: Tasks and bids appear instantly via Socket.IO WebSockets
- **Advanced Filtering**: Filter by status (Open/In Progress/Completed), category, or search keywords
- **Smart Sorting**: Sort by newest, highest budget, or closest deadline
- **8 Categories**: Development, Design, Writing, Tutoring, Marketing, Business, Labor, Other
- **Status Tracking**: OPEN → IN_PROGRESS → COMPLETED workflow with notifications

### 2. Competitive Bidding System
- **Proposal Submission**: Bid with amount, time estimate (hours), and detailed pitch (min 20 chars)
- **Real-Time Bid Updates**: Instant notifications when new bids arrive
- **Duplicate Prevention**: System prevents multiple bids from same user on same task
- **Bid Management**: Accept, reject, withdraw, or update pending bids
- **Transaction Safety**: Atomic operations ensure data consistency during bid acceptance

### 3. Complete Task Lifecycle
- **Create**: University-verified students post tasks with title, description, budget, deadline, category
- **Bid**: Other students submit competitive proposals with pricing and timelines
- **Accept**: Task poster reviews bids and accepts the best proposal
- **Complete**: Mark task as done, trigger payment release (simulated), update portfolios
- **Review**: Both parties can leave ratings (1-5 stars) and written feedback

### 4. Automated Portfolio & Analytics
- **Dynamic Portfolio**: Auto-updates when tasks complete with earnings, reviews, and job history
- **Stats Dashboard**: Total earned, jobs completed, average rating, review count
- **Earnings Visualization**: Interactive Recharts bar graph showing income per job
- **Skills Management**: Add/remove skills with tag-based UI
- **Profile Editing**: Update avatar (5 presets + custom URL), name, university, bio (500 char max)

### 5. Comprehensive Notification System
- **Real-Time Delivery**: Socket.IO pushes notifications instantly to connected users
- **Notification Types**: NEW_BID, BID_ACCEPTED, BID_REJECTED, TASK_COMPLETED, REVIEW_RECEIVED
- **Management**: Mark as read (single/all), delete, get unread count
- **Backend Complete**: Full API ready (frontend UI pending)

### 6. Reviews & Ratings
- **Post-Completion Reviews**: Both task poster and accepted bidder can review each other
- **5-Star Rating System**: Numeric rating (1-5) + written comment (min 10 chars)
- **Validation**: Prevents duplicate reviews, self-reviews, and unauthorized reviews
- **Portfolio Integration**: Average rating calculated and displayed on user profiles

### 7. Security & Authentication
- **University Email Validation**: Enforces `.edu` or `.ac.xx` domain registration
- **Password Security**: bcrypt hashing with 12 rounds (salt automatically generated)
- **JWT Tokens**: 7-day expiry, Bearer token scheme, secure HTTP-only recommended for production
- **Protected Routes**: Middleware validates tokens on all authenticated endpoints
- **Authorization**: Users can only edit own profile, bid on others' tasks, etc.

### 8. Responsive Design
- **Mobile-First**: Bottom navigation bar on mobile, sidebar on desktop
- **Tailwind CSS**: Slate/Violet/Emerald color palette with dark mode support
- **Lucide Icons**: Consistent iconography across all components
- **Animations**: Smooth transitions and loading states for better UX

---

## 🛠️ Tech Stack

### **Frontend**
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.3 | UI framework with TypeScript for type safety |
| **Vite** | 6.2.0 | Build tool with HMR for fast development |
| **TypeScript** | 5.8.2 | Static typing for JavaScript |
| **Tailwind CSS** | 3.x | Utility-first CSS framework (via CDN) |
| **Lucide React** | 0.562.0 | Icon library with 1000+ SVG icons |
| **Recharts** | 3.6.0 | Composable charting library for data visualization |
| **Socket.IO Client** | 4.8.2 | WebSocket client for real-time updates |

### **Backend**
| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 22.x | JavaScript runtime environment |
| **Express** | 4.21.2 | Web application framework |
| **TypeScript** | 5.8.2 | Type-safe backend development |
| **PostgreSQL** | 17.7 | Relational database (hosted on NeonDB) |
| **pg** | 8.17.0 | PostgreSQL client for Node.js |
| **Socket.IO** | 4.8.2 | WebSocket server for real-time communication |
| **bcrypt** | 5.1.1 | Password hashing with salt generation |
| **jsonwebtoken** | 9.0.2 | JWT authentication tokens |
| **helmet** | 8.0.0 | Security middleware (sets HTTP headers) |
| **cors** | 2.8.5 | Cross-origin resource sharing configuration |
| **dotenv** | 16.6.1 | Environment variable management |

### **Development Tools**
| Technology | Version | Purpose |
|------------|---------|---------|
| **tsx** | 4.19.2 | TypeScript execution with watch mode |
| **concurrently** | 9.1.2 | Run frontend + backend simultaneously |
| **@vitejs/plugin-react** | 5.0.0 | React plugin for Vite |
| **@types/** | Various | TypeScript definitions for libraries |

### **Database**
- **PostgreSQL 17.7** on **NeonDB** (serverless Postgres)
- **8 Tables**: users, tasks, bids, reviews, user_skills, notifications, messages, transactions
- **UUID Primary Keys**: Using `uuid-ossp` extension
- **Constraints**: Email format validation, NOT NULL fields, foreign key relationships
- **Indexes**: Optimized for email lookups, task filtering, notification queries
- **Triggers**: Auto-update timestamps on row modifications

---

## 📁 Project Structure

```
bidyourskill/
├── 📄 Configuration Files
│   ├── package.json              # Dependencies and npm scripts
│   ├── tsconfig.json             # Frontend TypeScript config
│   ├── tsconfig.server.json      # Backend TypeScript config
│   ├── vite.config.ts            # Vite build configuration
│   ├── vite-env.d.ts             # Vite environment types
│   └── .env                      # Environment variables (DB, JWT secret)
│
├── 🎨 Frontend (React + TypeScript)
│   ├── index.html                # Entry point with Tailwind CDN
│   ├── index.tsx                 # React root with StrictMode
│   ├── App.tsx                   # Router, auth state, layout wrapper
│   ├── types.ts                  # TypeScript interfaces (User, Task, Bid, etc.)
│   ├── components/
│   │   ├── Auth.tsx              # Login/signup with email validation
│   │   ├── Layout.tsx            # Navigation (sidebar/header/bottom nav)
│   │   ├── TaskBoard.tsx         # Task feed, filters, create modal
│   │   ├── TaskCard.tsx          # Individual task preview card
│   │   ├── TaskDetail.tsx        # Full task view, bidding, management
│   │   ├── Portfolio.tsx         # User profile, stats, earnings chart
│   │   ├── ProfileEditModal.tsx  # Edit name, bio, avatar, skills
│   │   ├── Toast.tsx             # Toast notification component
│   │   ├── ToastContainer.tsx    # Toast notification manager
│   │   └── ConfirmModal.tsx      # Reusable confirmation dialog
│   └── services/
│       ├── api.ts                # API wrapper with fetch + JWT
│       └── socket.ts             # Socket.IO client setup
│
├── 🖥️ Backend (Node.js + Express + TypeScript)
│   └── server/
│       ├── index.ts              # Express app, middleware, server startup
│       ├── config/
│       │   └── database.ts       # PostgreSQL connection pool
│       ├── middleware/
│       │   ├── auth.ts           # JWT authentication middleware
│       │   └── errorHandler.ts   # Error handling & 404 middleware
│       ├── controllers/
│       │   ├── authController.ts       # Register, login, logout, getCurrentUser
│       │   ├── taskController.ts       # CRUD tasks, filters, search, complete
│       │   ├── bidController.ts        # Submit, accept, reject, withdraw bids
│       │   ├── userController.ts       # Get profile, update profile/skills
│       │   ├── notificationController.ts # Get, mark read, delete notifications
│       │   └── reviewController.ts     # Submit, get task/user reviews
│       ├── routes/
│       │   ├── auth.ts           # /api/auth routes
│       │   ├── tasks.ts          # /api/tasks routes
│       │   ├── bids.ts           # /api/bids routes
│       │   ├── users.ts          # /api/users routes
│       │   ├── notifications.ts  # /api/notifications routes
│       │   └── reviews.ts        # /api/reviews routes
│       ├── socket/
│       │   └── index.ts          # Socket.IO setup, room management, events
│       └── utils/
│           └── validators.ts     # Input sanitization helpers
│
├── 🗄️ Database (PostgreSQL Scripts)
│   └── database/
│       ├── setup.py              # Python script to initialize database
│       ├── reset.py              # Python script to drop and recreate
│       ├── check.py              # Python script to verify connection
│       ├── requirements.txt      # Python dependencies (psycopg2)
│       └── README.md             # Database setup instructions
│
└── 📚 Documentation
    └── README.md                       # This file
```

---

## 📖 Getting Started

### **Prerequisites**
- **Node.js** 18+ (tested with 22.x)
- **npm** or **yarn**
- **PostgreSQL** database (NeonDB account recommended)
- **Python 3.x** (for database scripts)

### **1. Clone & Install**
```bash
git clone <repository-url>
cd bidyourskill
npm install
```

### **2. Database Setup**
```bash
# Install Python dependencies
cd database
pip install -r requirements.txt

# Configure database connection
# Edit database/.env with your PostgreSQL credentials:
# DATABASE_URL=postgresql://user:password@host:port/database

# Initialize database (creates tables)
python setup.py

# (Optional) Seed sample data
python setup.py --seed

cd ..
```

### **3. Environment Configuration**
Create `.env` file in project root:
```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Server
PORT=5000
NODE_ENV=development

# Client
CLIENT_URL=http://localhost:3000
```

Create `vite-env.d.ts` file (if not exists):
```typescript
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

Create `.env` file for frontend (optional, defaults to http://localhost:5000):
```env
VITE_API_URL=http://localhost:5000
```

### **4. Run Development Servers**
```bash
# Option 1: Run both frontend + backend simultaneously
npm run dev:all

# Option 2: Run separately in different terminals
npm run dev          # Frontend (Vite) on port 3000
npm run dev:server   # Backend (Express) on port 5000
```

### **5. Access Application**
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **Socket.IO**: ws://localhost:5000

---

## 🧪 Testing

**Quick Test Flow**:dget, deadline, category)
4. Open in incognito, register second user
5. Submit bid on first user's task
6. Accept bid as first user
7. Complete task and submit review
8. Check portfolio updates for both users

---

## 📖 User Guide

### **1. Registration & Login**
1. Visit http://localhost:3000
2. Click "Sign Up" tab
3. Enter university email (must end with `.edu` or `.ac.xx`)
4. Create password (min 6 characters recommended)
5. Click "Create Account"
6. Automatically logged in with JWT token

**Note**: Seed data users have fake bcrypt hashes and cannot login. Register new accounts for testing.

### **2. Creating Tasks**
1. Click **"Post a Gig"** button (top right or `+` icon on mobile)
2. Fill in required fields:
   - **Title**: Brief description (e.g., "Build React Website")
   - **Description**: Detailed requirements
   - **Budget**: Amount in USD (e.g., 150)
   - **Deadline**: Date picker for due date
   - **Category**: Select from 8 options
3. Click **"Post Task"**
4. Task appears on board instantly via Socket.IO

### **3. Submitting Bids**
1. Browse task board or use search/filters
2. Click on any task card (not yours)
3. Scroll to "Submit Your Proposal" form
4. Enter:
   - **Bid Amount**: Your price (must be > 0)
   - **Time Estimate**: Hours to complete
   - **Message**: Pitch (min 20 characters)
5. Click **"Submit Bid"**
6. Real-time notification sent to task poster

### **4. Managing Bids (Task Poster)**
1. Go to your posted task
2. View "Proposals Received" section
3. Review each bid:
   - Bidder name, avatar, rating
   - Bid amount and time estimate
   - Pitch message
4. Click **"Accept Proposal"** on chosen bid
5. System automatically:
   - Updates task status to IN_PROGRESS
   - Marks bid as ACCEPTED
   - Rejects other bids
   - Sends notifications to all bidders

### **5. Completing Tasks**
1. Navigate to in-progress task
2. Click **"Complete & Pay"** button (only task poster can do this)
3. Task status changes to COMPLETED
4. Worker's portfolio auto-updates with earnings
5. Both users can now submit reviews

### **6. Reviewing Users**
1. Go to completed task detail page
2. Scroll to "Leave a Review" section
3. Select star rating (1-5)
4. Write review comment (min 10 characters)
5. Click **"Submit Review"**
6. Review appears on user's portfolio
7. Average rating recalculates automatically

### **7. Editing Profile**
1. Click **"Portfolio"** in navigation
2. Click **Settings** icon (⚙️) in profile header
3. Update fields:
   - **Avatar**: Choose from 5 presets or enter custom URL
   - **Name**: Display name (min 2 chars)
   - **University**: Institution name (min 2 chars)
   - **Bio**: About me (max 500 chars)
   - **Skills**: Add/remove skill tags
4. Click **"Save Changes"**
5. Profile updates instantly across app

---

## 🏗️ Architecture Highlights

### **Real-Time Communication**
- **Socket.IO Rooms**: Users join personal rooms (`user-${userId}`) and task rooms (`task-${taskId}`)
- **Events**: `task-created`, `task-updated`, `bid-submitted`, `bid-accepted`, `notification-received`
- **Authentication**: Socket connections authenticated via JWT token in handshake

### **Database Design**
- **Normalized Schema**: 8 tables with proper foreign keys and cascading deletes
- **Indexes**: Strategic indexes on frequently queried columns (email, task status, user_id)
- **Constraints**: Check constraints for email format, budget > 0, rating 1-5
- **Triggers**: `updated_at_timestamp()` function auto-updates timestamps on row changes
- **Views**: `user_portfolio_stats` materializes complex aggregations

### **API Design**
- **RESTful Endpoints**: Standard HTTP methods (GET, POST, PUT, PATCH, DELETE)
- **JWT Authentication**: Bearer token in Authorization header
- **Error Handling**: Consistent error responses with status codes and messages
- **Input Validation**: Sanitization and validation on all user inputs
- **Pagination Ready**: API structure supports pagination (not yet implemented)

### **Frontend State Management**
- **React useState/useEffect**: Component-level state management
- **API Service Layer**: Centralized API calls in `services/api.ts`
- **Socket Integration**: Real-time updates merged with API data
- **Local Storage**: JWT token persistence
- **No Redux**: Simple enough for built-in React state

---

## 🎨 Design System

### **Color Palette**
- **Primary**: Violet (`#8b5cf6`) - Headers, buttons, accents
- **Secondary**: Slate (`#1e293b`) - Backgrounds, cards
- **Success**: Emerald (`#10b981`) - Completed states
- **Warning**: Amber (`#f59e0b`) - In progress states
- **Error**: Red (`#ef4444`) - Errors, rejections

### **Typography**
- **Headings**: Inter font family, bold weights
- **Body**: Inter font family, normal weights
- **Code**: JetBrains Mono (monospace)

### **Components**
- **Cards**: Rounded corners, shadow on hover
- **Buttons**: Primary (violet), secondary (slate), danger (red)
- **Forms**: Consistent input styling with focus states
- **Modals**: Centered overlay with backdrop blur
- **Toasts**: Bottom-right notifications with auto-dismiss

---

## 🔮 Roadmap & Future Improvements

### **In Progress** (Current Sprint)
- ✅ Profile editing (COMPLETED)
- ⏳ Notification UI (bell icon in header) - Backend complete

### **Planned Features**
1. **Messaging System** (High Priority)
   - Direct chat between task poster and accepted bidder
   - Real-time messaging via Socket.IO
   - Message history and unread indicators

2. **Payment Integration** (High Priority)
   - Stripe Connect for escrow payments
   - Hold funds when bid accepted
   - Release on task completion
   - Platform fee calculation (5-10%)

3. **Work Submission & Deliverables**
   - File upload system (AWS S3 or Cloudinary)
   - Revision request workflow
   - Approval/rejection of deliverables

4. **Enhanced Notifications**
   - Bell icon UI in header
   - Dropdown menu with recent notifications
   - Unread count badge
   - Mark all as read button

5. **Advanced Features**
   - Email notifications (nodemailer configured)
   - Password reset flow
   - Email verification for new accounts
   - Rate limiting to prevent abuse
   - Task dispute resolution
   - Favorite/bookmark tasks
   - User blocking/reporting

### **Performance Optimizations**
- API pagination for large datasets
- Image optimization and lazy loading
- Database query optimization
- Redis caching for frequently accessed data
- CDN for static assets

### **Production Readiness**
- Environment-specific configs
- Logging system (Winston or Pino)
- Error monitoring (Sentry)
- API rate limiting
- HTTPS enforcement
- Database connection pooling optimization
- Automated testing (Jest, Cypress)

---

## 🐛 Known Issues

See [ISSUES_AND_MISSING_FEATURES.md](ISSUES_AND_MISSING_FEATURES.md) for comprehensive list.

**Critical Issues**:
- Seeded users cannot login (fake bcrypt hashes) - Register new accounts
- No notification UI yet (backend complete)
- No messaging system
---

## 📝 API Documentation

### **Base URL**
```
http://localhost:5000/api
```

### **Authentication Endpoints**
```
POST   /api/auth/register          # Register new user
POST   /api/auth/login             # Login with email/password
GET    /api/auth/me                # Get current user (requires JWT)
POST   /api/auth/logout            # Logout (client-side token removal)
```

### **Task Endpoints**
```
GET    /api/tasks                  # Get all tasks (query: status, category, search, sort)
POST   /api/tasks                  # Create new task (requires JWT)
GET    /api/tasks/:id              # Get task by ID
PUT    /api/tasks/:id              # Update task (requires JWT, must be owner)
DELETE /api/tasks/:id              # Delete task (requires JWT, must be owner)
POST   /api/tasks/:id/complete     # Mark task as completed (requires JWT, must be owner)
```

### **Bid Endpoints**
```
GET    /api/bids/task/:taskId      # Get all bids for a task
POST   /api/bids                   # Submit new bid (requires JWT)
PUT    /api/bids/:id               # Update pending bid (requires JWT, must be bidder)
DELETE /api/bids/:id               # Withdraw bid (requires JWT, must be bidder)
POST   /api/bids/:id/accept        # Accept bid (requires JWT, must be task owner)
```

### **User Endpoints**
```
GET    /api/users/:id              # Get user profile
PATCH  /api/users/:id              # Update profile (requires JWT, must be own profile)
POST   /api/users/:id/skills       # Update skills (requires JWT, must be own profile)
GET    /api/users/:id/portfolio    # Get portfolio stats
```

### **Notification Endpoints**
```
GET    /api/notifications          # Get notifications (query: unreadOnly)
GET    /api/notifications/unread-count  # Get unread count
PUT    /api/notifications/:id/read      # Mark as read
PUT    /api/notifications/read-all      # Mark all as read
DELETE /api/notifications/:id           # Delete notification
```

### **Review Endpoints**
```
POST   /api/reviews                # Submit review (requires JWT)
GET    /api/reviews/task/:taskId   # Get reviews for a task
GET    /api/reviews/user/:userId   # Get reviews for a user
```

For detailed request/response schemas, see [API Documentation](server/README.md) (if exists) or inspect `server/controllers/` files.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

**Development Guidelines**:
- Follow TypeScript best practices
- Add JSDoc comments for functions
- Write tests for new features
- Update documentation
- Use conventional commit messages

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 👥 Authors

- **Development Team** - Full-stack implementation
- **Contributors** - See GitHub contributors list

---

## 🙏 Acknowledgments

- **NeonDB** - Serverless PostgreSQL hosting
- **Vite** - Lightning-fast build tool
- **React Team** - Amazing framework
- **Socket.IO** - Real-time communication
- **Tailwind CSS** - Utility-first styling
- **Lucide** - Beautiful icon library
