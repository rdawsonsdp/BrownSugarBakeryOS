'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useZones } from '@/lib/hooks/use-zones'
import { useZoneShiftCounts } from '@/lib/hooks/use-shift'
import { useAuthStore } from '@/lib/stores/auth-store'
import { ZoneCard } from '@/components/zone/zone-card'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { Skeleton } from '@/components/ui/skeleton'

export default function LoginZonePage() {
  const router = useRouter()
  const { data: zones, isLoading } = useZones()
  const { data: shiftCounts } = useZoneShiftCounts()
  const { selectedStaff, setZone } = useAuthStore()

  useEffect(() => {
    if (!selectedStaff) {
      router.push('/login')
    }
  }, [selectedStaff, router])

  if (!selectedStaff) return null

  const handleZoneSelect = (zone: NonNullable<typeof zones>[0]) => {
    setZone(zone)
    router.push('/login/role')
  }

  return (
    <div className="min-h-dvh bg-cream relative noise-bg">
      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-brown/50 text-sm mb-1">Welcome, {selectedStaff.display_name}</p>
            <h1 className="text-2xl font-bold text-brown">Select Your Zone</h1>
            <p className="text-brown/50 text-sm mt-1">Where are you working today?</p>
          </motion.div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/login')}
              className="p-2 rounded-lg text-brown/40 hover:text-brown hover:bg-brown/5 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <LanguageToggle />
          </div>
        </div>

        {/* Zone Cards */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {zones?.map((zone, i) => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                activeCount={shiftCounts?.[zone.id] || 0}
                onClick={() => handleZoneSelect(zone)}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
