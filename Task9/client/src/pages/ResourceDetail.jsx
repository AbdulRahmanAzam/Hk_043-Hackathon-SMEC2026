import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, 
  MapPin, 
  Users, 
  Clock, 
  Calendar,
  Monitor,
  Projector,
  Wind,
  Video,
  Star,
  ChevronRight
} from 'lucide-react'
import Button from '../components/ui/Button'
import AvailabilityHeatmap from '../components/AvailabilityHeatmap'
import { SkeletonHeatmap } from '../components/ui/Skeleton'

// Mock resource detail
const mockResource = {
  id: '1',
  code: 'LAB-A1',
  name: 'Computer Lab A',
  type: 'lab',
  description: 'Modern computer lab equipped with high-performance workstations, ideal for software development, data analysis, and design projects. Features the latest hardware and software tools for an optimal learning experience.',
  capacity: 40,
  location: 'Building A, Floor 2, Room 204',
  building: 'Building A',
  floor: 2,
  attributes: {
    hasProjector: true,
    hasAC: true,
    hasWhiteboard: true,
    hasVideoConference: false,
    software: ['MATLAB', 'VS Code', 'Python', 'AutoCAD', 'Adobe Suite'],
    equipment: ['40 Desktop PCs', 'Interactive Whiteboard'],
  },
  minBookingDurationMinutes: 30,
  maxBookingDurationMinutes: 480,
  advanceBookingDays: 30,
  requiresApproval: true,
  checkInRequired: true,
}

// Mock heatmap data
const mockHeatmapData = [
  { dayOfWeek: 1, hourSlot: 9, demandLevel: 'low' },
  { dayOfWeek: 1, hourSlot: 10, demandLevel: 'medium' },
  { dayOfWeek: 1, hourSlot: 11, demandLevel: 'high' },
  { dayOfWeek: 1, hourSlot: 14, demandLevel: 'recommended' },
  { dayOfWeek: 2, hourSlot: 9, demandLevel: 'recommended' },
  { dayOfWeek: 2, hourSlot: 10, demandLevel: 'low' },
  { dayOfWeek: 2, hourSlot: 14, demandLevel: 'high' },
  { dayOfWeek: 3, hourSlot: 11, demandLevel: 'booked' },
  { dayOfWeek: 3, hourSlot: 12, demandLevel: 'booked' },
  { dayOfWeek: 4, hourSlot: 15, demandLevel: 'recommended' },
  { dayOfWeek: 4, hourSlot: 16, demandLevel: 'low' },
  { dayOfWeek: 5, hourSlot: 9, demandLevel: 'medium' },
  { dayOfWeek: 5, hourSlot: 10, demandLevel: 'medium' },
]

// Mock recommended slots
const mockRecommendedSlots = [
  { day: 'Monday', time: '2:00 PM - 4:00 PM', reason: 'Low demand, high availability' },
  { day: 'Tuesday', time: '9:00 AM - 11:00 AM', reason: 'Best time based on your history' },
  { day: 'Thursday', time: '3:00 PM - 5:00 PM', reason: 'Usually quiet hours' },
]

export default function ResourceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  const resource = mockResource // Replace with actual API call
  const isLoading = false
  
  const handleSlotClick = (slot, date) => {
    // Navigate to booking flow with pre-selected slot
    navigate(`/book/${id}`, { 
      state: { 
        date, 
        startHour: slot.hourSlot,
        resource 
      } 
    })
  }
  
  const amenityIcons = {
    hasProjector: { icon: Projector, label: 'Projector' },
    hasAC: { icon: Wind, label: 'Air Conditioning' },
    hasWhiteboard: { icon: Monitor, label: 'Whiteboard' },
    hasVideoConference: { icon: Video, label: 'Video Conference' },
  }
  
  return (
    <div className="space-y-6">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <Link 
          to="/resources"
          className="inline-flex items-center gap-2 text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Resources
        </Link>
      </motion.div>
      
      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Resource details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Header card */}
          <div className="card overflow-hidden">
            {/* Hero section */}
            <div className="h-48 bg-gradient-to-br from-blue-500 to-blue-600 relative">
              <div className="absolute inset-0 opacity-20">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <pattern id="hero-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
                      <circle cx="15" cy="15" r="2" fill="white" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#hero-pattern)" />
                </svg>
              </div>
              
              <div className="absolute bottom-4 left-4 right-4">
                <span className="badge bg-white/20 text-white backdrop-blur-sm mb-2">
                  {resource.code}
                </span>
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                  {resource.name}
                </h1>
              </div>
            </div>
            
            {/* Details */}
            <div className="p-6">
              <p className="text-surface-600 dark:text-surface-400 mb-6">
                {resource.description}
              </p>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Location</p>
                    <p className="text-sm font-medium text-surface-900 dark:text-white">{resource.building}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success-100 dark:bg-success-900/30 flex items-center justify-center">
                    <Users className="w-5 h-5 text-success-600 dark:text-success-400" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Capacity</p>
                    <p className="text-sm font-medium text-surface-900 dark:text-white">{resource.capacity} seats</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-warning-600 dark:text-warning-400" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Booking Duration</p>
                    <p className="text-sm font-medium text-surface-900 dark:text-white">
                      {resource.minBookingDurationMinutes / 60}h - {resource.maxBookingDurationMinutes / 60}h
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-500">Advance Booking</p>
                    <p className="text-sm font-medium text-surface-900 dark:text-white">Up to {resource.advanceBookingDays} days</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Amenities */}
          <div className="card p-6">
            <h2 className="font-semibold text-surface-900 dark:text-white mb-4">
              Amenities & Equipment
            </h2>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {Object.entries(amenityIcons).map(([key, { icon: Icon, label }]) => (
                <div
                  key={key}
                  className={`flex items-center gap-2 p-3 rounded-xl border ${
                    resource.attributes?.[key]
                      ? 'border-success-200 bg-success-50 dark:border-success-800 dark:bg-success-900/20'
                      : 'border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800 opacity-50'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${
                    resource.attributes?.[key] 
                      ? 'text-success-600 dark:text-success-400' 
                      : 'text-surface-400'
                  }`} />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
            
            {resource.attributes?.software?.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Software Available
                </h3>
                <div className="flex flex-wrap gap-2">
                  {resource.attributes.software.map(sw => (
                    <span key={sw} className="badge badge-primary">{sw}</span>
                  ))}
                </div>
              </div>
            )}
            
            {resource.attributes?.equipment?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
                  Equipment
                </h3>
                <div className="flex flex-wrap gap-2">
                  {resource.attributes.equipment.map(eq => (
                    <span key={eq} className="badge badge-neutral">{eq}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Availability Heatmap */}
          {isLoading ? (
            <SkeletonHeatmap />
          ) : (
            <AvailabilityHeatmap 
              data={mockHeatmapData}
              selectedDate={selectedDate}
              onSlotClick={handleSlotClick}
            />
          )}
        </motion.div>
        
        {/* Right column - Booking sidebar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* Quick book card */}
          <div className="card p-6 sticky top-20">
            <h2 className="font-semibold text-surface-900 dark:text-white mb-4">
              Book This Resource
            </h2>
            
            <div className="space-y-4 mb-6">
              <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800">
                <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400 mb-1">
                  <Star className="w-4 h-4" />
                  <span className="text-sm font-medium">Smart Recommendation</span>
                </div>
                <p className="text-sm text-primary-600 dark:text-primary-300">
                  Best time to book: <strong>Tuesday 9 AM</strong>
                </p>
              </div>
              
              {resource.requiresApproval && (
                <p className="text-sm text-surface-600 dark:text-surface-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-warning-500 rounded-full" />
                  Requires approval
                </p>
              )}
              
              {resource.checkInRequired && (
                <p className="text-sm text-surface-600 dark:text-surface-400 flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary-500 rounded-full" />
                  QR check-in required
                </p>
              )}
            </div>
            
            <Link to={`/book/${id}`} state={{ resource }}>
              <Button className="w-full" size="lg">
                Book Now
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          {/* Recommended slots */}
          <div className="card p-6">
            <h3 className="font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-primary-500" />
              Recommended Slots
            </h3>
            
            <div className="space-y-3">
              {mockRecommendedSlots.map((slot, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/book/${id}`, { state: { resource, recommendedSlot: slot } })}
                  className="w-full text-left p-3 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-surface-900 dark:text-white">{slot.day}</span>
                    <span className="text-sm text-primary-600 dark:text-primary-400">{slot.time}</span>
                  </div>
                  <p className="text-xs text-surface-500 dark:text-surface-400">{slot.reason}</p>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
