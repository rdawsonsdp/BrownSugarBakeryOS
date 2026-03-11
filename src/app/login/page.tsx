'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Skeleton } from '@/components/ui/skeleton'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { PinPad } from '@/components/pin/pin-pad'
import { AppVersion } from '@/components/layout/app-version'
import { track } from '@/lib/analytics/track'
import { EVENTS } from '@/lib/analytics/events'
import { Search, Loader2, Lock } from 'lucide-react'

interface LastLogin {
  staffName: string
  staffId: string
  zoneSlug: string
  zoneId: string
  roleId: string
  roleName: string
}

function getLastLogin(): LastLogin | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('bakeryos-last-login')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 60_000

export default function LoginPage() {
  const router = useRouter()
  const { locale } = useLocaleStore()
  const { selectByName, setVerifiedStaff, login } = useAuthStore()
  const [lastLogin, setLastLogin] = useState<LastLogin | null>(null)
  const [search, setSearch] = useState('')
  const [startingShift, setStartingShift] = useState(false)
  const [error, setError] = useState(false)
  const [locked, setLocked] = useState(false)
  const [lockCountdown, setLockCountdown] = useState(0)
  const [quickStartPending, setQuickStartPending] = useState(false)

  useEffect(() => {
    setLastLogin(getLastLogin())
  }, [])

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

  // Countdown timer
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

  // Fetch all active staff
  const { data: staffList, isLoading: staffLoading } = useQuery<
    { id: string; display_name: string; first_name: string; last_name: string }[]
  >({
    queryKey: ['all-active-staff'],
    queryFn: async () => {
      const res = await fetch('/api/staff?all_active=true')
      if (!res.ok) throw new Error('Failed to fetch staff')
      return res.json()
    },
  })

  const filteredStaff = useMemo(() => {
    if (!staffList) return []
    if (!search.trim()) return staffList
    const q = search.toLowerCase()
    return staffList.filter(
      (s) =>
        s.display_name.toLowerCase().includes(q) ||
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q)
    )
  }, [staffList, search])

  const handleFailedAttempt = useCallback(() => {
    setError(true)
    const attempts = parseInt(sessionStorage.getItem('bakeryos-pin-attempts') || '0') + 1
    sessionStorage.setItem('bakeryos-pin-attempts', String(attempts))

    if (attempts >= MAX_ATTEMPTS) {
      const lockUntil = Date.now() + LOCKOUT_MS
      sessionStorage.setItem('bakeryos-pin-lockout', String(lockUntil))
      setLocked(true)
      setLockCountdown(Math.ceil(LOCKOUT_MS / 1000))
    }
  }, [])

  // Start shift and navigate to dashboard
  const startShiftAndGo = useCallback(async (
    staff: { id: string; display_name: string; zone_id: string | null; role_id: string | null; role?: { is_manager: boolean } | null },
    zoneId: string,
    roleId: string,
  ) => {
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

  // Quick-start PIN for returning user (shown as shortcut)
  const handleQuickStartPin = useCallback(async (pin: string): Promise<boolean> => {
    if (locked || !lastLogin) return false
    setError(false)
    setQuickStartPending(true)

    try {
      const res = await fetch('/api/pin-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      if (!res.ok) {
        setQuickStartPending(false)
        handleFailedAttempt()
        return false
      }

      const data = await res.json()
      const staff = data.staff
      sessionStorage.removeItem('bakeryos-pin-attempts')
      setVerifiedStaff(staff)
      selectByName(staff)

      // Auto-start with last login context
      if (lastLogin.staffId === staff.id && lastLogin.zoneId && lastLogin.roleId) {
        track(EVENTS.QUICK_START_USED, { staffId: staff.id, roleName: lastLogin.roleName })
        const success = await startShiftAndGo(staff, lastLogin.zoneId, lastLogin.roleId)
        if (success) return true
      }

      // Manager auto-start
      if (staff.role?.is_manager && staff.zone_id && staff.role_id) {
        const success = await startShiftAndGo(staff, staff.zone_id, staff.role_id)
        if (success) return true
      }

      // Fallback: role picker
      setQuickStartPending(false)
      setTimeout(() => router.push('/login/role'), 400)
      return true
    } catch {
      setQuickStartPending(false)
      handleFailedAttempt()
      return false
    }
  }, [locked, lastLogin, handleFailedAttempt, setVerifiedStaff, selectByName, startShiftAndGo, router])

  // Name selection: goes to PIN page
  const handleNameSelect = (staff: NonNullable<typeof staffList>[0]) => {
    selectByName(staff as Parameters<typeof selectByName>[0])
    router.push('/login/pin')
  }

  return (
    <div className="min-h-dvh bg-cream relative">
      <div className="relative z-10 max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <Image
              src="/icons/bsb-logo-coin.svg"
              alt="BSB"
              width={44}
              height={44}
              className="rounded-full"
            />
            <div>
              <h1 className="text-lg font-bold text-text-primary uppercase tracking-wide">
                Brown Sugar Bakery
              </h1>
              {lastLogin && !startingShift && (
                <p className="text-text-secondary text-sm">
                  {locale === 'es'
                    ? `¡Hola, ${lastLogin.staffName}!`
                    : `Welcome back, ${lastLogin.staffName}!`}
                </p>
              )}
            </div>
          </motion.div>
          <LanguageToggle />
        </div>

        {/* Main content */}
        <AnimatePresence mode="wait">
          {startingShift ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-16"
            >
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-text-secondary">
                {locale === 'es' ? 'Iniciando turno...' : 'Starting shift...'}
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="name-grid"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Quick-start for returning user */}
              {lastLogin && (
                <div className="mb-6">
                  <div className="bg-white border-2 border-primary/20 rounded-2xl p-4">
                    <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
                      {locale === 'es' ? 'Inicio rápido' : 'Quick Start'}
                    </p>
                    <p className="text-sm text-text-secondary mb-3">
                      {locale === 'es'
                        ? `Ingresa tu PIN para continuar como ${lastLogin.staffName}`
                        : `Enter your PIN to continue as ${lastLogin.staffName}`}
                    </p>

                    {error && !locked && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-red text-sm mb-2 font-medium"
                      >
                        {locale === 'es' ? 'PIN incorrecto. Intenta de nuevo.' : 'Incorrect PIN. Try again.'}
                      </motion.p>
                    )}

                    {locked && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mb-3 flex items-center gap-2"
                      >
                        <Lock className="w-4 h-4 text-red" />
                        <p className="text-red text-sm font-medium">
                          {locale === 'es'
                            ? `Demasiados intentos. Espera ${lockCountdown}s`
                            : `Too many attempts. Wait ${lockCountdown}s`}
                        </p>
                      </motion.div>
                    )}

                    <div className="max-w-xs mx-auto">
                      <PinPad onSubmit={handleQuickStartPin} zoneColor="#6C5CE7" isLoading={locked || quickStartPending} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-text-muted font-medium">
                      {locale === 'es' ? 'o selecciona tu nombre' : 'or select your name'}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                </div>
              )}

              {/* Name heading (when no returning user) */}
              {!lastLogin && (
                <div className="text-center mb-4">
                  <h2 className="text-xl font-bold text-text-primary">
                    {locale === 'es' ? 'Selecciona tu nombre' : 'Select Your Name'}
                  </h2>
                  <p className="text-text-secondary text-sm mt-1">
                    {locale === 'es' ? 'Toca tu nombre para iniciar' : 'Tap your name to get started'}
                  </p>
                </div>
              )}

              {/* Search filter */}
              {(staffList?.length ?? 0) > 8 && (
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={locale === 'es' ? 'Buscar nombre...' : 'Search name...'}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
                  />
                </div>
              )}

              {/* Name grid */}
              {staffLoading ? (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {filteredStaff.map((staff) => (
                    <button
                      key={staff.id}
                      onClick={() => handleNameSelect(staff)}
                      className="flex items-center gap-2.5 p-3 rounded-xl bg-white border-2 border-border hover:border-primary/30 hover:shadow-sm transition-all text-left active:scale-[0.97]"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {staff.first_name?.[0]}{staff.last_name?.[0]}
                      </div>
                      <span className="text-sm font-semibold text-text-primary truncate">
                        {staff.display_name}
                      </span>
                    </button>
                  ))}
                  {filteredStaff.length === 0 && search && (
                    <p className="col-span-2 text-sm text-text-muted text-center py-4">
                      {locale === 'es' ? 'No se encontraron resultados' : 'No results found'}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Version footer */}
        <div className="text-center pt-6 pb-4">
          <AppVersion showBuild />
        </div>
      </div>
    </div>
  )
}
