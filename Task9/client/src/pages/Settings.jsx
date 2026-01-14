import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  User, 
  Bell, 
  Palette, 
  Shield, 
  Mail,
  Phone,
  Building2,
  Save,
  Check
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useThemeStore } from '../store/themeStore'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import clsx from 'clsx'

const tabs = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
]

export default function Settings() {
  const { user, updateUser } = useAuthStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [activeTab, setActiveTab] = useState('profile')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  // Profile form state
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    department: user?.department || '',
  })
  
  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailBookingConfirmation: true,
    emailReminders: true,
    emailApprovalUpdates: true,
    emailWeeklyDigest: false,
    pushBookingReminders: true,
    pushStatusUpdates: true,
    reminderTime: '30', // minutes before
  })
  
  const handleProfileChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }))
  }
  
  const handleNotificationChange = (field) => {
    setNotifications(prev => ({ ...prev, [field]: !prev[field] }))
  }
  
  const handleSave = async () => {
    setIsSaving(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          Settings
        </h1>
        <p className="text-surface-600 dark:text-surface-400 mt-1">
          Manage your account preferences
        </p>
      </motion.div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Tabs */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <nav className="card p-2 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors',
                    activeTab === tab.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </motion.div>
        
        {/* Content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3"
        >
          <div className="card p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                    Profile Information
                  </h2>
                  <p className="text-sm text-surface-500 mt-1">
                    Update your personal information
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="First Name"
                    value={profile.firstName}
                    onChange={(e) => handleProfileChange('firstName', e.target.value)}
                    placeholder="Enter first name"
                  />
                  <Input
                    label="Last Name"
                    value={profile.lastName}
                    onChange={(e) => handleProfileChange('lastName', e.target.value)}
                    placeholder="Enter last name"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                    placeholder="Enter email"
                    leftIcon={<Mail className="w-5 h-5" />}
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                    placeholder="Enter phone number"
                    leftIcon={<Phone className="w-5 h-5" />}
                  />
                  <Input
                    label="Department"
                    value={profile.department}
                    onChange={(e) => handleProfileChange('department', e.target.value)}
                    placeholder="Enter department"
                    leftIcon={<Building2 className="w-5 h-5" />}
                    className="md:col-span-2"
                  />
                </div>
                
                <div className="pt-4 border-t border-surface-100 dark:border-surface-800">
                  <Button
                    onClick={handleSave}
                    isLoading={isSaving}
                    leftIcon={saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  >
                    {saveSuccess ? 'Saved!' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                    Notification Preferences
                  </h2>
                  <p className="text-sm text-surface-500 mt-1">
                    Choose how you want to be notified
                  </p>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium text-surface-900 dark:text-white">
                    Email Notifications
                  </h3>
                  
                  {[
                    { key: 'emailBookingConfirmation', label: 'Booking confirmations', description: 'Receive confirmation when your booking is approved' },
                    { key: 'emailReminders', label: 'Booking reminders', description: 'Get reminded before your scheduled booking' },
                    { key: 'emailApprovalUpdates', label: 'Approval updates', description: 'Notifications about booking approval status changes' },
                    { key: 'emailWeeklyDigest', label: 'Weekly digest', description: 'Summary of your upcoming bookings each week' },
                  ].map(item => (
                    <label 
                      key={item.key}
                      className="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800/50 rounded-xl cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-surface-900 dark:text-white">
                          {item.label}
                        </p>
                        <p className="text-sm text-surface-500">
                          {item.description}
                        </p>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={notifications[item.key]}
                          onChange={() => handleNotificationChange(item.key)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-200 dark:bg-surface-700 rounded-full peer peer-checked:bg-primary-600 transition-colors"></div>
                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5"></div>
                      </div>
                    </label>
                  ))}
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium text-surface-900 dark:text-white">
                    Push Notifications
                  </h3>
                  
                  {[
                    { key: 'pushBookingReminders', label: 'Booking reminders', description: 'Push notification before your booking starts' },
                    { key: 'pushStatusUpdates', label: 'Status updates', description: 'Real-time updates on booking status' },
                  ].map(item => (
                    <label 
                      key={item.key}
                      className="flex items-center justify-between p-4 bg-surface-50 dark:bg-surface-800/50 rounded-xl cursor-pointer hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-surface-900 dark:text-white">
                          {item.label}
                        </p>
                        <p className="text-sm text-surface-500">
                          {item.description}
                        </p>
                      </div>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={notifications[item.key]}
                          onChange={() => handleNotificationChange(item.key)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-surface-200 dark:bg-surface-700 rounded-full peer peer-checked:bg-primary-600 transition-colors"></div>
                        <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5"></div>
                      </div>
                    </label>
                  ))}
                </div>
                
                <div className="space-y-2">
                  <label className="label">Reminder Time</label>
                  <select
                    value={notifications.reminderTime}
                    onChange={(e) => setNotifications(prev => ({ ...prev, reminderTime: e.target.value }))}
                    className="input"
                  >
                    <option value="15">15 minutes before</option>
                    <option value="30">30 minutes before</option>
                    <option value="60">1 hour before</option>
                    <option value="1440">1 day before</option>
                  </select>
                </div>
                
                <div className="pt-4 border-t border-surface-100 dark:border-surface-800">
                  <Button
                    onClick={handleSave}
                    isLoading={isSaving}
                    leftIcon={saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  >
                    {saveSuccess ? 'Saved!' : 'Save Preferences'}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                    Appearance
                  </h2>
                  <p className="text-sm text-surface-500 mt-1">
                    Customize how the app looks
                  </p>
                </div>
                
                <div className="space-y-4">
                  <h3 className="font-medium text-surface-900 dark:text-white">
                    Theme
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => !isDark && toggleTheme()}
                      className={clsx(
                        'p-4 rounded-xl border-2 transition-colors text-left',
                        !isDark
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
                      )}
                    >
                      <div className="w-full h-24 bg-white rounded-lg shadow-sm mb-3 flex items-center justify-center">
                        <div className="w-2/3 h-3 bg-surface-200 rounded"></div>
                      </div>
                      <p className="font-medium text-surface-900 dark:text-white">Light</p>
                      <p className="text-sm text-surface-500">Clean and bright</p>
                    </button>
                    
                    <button
                      onClick={() => isDark && toggleTheme()}
                      className={clsx(
                        'p-4 rounded-xl border-2 transition-colors text-left',
                        isDark
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
                      )}
                    >
                      <div className="w-full h-24 bg-surface-900 rounded-lg shadow-sm mb-3 flex items-center justify-center">
                        <div className="w-2/3 h-3 bg-surface-700 rounded"></div>
                      </div>
                      <p className="font-medium text-surface-900 dark:text-white">Dark</p>
                      <p className="text-sm text-surface-500">Easy on the eyes</p>
                    </button>
                  </div>
                </div>
                
                <div className="p-4 bg-surface-50 dark:bg-surface-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <Palette className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="font-medium text-surface-900 dark:text-white">
                        More customization coming soon
                      </p>
                      <p className="text-sm text-surface-500">
                        Custom accent colors, compact mode, and more
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
