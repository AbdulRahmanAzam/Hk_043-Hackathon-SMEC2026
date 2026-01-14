import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL, { getAuthHeaders } from '../config/api';

export default function PostCard({ post, currentUser, onUpdate }) {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(post.likes?.includes(currentUser?._id));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [isHovered, setIsHovered] = useState(false);

  const handleLike = async () => {
    try {
      if (isLiked) {
        await axios.post(`${API_URL}/api/posts/${post._id}/unlike`, {
          userId: currentUser._id
        }, { headers: getAuthHeaders() });
        setIsLiked(false);
        setLikesCount(prev => prev - 1);
      } else {
        await axios.post(`${API_URL}/api/posts/${post._id}/like`, {
          userId: currentUser._id
        }, { headers: getAuthHeaders() });
        setIsLiked(true);
        setLikesCount(prev => prev + 1);
      }
      if (onUpdate) onUpdate();
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

  return (
    <div 
      className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div
            onClick={() => navigate(`/profile/${post.user.username}`)}
            className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg cursor-pointer shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
          >
            {post.user.username.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3 flex-1">
            <p
              onClick={() => navigate(`/profile/${post.user.username}`)}
              className="font-bold text-gray-900 cursor-pointer hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 transition-all"
            >
              {post.user.username}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {formatDate(post.createdAt)}
            </p>
          </div>
        </div>

        <p className="text-gray-800 mb-4 leading-relaxed text-base">{post.content}</p>

        {post.image && (
          <div className="relative mb-4 rounded-xl overflow-hidden group cursor-pointer" onClick={() => navigate(`/post/${post._id}`)}>
            <img
              src={`${API_URL}${post.image}`}
              alt="Post"
              className="w-full h-auto transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </div>
        )}

        <div className="flex items-center gap-4 pt-4 border-t border-gray-100">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all duration-300 ${
              isLiked 
                ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                : 'text-gray-600 hover:text-red-500 hover:bg-red-50'
            }`}
          >
            <svg
              className={`w-6 h-6 transition-all duration-300 ${isLiked ? 'fill-red-500 scale-110' : 'fill-none'}`}
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
            <span>{likesCount}</span>
          </button>

          <button
            onClick={() => navigate(`/post/${post._id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <span>Comment</span>
          </button>

          <button
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-all duration-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
