'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getChicagoDate } from '@/lib/utils/timezone'

export function useActiveShifts(zoneId?: string) {
  return useQuery({
    queryKey: ['active-shifts', zoneId],
    queryFn: async () => {
      const supabase = createClient()
      const today = getChicagoDate()

      let query = supabase
        .from('shifts')
        .select('*, staff:staff(*)')
        .eq('shift_date', today)
        .is('ended_at', null)

      if (zoneId) query = query.eq('zone_id', zoneId)

      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
}

export function useZoneShiftCounts() {
  return useQuery({
    queryKey: ['zone-shift-counts'],
    queryFn: async () => {
      const supabase = createClient()
      const today = getChicagoDate()

      const { data, error } = await supabase
        .from('shifts')
        .select('zone_id')
        .eq('shift_date', today)
        .is('ended_at', null)

      if (error) throw error

      const counts: Record<string, number> = {}
      data?.forEach((s) => {
        counts[s.zone_id] = (counts[s.zone_id] || 0) + 1
      })
      return counts
    },
  })
}
