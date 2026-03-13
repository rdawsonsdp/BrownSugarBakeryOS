'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, ClipboardList, ArrowLeft, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'

interface RoleWithZone {
  id: string
  name_en: string
  name_es: string
  slug: string
  is_manager: boolean
  zone_id: string | null
  sort_order: number | null
  zone: {
    id: string
    name_en: string
    name_es: string
    slug: string
    color: string
    icon: string
  } | null
}

function getLastLogin() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('bakeryos-last-login')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function LoginRolePage() {
  const router = useRouter()
  const { locale } = useLocaleStore()
  const { selectedStaff, login } = useAuthStore()
  const [loading, setLoading] = useState<string | null>(null)
  const [navigating, setNavigating] = useState(false)
  const [lastLogin, setLastLogin] = useState<ReturnType<typeof getLastLogin>>(null)

  // The user's default zone comes from their staff record
  const userZoneId = selectedStaff?.zone_id

  // Fetch roles scoped to the user's zone, staff only (non-manager)
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['zone-staff-roles', userZoneId],
    queryFn: async () => {
      if (!userZoneId) return []
      const supabase = createClient()
      const { data, error } = await supabase
        .from('roles')
        .select('*, zone:zones(*)')
        .eq('zone_id', userZoneId)
        .eq('is_manager', false)
        .eq('is_active', true)
        .order('sort_order')
        .order('name_en')
      if (error) throw error
      return data as RoleWithZone[]
    },
    enabled: !!userZoneId,
  })

  useEffect(() => {
    setLastLogin(getLastLogin())
  }, [])

  // Redirect if no staff selected
  useEffect(() => {
    if (navigating) return
    if (!selectedStaff) {
      router.push('/login')
    }
  }, [selectedStaff, navigating, router])

  // Auto-select if only one role available
  useEffect(() => {
    if (navigating || loading || !roles) return
    if (roles.length === 1) {
      handleRoleSelect(roles[0])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roles?.length])

  if (!navigating && !selectedStaff) return null

  const handleRoleSelect = async (role: RoleWithZone) => {
    if (!selectedStaff || !role.zone) return
    setLoading(role.id)
    setNavigating(true)

    try {
      const res = await fetch('/api/start-shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaff.id,
          zone_id: role.zone.id,
          role_id: role.id,
        }),
      })

      if (!res.ok) throw new Error('Failed to start shift')
      const data = await res.json()

      const roleName = locale === 'es' ? data.role.name_es : data.role.name_en
      const dashPath = `/zone/${role.zone.slug}/staff`

      // Save last login for Quick Start
      try {
        localStorage.setItem('bakeryos-last-login', JSON.stringify({
          staffName: selectedStaff.display_name,
          staffId: selectedStaff.id,
          zoneSlug: role.zone.slug,
          zoneId: role.zone.id,
          roleId: role.id,
          roleName,
        }))
      } catch { /* */ }

      // Store previous shift notes for handoff display
      try {
        if (data.previousShiftNotes) {
          sessionStorage.setItem('bakeryos-prev-notes', data.previousShiftNotes)
        } else {
          sessionStorage.removeItem('bakeryos-prev-notes')
        }
      } catch { /* */ }

      login({
        staff: data.staff,
        zone: data.zone,
        role: data.role,
        shift: data.shift,
      })

      router.push(dashPath)
    } catch (err) {
      console.error('Failed to start shift:', err)
      setLoading(null)
      setNavigating(false)
    }
  }

  // Get zone name from first role's zone data (all roles are same zone)
  const zoneName = roles?.[0]?.zone
    ? (locale === 'es' ? roles[0].zone.name_es : roles[0].zone.name_en)
    : ''

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
          <span className="text-sm font-bold text-white/70">
            {selectedStaff?.display_name}
            {zoneName && <span className="text-white/40"> / {zoneName}</span>}
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brown">
            {locale === 'es' ? 'Selecciona tu Rol' : 'Select Your Role'}
          </h1>
          <p className="text-brown/50 text-sm mt-1">
            {locale === 'es' ? '¿Qué haces hoy?' : 'What are you doing today?'}
          </p>
        </div>

        {rolesLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : roles && roles.length > 0 ? (
          <div className="space-y-2">
            {roles.map((role, i) => {
              const roleName = locale === 'es' ? role.name_es : role.name_en
              const isThisLoading = loading === role.id
              const isLastUsed = lastLogin?.roleId === role.id

              return (
                <motion.button
                  key={role.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => handleRoleSelect(role)}
                  disabled={!!loading}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                    'bg-white hover:shadow-md active:scale-[0.98]',
                    isLastUsed
                      ? 'border-gold/20 hover:border-gold/40'
                      : 'border-brown/10 hover:border-brown/30',
                    loading && !isThisLoading && 'opacity-40'
                  )}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-brown/5">
                    {isThisLoading ? (
                      <Loader2 className="w-5 h-5 text-brown animate-spin" />
                    ) : (
                      <ClipboardList className="w-5 h-5 text-brown/40" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-brown text-sm">{roleName}</h3>
                  </div>
                  {isLastUsed && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-gold bg-gold/10 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3" />
                      {locale === 'es' ? 'Último' : 'Last'}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-brown/40">
              {locale === 'es' ? 'No hay roles disponibles en tu zona' : 'No roles available in your zone'}
            </p>
            <button
              onClick={() => router.push('/admin/roles')}
              className="mt-3 text-xs font-semibold text-gold hover:text-gold/80 transition-colors"
            >
              {locale === 'es' ? '→ Configurar roles' : '→ Set up roles'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
