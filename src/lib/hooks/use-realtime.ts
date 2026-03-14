'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useRealtimeTaskCompletions(shiftId?: string) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!shiftId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`task-completions-${shiftId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_completions',
          filter: `shift_id=eq.${shiftId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['task-completions', shiftId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [shiftId, queryClient])
}

export function useRealtimeAll() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('manager-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_completions' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['all-task-completions'] })
          queryClient.invalidateQueries({ queryKey: ['all-completions-today'] })
          queryClient.invalidateQueries({ queryKey: ['task-completions'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shifts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['active-shifts'] })
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])
}
