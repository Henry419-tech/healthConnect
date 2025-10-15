// app/auth/signup/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Heart, Mail, Lock, User, Eye, EyeOff, ArrowLeft, CheckCircle, Sparkles, Shield } from 'lucide-react'
import { useDarkMode } from '@/contexts/DarkModeContext'

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const { isDarkMode } = useDarkMode()

  const passwordRequirements = [
    { label: 'At least 6 characters', met: formData.password.length >= 6 },
    { label: 'Contains a number', met: /\d/.test(formData.password) },
    { label: 'Contains a letter', met: /[a-zA-Z]/.test(formData.password) },
  ]

  // Apply dark mode class to container
  useEffect(() => {
    const container = document.querySelector('.auth-container')
    if (container) {
      if (isDarkMode) {
        container.classList.add('dark-mode')
      } else {
        container.classList.remove('dark-mode')
      }
    }
  }, [isDarkMode])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong')
      }

      setSuccess(true)
      
      // Auto sign in after successful registration
      setTimeout(async () => {
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        })

        if (!result?.error) {
          router.push('/dashboard')
          router.refresh()
        } else {
          router.push('/auth/signin')
        }
      }, 2000)

    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className={`auth-container success-container ${isDarkMode ? 'dark-mode' : ''}`}>
        <div className="auth-bg-element auth-bg-element-1 success-bg"></div>
        <div className="auth-bg-element auth-bg-element-2 success-bg"></div>
        <div className="auth-bg-element auth-bg-element-3 success-bg"></div>
        
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="success-card"
        >
          <div className="success-glow"></div>
          <div className="success-icon-wrapper">
            <CheckCircle size={60} className="success-icon" />
            <div className="success-icon-glow"></div>
          </div>
          <h1 className="success-title">Account Created!</h1>
          <p className="success-subtitle">Welcome to HealthConnect Navigator</p>
          <div className="success-loader">
            <div className="success-spinner"></div>
            <span>Signing you in...</span>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      {/* Floating Background Elements */}
      <div className="auth-bg-element auth-bg-element-1"></div>
      <div className="auth-bg-element auth-bg-element-2"></div>
      <div className="auth-bg-element auth-bg-element-3"></div>
      <div className="auth-bg-element auth-bg-element-4"></div>
      <div className="auth-bg-element auth-bg-element-5"></div>

      {/* Animated Background Particles */}
      <div className="auth-particles">
        <div className="auth-particle"></div>
        <div className="auth-particle"></div>
        <div className="auth-particle"></div>
        <div className="auth-particle"></div>
        <div className="auth-particle"></div>
        <div className="auth-particle"></div>
        <div className="auth-particle"></div>
      </div>

      {/* Back to Home */}
      <Link 
  href="/" 
  className="auth-back-button"
  style={{ 
    transform: typeof window !== 'undefined' && window.innerWidth < 768 ? 'scale(0.8)' : 'scale(1)',
    transformOrigin: 'left center'
  }}
>
  <ArrowLeft size={20} />
  <span>Back to Home</span>
</Link>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="auth-card-container"
      >
        {/* Header */}
        <div className="auth-header">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="auth-logo signup-logo"
          >
            <Heart size={32} />
            <div className="auth-logo-glow signup-glow"></div>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="auth-title"
          >
            Create Account
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="auth-subtitle"
          >
            Join HealthConnect Navigator today
          </motion.p>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="auth-form-card signup-card"
        >
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="auth-error"
              >
                <div className="auth-error-glow"></div>
                {error}
              </motion.div>
            )}

            {/* Name Field */}
            <div className="auth-field-group">
              <label htmlFor="name" className="auth-label">
                Full Name
              </label>
              <div className="auth-input-wrapper">
                <User size={20} className="auth-input-icon" />
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="Enter your full name"
                />
                <div className="auth-input-glow"></div>
              </div>
            </div>

            {/* Email Field */}
            <div className="auth-field-group">
              <label htmlFor="email" className="auth-label">
                Email Address
              </label>
              <div className="auth-input-wrapper">
                <Mail size={20} className="auth-input-icon" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="Enter your email"
                />
                <div className="auth-input-glow"></div>
              </div>
            </div>

            {/* Password Field */}
            <div className="auth-field-group">
              <label htmlFor="password" className="auth-label">
                Password
              </label>
              <div className="auth-input-wrapper">
                <Lock size={20} className="auth-input-icon" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-toggle-password"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                <div className="auth-input-glow"></div>
              </div>
              
              {/* Password Requirements */}
              {formData.password && (
                <div className="password-requirements">
                  {passwordRequirements.map((req, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`password-requirement ${req.met ? 'met' : ''}`}
                    >
                      <div className="requirement-dot"></div>
                      {req.label}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="auth-field-group">
              <label htmlFor="confirmPassword" className="auth-label">
                Confirm Password
              </label>
              <div className="auth-input-wrapper">
                <Shield size={20} className="auth-input-icon" />
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="auth-input"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="auth-toggle-password"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                <div className="auth-input-glow"></div>
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="auth-submit-button signup-button"
            >
              <div className="auth-button-glow signup-button-glow"></div>
              <div className="auth-button-content">
                {isLoading ? (
                  <>
                    <div className="auth-spinner"></div>
                    Creating Account...
                  </>
                ) : (
                  <>
                    Create Account
                    <Sparkles size={20} />
                  </>
                )}
              </div>
            </motion.button>
          </form>

          {/* Sign In Link */}
          <div className="auth-footer-links">
            <p className="auth-footer-text">
              Already have an account?{' '}
              <Link href="/auth/signin" className="auth-footer-link">
                Sign in
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}