import { create } from 'zustand'

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  isLoading: false,
  
  // Set notifications
  setNotifications: (notifications) => {
    set({ notifications })
  },
  
  // Add notification
  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }))
  },
  
  // Mark as read
  markAsRead: (notificationId) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))
  },
  
  // Mark all as read
  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },
  
  // Set unread count
  setUnreadCount: (count) => {
    set({ unreadCount: count })
  },
  
  // Toggle notification panel
  toggleOpen: () => {
    set((state) => ({ isOpen: !state.isOpen }))
  },
  
  // Close notification panel
  close: () => {
    set({ isOpen: false })
  },
  
  // Set loading
  setLoading: (isLoading) => {
    set({ isLoading })
  },
}))
