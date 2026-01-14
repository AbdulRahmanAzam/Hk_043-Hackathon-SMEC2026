import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  SlidersHorizontal,
  X,
  ChevronDown
} from 'lucide-react'
import ResourceCard from '../components/ResourceCard'
import { SkeletonCard } from '../components/ui/Skeleton'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import clsx from 'clsx'

// Mock resources data
const mockResources = [
  { id: '1', code: 'LAB-A1', name: 'Computer Lab A', type: 'lab', capacity: 40, location: 'Building A, Floor 2', building: 'Building A', attributes: { hasProjector: true, hasAC: true, software: ['MATLAB', 'VS Code'] } },
  { id: '2', code: 'LAB-B2', name: 'Electronics Lab', type: 'lab', capacity: 30, location: 'Building B, Floor 1', building: 'Building B', attributes: { hasProjector: false, hasAC: true } },
  { id: '3', code: 'HALL-01', name: 'Seminar Hall A', type: 'hall', capacity: 200, location: 'Main Block', building: 'Main Block', attributes: { hasProjector: true, hasAC: true, hasVideoConference: true } },
  { id: '4', code: 'HALL-02', name: 'Auditorium', type: 'hall', capacity: 500, location: 'Central Campus', building: 'Auditorium Block', attributes: { hasProjector: true, hasAC: true } },
  { id: '5', code: 'MR-101', name: 'Meeting Room 101', type: 'meeting_room', capacity: 12, location: 'Admin Block, Floor 1', building: 'Admin Block', attributes: { hasProjector: true, hasWhiteboard: true, hasAC: true } },
  { id: '6', code: 'MR-102', name: 'Conference Room', type: 'meeting_room', capacity: 20, location: 'Admin Block, Floor 2', building: 'Admin Block', attributes: { hasProjector: true, hasVideoConference: true, hasAC: true } },
  { id: '7', code: 'GYM-01', name: 'Indoor Sports Hall', type: 'sports_facility', capacity: 100, location: 'Sports Complex', building: 'Sports Complex', attributes: { hasAC: false } },
  { id: '8', code: 'EQ-3DP', name: '3D Printer Lab', type: 'equipment', capacity: 10, location: 'Innovation Center', building: 'Innovation Hub', attributes: { equipment: ['Prusa MK3S', 'Ultimaker S5'] } },
]

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'lab', label: 'Labs' },
  { value: 'hall', label: 'Halls' },
  { value: 'meeting_room', label: 'Meeting Rooms' },
  { value: 'sports_facility', label: 'Sports' },
  { value: 'equipment', label: 'Equipment' },
]

const capacityOptions = [
  { value: '', label: 'Any Capacity' },
  { value: '10', label: 'Up to 10' },
  { value: '30', label: 'Up to 30' },
  { value: '50', label: 'Up to 50' },
  { value: '100', label: 'Up to 100' },
  { value: '200', label: '100+' },
]

const buildingOptions = [
  { value: '', label: 'All Buildings' },
  { value: 'Building A', label: 'Building A' },
  { value: 'Building B', label: 'Building B' },
  { value: 'Main Block', label: 'Main Block' },
  { value: 'Admin Block', label: 'Admin Block' },
]

export default function Resources() {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    type: '',
    capacity: '',
    building: '',
    hasProjector: false,
    hasAC: false,
  })
  
  const isLoading = false // Replace with actual loading state
  
  // Filter resources
  const filteredResources = useMemo(() => {
    return mockResources.filter(resource => {
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch = 
          resource.name.toLowerCase().includes(query) ||
          resource.code.toLowerCase().includes(query) ||
          resource.type.toLowerCase().includes(query) ||
          resource.location?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }
      
      // Type filter
      if (filters.type && resource.type !== filters.type) return false
      
      // Capacity filter
      if (filters.capacity) {
        const maxCapacity = parseInt(filters.capacity)
        if (maxCapacity === 200) {
          if (resource.capacity <= 100) return false
        } else if (resource.capacity > maxCapacity) {
          return false
        }
      }
      
      // Building filter
      if (filters.building && resource.building !== filters.building) return false
      
      // Attribute filters
      if (filters.hasProjector && !resource.attributes?.hasProjector) return false
      if (filters.hasAC && !resource.attributes?.hasAC) return false
      
      return true
    })
  }, [searchQuery, filters])
  
  const activeFilterCount = Object.values(filters).filter(v => v).length
  
  const clearFilters = () => {
    setFilters({
      type: '',
      capacity: '',
      building: '',
      hasProjector: false,
      hasAC: false,
    })
    setSearchQuery('')
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">
          Resource Catalog
        </h1>
        <p className="text-surface-600 dark:text-surface-400 mt-1">
          Browse and book campus resources
        </p>
      </motion.div>
      
      {/* Search and filters bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        {/* Search */}
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by name, code, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-5 h-5" />}
            rightIcon={
              searchQuery && (
                <button onClick={() => setSearchQuery('')}>
                  <X className="w-4 h-4" />
                </button>
              )
            }
          />
        </div>
        
        {/* Filter toggle */}
        <Button
          variant={showFilters || activeFilterCount > 0 ? 'primary' : 'secondary'}
          onClick={() => setShowFilters(!showFilters)}
          leftIcon={<SlidersHorizontal className="w-4 h-4" />}
        >
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded-full text-xs">
              {activeFilterCount}
            </span>
          )}
        </Button>
        
        {/* View mode toggle */}
        <div className="flex items-center gap-1 p-1 bg-surface-100 dark:bg-surface-800 rounded-xl">
          <button
            onClick={() => setViewMode('grid')}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              viewMode === 'grid' 
                ? 'bg-white dark:bg-surface-700 shadow-sm' 
                : 'hover:bg-surface-200 dark:hover:bg-surface-700'
            )}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              'p-2 rounded-lg transition-colors',
              viewMode === 'list' 
                ? 'bg-white dark:bg-surface-700 shadow-sm' 
                : 'hover:bg-surface-200 dark:hover:bg-surface-700'
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
      
      {/* Expanded filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="card p-4"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-surface-900 dark:text-white">Filter Resources</h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                Clear all
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Type"
              value={filters.type}
              onChange={(value) => setFilters(f => ({ ...f, type: value }))}
              options={typeOptions}
            />
            
            <Select
              label="Capacity"
              value={filters.capacity}
              onChange={(value) => setFilters(f => ({ ...f, capacity: value }))}
              options={capacityOptions}
            />
            
            <Select
              label="Building"
              value={filters.building}
              onChange={(value) => setFilters(f => ({ ...f, building: value }))}
              options={buildingOptions}
            />
            
            <div>
              <label className="label">Amenities</label>
              <div className="flex flex-wrap gap-2">
                <label className={clsx(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                  filters.hasProjector 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' 
                    : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'
                )}>
                  <input
                    type="checkbox"
                    checked={filters.hasProjector}
                    onChange={(e) => setFilters(f => ({ ...f, hasProjector: e.target.checked }))}
                    className="sr-only"
                  />
                  <span className="text-sm">Projector</span>
                </label>
                
                <label className={clsx(
                  'inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                  filters.hasAC 
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400' 
                    : 'border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800'
                )}>
                  <input
                    type="checkbox"
                    checked={filters.hasAC}
                    onChange={(e) => setFilters(f => ({ ...f, hasAC: e.target.checked }))}
                    className="sr-only"
                  />
                  <span className="text-sm">AC</span>
                </label>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-surface-600 dark:text-surface-400">
          {filteredResources.length} resource{filteredResources.length !== 1 ? 's' : ''} found
        </p>
      </div>
      
      {/* Resources grid/list */}
      {isLoading ? (
        <div className={clsx(
          'grid gap-4',
          viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'
        )}>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filteredResources.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <div className="w-16 h-16 bg-surface-100 dark:bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-surface-400" />
          </div>
          <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-2">
            No resources found
          </h3>
          <p className="text-surface-600 dark:text-surface-400 mb-4">
            Try adjusting your search or filters
          </p>
          <Button variant="secondary" onClick={clearFilters}>
            Clear all filters
          </Button>
        </motion.div>
      ) : (
        <div className={clsx(
          'grid gap-4',
          viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'
        )}>
          {filteredResources.map((resource, index) => (
            <ResourceCard key={resource.id} resource={resource} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}
