'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { createClient } from '@/lib/supabase/client'
import { track, flushQueue } from './track'
import { EVENTS } from './events'

/**
 * Hook that manages session lifecycle analytics.
 * Call once in the Providers component.
 *
 * - Tracks session_end on beforeunload / logout
 * - Updates login_sessions.logged_out_at
 * - Flushes offline event queue when online
 */
export function useTrackSession() {
  useEffect(() => {
    // Flush any queued offline events on load
    flushQueue()

    const handleOnline = () => {
      flushQueue()
    }

    const handleBeforeUnload = () => {
      const state = useAuthStore.getState()
      if (!state.isAuthenticated || !state.shift) return

      // Track session end
      track(EVENTS.SESSION_END)

      // Update login_sessions.logged_out_at using sendBeacon for reliability
      try {
        const payload = JSON.stringify({ shift_id: state.shift.id })
        navigator.sendBeacon('/api/analytics/session-end', payload)
      } catch {
        // Best effort
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])
}
