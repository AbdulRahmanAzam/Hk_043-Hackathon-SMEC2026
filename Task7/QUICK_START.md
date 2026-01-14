# 🚀 Quick Start Guide - Mini Social

## Start the Application

### Step 1: Start Backend Server
Open a terminal and run:
```bash
cd server
npm install
npm run dev
```
✅ Server will start on http://localhost:5000

### Step 2: Start Frontend (New Terminal)
Open a NEW terminal and run:
```bash
cd client
npm install
npm run dev
```
✅ App will start on http://localhost:3000

## First Time Usage

1. **Login** - Enter any username (e.g., "john", "sarah", "alex")
2. **Discover Users** - Click "Discover" in navbar
3. **Follow Users** - Search and follow other users
4. **View Feed** - See posts from people you follow
5. **Create Post** - Share your thoughts with text/image
6. **Interact** - Like and comment on posts

## Troubleshooting

### Server won't start?
- Make sure MongoDB URI is in .env file
- Check if port 5000 is available
- Run `npm install` in server folder

### Frontend won't start?
- Check if port 3000 is available
- Run `npm install` in client folder
- Make sure backend is running first

### Can't see posts in feed?
- You need to follow users first!
- Go to Discover page
- Follow some users
- Their posts will appear in your feed

### 500 Error on Profile?
- Make sure backend server is running
- Check browser console for details
- Refresh the page

## Features Overview

✅ Username-based login (no password needed)
✅ Create posts with text and optional images
✅ Like/unlike posts
✅ Comment on posts
✅ Follow/unfollow users
✅ Search and discover users
✅ Personalized feed showing posts from followed users
✅ User profiles with post history
✅ Responsive mobile-friendly design

Enjoy using Mini Social! 🎉
