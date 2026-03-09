'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { RoleSopAssignment, SOP } from '@/lib/types/database.types'

type SopSummary = Pick<SOP, 'id' | 'name_en' | 'name_es' | 'is_critical' | 'category' | 'sort_order' | 'zone_id'>

export interface RoleSopAssignmentWithSop extends RoleSopAssignment {
  sop: SopSummary | null
}

export function useRoleSopAssignments(roleId: string | null) {
  return useQuery<RoleSopAssignmentWithSop[]>({
    queryKey: ['role-sop-assignments', roleId],
    queryFn: async () => {
      const res = await fetch(`/api/role-sop-assignments?role_id=${roleId}`)
      if (!res.ok) throw new Error('Failed to fetch role SOP assignments')
      return res.json()
    },
    enabled: !!roleId,
  })
}

export function useAddRoleSopAssignment() {
  const queryClient = useQueryClient()

  return useMutation<RoleSopAssignmentWithSop, Error, { role_id: string; sop_id: string }>({
    mutationFn: async ({ role_id, sop_id }) => {
      const res = await fetch('/api/role-sop-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role_id, sop_id }),
      })
      if (!res.ok) throw new Error('Failed to add role SOP assignment')
      return res.json()
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['role-sop-assignments', vars.role_id] })
    },
  })
}

export function useRemoveRoleSopAssignment() {
  const queryClient = useQueryClient()

  return useMutation<{ success: boolean }, Error, { role_id: string; sop_id: string }>({
    mutationFn: async ({ role_id, sop_id }) => {
      const res = await fetch(
        `/api/role-sop-assignments?role_id=${role_id}&sop_id=${sop_id}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error('Failed to remove role SOP assignment')
      return res.json()
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['role-sop-assignments', vars.role_id] })
    },
  })
}
