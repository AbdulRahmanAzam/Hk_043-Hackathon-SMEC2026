import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User,
  Calendar,
  MapPin,
  FileText,
  ChevronDown,
  ChevronUp,
  Shield,
  AlertTriangle
} from 'lucide-react'
import { format } from 'date-fns'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { SkeletonList } from '../components/ui/Skeleton'
import clsx from 'clsx'

// Mock pending approvals
const mockApprovals = [
  {
    id: '1',
    bookingReference: 'BK-240116-X1Y2Z3',
    resource: { name: 'Seminar Hall A', code: 'HALL-01', location: 'Main Block', type: 'event_space' },
    user: { name: 'Alice Johnson', email: 'alice@college.edu', role: 'student' },
    startTime: new Date(2026, 0, 18, 10, 0),
    endTime: new Date(2026, 0, 18, 14, 0),
    status: 'pending',
    purpose: 'event',
    title: 'Tech Symposium 2026',
    description: 'Annual technology symposium with guest speakers from industry',
    attendees: 150,
    requiresEquipment: ['Projector', 'Microphone System', 'Recording Setup'],
    createdAt: new Date(2026, 0, 15, 9, 30),
    priority: 'normal',
  },
  {
    id: '2',
    bookingReference: 'BK-240116-A2B3C4',
    resource: { name: 'Computer Lab B', code: 'LAB-B2', location: 'Building A, Floor 3', type: 'lab' },
    user: { name: 'Dr. Robert Smith', email: 'r.smith@college.edu', role: 'faculty' },
    startTime: new Date(2026, 0, 19, 14, 0),
    endTime: new Date(2026, 0, 19, 17, 0),
    status: 'pending',
    purpose: 'academic',
    title: 'Machine Learning Workshop',
    description: 'Hands-on workshop on ML fundamentals using Python',
    attendees: 30,
    requiresEquipment: ['GPU Workstations'],
    createdAt: new Date(2026, 0, 15, 14, 20),
    priority: 'high',
    conflictInfo: {
      hasConflict: true,
      conflictingBooking: {
        title: 'Regular Lab Session',
        user: 'Prof. James Brown',
        startTime: new Date(2026, 0, 19, 15, 0),
        endTime: new Date(2026, 0, 19, 17, 0),
      }
    }
  },
  {
    id: '3',
    bookingReference: 'BK-240116-D5E6F7',
    resource: { name: 'Meeting Room 201', code: 'MR-201', location: 'Admin Block', type: 'meeting_room' },
    user: { name: 'Sarah Williams', email: 'sarah.w@college.edu', role: 'student' },
    startTime: new Date(2026, 0, 17, 16, 0),
    endTime: new Date(2026, 0, 17, 18, 0),
    status: 'pending',
    purpose: 'meeting',
    title: 'Club Committee Meeting',
    description: 'Monthly planning meeting for Photography Club',
    attendees: 8,
    requiresEquipment: [],
    createdAt: new Date(2026, 0, 16, 8, 0),
    priority: 'low',
  },
]

const priorityConfig = {
  low: { label: 'Low', color: 'text-surface-500', bg: 'bg-surface-100' },
  normal: { label: 'Normal', color: 'text-primary-600', bg: 'bg-primary-100' },
  high: { label: 'High', color: 'text-warning-600', bg: 'bg-warning-100' },
  urgent: { label: 'Urgent', color: 'text-danger-600', bg: 'bg-danger-100' },
}

export default function Approvals() {
  const [approvals, setApprovals] = useState(mockApprovals)
  const [expandedId, setExpandedId] = useState(null)
  const [selectedApproval, setSelectedApproval] = useState(null)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [declineReason, setDeclineReason] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  
  const isLoading = false
  
  const handleApprove = (approval) => {
    // If there's a conflict, show override modal
    if (approval.conflictInfo?.hasConflict) {
      setSelectedApproval(approval)
      setShowOverrideModal(true)
      return
    }
    
    // Direct approval
    setApprovals(prev => prev.filter(a => a.id !== approval.id))
    // Show toast notification
  }
  
  const handleDecline = (approval) => {
    setSelectedApproval(approval)
    setShowDeclineModal(true)
  }
  
  const confirmDecline = () => {
    setApprovals(prev => prev.filter(a => a.id !== selectedApproval.id))
    setShowDeclineModal(false)
    setDeclineReason('')
  }
  
  const confirmOverride = () => {
    setApprovals(prev => prev.filter(a => a.id !== selectedApproval.id))
    setShowOverrideModal(false)
    setOverrideReason('')
  }
  
  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
            Pending Approvals
          </h1>
          <p className="text-surface-600 dark:text-surface-400 mt-1">
            Review and approve booking requests
          </p>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <span className="text-surface-500">
            {approvals.length} pending
          </span>
        </div>
      </motion.div>
      
      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          { label: 'Pending Review', value: approvals.length, color: 'warning' },
          { label: 'Approved Today', value: 8, color: 'success' },
          { label: 'Conflicts Detected', value: 1, color: 'danger' },
        ].map((stat, index) => (
          <div key={stat.label} className="card p-4">
            <p className="text-sm text-surface-500 dark:text-surface-400">{stat.label}</p>
            <p className={`text-2xl font-bold text-${stat.color}-600 dark:text-${stat.color}-400`}>
              {stat.value}
            </p>
          </div>
        ))}
      </motion.div>
      
      {/* Approvals list */}
      {isLoading ? (
        <SkeletonList items={4} />
      ) : approvals.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <CheckCircle className="w-16 h-16 text-success-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-2">
            All caught up!
          </h3>
          <p className="text-surface-600 dark:text-surface-400">
            No pending approvals at the moment
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {approvals.map((approval, index) => {
            const priority = priorityConfig[approval.priority]
            const isExpanded = expandedId === approval.id
            const hasConflict = approval.conflictInfo?.hasConflict
            
            return (
              <motion.div
                key={approval.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={clsx(
                  'card overflow-hidden',
                  hasConflict && 'ring-2 ring-warning-400'
                )}
              >
                {/* Conflict banner */}
                {hasConflict && (
                  <div className="bg-warning-50 dark:bg-warning-900/30 px-4 py-2 flex items-center gap-2 text-sm text-warning-700 dark:text-warning-400">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Scheduling conflict detected</span>
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* User avatar */}
                    <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    
                    {/* Request details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-surface-900 dark:text-white">
                            {approval.title}
                          </h3>
                          <p className="text-sm text-surface-600 dark:text-surface-400">
                            {approval.user.name} • {approval.user.role}
                          </p>
                        </div>
                        <span className={clsx(
                          'text-xs font-medium px-2 py-1 rounded-full',
                          priority.bg, priority.color
                        )}>
                          {priority.label} Priority
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-surface-500 dark:text-surface-400">
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          <span>{approval.resource.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{format(approval.startTime, 'EEE, MMM d')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>
                            {format(approval.startTime, 'h:mm a')} - {format(approval.endTime, 'h:mm a')}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          <span>{approval.attendees} attendees</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2 lg:flex-shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(approval)}
                        leftIcon={hasConflict ? <Shield className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      >
                        {hasConflict ? 'Override' : 'Approve'}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDecline(approval)}
                        leftIcon={<XCircle className="w-4 h-4" />}
                      >
                        Decline
                      </Button>
                      <button
                        onClick={() => toggleExpand(approval.id)}
                        className="p-2 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  
                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-surface-100 dark:border-surface-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-medium text-surface-900 dark:text-white mb-2">
                              Description
                            </h4>
                            <p className="text-sm text-surface-600 dark:text-surface-400">
                              {approval.description}
                            </p>
                          </div>
                          
                          <div>
                            <h4 className="text-sm font-medium text-surface-900 dark:text-white mb-2">
                              Equipment Required
                            </h4>
                            {approval.requiresEquipment.length > 0 ? (
                              <ul className="text-sm text-surface-600 dark:text-surface-400 list-disc list-inside">
                                {approval.requiresEquipment.map(eq => (
                                  <li key={eq}>{eq}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-sm text-surface-500">None</p>
                            )}
                          </div>
                          
                          {hasConflict && (
                            <div className="md:col-span-2 p-3 bg-warning-50 dark:bg-warning-900/20 rounded-lg">
                              <h4 className="text-sm font-medium text-warning-700 dark:text-warning-400 mb-2">
                                Conflicting Booking
                              </h4>
                              <p className="text-sm text-warning-600 dark:text-warning-300">
                                "{approval.conflictInfo.conflictingBooking.title}" by {approval.conflictInfo.conflictingBooking.user}
                                <br />
                                {format(approval.conflictInfo.conflictingBooking.startTime, 'h:mm a')} - {format(approval.conflictInfo.conflictingBooking.endTime, 'h:mm a')}
                              </p>
                            </div>
                          )}
                          
                          <div className="md:col-span-2 text-xs text-surface-400">
                            Submitted {format(approval.createdAt, 'MMM d, yyyy h:mm a')} • Ref: {approval.bookingReference}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
      
      {/* Decline Modal */}
      <Modal
        isOpen={showDeclineModal}
        onClose={() => setShowDeclineModal(false)}
        title="Decline Request"
      >
        <div className="space-y-4">
          <p className="text-surface-600 dark:text-surface-400">
            Are you sure you want to decline this booking request?
          </p>
          
          <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
            <p className="font-medium text-surface-900 dark:text-white">
              {selectedApproval?.title}
            </p>
            <p className="text-sm text-surface-500">
              by {selectedApproval?.user.name}
            </p>
          </div>
          
          <div>
            <label className="label">Reason for declining *</label>
            <textarea
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="Please provide a reason for the user..."
              rows={3}
              className="input resize-none"
              required
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowDeclineModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={confirmDecline}
              disabled={!declineReason.trim()}
            >
              Decline Request
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Override Modal */}
      <Modal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        title="Override Conflict"
      >
        <div className="space-y-4">
          <div className="p-3 bg-warning-50 dark:bg-warning-900/30 rounded-lg text-warning-700 dark:text-warning-400">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 mt-0.5" />
              <div>
                <p className="font-medium">Scheduling Conflict</p>
                <p className="text-sm mt-1">
                  Approving this request will cancel the conflicting booking:
                </p>
                <p className="text-sm mt-2 font-medium">
                  "{selectedApproval?.conflictInfo?.conflictingBooking.title}"
                </p>
              </div>
            </div>
          </div>
          
          <div>
            <label className="label">Override Reason *</label>
            <textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Explain why this booking takes priority..."
              rows={3}
              className="input resize-none"
              required
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowOverrideModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmOverride}
              disabled={!overrideReason.trim()}
              leftIcon={<Shield className="w-4 h-4" />}
            >
              Confirm Override
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
