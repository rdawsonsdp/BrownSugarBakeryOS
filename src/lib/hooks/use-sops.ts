'use client'

import { useQuery } from '@tanstack/react-query'
import type { SOPWithSteps } from '@/lib/types/database.types'

export function useSOPs(zoneId?: string, category?: string) {
  return useQuery<SOPWithSteps[]>({
    queryKey: ['sops', zoneId, category],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (zoneId) params.set('zone_id', zoneId)
      if (category) params.set('category', category)

      const res = await fetch(`/api/sops?${params}`)
      if (!res.ok) throw new Error('Failed to fetch SOPs')
      return res.json()
    },
  })
}

export function useSOP(sopId: string | null) {
  return useQuery<SOPWithSteps>({
    queryKey: ['sop', sopId],
    queryFn: async () => {
      const res = await fetch(`/api/sops?id=${sopId}`)
      if (!res.ok) throw new Error('Failed to fetch SOP')
      const data = await res.json()
      return Array.isArray(data) ? data[0] : data
    },
    enabled: !!sopId,
  })
}
