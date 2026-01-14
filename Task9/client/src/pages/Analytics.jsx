import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Clock,
  Users,
  Calendar,
  AlertCircle,
  Download,
  Filter
} from 'lucide-react'
import { format, subDays } from 'date-fns'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import Button from '../components/ui/Button'
import Select from '../components/ui/Select'

// Mock analytics data
const dailyBookings = [
  { date: 'Mon', bookings: 45, capacity: 80 },
  { date: 'Tue', bookings: 52, capacity: 80 },
  { date: 'Wed', bookings: 61, capacity: 80 },
  { date: 'Thu', bookings: 58, capacity: 80 },
  { date: 'Fri', bookings: 48, capacity: 80 },
  { date: 'Sat', bookings: 25, capacity: 80 },
  { date: 'Sun', bookings: 12, capacity: 80 },
]

const hourlyDistribution = [
  { hour: '8AM', bookings: 15 },
  { hour: '9AM', bookings: 35 },
  { hour: '10AM', bookings: 52 },
  { hour: '11AM', bookings: 48 },
  { hour: '12PM', bookings: 30 },
  { hour: '1PM', bookings: 25 },
  { hour: '2PM', bookings: 55 },
  { hour: '3PM', bookings: 62 },
  { hour: '4PM', bookings: 45 },
  { hour: '5PM', bookings: 28 },
  { hour: '6PM', bookings: 15 },
]

const resourceUtilization = [
  { name: 'Computer Labs', utilization: 78, bookings: 156 },
  { name: 'Seminar Halls', utilization: 65, bookings: 89 },
  { name: 'Meeting Rooms', utilization: 82, bookings: 234 },
  { name: 'Libraries', utilization: 45, bookings: 67 },
  { name: 'Sports Facilities', utilization: 55, bookings: 45 },
]

const bookingsByPurpose = [
  { name: 'Academic', value: 45, color: '#8b5cf6' },
  { name: 'Meeting', value: 25, color: '#06b6d4' },
  { name: 'Event', value: 15, color: '#f59e0b' },
  { name: 'Research', value: 10, color: '#10b981' },
  { name: 'Other', value: 5, color: '#6b7280' },
]

const topResources = [
  { name: 'Computer Lab A', code: 'LAB-A1', bookings: 89, trend: 12 },
  { name: 'Meeting Room 101', code: 'MR-101', bookings: 76, trend: -5 },
  { name: 'Seminar Hall A', code: 'HALL-01', bookings: 54, trend: 8 },
  { name: 'Library Study Room 1', code: 'LIB-SR1', bookings: 48, trend: 15 },
  { name: 'Conference Room B', code: 'CR-B', bookings: 42, trend: -2 },
]

const timeRangeOptions = [
  { value: '7', label: 'Last 7 Days' },
  { value: '30', label: 'Last 30 Days' },
  { value: '90', label: 'Last 90 Days' },
  { value: 'year', label: 'This Year' },
]

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('7')
  
  const stats = [
    {
      label: 'Total Bookings',
      value: '1,284',
      change: '+12.5%',
      trend: 'up',
      icon: Calendar,
      color: 'primary',
    },
    {
      label: 'Active Users',
      value: '342',
      change: '+8.2%',
      trend: 'up',
      icon: Users,
      color: 'success',
    },
    {
      label: 'Avg. Utilization',
      value: '68%',
      change: '+5.4%',
      trend: 'up',
      icon: BarChart3,
      color: 'warning',
    },
    {
      label: 'No-Show Rate',
      value: '4.2%',
      change: '-1.8%',
      trend: 'down',
      icon: AlertCircle,
      color: 'danger',
    },
  ]
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Analytics Dashboard
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            Resource utilization and booking insights
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select
            options={timeRangeOptions}
            value={timeRange}
            onChange={setTimeRange}
          />
          <Button variant="secondary" leftIcon={<Download className="w-4 h-4" />}>
            Export
          </Button>
        </div>
      </motion.div>
      
      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat, index) => {
          const Icon = stat.icon
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown
          
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="card p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl bg-${stat.color}-100 dark:bg-${stat.color}-900/30 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                </div>
                <span className={`flex items-center gap-1 text-sm font-medium ${
                  stat.trend === 'up' 
                    ? stat.label === 'No-Show Rate' 
                      ? 'text-danger-600' 
                      : 'text-success-600'
                    : stat.label === 'No-Show Rate'
                      ? 'text-success-600'
                      : 'text-danger-600'
                }`}>
                  <TrendIcon className="w-4 h-4" />
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-surface-900 dark:text-white">
                {stat.value}
              </p>
              <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                {stat.label}
              </p>
            </motion.div>
          )
        })}
      </motion.div>
      
      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Bookings Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
            Daily Bookings
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyBookings}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="bookings" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorBookings)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        
        {/* Hourly Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
            Peak Hours
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="hour" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--tooltip-bg, #fff)',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar 
                  dataKey="bookings" 
                  fill="#06b6d4" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
      
      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purpose Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
            Bookings by Purpose
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bookingsByPurpose}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {bookingsByPurpose.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        
        {/* Resource Utilization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card p-6 lg:col-span-2"
        >
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-4">
            Resource Utilization
          </h3>
          <div className="space-y-4">
            {resourceUtilization.map((resource, index) => (
              <div key={resource.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-surface-700 dark:text-surface-300">
                    {resource.name}
                  </span>
                  <span className="font-medium text-surface-900 dark:text-white">
                    {resource.utilization}%
                  </span>
                </div>
                <div className="h-2 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${resource.utilization}%` }}
                    transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }}
                    className={`h-full rounded-full ${
                      resource.utilization >= 80 
                        ? 'bg-success-500' 
                        : resource.utilization >= 50 
                          ? 'bg-primary-500' 
                          : 'bg-warning-500'
                    }`}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
      
      {/* Top Resources Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card overflow-hidden"
      >
        <div className="p-6 border-b border-surface-100 dark:border-surface-800">
          <h3 className="text-lg font-semibold text-surface-900 dark:text-white">
            Top Resources
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-800/50">
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {topResources.map((resource, index) => (
                <tr key={resource.code} className="hover:bg-surface-50 dark:hover:bg-surface-800/30">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-surface-900 dark:text-white">
                      {resource.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-surface-500">
                      {resource.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-surface-900 dark:text-white">
                      {resource.bookings}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`flex items-center gap-1 text-sm font-medium ${
                      resource.trend > 0 ? 'text-success-600' : 'text-danger-600'
                    }`}>
                      {resource.trend > 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      {Math.abs(resource.trend)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
