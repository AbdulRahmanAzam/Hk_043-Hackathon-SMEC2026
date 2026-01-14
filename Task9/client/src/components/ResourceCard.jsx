import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  Monitor, 
  Building, 
  Wrench, 
  Users, 
  Dumbbell, 
  MapPin, 
  Star,
  Clock,
  ChevronRight 
} from 'lucide-react'
import clsx from 'clsx'

const resourceIcons = {
  lab: Monitor,
  hall: Building,
  equipment: Wrench,
  meeting_room: Users,
  sports_facility: Dumbbell,
}

const resourceColors = {
  lab: 'from-blue-500 to-blue-600',
  hall: 'from-purple-500 to-purple-600',
  equipment: 'from-orange-500 to-orange-600',
  meeting_room: 'from-green-500 to-green-600',
  sports_facility: 'from-red-500 to-red-600',
}

export default function ResourceCard({ resource, index = 0 }) {
  const navigate = useNavigate()
  const Icon = resourceIcons[resource.type] || Building
  
  const handleClick = () => {
    navigate(`/resources/${resource._id || resource.id}`)
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      onClick={handleClick}
      className="card card-hover cursor-pointer overflow-hidden group"
    >
      {/* Header with gradient */}
      <div className={clsx(
        'h-32 bg-gradient-to-br flex items-center justify-center relative overflow-hidden',
        resourceColors[resource.type] || 'from-surface-500 to-surface-600'
      )}>
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`pattern-${resource.id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#pattern-${resource.id})`} />
          </svg>
        </div>
        
        {/* Icon */}
        <div className="relative">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center transform group-hover:scale-110 transition-transform">
            <Icon className="w-8 h-8 text-white" />
          </div>
        </div>
        
        {/* Availability badge */}
        <div className="absolute top-3 right-3">
          <span className={clsx(
            'px-2.5 py-1 rounded-full text-xs font-medium',
            resource.isAvailable !== false
              ? 'bg-white/20 text-white backdrop-blur-sm'
              : 'bg-danger-500/80 text-white'
          )}>
            {resource.isAvailable !== false ? 'Available' : 'In Use'}
          </span>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-surface-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {resource.name}
            </h3>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {resource.code}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-surface-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
        </div>
        
        {/* Details */}
        <div className="space-y-2 mt-3">
          <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
            <MapPin className="w-4 h-4" />
            <span>{resource.location || resource.building || 'Main Campus'}</span>
          </div>
          
          {resource.capacity && (
            <div className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
              <Users className="w-4 h-4" />
              <span>{resource.capacity} capacity</span>
            </div>
          )}
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="badge badge-neutral capitalize">
            {resource.type?.replace('_', ' ')}
          </span>
          {resource.attributes?.hasProjector && (
            <span className="badge badge-primary">Projector</span>
          )}
          {resource.attributes?.hasAC && (
            <span className="badge badge-primary">AC</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
