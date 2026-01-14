import { motion } from 'framer-motion'
import { Bell, Check, Calendar, AlertCircle, Info, CheckCircle, X } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

// Mock notifications for demo
const mockNotifications = [
  {
    id: 1,
    type: 'booking_approved',
    title: 'Booking Approved',
    message: 'Your booking for Computer Lab A on Jan 20 has been approved.',
    createdAt: new Date(Date.now() - 1000 * 60 * 30),
    read: false,
  },
  {
    id: 2,
    type: 'reminder',
    title: 'Upcoming Booking',
    message: 'Reminder: You have a booking in 30 minutes at Seminar Hall B.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
  },
  {
    id: 3,
    type: 'check_in',
    title: 'Check-in Required',
    message: 'Please check in for your booking at Lab C within 15 minutes.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    read: true,
  },
  {
    id: 4,
    type: 'booking_declined',
    title: 'Booking Declined',
    message: 'Your booking for Meeting Room 101 was declined due to conflict.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    read: true,
  },
]

const getIcon = (type) => {
  switch (type) {
    case 'booking_approved':
      return <CheckCircle className="w-5 h-5 text-success-500" />
    case 'booking_declined':
      return <AlertCircle className="w-5 h-5 text-danger-500" />
    case 'reminder':
      return <Calendar className="w-5 h-5 text-primary-500" />
    case 'check_in':
      return <Info className="w-5 h-5 text-warning-500" />
    default:
      return <Bell className="w-5 h-5 text-surface-400" />
  }
}

export default function NotificationPanel({ onClose }) {
  const unreadCount = mockNotifications.filter(n => !n.read).length
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="absolute right-0 mt-2 w-96 max-h-[480px] bg-white dark:bg-surface-800 rounded-2xl shadow-xl border border-surface-200 dark:border-surface-700 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-surface-900 dark:text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="badge badge-primary">{unreadCount} new</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
            Mark all read
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Notifications list */}
      <div className="max-h-[400px] overflow-y-auto">
        {mockNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="w-12 h-12 text-surface-300 dark:text-surface-600 mb-3" />
            <p className="text-surface-500 dark:text-surface-400">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100 dark:divide-surface-700">
            {mockNotifications.map((notification, index) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={clsx(
                  'flex gap-3 p-4 hover:bg-surface-50 dark:hover:bg-surface-700/50 cursor-pointer transition-colors',
                  !notification.read && 'bg-primary-50/50 dark:bg-primary-900/10'
                )}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={clsx(
                      'text-sm',
                      notification.read 
                        ? 'text-surface-600 dark:text-surface-400' 
                        : 'font-medium text-surface-900 dark:text-white'
                    )}>
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <span className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">
                    {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="px-4 py-3 border-t border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-900">
        <button className="w-full text-sm text-primary-600 dark:text-primary-400 hover:underline">
          View all notifications
        </button>
      </div>
    </motion.div>
  )
}
