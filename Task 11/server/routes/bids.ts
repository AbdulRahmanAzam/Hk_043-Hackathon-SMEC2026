import express from 'express';
import {
  getTaskBids,
  submitBid,
  getUserBids,
  updateBid,
  withdrawBid
} from '../controllers/bidController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Protected routes
router.get('/my-bids', authenticateToken, getUserBids);
router.get('/task/:taskId', getTaskBids);
router.post('/task/:taskId', authenticateToken, submitBid);
router.patch('/:id', authenticateToken, updateBid);
router.delete('/:id', authenticateToken, withdrawBid);

export default router;
