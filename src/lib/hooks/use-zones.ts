'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Zone } from '@/lib/types/database.types'

export function useZones() {
  return useQuery<Zone[]>({
    queryKey: ['zones'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')

      if (error) throw error
      return data
    },
  })
}

export function useZoneRoles(zoneId: string) {
  return useQuery({
    queryKey: ['roles', zoneId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('zone_id', zoneId)
        .eq('is_active', true)

      if (error) throw error
      return data
    },
    enabled: !!zoneId,
  })
}
