'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { getChicagoDate } from '@/lib/utils/timezone'

const INACTIVITY_TIMEOUT = 8 * 60 * 60 * 1000 // 8 hours

export function useStaffAuth() {
  const router = useRouter()
  const { staff, zone, role, shift, isAuthenticated, lastActivity, logout, updateActivity } = useAuthStore()

  // Auto-logout on inactivity OR day change (tasks must reset daily)
  useEffect(() => {
    if (!isAuthenticated) return

    const check = () => {
      // Inactivity check
      if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        logout()
        router.push('/login')
        return
      }
      // Day change check — shift belongs to a previous day
      if (shift?.shift_date && shift.shift_date !== getChicagoDate()) {
        logout()
        router.push('/login')
      }
    }

    const interval = setInterval(check, 60000) // Check every minute
    // Also check immediately on mount/rehydration
    check()
    return () => clearInterval(interval)
  }, [isAuthenticated, lastActivity, shift, logout, router])

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
      router.push('/login')
      return false
    }
    return true
  }, [isAuthenticated, router])

  return { staff, zone, role, shift, isAuthenticated, logout, requireAuth }
}
