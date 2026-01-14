import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import API_URL, { getAuthHeaders } from '../config/api';

export default function FollowersListModal({ 
  isOpen, 
  onClose, 
  type, 
  userList, 
  currentUser,
  onFollowUpdate 
}) {
  const navigate = useNavigate();
  const [followingIds, setFollowingIds] = useState([]);

  useEffect(() => {
    if (currentUser) {
      setFollowingIds(currentUser.following || []);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleFollow = async (userId, isFollowing) => {
    try {
      if (isFollowing) {
        await axios.post(`${API_URL}/api/users/${userId}/unfollow`, {
          currentUserId: currentUser._id
        }, { headers: getAuthHeaders() });
        setFollowingIds(prev => prev.filter(id => id !== userId));
      } else {
        await axios.post(`${API_URL}/api/users/${userId}/follow`, {
          currentUserId: currentUser._id
        }, { headers: getAuthHeaders() });
        setFollowingIds(prev => [...prev, userId]);
      }

      const updatedUser = JSON.parse(localStorage.getItem('currentUser'));
      if (isFollowing) {
        updatedUser.following = updatedUser.following.filter(id => id !== userId);
      } else {
        updatedUser.following = [...(updatedUser.following || []), userId];
      }
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      
      if (onFollowUpdate) {
        onFollowUpdate();
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleUserClick = (username) => {
    onClose();
    navigate(`/profile/${username}`);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden border border-white/20 transform transition-all duration-300 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 flex items-center justify-between shadow-lg z-10">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            {type === 'followers' ? 'Followers' : 'Following'}
            <span className="ml-2 px-3 py-1 bg-white/20 rounded-full text-sm">
              {userList.length}
            </span>
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-all duration-300 transform hover:scale-110 hover:rotate-90"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-88px)] custom-scrollbar">
          {userList.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="text-gray-500 font-medium">
                No {type === 'followers' ? 'followers' : 'following'} yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {userList.map((user) => {
                const isCurrentUser = user._id === currentUser._id;
                const isFollowing = followingIds.includes(user._id);

                return (
                  <div 
                    key={user._id} 
                    className="p-4 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div 
                        className="flex items-center gap-3 flex-1 cursor-pointer"
                        onClick={() => handleUserClick(user.username)}
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-110">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 transition-all">
                            {user.username}
                          </p>
                        </div>
                      </div>

                      {!isCurrentUser && (
                        <button
                          onClick={() => handleFollow(user._id, isFollowing)}
                          className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 ${
                            isFollowing
                              ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 hover:from-gray-200 hover:to-gray-300'
                              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                          }`}
                        >
                          {isFollowing ? (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                              Following
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Follow
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
