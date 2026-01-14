import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { pool } from '../config/database.js';
import { generateToken, AuthRequest } from '../middleware/auth.js';
import { isUniversityEmail, isValidPassword, sanitize } from '../utils/validators.js';
import { AppError } from '../middleware/errorHandler.js';

const SALT_ROUNDS = 12;

// Register new user
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, university, skills, bio } = req.body;

    // Validate inputs
    if (!email || !password || !name || !university) {
      throw new AppError('Email, password, name, and university are required', 400);
    }

    if (!isUniversityEmail(email)) {
      throw new AppError('Email must be from a university domain (.edu or .ac.*)', 400);
    }

    if (!isValidPassword(password)) {
      throw new AppError('Password must be at least 6 characters', 400);
    }

    if (name.trim().length === 0) {
      throw new AppError('Name cannot be empty', 400);
    }

    if (bio && bio.length > 500) {
      throw new AppError('Bio must be less than 500 characters', 400);
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      throw new AppError('Email already registered', 409);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, university, bio, avatar)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, name, university, bio, avatar, created_at`,
      [
        email.toLowerCase(),
        passwordHash,
        sanitize(name),
        sanitize(university),
        bio ? sanitize(bio) : null,
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
      ]
    );

    const user = result.rows[0];

    // Add user skills if provided
    if (skills && skills.length > 0) {
      const skillsArray = Array.isArray(skills) 
        ? skills 
        : skills.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);

      for (const skill of skillsArray) {
        await pool.query(
          'INSERT INTO user_skills (user_id, skill_name) VALUES ($1, $2)',
          [user.id, sanitize(skill)]
        );
      }
    }

    // Get user with skills
    const userWithSkills = await getUserWithSkills(user.id);

    // Generate token
    const token = generateToken(user.id, user.email);

    res.status(201).json({
      user: userWithSkills,
      token
    });
  } catch (error) {
    throw error;
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    // Find user
    const result = await pool.query(
      'SELECT id, email, password_hash, name, university, bio, avatar FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      throw new AppError('Invalid email or password', 401);
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      throw new AppError('Invalid email or password', 401);
    }

    // Get user with skills
    const userWithSkills = await getUserWithSkills(user.id);

    // Generate token
    const token = generateToken(user.id, user.email);

    res.json({
      user: userWithSkills,
      token
    });
  } catch (error) {
    throw error;
  }
};

// Get current user
export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError('Unauthorized', 401);
    }

    const user = await getUserWithSkills(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.json({ user });
  } catch (error) {
    throw error;
  }
};

// Logout (client-side token removal, server can implement token blacklist if needed)
export const logout = async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Logged out successfully' });
};

// Helper function to get user with skills
async function getUserWithSkills(userId: string) {
  const userResult = await pool.query(
    'SELECT id, email, name, university, bio, avatar, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    return null;
  }

  const user = userResult.rows[0];

  // Get user skills
  const skillsResult = await pool.query(
    'SELECT skill_name FROM user_skills WHERE user_id = $1 ORDER BY created_at',
    [userId]
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    university: user.university,
    bio: user.bio,
    avatar: user.avatar,
    skills: skillsResult.rows.map(row => row.skill_name),
    createdAt: new Date(user.created_at).getTime()
  };
}
