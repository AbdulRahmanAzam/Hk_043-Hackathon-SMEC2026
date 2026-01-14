# BidYourSkill Database Schema

This directory contains the PostgreSQL database schema and setup scripts for the BidYourSkill platform.

## 📋 Database Overview

**Database Type:** PostgreSQL (NeonDB)  
**Schema Version:** 1.0  
**Last Updated:** January 15, 2026

## 📊 Tables

### Core Tables
1. **users** - Student user accounts with university verification
2. **user_skills** - User skills (many-to-many relationship)
3. **tasks** - Gig/task postings
4. **bids** - Bid proposals on tasks
5. **reviews** - Reviews and ratings after task completion

### Feature Tables
6. **messages** - Direct messages between users (optional)
7. **notifications** - User notification system
8. **transactions** - Payment tracking (future integration)

### Views
- **tasks_with_poster** - Tasks joined with poster information
- **user_portfolio** - User's completed tasks and earnings
- **user_stats** - Aggregated user statistics

## 🚀 Quick Start

### Prerequisites
- Python 3.7+ installed
- NeonDB account and database created
- Database connection string in `.env` file

### Installation

1. **Install Python dependencies**
```bash
cd database
pip install -r requirements.txt
```

2. **Configure environment**
Create/update `.env` file in project root:
```env
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
PORT=5000
```

3. **Set up database schema**
```bash
cd database
python setup.py --seed
```

## 📝 Available Commands

| Command | Description |
|---------|-------------|
| `python setup.py` | Create database schema only |
| `python setup.py --seed` | Create schema AND seed with sample data |
| `python reset.py` | Drop all tables (⚠️ WARNING: Deletes all data) |
| `python reset.py --force` | Reset without confirmation |
| `python check.py` | Database health check and statistics |

## 🌱 Sample Data

When using `--seed` flag, the database is populated with:
- 6 sample users (including demo@uni.edu / password123)
- 6 tasks across different categories (Development, Tutoring, Labor, Design, Photography)
- 5 bids on various tasks
- 1 completed task with review
- User skills and notifications

Perfect for development and testing!

## 🗄️ Schema Details

### Users Table
```sql
- id (UUID, PK)
- email (VARCHAR, UNIQUE)
- password_hash (VARCHAR)
- name (VARCHAR)
- university (VARCHAR)
- bio (TEXT)
- avatar (VARCHAR)
- created_at, updated_at (TIMESTAMP)

Constraints:
- Email must be .edu or .ac domain
- Bio max 500 characters
```

### Tasks Table
```sql
- id (UUID, PK)
- title (VARCHAR)
- description (TEXT)
- poster_id (UUID, FK → users)
- assigned_to_id (UUID, FK → users)
- status (ENUM: OPEN, IN_PROGRESS, COMPLETED, CANCELLED)
- budget (DECIMAL)
- deadline (DATE)
- category (VARCHAR)
- created_at, updated_at, completed_at (TIMESTAMP)

Constraints:
- Budget must be positive
- Deadline must be in future
- Title min 10 chars, description min 20 chars
- Cannot assign task to poster
```

### Bids Table
```sql
- id (UUID, PK)
- task_id (UUID, FK → tasks)
- bidder_id (UUID, FK → users)
- amount (DECIMAL)
- time_estimate (VARCHAR)
- message (TEXT)
- status (ENUM: PENDING, ACCEPTED, REJECTED, WITHDRAWN)
- created_at, updated_at (TIMESTAMP)

Constraints:
- Amount must be positive
- Message min 20 characters
- One bid per user per task (UNIQUE)
```

## 🔐 Security Features

1. **Password Hashing**: Uses bcrypt (not stored in plain text)
2. **Email Validation**: Enforces .edu/.ac domains via CHECK constraint
3. **Cascade Deletes**: Proper foreign key relationships
4. **Input Validation**: CHECK constraints on critical fields
5. **Unique Constraints**: Prevents duplicate bids/reviews

## 📈 Performance Optimizations

- **Indexes** on frequently queried columns:
  - `users.email` (for authentication)
  - `tasks.poster_id`, `tasks.assigned_to_id`, `tasks.status`
  - `bids.task_id`, `bids.bidder_id`
  - All `created_at` columns (DESC for latest-first queries)

- **Materialized Views** for complex queries (user stats, portfolio)

## 🔄 Triggers

- **Auto-update timestamps**: `updated_at` columns automatically update on record modification
- Implemented via PostgreSQL triggers on `users`, `tasks`, and `bids` tables

## 🌱 Seed Data

The seed file (`seed.sql`) includes:
- 6 sample users (including `demo@uni.edu` with password `password123`)
- 6 tasks (OPEN, IN_PROGRESS, COMPLETED statuses)
- 5 bids on various tasks
- 1 review for completed task
- Sample notifications

**Default Test Account:**
- Email: `demo@uni.edu`
- Password: `password123`
- (Password hash in seed file is bcrypt-hashed)

## 🚧 Future Enhancements

- [ ] Payment/escrow transaction processing
- [ ] Real-time messaging system
- [ ] Advanced search with full-text indexing
- [ ] Task categories taxonomy
- [ ] User reputation scoring algorithm
- [ ] Dispute resolution workflow
- [ ] File attachments for tasks/bids

## 🛠️ Maintenance

### Backup Database
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### View Database Stats
```sql
SELECT schemaname, tablename, n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

### Monitor Active Connections
```sql
SELECT count(*) FROM pg_stat_activity
WHERE state = 'active';
```

## 📞 Support

For issues with database setup:
1. Check `.env` file has correct DATABASE_URL
2. Ensure NeonDB instance is running
3. Verify network connectivity to NeonDB
4. Check PostgreSQL logs in NeonDB dashboard

## 📜 License

Part of BidYourSkill platform. See main project README for license information.
