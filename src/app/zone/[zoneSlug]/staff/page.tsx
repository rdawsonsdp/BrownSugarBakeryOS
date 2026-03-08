'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { useStaffAuth } from '@/lib/hooks/use-staff-auth'
import { useSOPs } from '@/lib/hooks/use-sops'
import { useCategories } from '@/lib/hooks/use-categories'
import { ZoneHeader } from '@/components/layout/zone-header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { TaskList } from '@/components/dashboard/staff/task-list'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LogOut, Printer } from 'lucide-react'
import { SOPPrintCard } from '@/components/sop/sop-print-card'
import type { SOPWithSteps } from '@/lib/types/database.types'

export default function StaffDashboardPage() {
  const router = useRouter()
  const t = useTranslations('dashboard')
  const { locale } = useLocaleStore()
  const { staff, zone, role, shift, isAuthenticated, logout } = useStaffAuth()
  const [activeTab, setActiveTab] = useState<'tasks' | 'sops' | 'profile'>('tasks')
  const { data: sops } = useSOPs(zone?.id)
  const { data: categories = [] } = useCategories()
  const [printSop, setPrintSop] = useState<SOPWithSteps | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/zone')
    }
  }, [isAuthenticated, router])

  if (!staff || !zone || !role || !shift) return null

  const shiftLabel = t(`shift.${shift.shift_type}` as 'shift.opening')
  const roleName = locale === 'es' ? role.name_es : role.name_en

  const handleLogout = () => {
    logout()
    router.push('/zone')
  }

  const handlePrint = (sop: SOPWithSteps) => {
    setPrintSop(sop)
    setTimeout(() => window.print(), 100)
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-dvh bg-cream pb-20"
    >
      <ZoneHeader
        zoneName_en={zone.name_en}
        zoneName_es={zone.name_es}
        zoneColor={zone.color}
        roleName={roleName}
        staffName={staff.display_name}
        streak={staff.streak_count}
        shiftType={shiftLabel}
      />

      <div className="max-w-lg mx-auto no-print">
        {activeTab === 'tasks' && (
          <TaskList shiftId={shift.id} zoneId={zone.id} />
        )}

        {activeTab === 'sops' && (
          <div className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-brown/60 uppercase tracking-wider">
              {t('sops')}
            </h2>
            {sops?.map((sop) => (
              <Card key={sop.id} variant="default">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">
                      {locale === 'es' ? sop.name_es : sop.name_en}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {sop.is_critical && <Badge variant="critical" className="text-[10px]">Critical</Badge>}
                      <Button variant="ghost" size="sm" onClick={() => handlePrint(sop)}>
                        <Printer className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-brown/50">
                    {locale === 'es' ? sop.description_es : sop.description_en}
                  </p>
                  <p className="text-xs text-brown/40 mt-1">
                    {sop.sop_steps?.length || 0} steps
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="p-4 space-y-4">
            <Card variant="elevated">
              <CardContent className="p-5">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full bg-cream-dark mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-brown/30">
                    {staff.first_name[0]}{staff.last_name[0]}
                  </div>
                  <h2 className="text-lg font-bold text-brown">{staff.display_name}</h2>
                  <p className="text-sm text-brown/50">{roleName} — {locale === 'es' ? zone.name_es : zone.name_en}</p>
                  {staff.streak_count > 0 && (
                    <p className="text-gold font-semibold mt-2">
                      🔥 {t('streak', { count: staff.streak_count })}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            <Button variant="danger" onClick={handleLogout} className="w-full">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </div>
        )}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Print view */}
      {printSop && <SOPPrintCard sop={printSop} categories={categories} />}
    </motion.div>
  )
}
