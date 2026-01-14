import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import CommentBox from '../components/CommentBox';
import API_URL, { getAuthHeaders } from '../config/api';

export default function Post() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
    loadPost(user);
    loadComments();
  }, [id, navigate]);

  const loadPost = async (user) => {
    try {
      const response = await axios.get(`${API_URL}/api/posts/${id}`);
      setPost(response.data);
      setIsLiked(response.data.likes.includes(user._id));
      setLikesCount(response.data.likes.length);
    } catch (error) {
      console.error('Error loading post:', error);
    }
    setLoading(false);
  };

  const loadComments = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/comments/post/${id}`);
      setComments(response.data);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleLike = async () => {
    try {
      if (isLiked) {
        await axios.post(`${API_URL}/api/posts/${id}/unlike`, {
          userId: currentUser._id
        }, { headers: getAuthHeaders() });
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        await axios.post(`${API_URL}/api/posts/${id}/like`, {
          userId: currentUser._id
        }, { headers: getAuthHeaders() });
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading || !currentUser || !post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <Navbar currentUser={currentUser} />
        <div className="text-center py-20">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading post...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Navbar currentUser={currentUser} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8 border-b border-gray-100">
            <div className="flex items-center mb-6">
              <div
                onClick={() => navigate(`/profile/${post.user.username}`)}
                className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-2xl cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110"
              >
                {post.user.username.charAt(0).toUpperCase()}
              </div>
              <div className="ml-4">
                <p
                  onClick={() => navigate(`/profile/${post.user.username}`)}
                  className="font-bold text-xl text-gray-900 cursor-pointer hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 transition-all"
                >
                  {post.user.username}
                </p>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  {formatDate(post.createdAt)}
                </p>
              </div>
            </div>

            <p className="text-gray-800 text-lg leading-relaxed mb-6">{post.content}</p>

            {post.image && (
              <div className="rounded-2xl overflow-hidden mb-6 shadow-lg">
                <img
                  src={`${API_URL}${post.image}`}
                  alt="Post"
                  className="w-full h-auto"
                />
              </div>
            )}

            <div className="flex items-center gap-6 pt-6 border-t border-gray-100">
              <button
                onClick={handleLike}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold text-lg transition-all duration-300 ${
                  isLiked 
                    ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                    : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
                }`}
              >
                <svg
                  className={`w-8 h-8 transition-all duration-300 ${isLiked ? 'fill-red-500 scale-110' : 'fill-none'}`}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span>{likesCount} {likesCount === 1 ? 'like' : 'likes'}</span>
              </button>

              <div className="flex items-center gap-3 text-gray-600 text-lg font-semibold">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <span>{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span>
              </div>
            </div>
          </div>

          <div className="p-8 bg-gradient-to-br from-gray-50 to-blue-50">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Comments
            </h3>

            <div className="mb-6">
              <CommentBox
                postId={id}
                currentUser={currentUser}
                onCommentAdded={loadComments}
              />
            </div>

            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment._id} className="flex gap-3 bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-md hover:shadow-lg transition-all duration-300">
                  <div
                    onClick={() => navigate(`/profile/${comment.user.username}`)}
                    className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
                  >
                    {comment.user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p
                      onClick={() => navigate(`/profile/${comment.user.username}`)}
                      className="font-bold text-gray-900 mb-1 cursor-pointer hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 transition-all"
                    >
                      {comment.user.username}
                    </p>
                    <p className="text-gray-800 mb-2">{comment.text}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      {formatDate(comment.createdAt)}
                    </p>
                  </div>
                </div>
              ))}

              {comments.length === 0 && (
                <div className="text-center py-12 bg-white/50 rounded-2xl border-2 border-dashed border-gray-200">
                  <svg className="w-16 h-16 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-gray-500 font-medium">No comments yet</p>
                  <p className="text-gray-400 text-sm mt-1">Be the first to comment!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
