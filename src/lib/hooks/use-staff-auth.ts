'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'

const INACTIVITY_TIMEOUT = 8 * 60 * 60 * 1000 // 8 hours

export function useStaffAuth() {
  const router = useRouter()
  const { staff, zone, role, shift, isAuthenticated, lastActivity, logout, updateActivity } = useAuthStore()

  // Auto-logout on inactivity
  useEffect(() => {
    if (!isAuthenticated) return

    const check = () => {
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        logout()
        router.push('/zone')
      }
    }

    const interval = setInterval(check, 60000) // Check every minute
    return () => clearInterval(interval)
  }, [isAuthenticated, lastActivity, logout, router])

  // Update activity on interaction
  useEffect(() => {
    if (!isAuthenticated) return

    const handleActivity = () => updateActivity()
    window.addEventListener('touchstart', handleActivity, { passive: true })
    window.addEventListener('click', handleActivity)

    return () => {
      window.removeEventListener('touchstart', handleActivity)
      window.removeEventListener('click', handleActivity)
    }
  }, [isAuthenticated, updateActivity])

  const requireAuth = useCallback(() => {
    if (!isAuthenticated) {
      router.push('/zone')
      return false
    }
    return true
  }, [isAuthenticated, router])

  return { staff, zone, role, shift, isAuthenticated, logout, requireAuth }
}
