import Comment from '../models/Comment.js';

export const createComment = async (req, res) => {
  try {
    const { postId, userId, text } = req.body;
    
    const comment = new Comment({
      post: postId,
      user: userId,
      text
    });
    
    await comment.save();
    
    const populatedComment = await Comment.findById(comment._id).populate('user', 'username');
    
    res.json(populatedComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPostComments = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .populate('user', 'username')
      .sort({ createdAt: -1 });
    
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    await Comment.findByIdAndDelete(req.params.id);
    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
