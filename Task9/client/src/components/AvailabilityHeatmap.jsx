import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, addDays, startOfWeek, isSameDay } from 'date-fns'
import clsx from 'clsx'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 8) // 8 AM to 7 PM
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Color scale for demand levels
const getDemandColor = (level, isDark = false) => {
  if (isDark) {
    switch (level) {
      case 'low':
        return 'bg-success-900/40 hover:bg-success-800/60 border-success-700/30'
      case 'medium':
        return 'bg-warning-900/40 hover:bg-warning-800/60 border-warning-700/30'
      case 'high':
        return 'bg-danger-900/40 hover:bg-danger-800/60 border-danger-700/30'
      case 'booked':
        return 'bg-surface-700 border-surface-600 cursor-not-allowed'
      case 'recommended':
        return 'bg-primary-900/50 hover:bg-primary-800/70 border-primary-500/50 ring-2 ring-primary-500/30'
      default:
        return 'bg-surface-800 hover:bg-surface-700 border-surface-700'
    }
  }
  
  switch (level) {
    case 'low':
      return 'bg-success-100 hover:bg-success-200 border-success-200'
    case 'medium':
      return 'bg-warning-100 hover:bg-warning-200 border-warning-200'
    case 'high':
      return 'bg-danger-100 hover:bg-danger-200 border-danger-200'
    case 'booked':
      return 'bg-surface-200 border-surface-300 cursor-not-allowed'
    case 'recommended':
      return 'bg-primary-100 hover:bg-primary-200 border-primary-300 ring-2 ring-primary-300'
    default:
      return 'bg-surface-100 hover:bg-surface-200 border-surface-200'
  }
}

const getTextColor = (level, isDark = false) => {
  if (level === 'booked') return 'text-surface-400'
  if (level === 'recommended') return 'text-primary-600 dark:text-primary-400 font-medium'
  return 'text-surface-700 dark:text-surface-300'
}

export default function AvailabilityHeatmap({ 
  data = [], 
  onSlotClick, 
  selectedDate,
  showWeekView = true,
  loading = false 
}) {
  const [hoveredSlot, setHoveredSlot] = useState(null)
  const isDark = document.documentElement.classList.contains('dark')
  
  // Generate week dates starting from selected date or today
  const weekDates = useMemo(() => {
    const start = startOfWeek(selectedDate || new Date())
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [selectedDate])
  
  // Create a map of slot data for quick lookup
  const slotMap = useMemo(() => {
    const map = new Map()
    data.forEach(slot => {
      const key = `${slot.dayOfWeek}-${slot.hourSlot}`
      map.set(key, slot)
    })
    return map
  }, [data])
  
  // Get slot data or generate default
  const getSlotData = (dayIndex, hour) => {
    const key = `${dayIndex}-${hour}`
    return slotMap.get(key) || { 
      dayOfWeek: dayIndex, 
      hourSlot: hour, 
      demandLevel: 'available',
      available: true 
    }
  }
  
  if (loading) {
    return (
      <div className="card p-4">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-surface-200 dark:bg-surface-700 rounded mb-4" />
          <div className="grid grid-cols-8 gap-1">
            <div className="col-span-1" />
            {DAYS.map((_, i) => (
              <div key={i} className="h-8 bg-surface-200 dark:bg-surface-700 rounded" />
            ))}
            {HOURS.map(hour => (
              <>
                <div key={`label-${hour}`} className="h-10 bg-surface-200 dark:bg-surface-700 rounded" />
                {DAYS.map((_, dayIndex) => (
                  <div key={`${hour}-${dayIndex}`} className="h-10 bg-surface-200 dark:bg-surface-700 rounded" />
                ))}
              </>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="card p-4 lg:p-6 overflow-x-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-surface-900 dark:text-white">
          Availability Heatmap
        </h3>
        
        {/* Legend */}
        <div className="hidden md:flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-success-100 dark:bg-success-900/40 border border-success-200 dark:border-success-700/30" />
            <span className="text-surface-600 dark:text-surface-400">Low demand</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-warning-100 dark:bg-warning-900/40 border border-warning-200 dark:border-warning-700/30" />
            <span className="text-surface-600 dark:text-surface-400">Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-danger-100 dark:bg-danger-900/40 border border-danger-200 dark:border-danger-700/30" />
            <span className="text-surface-600 dark:text-surface-400">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-primary-100 dark:bg-primary-900/50 border border-primary-300 dark:border-primary-500/50 ring-2 ring-primary-300/50" />
            <span className="text-surface-600 dark:text-surface-400">Recommended</span>
          </div>
        </div>
      </div>
      
      {/* Heatmap grid */}
      <div className="min-w-[600px]">
        <div className="grid grid-cols-8 gap-1">
          {/* Header row - empty corner + day names */}
          <div className="h-10" />
          {DAYS.map((day, i) => (
            <div 
              key={day} 
              className={clsx(
                'h-10 flex flex-col items-center justify-center text-sm',
                isSameDay(weekDates[i], new Date()) && 'font-bold text-primary-600 dark:text-primary-400'
              )}
            >
              <span className="text-surface-600 dark:text-surface-400">{day}</span>
              <span className="text-xs text-surface-400 dark:text-surface-500">
                {format(weekDates[i], 'd')}
              </span>
            </div>
          ))}
          
          {/* Time slots */}
          {HOURS.map(hour => (
            <>
              {/* Hour label */}
              <div 
                key={`hour-${hour}`}
                className="h-10 flex items-center justify-end pr-2 text-xs text-surface-500 dark:text-surface-400"
              >
                {format(new Date().setHours(hour, 0), 'ha')}
              </div>
              
              {/* Day slots */}
              {DAYS.map((_, dayIndex) => {
                const slotData = getSlotData(dayIndex, hour)
                const isHovered = hoveredSlot === `${dayIndex}-${hour}`
                
                return (
                  <motion.button
                    key={`${hour}-${dayIndex}`}
                    whileHover={{ scale: slotData.demandLevel !== 'booked' ? 1.05 : 1 }}
                    whileTap={{ scale: slotData.demandLevel !== 'booked' ? 0.98 : 1 }}
                    onMouseEnter={() => setHoveredSlot(`${dayIndex}-${hour}`)}
                    onMouseLeave={() => setHoveredSlot(null)}
                    onClick={() => slotData.demandLevel !== 'booked' && onSlotClick?.(slotData, weekDates[dayIndex])}
                    disabled={slotData.demandLevel === 'booked'}
                    className={clsx(
                      'h-10 rounded-lg border transition-all duration-150 relative',
                      getDemandColor(slotData.demandLevel, isDark),
                      getTextColor(slotData.demandLevel, isDark)
                    )}
                  >
                    {/* Slot content */}
                    {slotData.demandLevel === 'recommended' && (
                      <span className="text-[10px]">★</span>
                    )}
                    {slotData.demandLevel === 'booked' && (
                      <span className="text-[10px]">—</span>
                    )}
                    
                    {/* Tooltip */}
                    {isHovered && slotData.demandLevel !== 'booked' && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-surface-900 dark:bg-surface-700 text-white text-xs rounded-lg shadow-lg whitespace-nowrap z-50"
                      >
                        <div className="font-medium">
                          {format(weekDates[dayIndex], 'EEE, MMM d')} at {format(new Date().setHours(hour), 'ha')}
                        </div>
                        <div className="text-surface-300 mt-0.5 capitalize">
                          {slotData.demandLevel || 'Available'} demand
                          {slotData.utilizationPercentage && ` • ${slotData.utilizationPercentage}% utilized`}
                        </div>
                        {slotData.demandLevel === 'recommended' && (
                          <div className="text-primary-400 mt-0.5">✨ Best time to book</div>
                        )}
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface-900 dark:border-t-surface-700" />
                      </motion.div>
                    )}
                  </motion.button>
                )
              })}
            </>
          ))}
        </div>
      </div>
      
      {/* Mobile legend */}
      <div className="flex md:hidden flex-wrap items-center gap-3 mt-4 pt-4 border-t border-surface-200 dark:border-surface-700 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-success-100 dark:bg-success-900/40" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-warning-100 dark:bg-warning-900/40" />
          <span>Medium</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-danger-100 dark:bg-danger-900/40" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary-100 dark:bg-primary-900/50 ring-1 ring-primary-300" />
          <span>Recommended</span>
        </div>
      </div>
    </div>
  )
}
