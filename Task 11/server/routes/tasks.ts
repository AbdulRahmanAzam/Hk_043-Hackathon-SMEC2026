import express from 'express';
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  acceptBid,
  completeTask,
  getMyTasks
} from '../controllers/taskController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getTasks);
router.get('/:id', getTaskById);

// Protected routes
router.post('/', authenticateToken, createTask);
router.patch('/:id', authenticateToken, updateTask);
router.delete('/:id', authenticateToken, deleteTask);
router.post('/:id/accept-bid', authenticateToken, acceptBid);
router.post('/:id/complete', authenticateToken, completeTask);
router.get('/my/posts', authenticateToken, getMyTasks);

export default router;
