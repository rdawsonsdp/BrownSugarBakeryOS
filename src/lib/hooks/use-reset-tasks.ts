'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { track } from '@/lib/analytics/track'
import { EVENTS } from '@/lib/analytics/events'

export function useResetTasks() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ zoneId, staffId }: { zoneId: string; staffId: string }) => {
      const res = await fetch('/api/reset-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zone_id: zoneId, staff_id: staffId }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to reset tasks')
      }

      return res.json()
    },
    onSuccess: (_data, { zoneId }) => {
      track(EVENTS.TASKS_RESET, { zone_id: zoneId })
      queryClient.invalidateQueries({ queryKey: ['task-completions'] })
      queryClient.invalidateQueries({ queryKey: ['all-completions-today'] })
      queryClient.invalidateQueries({ queryKey: ['all-task-completions'] })
    },
  })
}
