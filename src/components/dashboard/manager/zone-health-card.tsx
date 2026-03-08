'use client'

import { useTranslations } from 'next-intl'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils/cn'

interface ZoneHealthCardProps {
  zoneName_en: string
  zoneName_es: string
  zoneColor: string
  completionPercent: number
  activeStaff: number
  totalTasks: number
  completedTasks: number
}

export function ZoneHealthCard({
  zoneName_en,
  zoneName_es,
  zoneColor,
  completionPercent,
  activeStaff,
  totalTasks,
  completedTasks,
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
        <div className="space-y-2">
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
      </CardContent>
    </Card>
  )
}
