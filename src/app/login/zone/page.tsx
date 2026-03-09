'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, Store, ChefHat, Flame } from 'lucide-react'
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

export default function LoginZonePage() {
  const router = useRouter()
  const { locale } = useLocaleStore()
  const { data: zones, isLoading } = useZones()
  const { selectedStaff, selectedRole, isAuthenticated, login } = useAuthStore()
  const [loading, setLoading] = useState<string | null>(null)
  const [navigating, setNavigating] = useState(false)

  useEffect(() => {
    if (navigating) return
    if (!isAuthenticated && (!selectedStaff || !selectedRole)) {
      router.push('/login')
    }
  }, [selectedStaff, selectedRole, isAuthenticated, navigating, router])

  if (!navigating && !selectedStaff && !selectedRole) return null

  const staffName = selectedStaff?.display_name || ''
  const roleName = (locale === 'es' ? selectedRole?.name_es : selectedRole?.name_en) || ''

  const handleZoneSelect = async (zone: NonNullable<typeof zones>[0]) => {
    if (!selectedStaff || !selectedRole) return
    setLoading(zone.id)
    setNavigating(true)
    try {
      const res = await fetch('/api/start-shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaff.id,
          zone_id: zone.id,
          role_id: selectedRole.id,
        }),
      })

      if (!res.ok) throw new Error('Failed to start shift')

      const data = await res.json()

      const dashPath = data.role.is_manager
        ? `/zone/${zone.slug}/manager`
        : `/zone/${zone.slug}/staff`

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
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span className="text-sm font-bold text-white/70">
            {staffName} / {roleName}
          </span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-brown">Select Your Zone</h1>
          <p className="text-brown/50 text-sm mt-1">Where are you working today?</p>
        </motion.div>

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
              const isLoading = loading === zone.id

              return (
                <motion.button
                  key={zone.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => handleZoneSelect(zone)}
                  disabled={!!loading}
                  className={cn(
                    'w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all',
                    'bg-white hover:shadow-md active:scale-[0.98]',
                    'border-brown/10 hover:border-brown/30',
                    loading && !isLoading && 'opacity-40'
                  )}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: zone.color }}
                  >
                    {isLoading ? (
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                      <Icon className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-brown text-base">{zoneName}</h3>
                    {zone.description_en && (
                      <p className="text-xs text-brown/50 mt-0.5">
                        {locale === 'es' ? zone.description_es : zone.description_en}
                      </p>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}
