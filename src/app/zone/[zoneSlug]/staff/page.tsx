'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { useStaffAuth } from '@/lib/hooks/use-staff-auth'
import { track } from '@/lib/analytics/track'
import { EVENTS } from '@/lib/analytics/events'
import { useSOPs } from '@/lib/hooks/use-sops'
import { useCategories } from '@/lib/hooks/use-categories'
import { useRoleSopAssignments } from '@/lib/hooks/use-role-sop-assignments'
import { ZoneHeader } from '@/components/layout/zone-header'
import { BottomNav } from '@/components/layout/bottom-nav'
import { OfflineBanner } from '@/components/layout/offline-banner'
import { TaskList } from '@/components/dashboard/staff/task-list'
import { ShiftNotes } from '@/components/dashboard/shared/shift-notes'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LogOut, Printer } from 'lucide-react'
import { useTaskCompletions } from '@/lib/hooks/use-tasks'
import { IncompleteTasksDialog } from '@/components/layout/incomplete-tasks-dialog'

function SignOutButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors text-white text-xs font-semibold"
    >
      <LogOut className="w-3.5 h-3.5" />
      {label}
    </button>
  )
}
import { AppVersion } from '@/components/layout/app-version'
import { SOPPrintCard } from '@/components/sop/sop-print-card'
import type { SOPWithSteps } from '@/lib/types/database.types'

export default function StaffDashboardPage() {
  const router = useRouter()
  const t = useTranslations('dashboard')
  const { locale } = useLocaleStore()
  const { staff, zone, role, shift, isAuthenticated, logout } = useStaffAuth()
  const [activeTab, setActiveTab] = useState<'tasks' | 'sops' | 'profile'>('tasks')
  const [showSignOutWarning, setShowSignOutWarning] = useState(false)
  const handleTabChange = useCallback((tab: 'tasks' | 'sops' | 'profile') => {
    track(EVENTS.TAB_CHANGE, { from: activeTab, to: tab, dashboard: 'staff' })
    setActiveTab(tab)
  }, [activeTab])
  const { data: completions } = useTaskCompletions(shift?.id)
  const { data: sops } = useSOPs(zone?.id)
  const { data: roleAssignments } = useRoleSopAssignments(role?.id ?? null)
  const { data: categories = [] } = useCategories()

  // Filter SOPs to only those assigned to current role (if assignments exist)
  const filteredSops = useMemo(() => {
    if (!sops) return []
    if (!roleAssignments || roleAssignments.length === 0) return sops
    const assignedSopIds = new Set(roleAssignments.filter((a) => a.is_active).map((a) => a.sop_id))
    return sops.filter((s) => assignedSopIds.has(s.id))
  }, [sops, roleAssignments])
  const [printSop, setPrintSop] = useState<SOPWithSteps | null>(null)

  // Shift notes (handoff)
  const [previousNotes] = useState(() => {
    try { return sessionStorage.getItem('bakeryos-prev-notes') || null } catch { return null }
  })

  const handleSaveNotes = useCallback(async (notes: string) => {
    if (!shift) return
    track(EVENTS.SHIFT_NOTES_SAVE, { shift_id: shift.id, length: notes.length })
    try {
      await fetch('/api/shift-notes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id: shift.id, notes }),
      })
    } catch { /* swallow — notes will be lost if offline */ }
  }, [shift])

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  if (!staff || !zone || !role || !shift) return null

  const shiftLabel = t(`shift.${shift.shift_type}` as 'shift.opening')
  const roleName = locale === 'es' ? role.name_es : role.name_en

  const incompleteTasks = completions?.filter((c) => c.status !== 'completed' && c.status !== 'skipped') || []

  const handleLogout = () => {
    if (incompleteTasks.length > 0) {
      setShowSignOutWarning(true)
      return
    }
    logout()
    router.push('/login')
  }

  const handleForceLogout = () => {
    setShowSignOutWarning(false)
    logout()
    router.push('/login')
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
        compact
        rightSlot={<SignOutButton onClick={handleLogout} label={locale === 'es' ? 'Cerrar Sesión' : 'Sign Out'} />}
      />
      <OfflineBanner />

      <div className="max-w-lg mx-auto no-print">
        {activeTab === 'tasks' && (
          <>
            <div className="px-4 pt-4">
              <ShiftNotes
                shiftId={shift.id}
                previousNotes={previousNotes}
                onSave={handleSaveNotes}
              />
            </div>
            <TaskList shiftId={shift.id} zoneId={zone.id} />
          </>
        )}

        {activeTab === 'sops' && (
          <div className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-brown/60 uppercase tracking-wider">
              {t('sops')}
            </h2>
            {filteredSops.map((sop) => (
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
              <LogOut className="w-4 h-4" /> {locale === 'es' ? 'Cerrar Sesión' : 'Sign Out'}
            </Button>
            <div className="text-center pt-2">
              <AppVersion showBuild />
            </div>
          </div>
        )}
      </div>

      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Print view */}
      {printSop && <SOPPrintCard sop={printSop} categories={categories} />}

      {/* Sign-out warning dialog */}
      <IncompleteTasksDialog
        open={showSignOutWarning}
        onClose={() => setShowSignOutWarning(false)}
        onConfirm={handleForceLogout}
        incompleteCount={incompleteTasks.length}
        totalCount={completions?.length || 0}
      />
    </motion.div>
  )
}
