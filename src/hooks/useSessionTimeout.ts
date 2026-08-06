/**
 * useSessionTimeout — auto sign out after `timeoutMs` of user inactivity.
 *
 * Tracked events: mousemove, keydown, click, scroll, touchstart.
 * A 2-minute warning modal appears before logout fires.
 *
 * Usage: call once in a layout/provider that wraps authenticated pages.
 */
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { signOut } from 'next-auth/react'

const DEFAULT_TIMEOUT_MS  = 30 * 60 * 1000  // 30 minutes
const WARNING_BEFORE_MS   =  2 * 60 * 1000  // warn 2 min before logout

export function useSessionTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const [showWarning, setShowWarning] = useState(false)
  const logoutTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimer    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimers = useCallback(() => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current)
    if (warnTimer.current)   clearTimeout(warnTimer.current)
  }, [])

  const resetTimers = useCallback(() => {
    clearTimers()
    setShowWarning(false)

    warnTimer.current = setTimeout(() => {
      setShowWarning(true)
    }, timeoutMs - WARNING_BEFORE_MS)

    logoutTimer.current = setTimeout(() => {
      signOut({ callbackUrl: '/auth/signin?reason=timeout' })
    }, timeoutMs)
  }, [clearTimers, timeoutMs])

  useEffect(() => {
    resetTimers()
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const
    const handler = () => resetTimers()
    events.forEach(e => window.addEventListener(e, handler, { passive: true }))
    return () => {
      clearTimers()
      events.forEach(e => window.removeEventListener(e, handler))
    }
  }, [resetTimers, clearTimers])

  const stayLoggedIn = useCallback(() => {
    resetTimers()
    setShowWarning(false)
  }, [resetTimers])

  return { showWarning, stayLoggedIn }
}
