'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { useStaffAuth } from '@/lib/hooks/use-staff-auth'
import { useRealtimeAll } from '@/lib/hooks/use-realtime'
import { ZoneHeader } from '@/components/layout/zone-header'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { OverviewTab } from '@/components/dashboard/manager/overview-tab'
import { TeamTab } from '@/components/dashboard/manager/team-tab'
import { TasksTab } from '@/components/dashboard/manager/tasks-tab'
import { SOPLibrary } from '@/components/sop/sop-library'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export default function ManagerDashboardPage() {
  const router = useRouter()
  const t = useTranslations('manager')
  const td = useTranslations('dashboard')
  const { locale } = useLocaleStore()
  const { staff, zone, role, shift, isAuthenticated, logout } = useStaffAuth()
  const [activeTab, setActiveTab] = useState('overview')

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
      />

      <div className="max-w-lg mx-auto">
        <div className="px-4 pt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
              <TabsTrigger value="team">{t('myTeam')}</TabsTrigger>
              <TabsTrigger value="tasks">{t('currentTasks')}</TabsTrigger>
              <TabsTrigger value="library">{t('library')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab zoneId={zone.id} />
            </TabsContent>

            <TabsContent value="team">
              <TeamTab />
            </TabsContent>

            <TabsContent value="tasks">
              <TasksTab />
            </TabsContent>

            <TabsContent value="library">
              <SOPLibrary />
            </TabsContent>
          </Tabs>
        </div>

        <div className="px-4 mt-6">
          <Button variant="ghost" onClick={handleLogout} className="w-full text-brown/40">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
      </div>
    </motion.div>
  )
}
