# SwapSync - P2P Sharing Economy Platform

**SwapSync** is a modern Peer-to-Peer (P2P) marketplace designed for Pakistan's users to optimize utility by matching idle assets with local needs through renting and bartering. It addresses financial loss and environmental waste by encouraging the "circular economy"—stopping people from buying expensive items for one-time use.

## 🌟 Core Features

### 1. The Marketplace (Discovery Layer)
*   **Immersive Hero Section:** Engaging visuals with a contextual search bar.
*   **Smart Filtering:** Category chips (Electronics, Tools, Outdoors, Home, Fashion) and search functionality.
*   **Item Cards:** Displays visual status (Rent vs. Barter), distance, and owner verification status.
*   **Pakistani Localization:** All prices in PKR (Rs), Pakistani cities (Islamabad, Lahore, Karachi, Rawalpindi), and local phone formats.

### 2. Transaction History Dashboard
*   **Statistics Overview:** Total transactions, completed rentals, active rentals, and total earnings.
*   **Transaction Filtering:** View all transactions or filter by Rentals, Barters, or Completed status.
*   **Transaction Details:** View full history of rented, bartered, and completed items with timestamps and pricing.
*   **Earnings Tracking:** Automatic calculation of earnings from completed rental transactions.

### 3. Activity Hub (Transaction Management)
*   **Rental Request Workflow:** 
     - Borrower requests rental → Owner approves/rejects
     - Once approved, rental enters ACTIVE status
     - Automatic duration tracking and cost calculations
*   **Three Transaction Views:** Pending Requests (awaiting owner approval), My Requests (you're waiting), and Rejected Requests.
*   **Real-time Status:** Displays transaction status (REQUESTED, ACTIVE, COMPLETED, REJECTED).
*   **Contact Owner:** Direct communication with other users.

### 4. User Profiles & Trust
*   **Identity Verification:** Visual indicators for Email and Phone verification.
*   **Reviews & Ratings:** 5-star rating system with written feedback history.
*   **Trust Score:** Displayed metric based on successful transactions and reviews.
*   **Public Profiles:** View other users' profiles and transaction history before trading.

### 5. Item Listing Management
*   **Create Listings:** Add items with title, description, images, category, and rental price.
*   **Item Categories:** Electronics, Tools, Outdoors, Home, Fashion.
*   **Rental Duration Selector:** Choose from 1, 3, 5, 7, 14, or 30 days when requesting rentals.
*   **Estimated Cost Display:** See rental cost before confirming requests.

### 6. Authentication
*   **Streamlined Auth:** Modal-based Sign In/Sign Up flow.
*   **Mock Auth:** Simulation of user sessions with pre-loaded Pakistani users for demonstration.

---

## 🛠 Tech Stack

*   **Frontend Framework:** React 19 (Functional Components, Hooks)
*   **Language:** TypeScript (Strict typing for robust data modeling)
*   **Styling:** Tailwind CSS (Utility-first, responsive design, animations)
*   **Icons:** Lucide React
*   **Build Tool:** Vite 6.4.1
*   **State Management:** React Hooks (useState) with lightweight context

---

## 📂 Project Structure

```text
/
├── index.html              # Entry point, SVG favicon, global styles
├── index.tsx               # React Root mounting
├── App.tsx                 # Main layout, routing logic, global state
├── types.ts                # TypeScript interfaces (Item, User, Transaction)
├── metadata.json           # Application metadata
├── vite.config.ts          # Vite build configuration
├── tsconfig.json           # TypeScript configuration
├── services/
│   └── mockData.ts         # Static database: 8 users, 29 items, 4 transactions
├── components/
│   ├── Navbar.tsx          # Responsive navigation (Floating island design)
│   └── ItemCard.tsx        # Reusable grid item component
└── pages/
    ├── Marketplace.tsx     # Home view, Search & Filter
    ├── ItemDetail.tsx      # Single item view, Rent/Barter/Review actions
    ├── Dashboard.tsx       # Transaction history and statistics
    ├── Activity.tsx        # Rental request tracking and approval workflow
    ├── Profile.tsx         # User settings and verification
    ├── PublicProfile.tsx   # View other users' profiles
    ├── AddItem.tsx         # Form to create new listings
    └── AuthScreen.tsx      # Login/Signup form
```

---

## 🔑 Key Implementation Details

### 1. Rental Request Workflow
The app implements a two-step rental approval process:
1. **Borrower requests rental** → Transaction created with status `REQUESTED`
2. **Owner approves request** → Transaction moves to `ACTIVE` status
3. **Rental completes** → Transaction marked `COMPLETED` with optional review

This ensures owners have full control over who rents their items.

### 2. Custom Routing & State Management
Instead of using heavy routing libraries, the app uses a lightweight state-based router in `App.tsx`:
```typescript
const [activeTab, setActiveTab] = useState('market');
// ...
const renderContent = () => {
  switch (activeTab) {
    case 'market': return <Marketplace ... />;
    case 'activity': return <Activity ... />;
    case 'dashboard': return <Dashboard ... />;
    // ...
  }
}
```
*   **Transitions:** CSS Keyframe animations (`pageSlideUp`) create smooth transitions between views.

### 3. Transaction Time & Cost Logic (`Activity.tsx` & `Dashboard.tsx`)
The app performs client-side calculation of transaction states:
*   **Cost Calculation:** `daysRented * pricePerDay` for completed rentals.
*   **Total Earnings:** Aggregated from all completed rental transactions where user is the lender.
*   **Status Display:** Visual indicators (badges, colors) for each transaction status.

### 4. Pakistani Localization
*   **Currency:** All prices displayed in **PKR (Rs)**
*   **Cities:** Islamabad, Lahore, Karachi, Rawalpindi
*   **Users:** 8 distinct Pakistani users with realistic names and locations
*   **Items:** 29 items across popular categories with Pakistani context

### 5. Responsive Design Strategy
*   **Navigation:** Floating Island navbar on Desktop → Full-screen mobile menu on small screens.
*   **Layouts:** Extensive use of `grid-cols-1 md:grid-cols-12` for mobile-first stacking.
*   **Edge-to-Edge:** Marketplace and pages fill entire viewport for immersive experience.
*   **Touch Targets:** Buttons and inputs sized for optimal mobile interaction.

---

## 🚀 How to Run

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Start Development Server:**
    ```bash
    npm run dev
    ```

3.  **Access the App:**
    Open `http://localhost:3000/` in your browser.

4.  **Login with Mock Users:**
    - Ahmed Khan (Islamabad)
    - Fatima Zahra (Lahore)
    - Bilal Mahmood (Karachi)
    - Hassan Raza (Lahore)
    - Sara Ahmed (Islamabad)
    - Ali Hussain (Karachi)
    - Ayesha Malik (Rawalpindi)
    - Usman Sheikh (Lahore)

---

## 📊 Mock Data

**Users:** 8 Pakistani users across 4 cities
**Items:** 29 total items
- Electronics: 15 items
- Tools: 5 items
- Outdoors: 6 items
- Home: 2 items
- Fashion: 4 items

**Transactions:** 4 sample transactions (2 ACTIVE rentals, 2 REQUESTED pending approval)

---

## ✅ Implementation Status

### Completed Features
- ✅ Marketplace browsing with search and filtering
- ✅ Item detail view with rental/barter requests
- ✅ Rental request approval workflow (2-step process)
- ✅ Activity tracking with pending/active/completed/rejected statuses
- ✅ Transaction history dashboard with filtering
- ✅ User profiles with trust scores and reviews
- ✅ Pakistani localization (currency, cities, user data)
- ✅ Review and rating system
- ✅ Item creation/listing
- ✅ Authentication with mock users
- ✅ Responsive design (mobile-first)
- ✅ Edge-to-edge layout

### Removed/Cleaned Up
- ❌ Gemini AI integration (removed per requirements)
- ❌ Smart Dashboard (analytics replaced with transaction history)
- ❌ LoadingOverlay component (unused, deprecated)
- ❌ geminiService.ts (no longer needed)

---

## 🔮 Future Roadmap

*   **Real Backend:** Replace `mockData.ts` with Supabase or Firebase.
*   **Payment Integration:** Stripe/JazzCash integration for rental payments.
*   **Geolocation:** Real map integration for distance-based discovery.
*   **Notifications:** Real-time notifications for rental requests and approvals.
*   **Chat System:** In-app messaging for users to negotiate swaps and rentals.
*   **Advanced Reputation:** Detailed reputation algorithm with weighted reviews and transaction history.

---

## 📝 Notes

*   The app uses mock authentication and data for demonstration purposes.
*   All prices are displayed in **Pakistani Rupees (Rs)**.
*   The rental workflow requires owner approval before transactions become active.
*   Transaction history is persisted in the component state during the session.
