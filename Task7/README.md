# 🚀 Mini Social Media Web Application

A modern, full-stack social media application built with React, Node.js, Express, and MongoDB. Features secure JWT authentication, real-time interactions, and a beautiful glassmorphic UI design.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-16%2B-green.svg)
![React](https://img.shields.io/badge/react-18.2-blue.svg)

## ✨ Features

- 🔐 **Secure Authentication** - JWT-based auth with bcrypt password hashing
- 📝 **Create Posts** - Share text and images with your followers
- ❤️ **Like/Unlike** - Engage with posts you love
- 💬 **Comments** - Join the conversation
- 👥 **Follow/Unfollow** - Build your social network
- 🔍 **Discover Users** - Find new people to follow
- 📱 **Responsive Design** - Works on all devices
- 🎨 **Modern UI** - Glassmorphic design with smooth animations
- 🛡️ **Rate Limiting** - Protection against abuse
- ✅ **Input Validation** - Secure data handling

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite for fast development
- **Tailwind CSS** for modern styling
- **React Router** for navigation
- **Axios** for API calls

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **bcrypt** for password hashing
- **Multer** for image uploads
- **express-rate-limit** for security

## 📦 Installation & Setup

### Prerequisites
- Node.js v16 or higher
- MongoDB (local or Atlas)

### 1. Clone & Setup Environment

```bash
# Clone the repository
git clone <your-repo-url>
cd Task7

# Copy environment files
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` with your MongoDB URI and JWT secret.

### 2. Backend Setup

```bash
cd server
npm install
npm run dev
```

Server runs on **http://localhost:5000**

### 3. Frontend Setup

```bash
cd client
npm install
npm run dev
```

App runs on **http://localhost:5173**

## 🔑 Environment Variables

### Server (.env)
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your-super-secret-key
PORT=5000
NODE_ENV=development
```

### Client (.env)
```
VITE_API_URL=http://localhost:5000
```

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login with credentials |
| GET | `/api/auth/verify` | Verify JWT token |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/search` | Search users |
| GET | `/api/users/:id` | Get user by ID |
| GET | `/api/users/username/:username` | Get user by username |
| PUT | `/api/users/:id` | Update profile (auth) |
| POST | `/api/users/:id/follow` | Follow user (auth) |
| POST | `/api/users/:id/unfollow` | Unfollow user (auth) |

### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/posts` | Create post (auth) |
| GET | `/api/posts/feed/:userId` | Get user feed |
| GET | `/api/posts/user/:userId` | Get user posts |
| GET | `/api/posts/:id` | Get single post |
| POST | `/api/posts/:id/like` | Like post (auth) |
| POST | `/api/posts/:id/unlike` | Unlike post (auth) |
| DELETE | `/api/posts/:id` | Delete post (auth) |

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/comments` | Add comment (auth) |
| GET | `/api/comments/post/:postId` | Get post comments |
| DELETE | `/api/comments/:id` | Delete comment (auth) |

## 🎯 Usage

1. Open http://localhost:5173 in your browser
2. Register with a username and password (min 6 chars)
3. Go to **Discover** page to find and follow users
4. Once you follow users, their posts will appear in your feed
5. Create posts, like and comment!

## How Following Works

- Navigate to **Discover** page from the navbar
- Search for users or browse the list
- Click **Follow** button to follow a user
- Visit their profile to see their posts
- Their posts will now appear in your **Feed**
- Unfollow anytime from their profile or Discover page

## 📁 Project Structure

```
Task7/
├── .env                    # Root environment
├── .gitignore             # Git ignore rules
├── .eslintrc.json         # ESLint configuration
├── .prettierrc            # Prettier configuration
├── README.md              # This file
│
├── server/
│   ├── server.js          # Express app entry
│   ├── .env.example       # Env template
│   ├── models/
│   │   ├── User.js        # User schema
│   │   ├── Post.js        # Post schema
│   │   └── Comment.js     # Comment schema
│   ├── routes/
│   │   ├── authRoutes.js  # Auth endpoints
│   │   ├── userRoutes.js  # User endpoints
│   │   ├── postRoutes.js  # Post endpoints
│   │   └── commentRoutes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── postController.js
│   │   └── commentController.js
│   ├── middleware/
│   │   ├── auth.js        # JWT verification
│   │   └── errorHandler.js
│   └── uploads/           # Image storage
│
└── client/
    ├── .env.example       # Env template
    ├── src/
    │   ├── main.jsx       # React entry
    │   ├── App.jsx        # Router setup
    │   ├── index.css      # Global styles
    │   ├── config/
    │   │   └── api.js     # API configuration
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Feed.jsx
    │   │   ├── Discover.jsx
    │   │   ├── Profile.jsx
    │   │   └── Post.jsx
    │   └── components/
    │       ├── Navbar.jsx
    │       ├── PostCard.jsx
    │       ├── CommentBox.jsx
    │       ├── FollowersListModal.jsx
    │       ├── Alert.jsx
    │       ├── Button.jsx
    │       └── InputField.jsx
    └── index.html
```

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: 10 auth attempts / 15 min, 100 API calls / min
- **Input Validation**: Username and password requirements
- **File Validation**: Image type and size limits (5MB)
- **Error Handling**: Global error middleware
- **Protected Routes**: Auth middleware on sensitive endpoints

## 📄 License

MIT License - feel free to use for learning and hackathons!
