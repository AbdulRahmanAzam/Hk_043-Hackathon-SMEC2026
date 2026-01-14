import { User, Task, Bid, PortfolioItem } from '../types';
import { socketService } from './socket';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Helper function for API calls
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  
  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new ApiError(response.status, error.error || error.message || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error('Network error. Please check your connection.');
  }
}

// Authentication
export const login = async (email: string, password: string): Promise<{ user: User; token: string }> => {
  const data = await fetchAPI('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  // Store token
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));

  // Connect socket
  socketService.connect(data.token);

  return data;
};

export const register = async (userData: {
  email: string;
  password: string;
  name: string;
  university: string;
  skills: string[];
  bio?: string;
}): Promise<{ user: User; token: string }> => {
  const data = await fetchAPI('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });

  // Store token
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));

  // Connect socket
  socketService.connect(data.token);

  return data;
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const data = await fetchAPI('/api/auth/me');
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // Connect socket if we have a token
    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect(token);
    }
    
    return data.user;
  } catch (error) {
    // If unauthorized, clear storage
    if (error instanceof ApiError && error.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return null;
  }
};

export const logout = async (): Promise<void> => {
  try {
    await fetchAPI('/api/auth/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    socketService.disconnect();
  }
};

// Tasks
export const getTasks = async (filters?: {
  status?: string;
  category?: string;
  search?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}): Promise<{ tasks: Task[]; total: number; page: number }> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, value.toString());
      }
    });
  }

  const query = params.toString();
  return await fetchAPI(`/api/tasks${query ? `?${query}` : ''}`);
};

export const getTaskById = async (id: string): Promise<Task> => {
  const data = await fetchAPI(`/api/tasks/${id}`);
  return data.task;
};

export const createTask = async (taskData: {
  title: string;
  description: string;
  budget: number;
  deadline: string;
  category: string;
}): Promise<Task> => {
  const data = await fetchAPI('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData),
  });
  return data.task;
};

export const updateTask = async (id: string, taskData: Partial<Task>): Promise<Task> => {
  const data = await fetchAPI(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(taskData),
  });
  return data.task;
};

export const deleteTask = async (id: string): Promise<void> => {
  await fetchAPI(`/api/tasks/${id}`, { method: 'DELETE' });
};

export const acceptBid = async (taskId: string, bidId: string): Promise<void> => {
  await fetchAPI(`/api/tasks/${taskId}/accept-bid`, {
    method: 'POST',
    body: JSON.stringify({ bidId }),
  });
};

export const completeTask = async (taskId: string): Promise<void> => {
  await fetchAPI(`/api/tasks/${taskId}/complete`, {
    method: 'POST',
  });
};

export const getMyTasks = async (): Promise<Task[]> => {
  const data = await fetchAPI('/api/tasks/my/posts');
  return data.tasks;
};

// Bids
export const getTaskBids = async (taskId: string): Promise<Bid[]> => {
  const data = await fetchAPI(`/api/bids/task/${taskId}`);
  return data.bids;
};

export const submitBid = async (taskId: string, bidData: {
  amount: number;
  timeEstimate: string;
  message: string;
}): Promise<Bid> => {
  const data = await fetchAPI(`/api/bids/task/${taskId}`, {
    method: 'POST',
    body: JSON.stringify(bidData),
  });
  return data.bid;
};

export const getUserBids = async (): Promise<Bid[]> => {
  const data = await fetchAPI('/api/bids/my-bids');
  return data.bids;
};

export const updateBid = async (bidId: string, bidData: {
  amount: number;
  timeEstimate: string;
  message: string;
}): Promise<Bid> => {
  const data = await fetchAPI(`/api/bids/${bidId}`, {
    method: 'PATCH',
    body: JSON.stringify(bidData),
  });
  return data.bid;
};

export const withdrawBid = async (bidId: string): Promise<void> => {
  await fetchAPI(`/api/bids/${bidId}`, { method: 'DELETE' });
};

// Users
export const getUserProfile = async (userId: string): Promise<User> => {
  const data = await fetchAPI(`/api/users/${userId}`);
  return data.user;
};

export const getUserPortfolio = async (userId: string): Promise<{
  items: PortfolioItem[];
  stats: {
    totalEarned: number;
    jobsCompleted: number;
    avgEarningsPerJob: number;
    averageRating: number;
    reviewCount: number;
  };
}> => {
  return await fetchAPI(`/api/users/${userId}/portfolio`);
};

export const getUserStats = async (userId: string) => {
  return await fetchAPI(`/api/users/${userId}/stats`);
};

export const updateUserProfile = async (userId: string, profileData: {
  name?: string;
  university?: string;
  bio?: string;
  avatar?: string;
}): Promise<User> => {
  const data = await fetchAPI(`/api/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(profileData),
  });
  return data.user;
};

export const updateUserSkills = async (userId: string, skills: string[]): Promise<void> => {
  await fetchAPI(`/api/users/${userId}/skills`, {
    method: 'PATCH',
    body: JSON.stringify({ skills }),
  });
};

// Notifications
export const getNotifications = async (unreadOnly?: boolean) => {
  const params = unreadOnly ? '?unreadOnly=true' : '';
  const data = await fetchAPI(`/api/notifications${params}`);
  return data.notifications;
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  await fetchAPI(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await fetchAPI('/api/notifications/read-all', {
    method: 'PATCH',
  });
};

// Reviews
export const submitReview = async (reviewData: {
  taskId: string;
  revieweeId: string;
  rating: number;
  comment: string;
}): Promise<void> => {
  await fetchAPI('/api/reviews', {
    method: 'POST',
    body: JSON.stringify(reviewData),
  });
};

export const getTaskReviews = async (taskId: string) => {
  const data = await fetchAPI(`/api/reviews/task/${taskId}`);
  return data.reviews;
};

// Export default API object
export default {
  // Auth
  login,
  register,
  getCurrentUser,
  logout,
  
  // Tasks
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  acceptBid,
  completeTask,
  getMyTasks,
  
  // Bids
  getTaskBids,
  submitBid,
  getUserBids,
  updateBid,
  withdrawBid,
  
  // Users
  getUserProfile,
  getUserPortfolio,
  getUserStats,
  updateUserSkills,
  
  // Notifications
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  
  // Reviews
  submitReview,
  getTaskReviews,
};
