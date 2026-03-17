'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { User, UserX, UserPlus, ChevronDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface RoleSlot {
  roleId: string
  roleName: string
  staffName: string | null
  completed: number
  total: number
}

interface AvailableStaff {
  id: string
  first_name: string
  last_name: string
  display_name: string
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
  availableStaff?: AvailableStaff[]
  assigningRoleId?: string | null
  onAssignRole?: (roleId: string, staffId: string) => void
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
  availableStaff,
  assigningRoleId,
  onAssignRole,
}: ZoneHealthCardProps) {
  const t = useTranslations('manager')
  const { locale } = useLocaleStore()
  const name = locale === 'es' ? zoneName_es : zoneName_en
  const [openRoleId, setOpenRoleId] = useState<string | null>(null)

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
            <div className="space-y-1 pt-1 border-t border-brown/5">
              {roleSlots.map((slot) => {
                const slotPercent = slot.total === 0 ? 0 : Math.round((slot.completed / slot.total) * 100)
                const isOpen = openRoleId === slot.roleId
                const isAssigning = assigningRoleId === slot.roleId

                return (
                  <div key={slot.roleId}>
                    <div className="flex items-center gap-2 text-xs py-0.5">
                      {slot.staffName ? (
                        <User className="w-3.5 h-3.5 text-brown/40 flex-shrink-0" />
                      ) : (
                        <UserX className="w-3.5 h-3.5 text-brown/20 flex-shrink-0" />
                      )}
                      <span className="font-medium text-brown/70 min-w-0 truncate">
                        {slot.roleName}
                      </span>
                      <span className="text-brown/40 mx-0.5">&mdash;</span>
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
                      ) : onAssignRole ? (
                        <button
                          onClick={() => setOpenRoleId(isOpen ? null : slot.roleId)}
                          className={cn(
                            'flex items-center gap-1 px-2 py-0.5 rounded-full border border-dashed text-[10px] font-medium transition-colors',
                            isOpen
                              ? 'border-gold bg-gold/5 text-gold'
                              : 'border-brown/20 text-brown/30 hover:border-gold/40 hover:text-brown/50'
                          )}
                        >
                          {isAssigning ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <UserPlus className="w-3 h-3" />
                          )}
                          {locale === 'es' ? 'Asignar' : 'Assign'}
                          <ChevronDown className={cn('w-2.5 h-2.5 transition-transform', isOpen && 'rotate-180')} />
                        </button>
                      ) : (
                        <span className="text-brown/30 italic">
                          {locale === 'es' ? 'Sin asignar' : 'Not assigned'}
                        </span>
                      )}
                    </div>

                    {/* Staff picker dropdown */}
                    {isOpen && onAssignRole && availableStaff && (
                      <div className="ml-5 mt-1 mb-2 p-2 bg-cream/50 border border-brown/5 rounded-lg">
                        {availableStaff.length > 0 ? (
                          <div className="grid grid-cols-2 gap-1.5">
                            {availableStaff.map((s) => (
                              <button
                                key={s.id}
                                onClick={() => {
                                  onAssignRole(slot.roleId, s.id)
                                  setOpenRoleId(null)
                                }}
                                disabled={isAssigning}
                                className="flex items-center gap-2 p-2 rounded-lg bg-white border border-brown/10 hover:border-gold/30 hover:shadow-sm transition-all text-left disabled:opacity-50"
                              >
                                <div className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center text-[9px] font-bold text-gold flex-shrink-0">
                                  {s.first_name?.[0]}{s.last_name?.[0]}
                                </div>
                                <span className="text-xs font-medium text-brown truncate">
                                  {s.display_name}
                                </span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-brown/40 text-center py-1">
                            {locale === 'es' ? 'No hay personal disponible' : 'No staff available'}
                          </p>
                        )}
                      </div>
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
