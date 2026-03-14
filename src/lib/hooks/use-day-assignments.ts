'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getChicagoDate } from '@/lib/utils/timezone'

interface DayAssignment {
  id: string
  zone_id: string
  role_id: string
  staff_id: string | null
  shift_date: string
  shift_type: string
  assigned_by: string
  status: 'draft' | 'started'
  role: {
    id: string
    name_en: string
    name_es: string
    slug: string
    sort_order: number
    is_manager: boolean
  }
  staff: {
    id: string
    first_name: string
    last_name: string
    display_name: string
  } | null
}

interface DayStatus {
  day_setup: boolean
  day_started: boolean
  staff_assignment: {
    role_id: string
    role_name_en: string
    role_name_es: string
    status: string
  } | null
}

export function useDayAssignments(zoneId?: string) {
  return useQuery<DayAssignment[]>({
    queryKey: ['day-assignments', zoneId],
    queryFn: async () => {
      if (!zoneId) return []
      const res = await fetch(`/api/day-assignments?zone_id=${zoneId}`)
      if (!res.ok) throw new Error('Failed to fetch day assignments')
      return res.json()
    },
    enabled: !!zoneId,
  })
}

export function useDayStatus(zoneId?: string, staffId?: string) {
  return useQuery<DayStatus>({
    queryKey: ['day-status', zoneId, staffId],
    queryFn: async () => {
      if (!zoneId || !staffId) return { day_setup: false, day_started: false, staff_assignment: null }
      const res = await fetch(`/api/day-status?zone_id=${zoneId}&staff_id=${staffId}`)
      if (!res.ok) throw new Error('Failed to fetch day status')
      return res.json()
    },
    enabled: !!zoneId && !!staffId,
    refetchInterval: 5_000, // Poll every 5s for staff waiting screen
  })
}

export function useUpsertAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      zone_id: string
      role_id: string
      staff_id: string | null
      assigned_by: string
    }) => {
      const res = await fetch('/api/day-assignments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update assignment')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['day-assignments', variables.zone_id] })
    },
  })
}

export function useClearAssignment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, zoneId }: { id: string; zoneId: string }) => {
      const res = await fetch(`/api/day-assignments?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to clear assignment')
      return { zoneId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['day-assignments', data.zoneId] })
    },
  })
}

export function useStartDay() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { zone_id: string; manager_staff_id: string }) => {
      const res = await fetch('/api/start-day', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to start day')
      }
      return res.json()
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['day-assignments', variables.zone_id] })
      queryClient.invalidateQueries({ queryKey: ['active-shifts'] })
      queryClient.invalidateQueries({ queryKey: ['day-status'] })
      queryClient.invalidateQueries({ queryKey: ['all-completions-today'] })
      queryClient.invalidateQueries({ queryKey: ['all-task-completions'] })
    },
  })
}

export function useDayStarted(zoneId?: string) {
  const { data: assignments } = useDayAssignments(zoneId)
  return assignments?.some((a) => a.status === 'started') ?? false
}
