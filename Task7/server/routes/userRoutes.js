import express from 'express';
import {
  getUserById,
  getUserByUsername,
  updateProfile,
  followUser,
  unfollowUser,
  searchUsers
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/search', searchUsers);
router.get('/:id', getUserById);
router.get('/username/:username', getUserByUsername);
router.put('/:id', authenticate, updateProfile);
router.post('/:id/follow', authenticate, followUser);
router.post('/:id/unfollow', authenticate, unfollowUser);

export default router;
