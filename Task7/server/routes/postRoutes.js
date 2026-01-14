import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  createPost,
  getFeed,
  getUserPosts,
  getPostById,
  likePost,
  unlikePost,
  deletePost
} from '../controllers/postController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/', authenticate, upload.single('image'), createPost);
router.get('/feed/:userId', getFeed);
router.get('/user/:userId', getUserPosts);
router.get('/:id', getPostById);
router.post('/:id/like', authenticate, likePost);
router.post('/:id/unlike', authenticate, unlikePost);
router.delete('/:id', authenticate, deletePost);

export default router;
