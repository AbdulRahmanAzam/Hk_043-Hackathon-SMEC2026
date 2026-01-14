import { Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { sanitize } from '../utils/validators.js';

// Get user profile
export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const userResult = await pool.query(
      'SELECT id, email, name, university, bio, avatar, created_at FROM users WHERE id = $1',
      [id]
    );

    if (userResult.rows.length === 0) {
      throw new AppError('User not found', 404);
    }

    const user = userResult.rows[0];

    // Get user skills
    const skillsResult = await pool.query(
      'SELECT skill_name FROM user_skills WHERE user_id = $1 ORDER BY created_at',
      [id]
    );

    const formattedUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      university: user.university,
      bio: user.bio,
      avatar: user.avatar,
      skills: skillsResult.rows.map(row => row.skill_name),
      createdAt: new Date(user.created_at).getTime()
    };

    res.json({ user: formattedUser });
  } catch (error) {
    throw error;
  }
};

// Get user portfolio
export const getUserPortfolio = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Get completed tasks
    const tasksResult = await pool.query(
      `SELECT 
        t.id as task_id, t.title, t.description, t.budget, t.completed_at, t.created_at,
        u.name as poster_name
      FROM tasks t
      LEFT JOIN users u ON t.poster_id = u.id
      WHERE t.assigned_to_id = $1 AND t.status = 'COMPLETED'
      ORDER BY t.completed_at DESC`,
      [id]
    );

    // Get reviews for completed tasks
    const reviewsResult = await pool.query(
      `SELECT r.task_id, r.rating, r.comment
       FROM reviews r
       WHERE r.reviewee_id = $1`,
      [id]
    );

    const reviewsMap = new Map();
    reviewsResult.rows.forEach(review => {
      reviewsMap.set(review.task_id, {
        rating: review.rating,
        comment: review.comment
      });
    });

    const portfolioItems = tasksResult.rows.map(row => {
      const review = reviewsMap.get(row.task_id);
      return {
        taskId: row.task_id,
        title: row.title,
        description: row.description,
        earned: parseFloat(row.budget),
        completedAt: row.completed_at ? new Date(row.completed_at).getTime() : new Date(row.created_at).getTime(),
        posterName: row.poster_name,
        rating: review?.rating,
        feedback: review?.comment
      };
    });

    // Calculate stats
    const totalEarned = portfolioItems.reduce((sum, item) => sum + item.earned, 0);
    const jobsCompleted = portfolioItems.length;
    const avgEarningsPerJob = jobsCompleted > 0 ? totalEarned / jobsCompleted : 0;

    // Calculate average rating
    const ratings = portfolioItems.filter(item => item.rating).map(item => item.rating as number);
    const averageRating = ratings.length > 0 
      ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
      : 0;

    res.json({
      items: portfolioItems,
      stats: {
        totalEarned,
        jobsCompleted,
        avgEarningsPerJob,
        averageRating,
        reviewCount: ratings.length
      }
    });
  } catch (error) {
    throw error;
  }
};

// Get user stats
export const getUserStats = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        COUNT(DISTINCT CASE WHEN t.poster_id = $1 THEN t.id END) as tasks_posted,
        COUNT(DISTINCT CASE WHEN t.assigned_to_id = $1 AND t.status = 'COMPLETED' THEN t.id END) as tasks_completed,
        COUNT(DISTINCT CASE WHEN b.bidder_id = $1 THEN b.id END) as bids_placed,
        COALESCE(SUM(CASE WHEN t.assigned_to_id = $1 AND t.status = 'COMPLETED' THEN t.budget ELSE 0 END), 0) as total_earned,
        COALESCE(AVG(CASE WHEN r.reviewee_id = $1 THEN r.rating END), 0) as avg_rating,
        COUNT(CASE WHEN r.reviewee_id = $1 THEN r.id END) as review_count
      FROM users u
      LEFT JOIN tasks t ON u.id = t.poster_id OR u.id = t.assigned_to_id
      LEFT JOIN bids b ON u.id = b.bidder_id
      LEFT JOIN reviews r ON u.id = r.reviewee_id
      WHERE u.id = $1
      GROUP BY u.id`,
      [id]
    );

    const stats = result.rows[0] || {};

    res.json({
      stats: {
        tasksPosted: parseInt(stats.tasks_posted) || 0,
        tasksCompleted: parseInt(stats.tasks_completed) || 0,
        bidsPlaced: parseInt(stats.bids_placed) || 0,
        totalEarned: parseFloat(stats.total_earned) || 0,
        averageRating: parseFloat(stats.avg_rating) || 0,
        reviewCount: parseInt(stats.review_count) || 0
      }
    });
  } catch (error) {
    throw error;
  }
};

// Get reviews for a user
export const getUserReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        r.id, r.task_id, r.rating, r.comment, r.created_at,
        t.title as task_title,
        u.name as reviewer_name, u.avatar as reviewer_avatar
      FROM reviews r
      LEFT JOIN tasks t ON r.task_id = t.id
      LEFT JOIN users u ON r.reviewer_id = u.id
      WHERE r.reviewee_id = $1
      ORDER BY r.created_at DESC`,
      [id]
    );

    const reviews = result.rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      taskTitle: row.task_title,
      rating: row.rating,
      comment: row.comment,
      reviewerName: row.reviewer_name,
      reviewerAvatar: row.reviewer_avatar,
      createdAt: new Date(row.created_at).getTime()
    }));

    res.json({ reviews });
  } catch (error) {
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { name, university, bio, avatar } = req.body;

    // Check authorization
    if (userId !== id) {
      throw new AppError('You can only update your own profile', 403);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      if (!name || name.trim().length < 2) {
        throw new AppError('Name must be at least 2 characters', 400);
      }
      updates.push(`name = $${paramCount}`);
      values.push(sanitize(name));
      paramCount++;
    }

    if (university !== undefined) {
      if (!university || university.trim().length < 2) {
        throw new AppError('University must be at least 2 characters', 400);
      }
      updates.push(`university = $${paramCount}`);
      values.push(sanitize(university));
      paramCount++;
    }

    if (bio !== undefined) {
      updates.push(`bio = $${paramCount}`);
      values.push(bio ? sanitize(bio) : null);
      paramCount++;
    }

    if (avatar !== undefined) {
      updates.push(`avatar = $${paramCount}`);
      values.push(avatar || null);
      paramCount++;
    }

    if (updates.length === 0) {
      throw new AppError('No fields to update', 400);
    }

    values.push(id);
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, email, name, university, bio, avatar, created_at
    `;

    const result = await pool.query(query, values);
    
    // Get user skills
    const skillsResult = await pool.query(
      'SELECT skill_name FROM user_skills WHERE user_id = $1 ORDER BY created_at',
      [id]
    );

    const updatedUser = {
      id: result.rows[0].id,
      email: result.rows[0].email,
      name: result.rows[0].name,
      university: result.rows[0].university,
      bio: result.rows[0].bio,
      avatar: result.rows[0].avatar,
      skills: skillsResult.rows.map(row => row.skill_name),
      createdAt: new Date(result.rows[0].created_at).getTime()
    };

    res.json({ user: updatedUser });
  } catch (error) {
    throw error;
  }
};

// Update user skills
export const updateUserSkills = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { skills } = req.body;

    // Check authorization
    if (userId !== id) {
      throw new AppError('You can only update your own skills', 403);
    }

    if (!Array.isArray(skills)) {
      throw new AppError('Skills must be an array', 400);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing skills
      await client.query('DELETE FROM user_skills WHERE user_id = $1', [id]);

      // Insert new skills
      for (const skill of skills) {
        if (skill && skill.trim().length > 0) {
          await client.query(
            'INSERT INTO user_skills (user_id, skill_name) VALUES ($1, $2)',
            [id, sanitize(skill.trim())]
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    res.json({ message: 'Skills updated successfully', skills });
  } catch (error) {
    throw error;
  }
};
