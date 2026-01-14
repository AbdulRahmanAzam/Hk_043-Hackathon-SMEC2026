import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Calendar, 
  Building2, 
  Clock, 
  TrendingUp, 
  ArrowRight,
  Plus,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { SkeletonStats, SkeletonList } from '../components/ui/Skeleton'
import Button from '../components/ui/Button'

// Mock data for demonstration
const mockStats = {
  student: [
    { label: 'Active Bookings', value: '3', trend: '+1 this week', icon: Calendar, color: 'primary' },
    { label: 'Hours Booked', value: '12', trend: 'This month', icon: Clock, color: 'success' },
    { label: 'Pending Approvals', value: '1', trend: 'Awaiting review', icon: AlertCircle, color: 'warning' },
    { label: 'Resources Used', value: '5', trend: 'Different spaces', icon: Building2, color: 'primary' },
  ],
  faculty: [
    { label: 'Active Bookings', value: '7', trend: '+3 this week', icon: Calendar, color: 'primary' },
    { label: 'Hours Booked', value: '28', trend: 'This month', icon: Clock, color: 'success' },
    { label: 'Pending Reviews', value: '4', trend: 'Need your action', icon: AlertCircle, color: 'warning' },
    { label: 'Templates', value: '3', trend: 'Quick rebook', icon: TrendingUp, color: 'primary' },
  ],
  admin: [
    { label: 'Total Bookings', value: '156', trend: '+12% vs last week', icon: Calendar, color: 'primary' },
    { label: 'Active Resources', value: '24', trend: 'Campus-wide', icon: Building2, color: 'success' },
    { label: 'Pending Approvals', value: '8', trend: 'Need review', icon: AlertCircle, color: 'warning' },
    { label: 'Utilization', value: '73%', trend: '+5% this month', icon: TrendingUp, color: 'success' },
  ],
}

const mockUpcomingBookings = [
  { id: 1, resource: 'Computer Lab A', date: 'Today, 2:00 PM', status: 'approved', duration: '2 hours' },
  { id: 2, resource: 'Seminar Hall B', date: 'Tomorrow, 10:00 AM', status: 'pending', duration: '3 hours' },
  { id: 3, resource: 'Meeting Room 101', date: 'Jan 18, 9:00 AM', status: 'approved', duration: '1 hour' },
]

const mockQuickActions = [
  { label: 'Book a Lab', href: '/resources?type=lab', icon: '🖥️' },
  { label: 'Reserve Hall', href: '/resources?type=hall', icon: '🏛️' },
  { label: 'Meeting Room', href: '/resources?type=meeting_room', icon: '👥' },
  { label: 'Equipment', href: '/resources?type=equipment', icon: '🔧' },
]

const statusStyles = {
  approved: { bg: 'bg-success-100 dark:bg-success-900/30', text: 'text-success-700 dark:text-success-400', icon: CheckCircle },
  pending: { bg: 'bg-warning-100 dark:bg-warning-900/30', text: 'text-warning-700 dark:text-warning-400', icon: AlertCircle },
  declined: { bg: 'bg-danger-100 dark:bg-danger-900/30', text: 'text-danger-700 dark:text-danger-400', icon: XCircle },
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const stats = mockStats[user?.role] || mockStats.student
  const isLoading = false // Replace with actual loading state
  
  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            {greeting()}, {user?.firstName}! 👋
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            Here's what's happening with your campus resources
          </p>
        </div>
        
        <Link to="/resources">
          <Button leftIcon={<Plus className="w-4 h-4" />}>
            New Booking
          </Button>
        </Link>
      </motion.div>
      
      {/* Stats Grid */}
      {isLoading ? (
        <SkeletonStats />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card p-5 hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-surface-600 dark:text-surface-400">{stat.label}</p>
                  <p className="text-3xl font-bold text-surface-900 dark:text-white mt-1">
                    {stat.value}
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-500 mt-1">
                    {stat.trend}
                  </p>
                </div>
                <div className={`p-2.5 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
      
      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Bookings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 card"
        >
          <div className="p-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
            <h2 className="font-semibold text-surface-900 dark:text-white">
              Upcoming Bookings
            </h2>
            <Link 
              to="/my-bookings" 
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="p-4">
              <SkeletonList items={3} />
            </div>
          ) : mockUpcomingBookings.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
              <p className="text-surface-600 dark:text-surface-400">No upcoming bookings</p>
              <Link to="/resources" className="text-primary-600 dark:text-primary-400 hover:underline text-sm mt-2 inline-block">
                Book a resource
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-surface-100 dark:divide-surface-800">
              {mockUpcomingBookings.map((booking, index) => {
                const StatusIcon = statusStyles[booking.status]?.icon || AlertCircle
                
                return (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="p-4 flex items-center justify-between hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusStyles[booking.status]?.bg}`}>
                        <StatusIcon className={`w-5 h-5 ${statusStyles[booking.status]?.text}`} />
                      </div>
                      <div>
                        <p className="font-medium text-surface-900 dark:text-white">
                          {booking.resource}
                        </p>
                        <p className="text-sm text-surface-500 dark:text-surface-400">
                          {booking.date} • {booking.duration}
                        </p>
                      </div>
                    </div>
                    <span className={`badge capitalize ${
                      booking.status === 'approved' ? 'badge-success' :
                      booking.status === 'pending' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {booking.status}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>
        
        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="p-4 border-b border-surface-200 dark:border-surface-700">
            <h2 className="font-semibold text-surface-900 dark:text-white">
              Quick Actions
            </h2>
          </div>
          
          <div className="p-4 grid grid-cols-2 gap-3">
            {mockQuickActions.map((action, index) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
              >
                <Link
                  to={action.href}
                  className="block p-4 rounded-xl bg-surface-50 dark:bg-surface-800 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors text-center"
                >
                  <span className="text-2xl mb-2 block">{action.icon}</span>
                  <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    {action.label}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
          
          {/* Recent activity section for admins/faculty */}
          {(user?.role === 'admin' || user?.role === 'faculty') && (
            <div className="p-4 border-t border-surface-200 dark:border-surface-700">
              <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-3">
                Pending Reviews
              </h3>
              <Link to="/approvals">
                <Button variant="secondary" className="w-full" size="sm">
                  View Approvals
                  <span className="ml-2 px-2 py-0.5 bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400 rounded-full text-xs">
                    {user?.role === 'admin' ? '8' : '4'}
                  </span>
                </Button>
              </Link>
            </div>
          )}
        </motion.div>
      </div>
      
      {/* Admin-specific analytics preview */}
      {user?.role === 'admin' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-surface-900 dark:text-white">
              Resource Utilization Overview
            </h2>
            <Link 
              to="/analytics" 
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
            >
              Full Analytics <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {/* Simple bar chart representation */}
          <div className="space-y-4">
            {[
              { name: 'Computer Labs', utilization: 85, color: 'primary' },
              { name: 'Seminar Halls', utilization: 72, color: 'success' },
              { name: 'Meeting Rooms', utilization: 64, color: 'warning' },
              { name: 'Sports Facilities', utilization: 45, color: 'danger' },
            ].map((resource) => (
              <div key={resource.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-surface-700 dark:text-surface-300">{resource.name}</span>
                  <span className="font-medium text-surface-900 dark:text-white">{resource.utilization}%</span>
                </div>
                <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${resource.utilization}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className={`h-full bg-${resource.color}-500 rounded-full`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}
