import { Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { validateBid, sanitize } from '../utils/validators.js';
import { AppError } from '../middleware/errorHandler.js';
import { emitTaskEvent } from '../socket/index.js';

// Get bids for a task
export const getTaskBids = async (req: AuthRequest, res: Response) => {
  try {
    const { taskId } = req.params;

    const result = await pool.query(
      `SELECT 
        b.id, b.task_id, b.bidder_id, b.amount, b.time_estimate, b.message, b.status, b.created_at,
        u.name as bidder_name, u.avatar as bidder_avatar
      FROM bids b
      LEFT JOIN users u ON b.bidder_id = u.id
      WHERE b.task_id = $1
      ORDER BY b.created_at DESC`,
      [taskId]
    );

    const bids = result.rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      bidderId: row.bidder_id,
      bidderName: row.bidder_name,
      bidderAvatar: row.bidder_avatar,
      amount: parseFloat(row.amount),
      timeEstimate: row.time_estimate,
      message: row.message,
      status: row.status,
      createdAt: new Date(row.created_at).getTime()
    }));

    res.json({ bids });
  } catch (error) {
    throw error;
  }
};

// Submit a bid
export const submitBid = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { taskId } = req.params;
    const { amount, timeEstimate, message } = req.body;

    // Validate
    const errors = validateBid({ amount, timeEstimate, message });
    if (errors.length > 0) {
      throw new AppError(errors.join(', '), 400);
    }

    // Check if task exists and is open
    const taskCheck = await pool.query(
      'SELECT id, poster_id, status FROM tasks WHERE id = $1',
      [taskId]
    );

    if (taskCheck.rows.length === 0) {
      throw new AppError('Task not found', 404);
    }

    const task = taskCheck.rows[0];

    if (task.status !== 'OPEN') {
      throw new AppError('Can only bid on open tasks', 400);
    }

    if (task.poster_id === userId) {
      throw new AppError('Cannot bid on your own task', 400);
    }

    // Check if user already bid on this task
    const existingBid = await pool.query(
      'SELECT id FROM bids WHERE task_id = $1 AND bidder_id = $2',
      [taskId, userId]
    );

    if (existingBid.rows.length > 0) {
      throw new AppError('You have already placed a bid on this task', 409);
    }

    // Create bid
    const result = await pool.query(
      `INSERT INTO bids (task_id, bidder_id, amount, time_estimate, message, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')
       RETURNING id, task_id, bidder_id, amount, time_estimate, message, status, created_at`,
      [taskId, userId, amount, sanitize(timeEstimate), sanitize(message)]
    );

    const bid = result.rows[0];

    // Get bidder name
    const userResult = await pool.query('SELECT name, avatar FROM users WHERE id = $1', [userId]);

    // Create notification for task poster
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link)
       VALUES ($1, 'BID_RECEIVED', 'New Bid on Your Task', $2, $3)`,
      [
        task.poster_id,
        `${userResult.rows[0].name} placed a bid of $${amount}`,
        `/tasks/${taskId}`
      ]
    );

    const formattedBid = {
      id: bid.id,
      taskId: bid.task_id,
      bidderId: bid.bidder_id,
      bidderName: userResult.rows[0].name,
      bidderAvatar: userResult.rows[0].avatar,
      amount: parseFloat(bid.amount),
      timeEstimate: bid.time_estimate,
      message: bid.message,
      status: bid.status,
      createdAt: new Date(bid.created_at).getTime()
    };

    // Emit socket event
    emitTaskEvent('bid:created', { taskId, bid: formattedBid });

    res.status(201).json({ bid: formattedBid });
  } catch (error) {
    throw error;
  }
};

// Get user's bids
export const getUserBids = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT 
        b.id, b.task_id, b.bidder_id, b.amount, b.time_estimate, b.message, b.status, b.created_at,
        t.title as task_title, t.status as task_status
      FROM bids b
      LEFT JOIN tasks t ON b.task_id = t.id
      WHERE b.bidder_id = $1
      ORDER BY b.created_at DESC`,
      [userId]
    );

    const bids = result.rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      taskTitle: row.task_title,
      taskStatus: row.task_status,
      amount: parseFloat(row.amount),
      timeEstimate: row.time_estimate,
      message: row.message,
      status: row.status,
      createdAt: new Date(row.created_at).getTime()
    }));

    res.json({ bids });
  } catch (error) {
    throw error;
  }
};

// Update bid
export const updateBid = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { amount, timeEstimate, message } = req.body;

    // Check if user owns the bid
    const bidCheck = await pool.query(
      'SELECT bidder_id, status FROM bids WHERE id = $1',
      [id]
    );

    if (bidCheck.rows.length === 0) {
      throw new AppError('Bid not found', 404);
    }

    if (bidCheck.rows[0].bidder_id !== userId) {
      throw new AppError('You can only update your own bids', 403);
    }

    if (bidCheck.rows[0].status !== 'PENDING') {
      throw new AppError('Cannot update bid that has been accepted or rejected', 400);
    }

    // Validate
    const errors = validateBid({ amount, timeEstimate, message });
    if (errors.length > 0) {
      throw new AppError(errors.join(', '), 400);
    }

    // Update bid
    const result = await pool.query(
      `UPDATE bids 
       SET amount = $1, time_estimate = $2, message = $3
       WHERE id = $4
       RETURNING *`,
      [amount, sanitize(timeEstimate), sanitize(message), id]
    );

    const bid = result.rows[0];

    res.json({ 
      bid: {
        id: bid.id,
        amount: parseFloat(bid.amount),
        timeEstimate: bid.time_estimate,
        message: bid.message
      }
    });
  } catch (error) {
    throw error;
  }
};

// Withdraw bid
export const withdrawBid = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Check if user owns the bid
    const bidCheck = await pool.query(
      'SELECT bidder_id, status FROM bids WHERE id = $1',
      [id]
    );

    if (bidCheck.rows.length === 0) {
      throw new AppError('Bid not found', 404);
    }

    if (bidCheck.rows[0].bidder_id !== userId) {
      throw new AppError('You can only withdraw your own bids', 403);
    }

    if (bidCheck.rows[0].status !== 'PENDING') {
      throw new AppError('Cannot withdraw bid that has been accepted or rejected', 400);
    }

    // Delete or mark as withdrawn
    await pool.query(
      `UPDATE bids SET status = 'WITHDRAWN' WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Bid withdrawn successfully' });
  } catch (error) {
    throw error;
  }
};
