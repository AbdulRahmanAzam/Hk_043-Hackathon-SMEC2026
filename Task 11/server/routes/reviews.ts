import express from 'express';
import {
  submitReview,
  getReview,
  getTaskReviews
} from '../controllers/reviewController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/:id', getReview);
router.get('/task/:taskId', getTaskReviews);

// Protected routes
router.post('/', authenticateToken, submitReview);

export default router;
