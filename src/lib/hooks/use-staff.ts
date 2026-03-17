'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/auth-store'

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  display_name: string
  role_id: string
  zone_id: string
  preferred_language: 'en' | 'es'
  streak_count: number
  is_active: boolean
  role: {
    id: string
    name_en: string
    name_es: string
    slug: string
    is_manager: boolean
    zone_id: string
  }
}

export function useZoneStaff(zoneId?: string) {
  return useQuery<StaffMember[]>({
    queryKey: ['zone-staff', zoneId],
    queryFn: async () => {
      if (!zoneId) return []
      const res = await fetch(`/api/staff?zone_id=${zoneId}`)
      if (!res.ok) throw new Error('Failed to fetch staff')
      return res.json()
    },
    enabled: !!zoneId,
  })
}

export function useAllActiveStaff() {
  return useQuery<StaffMember[]>({
    queryKey: ['all-active-staff'],
    queryFn: async () => {
      const res = await fetch('/api/staff?all_active=true')
      if (!res.ok) throw new Error('Failed to fetch staff')
      return res.json()
    },
  })
}

export function useCreateStaff() {
  const queryClient = useQueryClient()
  const zone = useAuthStore((s) => s.zone)

  return useMutation({
    mutationFn: async (data: {
      first_name: string
      last_name: string
      display_name?: string
      pin: string
      role_id: string
      zone_id: string
      preferred_language: 'en' | 'es'
    }) => {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create staff')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zone-staff', zone?.id] })
    },
  })
}

export function useUpdateStaff() {
  const queryClient = useQueryClient()
  const zone = useAuthStore((s) => s.zone)

  return useMutation({
    mutationFn: async (data: {
      id: string
      first_name?: string
      last_name?: string
      display_name?: string
      pin?: string
      role_id?: string
      preferred_language?: 'en' | 'es'
    }) => {
      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update staff')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zone-staff', zone?.id] })
    },
  })
}

export function useDeactivateStaff() {
  const queryClient = useQueryClient()
  const zone = useAuthStore((s) => s.zone)

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/staff?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to deactivate staff')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zone-staff', zone?.id] })
    },
  })
}

export function useReactivateStaff() {
  const queryClient = useQueryClient()
  const zone = useAuthStore((s) => s.zone)

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: true }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to reactivate staff')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zone-staff', zone?.id] })
    },
  })
}
