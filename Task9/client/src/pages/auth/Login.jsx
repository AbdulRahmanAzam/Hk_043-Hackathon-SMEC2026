import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import toast from 'react-hot-toast'

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()
  
  const validate = () => {
    const newErrors = {}
    
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    
    if (!validate()) return
    
    const result = await login(formData.email, formData.password)
    
    if (result.success) {
      toast.success('Welcome back!')
      navigate('/dashboard')
    } else {
      toast.error(result.error || 'Login failed')
    }
  }
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }
  
  return (
    <div>
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center justify-center mb-8">
        <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">
          Welcome back
        </h1>
        <p className="text-surface-600 dark:text-surface-400 mb-8">
          Sign in to continue to your dashboard
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter your email"
            leftIcon={<Mail className="w-5 h-5" />}
            error={errors.email}
            autoComplete="email"
          />
          
          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            leftIcon={<Lock className="w-5 h-5" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-surface-400 hover:text-surface-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            }
            error={errors.password}
            autoComplete="current-password"
          />
          
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-surface-600 dark:text-surface-400">
                Remember me
              </span>
            </label>
            
            <a href="#" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
              Forgot password?
            </a>
          </div>
          
          <Button
            type="submit"
            isLoading={isLoading}
            className="w-full"
            size="lg"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Sign in
          </Button>
        </form>
        
        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-surface-200 dark:border-surface-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-surface-50 dark:bg-surface-950 text-surface-500">
              New to Campus Resource?
            </span>
          </div>
        </div>
        
        <Link to="/register">
          <Button variant="secondary" className="w-full" size="lg">
            Create an account
          </Button>
        </Link>
        
        {/* Demo credentials */}
        <div className="mt-8 p-4 rounded-xl bg-surface-100 dark:bg-surface-800/50">
          <p className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Demo Credentials
          </p>
          <div className="space-y-1 text-sm text-surface-600 dark:text-surface-400">
            <p><span className="font-medium">Admin:</span> admin@campus.edu</p>
            <p><span className="font-medium">Faculty:</span> faculty@campus.edu</p>
            <p><span className="font-medium">Student:</span> student@campus.edu</p>
            <p className="text-xs mt-2">Password for all: <code className="px-1.5 py-0.5 bg-surface-200 dark:bg-surface-700 rounded">Demo123!</code></p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
