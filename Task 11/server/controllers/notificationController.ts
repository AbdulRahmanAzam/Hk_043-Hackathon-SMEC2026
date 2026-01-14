import { Response } from 'express';
import { pool } from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

// Get user notifications
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { unreadOnly = 'false' } = req.query;

    let query = `
      SELECT id, type, title, message, link, is_read, created_at
      FROM notifications
      WHERE user_id = $1
    `;

    if (unreadOnly === 'true') {
      query += ` AND is_read = FALSE`;
    }

    query += ` ORDER BY created_at DESC LIMIT 50`;

    const result = await pool.query(query, [userId]);

    const notifications = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      link: row.link,
      isRead: row.is_read,
      createdAt: new Date(row.created_at).getTime()
    }));

    res.json({ notifications });
  } catch (error) {
    throw error;
  }
};

// Mark notification as read
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Verify ownership
    const check = await pool.query(
      'SELECT user_id FROM notifications WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      throw new AppError('Notification not found', 404);
    }

    if (check.rows[0].user_id !== userId) {
      throw new AppError('Unauthorized', 403);
    }

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1',
      [id]
    );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    throw error;
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    throw error;
  }
};

// Delete notification
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    // Verify ownership
    const check = await pool.query(
      'SELECT user_id FROM notifications WHERE id = $1',
      [id]
    );

    if (check.rows.length === 0) {
      throw new AppError('Notification not found', 404);
    }

    if (check.rows[0].user_id !== userId) {
      throw new AppError('Unauthorized', 403);
    }

    await pool.query('DELETE FROM notifications WHERE id = $1', [id]);

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    throw error;
  }
};

// Get unread count
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    throw error;
  }
};
