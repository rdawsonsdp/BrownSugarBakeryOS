'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Shield, ClipboardList, Store, ChefHat, Flame, ArrowLeft, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useZones } from '@/lib/hooks/use-zones'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'

const iconMap: Record<string, React.ElementType> = {
  store: Store,
  'chef-hat': ChefHat,
  flame: Flame,
}

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
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [navigating, setNavigating] = useState(false)
  const lastLogin = useMemo(() => getLastLogin(), [])

  const { data: zones, isLoading: zonesLoading } = useZones()

  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['all-roles-with-zones'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('roles')
        .select('*, zone:zones(*)')
        .order('sort_order')
        .order('name_en')
      if (error) throw error
      return data as RoleWithZone[]
    },
  })

  useEffect(() => {
    if (navigating) return
    if (!selectedStaff) {
      router.push('/login')
    }
  }, [selectedStaff, navigating, router])

  // Count roles per zone and auto-select if only one zone has roles
  const zonesWithRoles = useMemo(() => {
    if (!zones || !roles) return null
    return zones.filter((z) => roles.some((r) => r.zone_id === z.id))
  }, [zones, roles])

  const roleCountByZone = useMemo(() => {
    if (!roles) return new Map<string, number>()
    const map = new Map<string, number>()
    for (const r of roles) {
      if (r.zone_id) map.set(r.zone_id, (map.get(r.zone_id) ?? 0) + 1)
    }
    return map
  }, [roles])

  useEffect(() => {
    if (!zonesWithRoles || selectedZoneId || navigating) return
    if (zonesWithRoles.length === 1) {
      setSelectedZoneId(zonesWithRoles[0].id)
    }
  }, [zonesWithRoles, selectedZoneId, navigating])

  // Auto-select: if only one role in selected zone, auto-pick it
  const zoneRoles = useMemo(
    () => roles?.filter((r) => r.zone_id === selectedZoneId) ?? [],
    [roles, selectedZoneId]
  )

  useEffect(() => {
    if (!selectedZoneId || navigating || loading) return
    if (zoneRoles.length === 1) {
      handleRoleSelect(zoneRoles[0])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedZoneId, zoneRoles.length])

  if (!navigating && !selectedStaff) return null

  const selectedZone = zones?.find((z) => z.id === selectedZoneId)

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
      const dashPath = data.role.is_manager
        ? `/zone/${role.zone.slug}/manager`
        : `/zone/${role.zone.slug}/staff`

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
      } catch { /* localStorage may be unavailable */ }

      // Store previous shift notes for handoff display
      try {
        if (data.previousShiftNotes) {
          sessionStorage.setItem('bakeryos-prev-notes', data.previousShiftNotes)
        } else {
          sessionStorage.removeItem('bakeryos-prev-notes')
        }
      } catch { /* sessionStorage may be unavailable */ }

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

  const isLoading = zonesLoading || rolesLoading

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
            onClick={() => {
              if (selectedZoneId && (zonesWithRoles?.length ?? 0) > 1) {
                setSelectedZoneId(null)
              } else {
                router.back()
              }
            }}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-bold text-white/70">
            {selectedStaff?.display_name}
            {selectedZone && (
              <span className="text-white/40"> / {locale === 'es' ? selectedZone.name_es : selectedZone.name_en}</span>
            )}
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {!selectedZoneId ? (
            /* ═══ Step 1: Pick Zone ═══ */
            <motion.div
              key="zones"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.15 }}
            >
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-brown">
                  {locale === 'es' ? 'Selecciona tu Zona' : 'Select Your Zone'}
                </h1>
                <p className="text-brown/50 text-sm mt-1">
                  {locale === 'es' ? '¿Dónde trabajas hoy?' : 'Where are you working today?'}
                </p>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }, (_, i) => (
                    <Skeleton key={i} className="h-20 w-full rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {zones?.map((zone, i) => {
                    const zoneName = locale === 'es' ? zone.name_es : zone.name_en
                    const Icon = iconMap[zone.icon] || Store
                    const roleCount = roleCountByZone.get(zone.id) ?? 0
                    const isLastUsed = lastLogin?.zoneId === zone.id
                    const hasRoles = roleCount > 0

                    return (
                      <motion.div
                        key={zone.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                      >
                        <button
                          onClick={() => hasRoles ? setSelectedZoneId(zone.id) : null}
                          disabled={!hasRoles}
                          className={cn(
                            'w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all',
                            hasRoles
                              ? cn(
                                  'bg-white hover:shadow-md active:scale-[0.98]',
                                  isLastUsed
                                    ? 'border-gold/30 hover:border-gold/50'
                                    : 'border-brown/10 hover:border-brown/30'
                                )
                              : 'bg-brown/[0.02] border-dashed border-brown/10 cursor-default'
                          )}
                        >
                          <div
                            className={cn(
                              'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                              !hasRoles && 'opacity-40'
                            )}
                            style={{ backgroundColor: zone.color }}
                          >
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className={cn('font-bold text-base', hasRoles ? 'text-brown' : 'text-brown/40')}>
                              {zoneName}
                            </h3>
                            {hasRoles ? (
                              <p className="text-xs text-brown/50 mt-0.5">
                                {roleCount} {roleCount === 1 ? (locale === 'es' ? 'rol' : 'role') : (locale === 'es' ? 'roles' : 'roles')}
                              </p>
                            ) : (
                              <p className="text-xs text-brown/40 mt-0.5">
                                {locale === 'es' ? 'No hay roles — necesita configuración' : 'No roles — needs setup'}
                              </p>
                            )}
                          </div>
                          {isLastUsed && hasRoles && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold text-gold bg-gold/10 px-2 py-1 rounded-full">
                              <Clock className="w-3 h-3" />
                              {locale === 'es' ? 'Último' : 'Last'}
                            </span>
                          )}
                        </button>
                        {!hasRoles && (
                          <button
                            onClick={() => router.push('/admin/roles')}
                            className="mt-1.5 ml-16 text-[11px] font-semibold text-gold hover:text-gold/80 transition-colors"
                          >
                            {locale === 'es' ? '→ Configurar roles' : '→ Set up roles'}
                          </button>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            /* ═══ Step 2: Pick Role in Zone ═══ */
            <motion.div
              key="roles"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.15 }}
            >
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-brown">
                  {locale === 'es' ? 'Selecciona tu Rol' : 'Select Your Role'}
                </h1>
                <p className="text-brown/50 text-sm mt-1">
                  {locale === 'es' ? '¿Qué haces hoy?' : 'What are you doing today?'}
                </p>
              </div>

              {zoneRoles.length > 0 ? (
                <div className="space-y-2">
                  {zoneRoles.map((role, i) => {
                    const roleName = locale === 'es' ? role.name_es : role.name_en
                    const Icon = role.is_manager ? Shield : ClipboardList
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
                          role.is_manager
                            ? 'border-gold/20 hover:border-gold/50'
                            : isLastUsed
                            ? 'border-gold/20 hover:border-gold/40'
                            : 'border-brown/10 hover:border-brown/30',
                          loading && !isThisLoading && 'opacity-40'
                        )}
                      >
                        <div
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                            role.is_manager ? 'bg-gold/10' : 'bg-brown/5'
                          )}
                        >
                          {isThisLoading ? (
                            <Loader2 className="w-5 h-5 text-brown animate-spin" />
                          ) : (
                            <Icon className={cn('w-5 h-5', role.is_manager ? 'text-gold' : 'text-brown/40')} />
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-brown text-sm">{roleName}</h3>
                        </div>
                        {isLastUsed && (
                          <span className="text-[10px] font-semibold text-gold bg-gold/10 px-2 py-1 rounded-full">
                            {locale === 'es' ? 'Último' : 'Last'}
                          </span>
                        )}
                      </motion.button>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-brown/40 text-center py-8">
                  {locale === 'es' ? 'No hay roles en esta zona' : 'No roles in this zone'}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
