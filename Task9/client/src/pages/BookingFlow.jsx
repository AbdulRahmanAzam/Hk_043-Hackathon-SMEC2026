import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Users, 
  FileText,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Info
} from 'lucide-react'
import { format, addHours, setHours, setMinutes, isAfter, isBefore } from 'date-fns'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'

const steps = [
  { id: 1, title: 'Date & Time', icon: Calendar },
  { id: 2, title: 'Details', icon: FileText },
  { id: 3, title: 'Review', icon: CheckCircle },
]

const purposeOptions = [
  { value: 'academic', label: 'Academic Class' },
  { value: 'research', label: 'Research Work' },
  { value: 'event', label: 'Event/Seminar' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'examination', label: 'Examination' },
]

const durationOptions = [
  { value: '30', label: '30 minutes' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
  { value: '240', label: '4 hours' },
]

// Mock resource for demo
const mockResource = {
  id: '1',
  code: 'LAB-A1',
  name: 'Computer Lab A',
  type: 'lab',
  capacity: 40,
  location: 'Building A, Floor 2',
  requiresApproval: true,
}

// Mock conflict check
const checkConflicts = (date, startTime, duration) => {
  // Simulate some conflicts
  const hour = parseInt(startTime.split(':')[0])
  if (hour === 11 || hour === 14) {
    return {
      hasConflict: true,
      message: 'This slot overlaps with an existing booking',
      alternatives: [
        { time: '10:00', available: true },
        { time: '15:00', available: true },
      ]
    }
  }
  return { hasConflict: false }
}

export default function BookingFlow() {
  const { resourceId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [conflictInfo, setConflictInfo] = useState(null)
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    duration: '60',
    purpose: '',
    title: '',
    description: '',
    expectedAttendees: '',
  })
  
  const [errors, setErrors] = useState({})
  
  const resource = location.state?.resource || mockResource
  
  // Pre-fill from recommended slot if available
  useEffect(() => {
    if (location.state?.recommendedSlot) {
      // Parse and set the recommended slot
    }
    if (location.state?.startHour) {
      setFormData(prev => ({
        ...prev,
        startTime: `${String(location.state.startHour).padStart(2, '0')}:00`
      }))
    }
  }, [location.state])
  
  const validateStep = (step) => {
    const newErrors = {}
    
    if (step === 1) {
      if (!formData.date) newErrors.date = 'Please select a date'
      if (!formData.startTime) newErrors.startTime = 'Please select a start time'
      if (!formData.duration) newErrors.duration = 'Please select duration'
      
      // Check for conflicts
      const conflict = checkConflicts(formData.date, formData.startTime, formData.duration)
      if (conflict.hasConflict) {
        setConflictInfo(conflict)
        setShowConflictModal(true)
        return false
      }
    }
    
    if (step === 2) {
      if (!formData.purpose) newErrors.purpose = 'Please select a purpose'
      if (!formData.title.trim()) newErrors.title = 'Please enter a title'
      if (formData.title.length < 5) newErrors.title = 'Title must be at least 5 characters'
      if (!formData.expectedAttendees) newErrors.expectedAttendees = 'Please enter expected attendees'
      if (parseInt(formData.expectedAttendees) > resource.capacity) {
        newErrors.expectedAttendees = `Maximum capacity is ${resource.capacity}`
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3))
    }
  }
  
  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }
  
  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    toast.success(
      resource.requiresApproval 
        ? 'Booking submitted for approval!' 
        : 'Booking confirmed!'
    )
    
    navigate('/my-bookings')
  }
  
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }
  
  // Calculate end time
  const endTime = formData.startTime && formData.duration
    ? format(addHours(
        setMinutes(setHours(new Date(), parseInt(formData.startTime.split(':')[0])), parseInt(formData.startTime.split(':')[1])),
        parseInt(formData.duration) / 60
      ), 'HH:mm')
    : ''
  
  return (
    <div className="max-w-3xl mx-auto">
      {/* Back button */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Link 
          to={`/resources/${resourceId}`}
          className="inline-flex items-center gap-2 text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Resource
        </Link>
      </motion.div>
      
      {/* Progress steps */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center transition-colors
                  ${currentStep >= step.id 
                    ? 'bg-primary-600 text-white' 
                    : 'bg-surface-200 dark:bg-surface-700 text-surface-500'
                  }
                `}>
                  <step.icon className="w-5 h-5" />
                </div>
                <span className={`
                  text-xs mt-2 hidden sm:block
                  ${currentStep >= step.id 
                    ? 'text-primary-600 dark:text-primary-400 font-medium' 
                    : 'text-surface-500'
                  }
                `}>
                  {step.title}
                </span>
              </div>
              
              {index < steps.length - 1 && (
                <div className={`
                  w-16 sm:w-24 h-1 mx-2 rounded-full transition-colors
                  ${currentStep > step.id 
                    ? 'bg-primary-600' 
                    : 'bg-surface-200 dark:bg-surface-700'
                  }
                `} />
              )}
            </div>
          ))}
        </div>
      </motion.div>
      
      {/* Resource summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-4 mb-6 flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <Calendar className="w-6 h-6 text-primary-600 dark:text-primary-400" />
        </div>
        <div>
          <h2 className="font-semibold text-surface-900 dark:text-white">{resource.name}</h2>
          <p className="text-sm text-surface-500">{resource.location} • {resource.code}</p>
        </div>
      </motion.div>
      
      {/* Step content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="card p-6"
      >
        {/* Step 1: Date & Time */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-1">
                Select Date & Time
              </h3>
              <p className="text-sm text-surface-600 dark:text-surface-400">
                Choose when you'd like to use this resource
              </p>
            </div>
            
            {/* Smart recommendation banner */}
            <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5" />
                <div>
                  <p className="font-medium text-primary-700 dark:text-primary-400">
                    Smart Recommendation
                  </p>
                  <p className="text-sm text-primary-600 dark:text-primary-300 mt-1">
                    Based on historical data, <strong>Tuesday at 9 AM</strong> has the lowest demand and highest approval rate.
                  </p>
                  <button 
                    onClick={() => {
                      handleChange('date', format(new Date(), 'yyyy-MM-dd'))
                      handleChange('startTime', '09:00')
                    }}
                    className="text-sm text-primary-700 dark:text-primary-300 underline mt-2"
                  >
                    Apply recommendation
                  </button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                error={errors.date}
              />
              
              <Input
                label="Start Time"
                type="time"
                value={formData.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                error={errors.startTime}
              />
            </div>
            
            <Select
              label="Duration"
              value={formData.duration}
              onChange={(value) => handleChange('duration', value)}
              options={durationOptions}
              error={errors.duration}
            />
            
            {formData.startTime && formData.duration && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-100 dark:bg-surface-800">
                <Clock className="w-4 h-4 text-surface-500" />
                <span className="text-sm text-surface-700 dark:text-surface-300">
                  Your booking: <strong>{formData.startTime}</strong> to <strong>{endTime}</strong>
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Step 2: Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-1">
                Booking Details
              </h3>
              <p className="text-sm text-surface-600 dark:text-surface-400">
                Tell us more about your booking
              </p>
            </div>
            
            <Select
              label="Purpose"
              value={formData.purpose}
              onChange={(value) => handleChange('purpose', value)}
              options={purposeOptions}
              placeholder="Select purpose..."
              error={errors.purpose}
            />
            
            <Input
              label="Title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g., Data Structures Lab Session"
              error={errors.title}
              helperText="A brief title for your booking"
            />
            
            <div>
              <label className="label">Description (optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Additional details about your booking..."
                rows={3}
                className="input resize-none"
              />
            </div>
            
            <Input
              label="Expected Attendees"
              type="number"
              value={formData.expectedAttendees}
              onChange={(e) => handleChange('expectedAttendees', e.target.value)}
              placeholder="Number of people"
              error={errors.expectedAttendees}
              min={1}
              max={resource.capacity}
              helperText={`Maximum capacity: ${resource.capacity}`}
              leftIcon={<Users className="w-5 h-5" />}
            />
          </div>
        )}
        
        {/* Step 3: Review */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-surface-900 dark:text-white mb-1">
                Review Your Booking
              </h3>
              <p className="text-sm text-surface-600 dark:text-surface-400">
                Please confirm all details are correct
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-surface-500 mb-1">Resource</p>
                    <p className="font-medium text-surface-900 dark:text-white">{resource.name}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 mb-1">Location</p>
                    <p className="font-medium text-surface-900 dark:text-white">{resource.location}</p>
                  </div>
                  <div>
                    <p className="text-surface-500 mb-1">Date</p>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {format(new Date(formData.date), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-surface-500 mb-1">Time</p>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {formData.startTime} - {endTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-surface-500 mb-1">Purpose</p>
                    <p className="font-medium text-surface-900 dark:text-white capitalize">
                      {purposeOptions.find(p => p.value === formData.purpose)?.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-surface-500 mb-1">Attendees</p>
                    <p className="font-medium text-surface-900 dark:text-white">
                      {formData.expectedAttendees} people
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl border border-surface-200 dark:border-surface-700">
                <p className="text-surface-500 text-sm mb-1">Title</p>
                <p className="font-medium text-surface-900 dark:text-white">{formData.title}</p>
                {formData.description && (
                  <>
                    <p className="text-surface-500 text-sm mt-3 mb-1">Description</p>
                    <p className="text-surface-700 dark:text-surface-300">{formData.description}</p>
                  </>
                )}
              </div>
              
              {resource.requiresApproval && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800">
                  <Info className="w-5 h-5 text-warning-600 dark:text-warning-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-warning-800 dark:text-warning-300">
                      Approval Required
                    </p>
                    <p className="text-sm text-warning-700 dark:text-warning-400 mt-1">
                      This booking will be submitted for approval. You'll receive a notification once it's reviewed.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-surface-200 dark:border-surface-700">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 1}
            leftIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Back
          </Button>
          
          {currentStep < 3 ? (
            <Button
              onClick={handleNext}
              rightIcon={<ChevronRight className="w-4 h-4" />}
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              isLoading={isSubmitting}
              rightIcon={<CheckCircle className="w-4 h-4" />}
            >
              {resource.requiresApproval ? 'Submit for Approval' : 'Confirm Booking'}
            </Button>
          )}
        </div>
      </motion.div>
      
      {/* Conflict Modal */}
      <Modal
        isOpen={showConflictModal}
        onClose={() => setShowConflictModal(false)}
        title="Booking Conflict Detected"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-danger-50 dark:bg-danger-900/20">
            <AlertTriangle className="w-5 h-5 text-danger-600 dark:text-danger-400 mt-0.5" />
            <div>
              <p className="font-medium text-danger-800 dark:text-danger-300">
                Time Slot Unavailable
              </p>
              <p className="text-sm text-danger-700 dark:text-danger-400 mt-1">
                {conflictInfo?.message}
              </p>
            </div>
          </div>
          
          {conflictInfo?.alternatives?.length > 0 && (
            <div>
              <p className="font-medium text-surface-900 dark:text-white mb-3">
                Available Alternatives
              </p>
              <div className="space-y-2">
                {conflictInfo.alternatives.map((alt, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      handleChange('startTime', alt.time)
                      setShowConflictModal(false)
                    }}
                    className="w-full p-3 rounded-xl border border-surface-200 dark:border-surface-700 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors text-left"
                  >
                    <span className="font-medium text-surface-900 dark:text-white">
                      {alt.time}
                    </span>
                    <span className="text-sm text-success-600 dark:text-success-400 ml-2">
                      Available
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowConflictModal(false)}>
              Choose Different Time
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
