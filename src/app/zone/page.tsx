'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useZones } from '@/lib/hooks/use-zones'
import { useZoneShiftCounts } from '@/lib/hooks/use-shift'
import { useAuthStore } from '@/lib/stores/auth-store'
import { createClient } from '@/lib/supabase/client'
import { ZoneCard } from '@/components/zone/zone-card'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { Skeleton } from '@/components/ui/skeleton'

export default function ZoneSelectPage() {
  const router = useRouter()
  const t = useTranslations('zone')
  const { data: zones, isLoading } = useZones()
  const { data: shiftCounts } = useZoneShiftCounts()
  const { staff, role, roleType, setZone, setRole, login } = useAuthStore()

  useEffect(() => {
    if (!staff || !roleType) {
      router.push('/role')
    }
  }, [staff, roleType, router])

  if (!staff || !roleType) return null

  const handleZoneSelect = async (zone: NonNullable<typeof zones>[0]) => {
    const supabase = createClient()
    const isManager = roleType === 'manager'

    // Resolve the role for this zone + role type
    const { data: roles } = await supabase
      .from('roles')
      .select('*')
      .eq('zone_id', zone.id)
      .eq('is_manager', isManager)
      .limit(1)

    const resolvedRole = roles?.[0] || role

    // Create or resume shift
    const today = new Date().toISOString().split('T')[0]
    const hour = new Date().getHours()
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

      if (shift) {
        // Create pending task completions
        const dayOfWeek = new Date().getDay()

        const { data: excludedSOPs } = await supabase
          .from('sops')
          .select('id')
          .eq('zone_id', zone.id)
          .not('days_of_week', 'is', null)
          .not('days_of_week', 'cs', `{${dayOfWeek}}`)

        const excludedIds = new Set(excludedSOPs?.map((es) => es.id) ?? [])

        const { data: templates } = await supabase
          .from('task_templates')
          .select('*')
          .eq('zone_id', zone.id)
          .eq('shift_type', shiftType)
          .eq('is_active', true)

        const todayTemplates = templates?.filter((t) =>
          !t.sop_id || !excludedIds.has(t.sop_id)
        ) ?? []

        if (todayTemplates.length > 0) {
          const completions = todayTemplates.map((t) => ({
            task_template_id: t.id,
            shift_id: shift!.id,
            staff_id: staff.id,
            status: 'pending' as const,
          }))

          await supabase.from('task_completions').insert(completions)
        }
      }
    }

    // Update auth store with zone, role, and shift
    setZone(zone)
    if (resolvedRole) setRole(resolvedRole)
    login({
      staff,
      zone,
      role: resolvedRole!,
      shift: shift!,
    })

    // Route to dashboard
    const dashPath = isManager
      ? `/zone/${zone.slug}/manager`
      : `/zone/${zone.slug}/staff`

    router.push(dashPath)
  }

  return (
    <div className="min-h-dvh bg-cream relative noise-bg">
      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-brown/50 text-sm mb-1">Welcome, {staff.display_name}</p>
            <h1 className="text-2xl font-bold text-brown">{t('title')}</h1>
            <p className="text-brown/50 text-sm mt-1">{t('subtitle')}</p>
          </motion.div>
          <LanguageToggle />
        </div>

        {/* Zone Cards */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {zones?.map((zone, i) => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                activeCount={shiftCounts?.[zone.id] || 0}
                onClick={() => handleZoneSelect(zone)}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
