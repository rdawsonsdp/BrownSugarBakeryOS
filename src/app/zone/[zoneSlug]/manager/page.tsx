'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { useStaffAuth } from '@/lib/hooks/use-staff-auth'
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

export default function ManagerDashboardPage() {
  const router = useRouter()
  const t = useTranslations('manager')
  const td = useTranslations('dashboard')
  const { locale } = useLocaleStore()
  const { staff, zone, role, shift, isAuthenticated, logout } = useStaffAuth()
  const [activeTab, setActiveTab] = useState('dashboard')

  // Subscribe to realtime updates
  useRealtimeAll()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  if (!staff || !zone || !role || !shift) return null

  const roleName = locale === 'es' ? role.name_es : role.name_en

  const handleLogout = () => {
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
              Sign Out
            </button>
          </>
        }
      />
      <OfflineBanner />

      <div className="max-w-lg mx-auto">
        <div className="px-4 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
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
    </motion.div>
  )
}
