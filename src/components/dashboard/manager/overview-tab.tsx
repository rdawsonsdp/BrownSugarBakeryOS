'use client'

import { useTranslations } from 'next-intl'
import { AnimatePresence } from 'framer-motion'
import { useZones } from '@/lib/hooks/use-zones'
import { useActiveShifts } from '@/lib/hooks/use-shift'
import { useZoneStaff } from '@/lib/hooks/use-staff'
import { useSOPs } from '@/lib/hooks/use-sops'
import { ZoneHealthCard } from './zone-health-card'
import { AlertCard } from './alert-card'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import { CheckCircle2, Circle, User } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface OverviewTabProps {
  zoneId?: string
}

export function OverviewTab({ zoneId }: OverviewTabProps) {
  const t = useTranslations('manager')
  const { data: zones, isLoading: zonesLoading } = useZones()
  const { data: activeShifts } = useActiveShifts()
  const { data: zoneStaff } = useZoneStaff(zoneId)
  const { data: zoneSops } = useSOPs(zoneId)
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])

  // Fetch today's task completions for the current zone
  const { data: allCompletions } = useQuery({
    queryKey: ['all-completions-today', zoneId],
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

  // Filter to current zone only
  const currentZone = zones?.find((z) => z.id === zoneId)
  const filteredZones = currentZone ? [currentZone] : zones || []

  // Calculate per-zone stats
  const zoneStats = filteredZones.map((zone) => {
    const zoneCompletions = allCompletions?.filter(
      (c) => c.task_template?.zone_id === zone.id
    ) || []
    const total = zoneCompletions.length
    const completed = zoneCompletions.filter((c) => c.status === 'completed').length
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
    const staffCount = activeShifts?.filter((s) => s.zone_id === zone.id).length || 0

    return { zone, total, completed, percent, staffCount }
  })

  // Group SOPs by assigned role/staff
  const roleGroups: { roleLabel: string; staffId: string | null; sops: typeof zoneSops }[] = []

  if (zoneSops) {
    const grouped = new Map<string, { label: string; staffId: string | null; sops: typeof zoneSops }>()

    for (const sop of zoneSops) {
      const key = sop.assigned_staff?.id || '__unassigned__'
      const label = sop.assigned_staff?.display_name || 'Unassigned'

      if (!grouped.has(key)) {
        grouped.set(key, { label, staffId: sop.assigned_staff?.id || null, sops: [] })
      }
      grouped.get(key)!.sops!.push(sop)
    }

    // Put assigned roles first, unassigned last
    const entries = Array.from(grouped.values())
    entries.sort((a, b) => {
      if (a.staffId === null) return 1
      if (b.staffId === null) return -1
      return a.label.localeCompare(b.label)
    })

    for (const entry of entries) {
      roleGroups.push({ roleLabel: entry.label, staffId: entry.staffId, sops: entry.sops })
    }
  }

  // Find overdue critical tasks for this zone only
  const overdueAlerts = allCompletions?.filter((c) => {
    if (c.status === 'completed') return false
    if (!c.task_template?.is_critical) return false
    if (dismissedAlerts.includes(c.id)) return false
    if (zoneId && c.task_template?.zone_id !== zoneId) return false
    const created = new Date(c.created_at)
    return Date.now() - created.getTime() > 30 * 60 * 1000
  }) || []

  return (
    <div className="space-y-6 p-4">
      {/* Zone Health Card */}
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

      {/* Tasks organized by Role */}
      {roleGroups.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-brown/60 uppercase tracking-wider mb-3">
            {t('currentTasks')}
          </h2>
          <div className="space-y-4">
            {roleGroups.map((group) => {
              const totalInGroup = group.sops?.length || 0
              // Check completion status from allCompletions for these SOPs
              const sopIds = new Set(group.sops?.map((s) => s.id) || [])

              return (
                <div key={group.staffId || 'unassigned'} className="space-y-1.5">
                  {/* Role header */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-brown/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-brown/40" />
                    </div>
                    <span className="text-xs font-bold text-brown">
                      {group.roleLabel}
                    </span>
                    <span className="text-[10px] text-brown/40">
                      {totalInGroup} {totalInGroup === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>

                  {/* Tasks under this role */}
                  {group.sops?.map((sop) => {
                    // Find if there's a completion for this SOP
                    const completion = allCompletions?.find(
                      (c) => c.task_template?.sop_id === sop.id
                    )
                    const isCompleted = completion?.status === 'completed'

                    return (
                      <div
                        key={sop.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border transition-colors ml-8',
                          isCompleted
                            ? 'bg-brown/5 border-brown/5'
                            : 'bg-white border-brown/10'
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-brown/20 flex-shrink-0" />
                        )}
                        <span
                          className={cn(
                            'text-sm flex-1',
                            isCompleted
                              ? 'line-through text-brown/30'
                              : 'text-brown font-medium'
                          )}
                        >
                          {sop.name_en}
                        </span>
                        {sop.is_critical && !isCompleted && (
                          <span className="text-[10px] font-bold text-red uppercase">Critical</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

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
