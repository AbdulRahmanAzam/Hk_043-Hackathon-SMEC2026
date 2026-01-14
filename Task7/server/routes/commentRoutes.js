import express from 'express';
import {
  createComment,
  getPostComments,
  deleteComment
} from '../controllers/commentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, createComment);
router.get('/post/:postId', getPostComments);
router.delete('/:id', authenticate, deleteComment);

export default router;
