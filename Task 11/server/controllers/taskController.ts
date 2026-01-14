import { Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { validateTask, sanitize } from '../utils/validators.js';
import { AppError } from '../middleware/errorHandler.js';
import { emitTaskEvent } from '../socket/index.js';

// Get all tasks with filters
export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { status, category, search, sortBy = 'newest', page = '1', limit = '20' } = req.query;

    let query = `
      SELECT 
        t.id, t.title, t.description, t.poster_id, t.assigned_to_id, 
        t.status, t.budget, t.deadline, t.category, t.created_at, t.updated_at,
        u.name as poster_name,
        COUNT(b.id) FILTER (WHERE b.status = 'PENDING') as bids_count
      FROM tasks t
      LEFT JOIN users u ON t.poster_id = u.id
      LEFT JOIN bids b ON t.id = b.task_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Filter by status
    if (status && status !== 'ALL') {
      query += ` AND t.status = $${paramIndex++}`;
      params.push(status);
    }

    // Filter by category
    if (category) {
      query += ` AND t.category = $${paramIndex++}`;
      params.push(category);
    }

    // Search in title and description
    if (search) {
      query += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Group by task fields
    query += ` GROUP BY t.id, u.name`;

    // Sorting
    switch (sortBy) {
      case 'budget_high':
        query += ' ORDER BY t.budget DESC';
        break;
      case 'budget_low':
        query += ' ORDER BY t.budget ASC';
        break;
      case 'deadline':
        query += ' ORDER BY t.deadline ASC';
        break;
      case 'newest':
      default:
        query += ' ORDER BY t.created_at DESC';
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limitNum, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM tasks WHERE 1=1';
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (status && status !== 'ALL') {
      countQuery += ` AND status = $${countParamIndex++}`;
      countParams.push(status);
    }

    if (category) {
      countQuery += ` AND category = $${countParamIndex++}`;
      countParams.push(category);
    }

    if (search) {
      countQuery += ` AND (title ILIKE $${countParamIndex} OR description ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Format response
    const tasks = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      posterId: row.poster_id,
      posterName: row.poster_name,
      assignedToId: row.assigned_to_id,
      status: row.status,
      budget: parseFloat(row.budget),
      deadline: row.deadline,
      category: row.category,
      createdAt: new Date(row.created_at).getTime(),
      bidsCount: parseInt(row.bids_count) || 0
    }));

    res.json({
      tasks,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    throw error;
  }
};

// Get single task by ID
export const getTaskById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        t.id, t.title, t.description, t.poster_id, t.assigned_to_id, 
        t.status, t.budget, t.deadline, t.category, t.created_at, t.updated_at,
        u.name as poster_name, u.email as poster_email, u.avatar as poster_avatar,
        COUNT(b.id) FILTER (WHERE b.status = 'PENDING') as bids_count
      FROM tasks t
      LEFT JOIN users u ON t.poster_id = u.id
      LEFT JOIN bids b ON t.id = b.task_id
      WHERE t.id = $1
      GROUP BY t.id, u.name, u.email, u.avatar`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new AppError('Task not found', 404);
    }

    const row = result.rows[0];
    const task = {
      id: row.id,
      title: row.title,
      description: row.description,
      posterId: row.poster_id,
      posterName: row.poster_name,
      posterEmail: row.poster_email,
      posterAvatar: row.poster_avatar,
      assignedToId: row.assigned_to_id,
      status: row.status,
      budget: parseFloat(row.budget),
      deadline: row.deadline,
      category: row.category,
      createdAt: new Date(row.created_at).getTime(),
      bidsCount: parseInt(row.bids_count) || 0
    };

    res.json({ task });
  } catch (error) {
    throw error;
  }
};

// Create new task
export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { title, description, budget, deadline, category } = req.body;

    // Validate
    const errors = validateTask({ title, description, budget, deadline, category });
    if (errors.length > 0) {
      throw new AppError(errors.join(', '), 400);
    }

    // Create task
    const result = await pool.query(
      `INSERT INTO tasks (title, description, poster_id, budget, deadline, category, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'OPEN')
       RETURNING id, title, description, poster_id, assigned_to_id, status, budget, deadline, category, created_at`,
      [sanitize(title), sanitize(description), userId, budget, deadline, sanitize(category)]
    );

    const task = result.rows[0];

    // Get poster name
    const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);

    const formattedTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      posterId: task.poster_id,
      posterName: userResult.rows[0].name,
      assignedToId: task.assigned_to_id,
      status: task.status,
      budget: parseFloat(task.budget),
      deadline: task.deadline,
      category: task.category,
      createdAt: new Date(task.created_at).getTime(),
      bidsCount: 0
    };

    // Emit socket event
    emitTaskEvent('task:created', formattedTask);

    res.status(201).json({ task: formattedTask });
  } catch (error) {
    throw error;
  }
};

// Update task
export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { title, description, budget, deadline, category } = req.body;

    // Check if user owns the task
    const taskCheck = await pool.query(
      'SELECT poster_id FROM tasks WHERE id = $1',
      [id]
    );

    if (taskCheck.rows.length === 0) {
      throw new AppError('Task not found', 404);
    }

    if (taskCheck.rows[0].poster_id !== userId) {
      throw new AppError('You can only update your own tasks', 403);
    }

    // Validate
    const errors = validateTask({ title, description, budget, deadline, category });
    if (errors.length > 0) {
      throw new AppError(errors.join(', '), 400);
    }

    // Update task
    const result = await pool.query(
      `UPDATE tasks 
       SET title = $1, description = $2, budget = $3, deadline = $4, category = $5
       WHERE id = $6
       RETURNING *`,
      [sanitize(title), sanitize(description), budget, deadline, sanitize(category), id]
    );

    const task = result.rows[0];

    // Emit socket event
    emitTaskEvent('task:updated', {
      id: task.id,
      title: task.title,
      description: task.description,
      budget: parseFloat(task.budget),
      deadline: task.deadline,
      category: task.category
    });

    res.json({ task });
  } catch (error) {
    throw error;
  }
};

// Delete task
export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Check if user owns the task
    const taskCheck = await pool.query(
      'SELECT poster_id, status FROM tasks WHERE id = $1',
      [id]
    );

    if (taskCheck.rows.length === 0) {
      throw new AppError('Task not found', 404);
    }

    if (taskCheck.rows[0].poster_id !== userId) {
      throw new AppError('You can only delete your own tasks', 403);
    }

    if (taskCheck.rows[0].status !== 'OPEN') {
      throw new AppError('Cannot delete task that is in progress or completed', 400);
    }

    // Delete task (cascades to bids)
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    // Emit socket event
    emitTaskEvent('task:deleted', { id });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    throw error;
  }
};

// Accept bid
export const acceptBid = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id: taskId } = req.params;
    const { bidId } = req.body;

    if (!bidId) {
      throw new AppError('Bid ID is required', 400);
    }

    // Check if user owns the task
    const taskCheck = await pool.query(
      'SELECT poster_id, status FROM tasks WHERE id = $1',
      [taskId]
    );

    if (taskCheck.rows.length === 0) {
      throw new AppError('Task not found', 404);
    }

    if (taskCheck.rows[0].poster_id !== userId) {
      throw new AppError('Only task poster can accept bids', 403);
    }

    if (taskCheck.rows[0].status !== 'OPEN') {
      throw new AppError('Can only accept bids on open tasks', 400);
    }

    // Get bid details
    const bidCheck = await pool.query(
      'SELECT bidder_id FROM bids WHERE id = $1 AND task_id = $2',
      [bidId, taskId]
    );

    if (bidCheck.rows.length === 0) {
      throw new AppError('Bid not found', 404);
    }

    const bidderId = bidCheck.rows[0].bidder_id;

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update task status and assign to bidder
      await client.query(
        `UPDATE tasks 
         SET status = 'IN_PROGRESS', assigned_to_id = $1 
         WHERE id = $2`,
        [bidderId, taskId]
      );

      // Update bid status
      await client.query(
        `UPDATE bids SET status = 'ACCEPTED' WHERE id = $1`,
        [bidId]
      );

      // Reject other bids
      await client.query(
        `UPDATE bids SET status = 'REJECTED' WHERE task_id = $1 AND id != $2`,
        [taskId, bidId]
      );

      // Create notification for bidder
      await client.query(
        `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES ($1, 'BID_ACCEPTED', 'Your Bid Was Accepted!', 'Your bid was accepted. Start working on the task!', $2)`,
        [bidderId, `/tasks/${taskId}`]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Emit socket events
    emitTaskEvent('task:updated', { id: taskId, status: 'IN_PROGRESS', assignedToId: bidderId });
    emitTaskEvent('bid:accepted', { taskId, bidId, bidderId });

    res.json({ message: 'Bid accepted successfully' });
  } catch (error) {
    throw error;
  }
};

// Complete task
export const completeTask = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id: taskId } = req.params;

    // Check if user owns the task
    const taskCheck = await pool.query(
      'SELECT poster_id, status, assigned_to_id, budget FROM tasks WHERE id = $1',
      [taskId]
    );

    if (taskCheck.rows.length === 0) {
      throw new AppError('Task not found', 404);
    }

    const task = taskCheck.rows[0];

    if (task.poster_id !== userId) {
      throw new AppError('Only task poster can mark task as completed', 403);
    }

    if (task.status !== 'IN_PROGRESS') {
      throw new AppError('Can only complete tasks that are in progress', 400);
    }

    // Update task status
    await pool.query(
      `UPDATE tasks 
       SET status = 'COMPLETED', completed_at = NOW() 
       WHERE id = $1`,
      [taskId]
    );

    // Create notification for assignee
    if (task.assigned_to_id) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES ($1, 'TASK_COMPLETED', 'Task Completed!', 'The task has been marked as completed. Please leave a review!', $2)`,
        [task.assigned_to_id, `/tasks/${taskId}`]
      );
    }

    // Emit socket event
    emitTaskEvent('task:updated', { id: taskId, status: 'COMPLETED' });

    res.json({ message: 'Task marked as completed' });
  } catch (error) {
    throw error;
  }
};

// Get my posted tasks
export const getMyTasks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT 
        t.id, t.title, t.description, t.poster_id, t.assigned_to_id, 
        t.status, t.budget, t.deadline, t.category, t.created_at,
        COUNT(b.id) FILTER (WHERE b.status = 'PENDING') as bids_count
      FROM tasks t
      LEFT JOIN bids b ON t.id = b.task_id
      WHERE t.poster_id = $1
      GROUP BY t.id
      ORDER BY t.created_at DESC`,
      [userId]
    );

    const tasks = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      posterId: row.poster_id,
      assignedToId: row.assigned_to_id,
      status: row.status,
      budget: parseFloat(row.budget),
      deadline: row.deadline,
      category: row.category,
      createdAt: new Date(row.created_at).getTime(),
      bidsCount: parseInt(row.bids_count) || 0
    }));

    res.json({ tasks });
  } catch (error) {
    throw error;
  }
};
