// app/auth/signin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Heart, Mail, Lock, Eye, EyeOff, ArrowLeft, Sparkles } from 'lucide-react'
import { useDarkMode } from '@/contexts/DarkModeContext'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { isDarkMode } = useDarkMode()

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        await getSession()
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
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
      </div>

      {/* Back to Home */}
      <Link href="/" className="auth-back-button">
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
            className="auth-logo"
          >
            <Heart size={32} />
            <div className="auth-logo-glow"></div>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="auth-title"
          >
            Welcome Back
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="auth-subtitle"
          >
            Sign in to access your health dashboard
          </motion.p>
        </div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="auth-form-card"
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

            {/* Email Field */}
            <div className="auth-field-group">
              <label htmlFor="email" className="auth-label">
                Email Address
              </label>
              <div className="auth-input-wrapper">
                <Mail size={20} className="auth-input-icon" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                  placeholder="Enter your password"
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
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="auth-submit-button"
            >
              <div className="auth-button-glow"></div>
              <div className="auth-button-content">
                {isLoading ? (
                  <>
                    <div className="auth-spinner"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <Sparkles size={20} />
                  </>
                )}
              </div>
            </motion.button>
          </form>

          {/* Sign Up Link */}
          <div className="auth-footer-links">
            <p className="auth-footer-text">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="auth-footer-link">
                Sign up
              </Link>
            </p>
          </div>
        </motion.div>

        {/* Demo Credentials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="auth-demo-card"
        >
          <div className="auth-demo-glow"></div>
          <div className="auth-demo-content">
            <p className="auth-demo-title">✨ Demo Credentials</p>
            <p className="auth-demo-details">
              Email: demo@healthconnect.com<br />
              Password: demo123
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}