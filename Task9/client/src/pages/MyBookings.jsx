import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Calendar, 
  Clock, 
  MapPin, 
  MoreVertical,
  X,
  RefreshCw,
  Download,
  QrCode,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter
} from 'lucide-react'
import { format } from 'date-fns'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { SkeletonList } from '../components/ui/Skeleton'
import clsx from 'clsx'

// Mock bookings data
const mockBookings = [
  {
    id: '1',
    bookingReference: 'BK-240115-A1B2C3',
    resource: { name: 'Computer Lab A', code: 'LAB-A1', location: 'Building A, Floor 2' },
    startTime: new Date(2026, 0, 16, 14, 0),
    endTime: new Date(2026, 0, 16, 16, 0),
    status: 'approved',
    purpose: 'academic',
    title: 'Data Structures Lab Session',
    checkInCode: 'CHK-12345',
    checkedInAt: null,
  },
  {
    id: '2',
    bookingReference: 'BK-240115-D4E5F6',
    resource: { name: 'Seminar Hall B', code: 'HALL-02', location: 'Main Block' },
    startTime: new Date(2026, 0, 17, 10, 0),
    endTime: new Date(2026, 0, 17, 13, 0),
    status: 'pending',
    purpose: 'event',
    title: 'Department Seminar',
    checkInCode: null,
    checkedInAt: null,
  },
  {
    id: '3',
    bookingReference: 'BK-240115-G7H8I9',
    resource: { name: 'Meeting Room 101', code: 'MR-101', location: 'Admin Block' },
    startTime: new Date(2026, 0, 18, 9, 0),
    endTime: new Date(2026, 0, 18, 10, 0),
    status: 'approved',
    purpose: 'meeting',
    title: 'Project Discussion',
    checkInCode: 'CHK-67890',
    checkedInAt: null,
  },
  {
    id: '4',
    bookingReference: 'BK-240110-J1K2L3',
    resource: { name: 'Computer Lab A', code: 'LAB-A1', location: 'Building A, Floor 2' },
    startTime: new Date(2026, 0, 10, 14, 0),
    endTime: new Date(2026, 0, 10, 16, 0),
    status: 'completed',
    purpose: 'academic',
    title: 'Programming Lab',
    checkInCode: 'CHK-11111',
    checkedInAt: new Date(2026, 0, 10, 13, 55),
  },
  {
    id: '5',
    bookingReference: 'BK-240108-M4N5O6',
    resource: { name: 'Seminar Hall A', code: 'HALL-01', location: 'Main Block' },
    startTime: new Date(2026, 0, 8, 10, 0),
    endTime: new Date(2026, 0, 8, 12, 0),
    status: 'cancelled',
    purpose: 'event',
    title: 'Guest Lecture',
    cancellationReason: 'Speaker unavailable',
    checkInCode: null,
    checkedInAt: null,
  },
]

const statusConfig = {
  pending: { label: 'Pending', color: 'warning', icon: AlertCircle },
  approved: { label: 'Approved', color: 'success', icon: CheckCircle },
  declined: { label: 'Declined', color: 'danger', icon: XCircle },
  cancelled: { label: 'Cancelled', color: 'danger', icon: XCircle },
  completed: { label: 'Completed', color: 'primary', icon: CheckCircle },
  no_show: { label: 'No Show', color: 'danger', icon: XCircle },
}

const filterOptions = [
  { value: 'all', label: 'All Bookings' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export default function MyBookings() {
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  
  const isLoading = false
  
  // Filter bookings
  const filteredBookings = mockBookings.filter(booking => {
    if (selectedFilter === 'all') return true
    if (selectedFilter === 'upcoming') {
      return ['pending', 'approved'].includes(booking.status) && booking.startTime > new Date()
    }
    return booking.status === selectedFilter
  })
  
  const handleCancel = (booking) => {
    setSelectedBooking(booking)
    setShowCancelModal(true)
  }
  
  const handleRebook = (booking) => {
    // Navigate to booking flow with pre-filled data
    console.log('Rebook:', booking)
  }
  
  const handleShowQR = (booking) => {
    setSelectedBooking(booking)
    setShowQRModal(true)
  }
  
  const confirmCancel = () => {
    // API call to cancel booking
    console.log('Cancelling:', selectedBooking?.id, cancelReason)
    setShowCancelModal(false)
    setCancelReason('')
  }
  
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
            My Bookings
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            Manage your resource bookings
          </p>
        </div>
      </motion.div>
      
      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2"
      >
        {filterOptions.map(option => (
          <button
            key={option.value}
            onClick={() => setSelectedFilter(option.value)}
            className={clsx(
              'px-4 py-2 rounded-xl text-sm font-medium transition-colors',
              selectedFilter === option.value
                ? 'bg-primary-600 text-white'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
            )}
          >
            {option.label}
          </button>
        ))}
      </motion.div>
      
      {/* Bookings list */}
      {isLoading ? (
        <SkeletonList items={5} />
      ) : filteredBookings.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Calendar className="w-16 h-16 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-2">
            No bookings found
          </h3>
          <p className="text-surface-600 dark:text-surface-400">
            {selectedFilter === 'all' 
              ? "You haven't made any bookings yet"
              : `No ${selectedFilter} bookings`
            }
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((booking, index) => {
            const status = statusConfig[booking.status]
            const StatusIcon = status.icon
            const isPast = booking.startTime < new Date()
            const canCheckIn = booking.status === 'approved' && !isPast && !booking.checkedInAt
            
            return (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="card p-4 hover:shadow-card-hover transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Status indicator */}
                  <div className={clsx(
                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                    `bg-${status.color}-100 dark:bg-${status.color}-900/30`
                  )}>
                    <StatusIcon className={`w-6 h-6 text-${status.color}-600 dark:text-${status.color}-400`} />
                  </div>
                  
                  {/* Booking details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-surface-900 dark:text-white">
                          {booking.title}
                        </h3>
                        <p className="text-sm text-surface-600 dark:text-surface-400">
                          {booking.resource.name} • {booking.resource.code}
                        </p>
                      </div>
                      <span className={`badge badge-${status.color} flex-shrink-0`}>
                        {status.label}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-surface-500 dark:text-surface-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{format(booking.startTime, 'EEE, MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>
                          {format(booking.startTime, 'h:mm a')} - {format(booking.endTime, 'h:mm a')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{booking.resource.location}</span>
                      </div>
                    </div>
                    
                    {/* Booking reference */}
                    <p className="text-xs text-surface-400 mt-2">
                      Ref: {booking.bookingReference}
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 lg:flex-shrink-0">
                    {canCheckIn && (
                      <Button
                        size="sm"
                        onClick={() => handleShowQR(booking)}
                        leftIcon={<QrCode className="w-4 h-4" />}
                      >
                        Check-in
                      </Button>
                    )}
                    
                    {booking.status === 'completed' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRebook(booking)}
                        leftIcon={<RefreshCw className="w-4 h-4" />}
                      >
                        Rebook
                      </Button>
                    )}
                    
                    {['pending', 'approved'].includes(booking.status) && !isPast && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancel(booking)}
                        className="text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<Download className="w-4 h-4" />}
                    >
                      ICS
                    </Button>
                  </div>
                </div>
                
                {/* Checked in indicator */}
                {booking.checkedInAt && (
                  <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
                    <span className="text-sm text-success-600 dark:text-success-400 flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Checked in at {format(booking.checkedInAt, 'h:mm a')}
                    </span>
                  </div>
                )}
                
                {/* Cancellation reason */}
                {booking.status === 'cancelled' && booking.cancellationReason && (
                  <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
                    <span className="text-sm text-surface-500">
                      Reason: {booking.cancellationReason}
                    </span>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
      
      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Booking"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to cancel your booking for <strong>{selectedBooking?.resource.name}</strong>?
          </p>
          
          <div>
            <label className="label">Reason for cancellation</label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please provide a reason..."
              rows={3}
              className="input resize-none"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
              Keep Booking
            </Button>
            <Button variant="danger" onClick={confirmCancel}>
              Cancel Booking
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* QR Code Modal */}
      <Modal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        title="Check-in QR Code"
      >
        <div className="text-center space-y-4">
          <div className="w-48 h-48 mx-auto bg-white p-4 rounded-xl">
            {/* Placeholder QR code */}
            <div className="w-full h-full bg-surface-100 rounded flex items-center justify-center">
              <QrCode className="w-24 h-24 text-surface-400" />
            </div>
          </div>
          
          <div>
            <p className="font-medium text-surface-900 dark:text-white">
              {selectedBooking?.resource.name}
            </p>
            <p className="text-sm text-surface-500">
              {selectedBooking && format(selectedBooking.startTime, 'EEE, MMM d • h:mm a')}
            </p>
          </div>
          
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Scan this code at the resource location or use code: <br />
            <code className="font-mono font-bold text-primary-600 dark:text-primary-400">
              {selectedBooking?.checkInCode}
            </code>
          </p>
          
          <Button variant="secondary" className="w-full" onClick={() => setShowQRModal(false)}>
            Done
          </Button>
        </div>
      </Modal>
    </div>
  )
}
