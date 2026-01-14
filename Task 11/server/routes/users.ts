import express from 'express';
import {
  getUserProfile,
  getUserPortfolio,
  getUserStats,
  getUserReviews,
  updateUserProfile,
  updateUserSkills
} from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/:id', getUserProfile);
router.get('/:id/portfolio', getUserPortfolio);
router.get('/:id/stats', getUserStats);
router.get('/:id/reviews', getUserReviews);

// Protected routes
router.patch('/:id', authenticateToken, updateUserProfile);
router.patch('/:id/skills', authenticateToken, updateUserSkills);

export default router;
