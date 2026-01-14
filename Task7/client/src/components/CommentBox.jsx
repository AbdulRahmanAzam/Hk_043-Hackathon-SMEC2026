import { useState } from 'react';
import axios from 'axios';
import API_URL, { getAuthHeaders } from '../config/api';

export default function CommentBox({ postId, currentUser, onCommentAdded }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/comments`, {
        postId,
        userId: currentUser._id,
        text
      }, { headers: getAuthHeaders() });
      setText('');
      if (onCommentAdded) onCommentAdded();
    } catch (error) {
      console.error('Error posting comment:', error);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-center bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-2xl border border-gray-200/50">
      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-lg">
        {currentUser.username.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 relative">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write a comment..."
          className="w-full px-5 py-3 pr-12 border-0 bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
          disabled={loading}
        />
        {text && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
            {text.length}/500
          </div>
        )}
      </div>
      <button
        type="submit"
        disabled={loading || !text.trim()}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 flex items-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="hidden sm:inline">Posting...</span>
          </>
        ) : (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="hidden sm:inline">Post</span>
          </>
        )}
      </button>
    </form>
  );
}
