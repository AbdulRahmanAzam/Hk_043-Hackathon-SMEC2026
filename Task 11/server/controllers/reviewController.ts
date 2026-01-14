import { Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { validateReview, sanitize } from '../utils/validators.js';
import { AppError } from '../middleware/errorHandler.js';

// Submit a review
export const submitReview = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { taskId, revieweeId, rating, comment } = req.body;

    if (!taskId || !revieweeId) {
      throw new AppError('Task ID and reviewee ID are required', 400);
    }

    // Validate review
    const errors = validateReview({ rating, comment });
    if (errors.length > 0) {
      throw new AppError(errors.join(', '), 400);
    }

    // Check if task is completed
    const taskCheck = await pool.query(
      'SELECT status, poster_id, assigned_to_id FROM tasks WHERE id = $1',
      [taskId]
    );

    if (taskCheck.rows.length === 0) {
      throw new AppError('Task not found', 404);
    }

    const task = taskCheck.rows[0];

    if (task.status !== 'COMPLETED') {
      throw new AppError('Can only review completed tasks', 400);
    }

    // Verify user is involved in the task
    if (task.poster_id !== userId && task.assigned_to_id !== userId) {
      throw new AppError('You can only review tasks you are involved in', 403);
    }

    // Verify reviewee is involved in the task
    if (task.poster_id !== revieweeId && task.assigned_to_id !== revieweeId) {
      throw new AppError('Invalid reviewee', 400);
    }

    // Cannot review yourself
    if (userId === revieweeId) {
      throw new AppError('Cannot review yourself', 400);
    }

    // Check if review already exists
    const existingReview = await pool.query(
      'SELECT id FROM reviews WHERE task_id = $1 AND reviewer_id = $2 AND reviewee_id = $3',
      [taskId, userId, revieweeId]
    );

    if (existingReview.rows.length > 0) {
      throw new AppError('You have already reviewed this person for this task', 409);
    }

    // Create review
    const result = await pool.query(
      `INSERT INTO reviews (task_id, reviewer_id, reviewee_id, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, task_id, reviewer_id, reviewee_id, rating, comment, created_at`,
      [taskId, userId, revieweeId, rating, sanitize(comment)]
    );

    const review = result.rows[0];

    // Create notification for reviewee
    const reviewerResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, 'REVIEW_RECEIVED', $2, $3, '/portfolio')`,
      [
        revieweeId,
        `You Received a ${rating}-Star Review!`,
        `${reviewerResult.rows[0].name} left you a review`
      ]
    );

    res.status(201).json({
      review: {
        id: review.id,
        taskId: review.task_id,
        rating: review.rating,
        comment: review.comment,
        createdAt: new Date(review.created_at).getTime()
      }
    });
  } catch (error) {
    throw error;
  }
};

// Get review by ID
export const getReview = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        r.id, r.task_id, r.reviewer_id, r.reviewee_id, r.rating, r.comment, r.created_at,
        reviewer.name as reviewer_name, reviewer.avatar as reviewer_avatar,
        reviewee.name as reviewee_name,
        t.title as task_title
      FROM reviews r
      LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id
      LEFT JOIN users reviewee ON r.reviewee_id = reviewee.id
      LEFT JOIN tasks t ON r.task_id = t.id
      WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Review not found', 404);
    }

    const row = result.rows[0];

    res.json({
      review: {
        id: row.id,
        taskId: row.task_id,
        taskTitle: row.task_title,
        reviewerId: row.reviewer_id,
        reviewerName: row.reviewer_name,
        reviewerAvatar: row.reviewer_avatar,
        revieweeId: row.reviewee_id,
        revieweeName: row.reviewee_name,
        rating: row.rating,
        comment: row.comment,
        createdAt: new Date(row.created_at).getTime()
      }
    });
  } catch (error) {
    throw error;
  }
};

// Get reviews for a task
export const getTaskReviews = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;

    const result = await pool.query(
      `SELECT 
        r.id, r.rating, r.comment, r.created_at,
        reviewer.name as reviewer_name, reviewer.avatar as reviewer_avatar,
        reviewee.name as reviewee_name
      FROM reviews r
      LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id
      LEFT JOIN users reviewee ON r.reviewee_id = reviewee.id
      WHERE r.task_id = $1
      ORDER BY r.created_at DESC`,
      [taskId]
    );

    const reviews = result.rows.map(row => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      reviewerName: row.reviewer_name,
      reviewerAvatar: row.reviewer_avatar,
      revieweeName: row.reviewee_name,
      createdAt: new Date(row.created_at).getTime()
    }));

    res.json({ reviews });
  } catch (error) {
    throw error;
  }
};
