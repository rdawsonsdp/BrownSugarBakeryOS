'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/auth-store'
import { createClient } from '@/lib/supabase/client'
import { getChicagoDate, getChicagoHour } from '@/lib/utils/timezone'
import type { Zone } from '@/lib/types/database.types'

export function useZoneSwitch() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { staff } = useAuthStore()
  const [isSwitching, setSwitching] = useState(false)

  const switchZone = async (zone: Zone) => {
    if (!staff) return
    setSwitching(true)

    try {
      const supabase = createClient()

      // Resolve manager role (roles are global, not zone-specific)
      const { data: roles } = await supabase
        .from('roles')
        .select('*')
        .eq('is_manager', true)
        .limit(1)

      const resolvedRole = roles?.[0]
      if (!resolvedRole) throw new Error('No manager role found')

      // Create or resume shift
      const today = getChicagoDate()
      const hour = getChicagoHour()
      const shiftType = hour < 11 ? 'opening' : hour < 15 ? 'mid' : 'closing'

      const { data: existingShift } = await supabase
        .from('shifts')
        .select('*')
        .eq('staff_id', staff.id)
        .eq('shift_date', today)
        .eq('shift_type', shiftType)
        .single()

      let shift = existingShift

      if (!shift) {
        const { data: newShift } = await supabase
          .from('shifts')
          .insert({
            staff_id: staff.id,
            zone_id: zone.id,
            shift_type: shiftType,
            shift_date: today,
          })
          .select()
          .single()

        shift = newShift
      }

      // Update auth store
      const store = useAuthStore.getState()
      store.setZone(zone)
      store.setRole(resolvedRole)
      store.login({
        staff,
        zone,
        role: resolvedRole,
        shift: shift!,
      })

      // Invalidate all zone-dependent queries
      queryClient.invalidateQueries()

      // Navigate (replace to avoid back-button issues)
      router.replace(`/zone/${zone.slug}/manager`)
    } catch (err) {
      console.error('Zone switch failed:', err)
    } finally {
      setSwitching(false)
    }
  }

  return { switchZone, isSwitching }
}
