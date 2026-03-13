'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { useStaffAuth } from '@/lib/hooks/use-staff-auth'
import { track } from '@/lib/analytics/track'
import { EVENTS } from '@/lib/analytics/events'
import { useRealtimeAll } from '@/lib/hooks/use-realtime'
import { ZoneHeader } from '@/components/layout/zone-header'
import { NotificationBell } from '@/components/layout/notification-bell'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { OverviewTab } from '@/components/dashboard/manager/overview-tab'
import { TeamTab } from '@/components/dashboard/manager/team-tab'
import { SOPLibrary } from '@/components/sop/sop-library'
import { SettingsTab } from '@/components/dashboard/manager/settings-tab'
import { LogOut } from 'lucide-react'
import { OfflineBanner } from '@/components/layout/offline-banner'
import { useTaskCompletions } from '@/lib/hooks/use-tasks'
import { IncompleteTasksDialog } from '@/components/layout/incomplete-tasks-dialog'

export default function ManagerDashboardPage() {
  const router = useRouter()
  const t = useTranslations('manager')
  const td = useTranslations('dashboard')
  const { locale } = useLocaleStore()
  const { staff, zone, role, shift, isAuthenticated, logout } = useStaffAuth()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showSignOutWarning, setShowSignOutWarning] = useState(false)
  const { data: completions } = useTaskCompletions(shift?.id)
  const handleTabChange = useCallback((tab: string) => {
    track(EVENTS.TAB_CHANGE, { from: activeTab, to: tab, dashboard: 'manager' })
    setActiveTab(tab)
  }, [activeTab])

  // Subscribe to realtime updates
  useRealtimeAll()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  if (!staff || !zone || !role || !shift) return null

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

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="min-h-dvh bg-cream pb-6"
    >
      <ZoneHeader
        zoneId={zone.id}
        zoneName_en={zone.name_en}
        zoneName_es={zone.name_es}
        zoneColor={zone.color}
        roleName={roleName}
        staffName={staff.display_name}
        streak={staff.streak_count}
        shiftType={td(`shift.${shift.shift_type}` as 'shift.opening')}
        isManager
        compact
        rightSlot={
          <>
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition-colors text-white text-xs font-semibold"
            >
              <LogOut className="w-3.5 h-3.5" />
              {locale === 'es' ? 'Cerrar Sesión' : 'Sign Out'}
            </button>
          </>
        }
      />
      <OfflineBanner />

      <div className="max-w-lg mx-auto">
        <div className="px-4 pt-4">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList>
              <TabsTrigger value="dashboard">{locale === 'es' ? 'Panel' : 'Dashboard'}</TabsTrigger>
              <TabsTrigger value="team">{t('myTeam')}</TabsTrigger>
              <TabsTrigger value="library">{t('library')}</TabsTrigger>
              <TabsTrigger value="settings">{locale === 'es' ? 'Ajustes' : 'Settings'}</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <OverviewTab zoneId={zone.id} />
            </TabsContent>

            <TabsContent value="team">
              <TeamTab />
            </TabsContent>

            <TabsContent value="library">
              <SOPLibrary />
            </TabsContent>

            <TabsContent value="settings">
              <SettingsTab onLogout={handleLogout} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
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
