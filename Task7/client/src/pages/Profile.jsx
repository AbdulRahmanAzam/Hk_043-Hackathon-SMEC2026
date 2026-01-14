import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../components/Navbar';
import PostCard from '../components/PostCard';
import FollowersListModal from '../components/FollowersListModal';
import API_URL, { getAuthHeaders } from '../config/api';

export default function Profile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [profileUser, setProfileUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (!user) {
      navigate('/login');
      return;
    }
    setCurrentUser(user);
    loadProfile(user);
  }, [username, navigate]);

  const loadProfile = async (user) => {
    try {
      const userResponse = await axios.get(`${API_URL}/api/users/username/${username}`);
      const profileData = userResponse.data;
      
      setProfileUser(profileData);
      setBio(profileData.bio);
      setIsFollowing(profileData.followers.some(f => f._id === user._id));

      const postsData = await axios.get(`${API_URL}/api/posts/user/${profileData._id}`);
      setPosts(postsData.data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
    setLoading(false);
  };

  const handleFollow = async () => {
    try {
      if (isFollowing) {
        await axios.post(`${API_URL}/api/users/${profileUser._id}/unfollow`, {
          currentUserId: currentUser._id
        }, { headers: getAuthHeaders() });
        setIsFollowing(false);
        setProfileUser(prev => ({
          ...prev,
          followers: prev.followers.filter(f => f._id !== currentUser._id)
        }));
        
        const updatedUser = { 
          ...currentUser, 
          following: currentUser.following.filter(id => id !== profileUser._id)
        };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
      } else {
        await axios.post(`${API_URL}/api/users/${profileUser._id}/follow`, {
          currentUserId: currentUser._id
        }, { headers: getAuthHeaders() });
        setIsFollowing(true);
        setProfileUser(prev => ({
          ...prev,
          followers: [...prev.followers, { _id: currentUser._id, username: currentUser.username }]
        }));
        
        const updatedUser = { 
          ...currentUser, 
          following: [...(currentUser.following || []), profileUser._id]
        };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
    }
  };

  const handleUpdateBio = async () => {
    try {
      await axios.put(`${API_URL}/api/users/${currentUser._id}`, { bio }, { headers: getAuthHeaders() });
      setEditingBio(false);
      const updatedUser = { ...currentUser, bio };
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
    } catch (error) {
      console.error('Error updating bio:', error);
    }
  };

  if (loading || !currentUser || !profileUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <Navbar currentUser={currentUser} />
        <div className="text-center py-20">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser._id === profileUser._id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <Navbar currentUser={currentUser} />

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-3xl shadow-2xl p-8 mb-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="relative group">
              <div className="w-32 h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-5xl font-bold shadow-2xl group-hover:shadow-3xl transition-all duration-300 transform group-hover:scale-105">
                {profileUser.username.charAt(0).toUpperCase()}
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full blur-2xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {profileUser.username}
                </h1>
                {!isOwnProfile && (
                  <button
                    onClick={handleFollow}
                    className={`px-8 py-2.5 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 ${
                      isFollowing
                        ? 'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800 hover:from-gray-300 hover:to-gray-400'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                    }`}
                  >
                    {isFollowing ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Following
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Follow
                      </span>
                    )}
                  </button>
                )}
              </div>

              <div className="flex justify-center md:justify-start gap-8 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {posts.length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium">Posts</div>
                </div>
                <div 
                  className="text-center cursor-pointer group transition-all duration-300 hover:scale-105"
                  onClick={() => {
                    setModalType('followers');
                    setShowModal(true);
                  }}
                >
                  <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent group-hover:from-purple-700 group-hover:to-pink-700 transition-all">
                    {profileUser.followers.length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium group-hover:text-purple-600 transition-colors">Followers</div>
                </div>
                <div 
                  className="text-center cursor-pointer group transition-all duration-300 hover:scale-105"
                  onClick={() => {
                    setModalType('following');
                    setShowModal(true);
                  }}
                >
                  <div className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent group-hover:from-pink-700 group-hover:to-red-700 transition-all">
                    {profileUser.following.length}
                  </div>
                  <div className="text-sm text-gray-600 font-medium group-hover:text-pink-600 transition-colors">Following</div>
                </div>
              </div>

              {isOwnProfile && editingBio ? (
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Add a bio..."
                    className="flex-1 px-4 py-2 border-0 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleUpdateBio}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingBio(false)}
                    className="px-6 py-2 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3 mb-4">
                  {profileUser.bio ? (
                    <p className="text-gray-700 italic">"{profileUser.bio}"</p>
                  ) : isOwnProfile ? (
                    <p className="text-gray-500">No bio yet</p>
                  ) : null}
                  {isOwnProfile && (
                    <button
                      onClick={() => setEditingBio(true)}
                      className="text-blue-600 hover:text-purple-600 text-sm font-medium transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Posts
          </h2>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-lg border border-white/20 rounded-2xl shadow-xl p-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-600">
              {isOwnProfile ? 'Share your first post!' : "This user hasn't posted anything yet"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                currentUser={currentUser}
                onUpdate={() => loadProfile(currentUser)}
              />
            ))}
          </div>
        )}
      </div>

      <FollowersListModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        type={modalType}
        userList={modalType === 'followers' ? profileUser.followers : profileUser.following}
        currentUser={currentUser}
        onFollowUpdate={() => loadProfile(currentUser)}
      />
    </div>
  );
}
