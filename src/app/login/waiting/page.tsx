'use client'

import { Suspense, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { useDayStatus } from '@/lib/hooks/use-day-assignments'
import { Clock, UserX, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LoginWaitingPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-cream" />}>
      <WaitingContent />
    </Suspense>
  )
}

function WaitingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason') || 'not-started'
  const { locale } = useLocaleStore()
  const { selectedStaff, login } = useAuthStore()

  const zoneId = selectedStaff?.zone_id || undefined
  const staffId = selectedStaff?.id || undefined
  const { data: dayStatus } = useDayStatus(zoneId, staffId)

  // Auto-start shift when day is started and staff has assignment
  const startShiftAndGo = useCallback(async () => {
    if (!selectedStaff || !dayStatus?.staff_assignment || !zoneId) return

    try {
      const res = await fetch('/api/start-shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaff.id,
          zone_id: zoneId,
          role_id: dayStatus.staff_assignment.role_id,
        }),
      })
      if (!res.ok) return
      const data = await res.json()

      login({ staff: data.staff, zone: data.zone, role: data.role, shift: data.shift })

      try {
        if (data.previousShiftNotes) {
          sessionStorage.setItem('bakeryos-prev-notes', data.previousShiftNotes)
        } else {
          sessionStorage.removeItem('bakeryos-prev-notes')
        }
      } catch { /* */ }

      const roleName = locale === 'es' ? data.role.name_es : data.role.name_en
      try {
        localStorage.setItem('bakeryos-last-login', JSON.stringify({
          staffName: selectedStaff.display_name,
          staffId: selectedStaff.id,
          zoneSlug: data.zone.slug,
          zoneId: data.zone.id,
          roleId: data.role.id,
          roleName,
        }))
      } catch { /* */ }

      const dashPath = data.role.is_manager
        ? `/zone/${data.zone.slug}/manager`
        : `/zone/${data.zone.slug}/staff`
      router.push(dashPath)
    } catch { /* */ }
  }, [selectedStaff, dayStatus, zoneId, locale, login, router])

  // Poll: auto-redirect when day starts and staff is assigned
  useEffect(() => {
    if (dayStatus?.day_started && dayStatus?.staff_assignment) {
      startShiftAndGo()
    }
  }, [dayStatus, startShiftAndGo])

  // Redirect if no staff selected
  useEffect(() => {
    if (!selectedStaff) {
      router.push('/login')
    }
  }, [selectedStaff, router])

  if (!selectedStaff) return null

  const isNotStarted = reason === 'not-started'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-dvh bg-cream flex items-center justify-center p-4"
    >
      <div className="w-full max-w-sm text-center">
        {isNotStarted ? (
          <>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              className="w-16 h-16 rounded-full bg-gold/10 mx-auto mb-5 flex items-center justify-center"
            >
              <Clock className="w-8 h-8 text-gold" />
            </motion.div>
            <h1 className="text-xl font-bold text-brown mb-2">
              {locale === 'es' ? 'Esperando al Gerente' : 'Waiting for Manager'}
            </h1>
            <p className="text-sm text-brown/60 mb-2">
              {locale === 'es'
                ? 'Tu gerente está configurando el horario de hoy.'
                : "Your manager is setting up today's schedule."}
            </p>
            <p className="text-xs text-brown/40 mb-8">
              {locale === 'es'
                ? 'Esta pantalla se actualizará automáticamente cuando estés asignado.'
                : "This screen will auto-update when you're assigned."}
            </p>
            <div className="flex items-center justify-center gap-2 text-brown/30">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">{locale === 'es' ? 'Verificando...' : 'Checking...'}</span>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-brown/5 mx-auto mb-5 flex items-center justify-center">
              <UserX className="w-8 h-8 text-brown/30" />
            </div>
            <h1 className="text-xl font-bold text-brown mb-2">
              {locale === 'es' ? 'Sin Rol Asignado' : 'Not Assigned Today'}
            </h1>
            <p className="text-sm text-brown/60 mb-8">
              {locale === 'es'
                ? 'No tienes un rol asignado para hoy. Consulta con tu gerente.'
                : "You haven't been assigned a role for today. Please check with your manager."}
            </p>
          </>
        )}

        <Button
          variant="ghost"
          className="mx-auto"
          onClick={() => router.push('/login')}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          {locale === 'es' ? 'Volver al inicio' : 'Back to Login'}
        </Button>
      </div>
    </motion.div>
  )
}
