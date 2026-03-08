'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { TaskCompletionWithTemplate } from '@/lib/types/database.types'

export function useTaskCompletions(shiftId: string | undefined) {
  return useQuery<TaskCompletionWithTemplate[]>({
    queryKey: ['task-completions', shiftId],
    queryFn: async () => {
      if (!shiftId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('task_completions')
        .select('*, task_template:task_templates(*)')
        .eq('shift_id', shiftId)
        .order('created_at')

      if (error) throw error

      // Sort: critical first, then by priority
      return (data as TaskCompletionWithTemplate[]).sort((a, b) => {
        if (a.task_template.is_critical !== b.task_template.is_critical) {
          return a.task_template.is_critical ? -1 : 1
        }
        return a.task_template.priority - b.task_template.priority
      })
    },
    enabled: !!shiftId,
  })
}

export function useCompleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, photo_url, notes }: { id: string; photo_url?: string; notes?: string }) => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('task_completions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          photo_url: photo_url || null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-completions'] })
    },
  })
}

export function useAllTaskCompletions(zoneId?: string) {
  return useQuery({
    queryKey: ['all-task-completions', zoneId],
    queryFn: async () => {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]

      let query = supabase
        .from('task_completions')
        .select('*, task_template:task_templates(*), shift:shifts(*), staff:staff(*)')
        .gte('created_at', `${today}T00:00:00`)

      if (zoneId) {
        query = query.eq('task_template.zone_id' as string, zoneId)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}
