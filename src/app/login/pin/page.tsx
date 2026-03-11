'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { PinPad } from '@/components/pin/pin-pad'
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Lock, Loader2 } from 'lucide-react'

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 60_000

export default function LoginPinPage() {
  const router = useRouter()
  const { locale } = useLocaleStore()
  const { loginMode, selectedStaff, setVerifiedStaff, login } = useAuthStore()
  const [error, setError] = useState(false)
  const [locked, setLocked] = useState(false)
  const [lockCountdown, setLockCountdown] = useState(0)
  const [startingShift, setStartingShift] = useState(false)

  useEffect(() => {
    if (!loginMode && !useAuthStore.getState().isAuthenticated) {
      router.push('/login')
    }
  }, [loginMode, router])

  // Check lockout on mount
  useEffect(() => {
    const lockUntil = sessionStorage.getItem('bakeryos-pin-lockout')
    if (lockUntil) {
      const remaining = parseInt(lockUntil) - Date.now()
      if (remaining > 0) {
        setLocked(true)
        setLockCountdown(Math.ceil(remaining / 1000))
      } else {
        sessionStorage.removeItem('bakeryos-pin-lockout')
        sessionStorage.removeItem('bakeryos-pin-attempts')
      }
    }
  }, [])

  // Countdown timer for lockout
  useEffect(() => {
    if (!locked) return
    const interval = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          setLocked(false)
          sessionStorage.removeItem('bakeryos-pin-lockout')
          sessionStorage.removeItem('bakeryos-pin-attempts')
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [locked])

  const headerLabel = selectedStaff?.display_name || 'Staff'

  // Auto-start shift for managers — called after PIN verification
  const autoStartShift = useCallback(async (staff: { id: string; zone_id: string | null; role_id: string | null; role?: { is_manager: boolean; zone_id: string } | null; display_name: string }) => {
    const zoneId = staff.zone_id
    const roleId = staff.role_id
    if (!zoneId || !roleId) return false

    setStartingShift(true)
    try {
      const res = await fetch('/api/start-shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staff.id, zone_id: zoneId, role_id: roleId }),
      })
      if (!res.ok) return false
      const data = await res.json()

      const roleName = locale === 'es' ? data.role.name_es : data.role.name_en
      const dashPath = data.role.is_manager
        ? `/zone/${data.zone.slug}/manager`
        : `/zone/${data.zone.slug}/staff`

      // Save last login for Quick Start
      try {
        localStorage.setItem('bakeryos-last-login', JSON.stringify({
          staffName: staff.display_name,
          staffId: staff.id,
          zoneSlug: data.zone.slug,
          zoneId: data.zone.id,
          roleId: data.role.id,
          roleName,
        }))
      } catch { /* */ }

      // Store previous shift notes
      try {
        if (data.previousShiftNotes) {
          sessionStorage.setItem('bakeryos-prev-notes', data.previousShiftNotes)
        } else {
          sessionStorage.removeItem('bakeryos-prev-notes')
        }
      } catch { /* */ }

      login({ staff: data.staff, zone: data.zone, role: data.role, shift: data.shift })
      router.push(dashPath)
      return true
    } catch {
      setStartingShift(false)
      return false
    }
  }, [locale, login, router])

  const handlePinSubmit = useCallback(async (pin: string): Promise<boolean> => {
    if (locked) return false
    setError(false)

    try {
      const res = await fetch('/api/pin-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: selectedStaff!.id, pin }),
      })

      if (!res.ok) {
        handleFailedAttempt()
        return false
      }

      const data = await res.json()
      sessionStorage.removeItem('bakeryos-pin-attempts')
      setVerifiedStaff(data.staff)

      const isManager = data.staff.role?.is_manager === true

      if (isManager) {
        // Manager: auto-start shift, go straight to dashboard
        const success = await autoStartShift(data.staff)
        if (!success) {
          // Fallback: go to role picker if auto-start fails
          setTimeout(() => router.push('/login/role'), 300)
        }
        return true
      } else {
        // Staff: go to role picker (scoped to their zone)
        setTimeout(() => router.push('/login/role'), 500)
        return true
      }
    } catch {
      handleFailedAttempt()
      return false
    }
  }, [selectedStaff, setVerifiedStaff, router, locked, autoStartShift])

  const handleFailedAttempt = () => {
    setError(true)
    const attempts = parseInt(sessionStorage.getItem('bakeryos-pin-attempts') || '0') + 1
    sessionStorage.setItem('bakeryos-pin-attempts', String(attempts))

    if (attempts >= MAX_ATTEMPTS) {
      const lockUntil = Date.now() + LOCKOUT_MS
      sessionStorage.setItem('bakeryos-pin-lockout', String(lockUntil))
      setLocked(true)
      setLockCountdown(Math.ceil(LOCKOUT_MS / 1000))
    }
  }

  if (!loginMode) return null

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="min-h-dvh bg-cream"
    >
      {/* Header */}
      <div className="bg-brown text-white px-4 pt-4 pb-5 safe-top">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-white/70">{headerLabel}</span>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 py-12 flex flex-col items-center">
        {startingShift ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 py-12"
          >
            <Loader2 className="w-8 h-8 text-brown animate-spin" />
            <p className="text-sm text-brown/60">
              {locale === 'es' ? 'Iniciando turno...' : 'Starting shift...'}
            </p>
          </motion.div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-10"
            >
              <h1 className="text-2xl font-bold text-brown">
                {locale === 'es' ? 'Ingresa tu PIN' : 'Enter Your PIN'}
              </h1>
              <p className="text-brown/50 text-sm mt-1">
                {locale === 'es' ? 'Código de 4 dígitos' : '4-digit code'}
              </p>
              {error && !locked && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red text-sm mt-2 font-medium"
                >
                  {locale === 'es' ? 'PIN incorrecto. Intenta de nuevo.' : 'Incorrect PIN. Try again.'}
                </motion.p>
              )}
              {locked && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 flex flex-col items-center gap-2"
                >
                  <Lock className="w-6 h-6 text-red" />
                  <p className="text-red text-sm font-medium">
                    {locale === 'es'
                      ? `Demasiados intentos. Espera ${lockCountdown}s`
                      : `Too many attempts. Wait ${lockCountdown}s`}
                  </p>
                </motion.div>
              )}
            </motion.div>

            <PinPad onSubmit={handlePinSubmit} zoneColor="#570522" isLoading={locked} />
          </>
        )}
      </div>
    </motion.div>
  )
}
