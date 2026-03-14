'use client'

import { useTranslations } from 'next-intl'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, UserX } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface RoleSlot {
  roleId: string
  roleName: string
  staffName: string | null
  completed: number
  total: number
}

interface ZoneHealthCardProps {
  zoneName_en: string
  zoneName_es: string
  zoneColor: string
  completionPercent: number
  activeStaff: number
  totalTasks: number
  completedTasks: number
  roleSlots?: RoleSlot[]
}

export function ZoneHealthCard({
  zoneName_en,
  zoneName_es,
  zoneColor,
  completionPercent,
  activeStaff,
  totalTasks,
  completedTasks,
  roleSlots,
}: ZoneHealthCardProps) {
  const t = useTranslations('manager')
  const { locale } = useLocaleStore()
  const name = locale === 'es' ? zoneName_es : zoneName_en

  return (
    <Card variant="elevated" className="overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: zoneColor }} />
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{name}</CardTitle>
        <p className="text-xs text-brown/50">
          {t('staffActive', { count: activeStaff })}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Overall progress */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-brown/60">{completedTasks}/{totalTasks}</span>
              <span className={cn(
                'font-bold',
                completionPercent >= 80 ? 'text-success' :
                completionPercent >= 50 ? 'text-warning' : 'text-red'
              )}>
                {completionPercent}%
              </span>
            </div>
            <div className="h-2 bg-brown/10 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  completionPercent >= 80 ? 'bg-success' :
                  completionPercent >= 50 ? 'bg-warning' : 'bg-red'
                )}
                style={{ width: `${completionPercent}%` }}
              />
            </div>
          </div>

          {/* Per-role breakdown */}
          {roleSlots && roleSlots.length > 0 && (
            <div className="space-y-1.5 pt-1 border-t border-brown/5">
              {roleSlots.map((slot) => {
                const slotPercent = slot.total === 0 ? 0 : Math.round((slot.completed / slot.total) * 100)
                return (
                  <div key={slot.roleId} className="flex items-center gap-2 text-xs">
                    {slot.staffName ? (
                      <User className="w-3.5 h-3.5 text-brown/40 flex-shrink-0" />
                    ) : (
                      <UserX className="w-3.5 h-3.5 text-brown/20 flex-shrink-0" />
                    )}
                    <span className="font-medium text-brown/70 min-w-0 truncate">
                      {slot.roleName}
                    </span>
                    <span className="text-brown/40 mx-0.5">—</span>
                    {slot.staffName ? (
                      <>
                        <span className="text-brown/60 truncate">{slot.staffName}</span>
                        <span className="ml-auto text-brown/40 flex-shrink-0 tabular-nums">
                          {slot.completed}/{slot.total}
                        </span>
                        <span className={cn(
                          'font-semibold flex-shrink-0 tabular-nums w-8 text-right',
                          slotPercent >= 80 ? 'text-success' :
                          slotPercent >= 50 ? 'text-warning' : 'text-red'
                        )}>
                          {slotPercent}%
                        </span>
                      </>
                    ) : (
                      <span className="text-brown/30 italic">
                        {locale === 'es' ? 'Sin asignar' : 'Not assigned'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
