'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

export function useDeleteSOP() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/sops?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete SOP')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sops'] })
    },
  })
}

export function useAssignSOPStaff() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, assigned_staff_id }: { id: string; assigned_staff_id: string | null }) => {
      const res = await fetch('/api/sops', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, assigned_staff_id }),
      })
      if (!res.ok) throw new Error('Failed to assign staff')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sops'] })
      // Also refresh task completions since the API cascades reassignment
      queryClient.invalidateQueries({ queryKey: ['task-completions'] })
      queryClient.invalidateQueries({ queryKey: ['all-completions-today'] })
    },
  })
}

export function useReorderSOPs() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (items: { id: string; sort_order: number }[]) => {
      const res = await fetch('/api/sops', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: '_reorder', reorder: items }),
      })
      if (!res.ok) throw new Error('Failed to reorder SOPs')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sops'] })
    },
  })
}

export function useToggleSOPActive() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const res = await fetch('/api/sops', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active }),
      })
      if (!res.ok) throw new Error('Failed to update SOP')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sops'] })
    },
  })
}
