'use client'

import { useTranslations } from 'next-intl'
import { AnimatePresence } from 'framer-motion'
import { useZones } from '@/lib/hooks/use-zones'
import { useActiveShifts } from '@/lib/hooks/use-shift'
import { ZoneHealthCard } from './zone-health-card'
import { AlertCard } from './alert-card'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function OverviewTab() {
  const t = useTranslations('manager')
  const { data: zones, isLoading: zonesLoading } = useZones()
  const { data: activeShifts } = useActiveShifts()
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])

  // Fetch today's task completions for all zones
  const { data: allCompletions } = useQuery({
    queryKey: ['all-completions-today'],
    queryFn: async () => {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('task_completions')
        .select('*, task_template:task_templates(*)')
        .gte('created_at', `${today}T00:00:00`)

      if (error) throw error
      return data
    },
  })

  if (zonesLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  // Calculate per-zone stats
  const zoneStats = zones?.map((zone) => {
    const zoneCompletions = allCompletions?.filter(
      (c) => c.task_template?.zone_id === zone.id
    ) || []
    const total = zoneCompletions.length
    const completed = zoneCompletions.filter((c) => c.status === 'completed').length
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
    const staffCount = activeShifts?.filter((s) => s.zone_id === zone.id).length || 0

    return { zone, total, completed, percent, staffCount }
  }) || []

  // Find overdue critical tasks
  const overdueAlerts = allCompletions?.filter((c) => {
    if (c.status === 'completed') return false
    if (!c.task_template?.is_critical) return false
    if (dismissedAlerts.includes(c.id)) return false
    // Consider overdue if created more than 30 min ago
    const created = new Date(c.created_at)
    return Date.now() - created.getTime() > 30 * 60 * 1000
  }) || []

  return (
    <div className="space-y-6 p-4">
      {/* Zone Health Cards */}
      <div>
        <h2 className="text-sm font-semibold text-brown/60 uppercase tracking-wider mb-3">
          {t('zoneHealth')}
        </h2>
        <div className="grid gap-3">
          {zoneStats.map(({ zone, total, completed, percent, staffCount }) => (
            <ZoneHealthCard
              key={zone.id}
              zoneName_en={zone.name_en}
              zoneName_es={zone.name_es}
              zoneColor={zone.color}
              completionPercent={percent}
              activeStaff={staffCount}
              totalTasks={total}
              completedTasks={completed}
            />
          ))}
        </div>
      </div>

      {/* Alerts */}
      <div>
        <h2 className="text-sm font-semibold text-brown/60 uppercase tracking-wider mb-3">
          {t('alerts')}
        </h2>
        <AnimatePresence mode="popLayout">
          {overdueAlerts.length > 0 ? (
            <div className="space-y-2">
              {overdueAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  title={alert.task_template?.name_en || 'Task overdue'}
                  type="overdue"
                  onDismiss={() => setDismissedAlerts((prev) => [...prev, alert.id])}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-brown/40 text-center py-6">{t('noAlerts')}</p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
