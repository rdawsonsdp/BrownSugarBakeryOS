'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useZones } from '@/lib/hooks/use-zones'
import { useZoneShiftCounts } from '@/lib/hooks/use-shift'
import { useAuthStore } from '@/lib/stores/auth-store'
import { ZoneCard } from '@/components/zone/zone-card'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { Skeleton } from '@/components/ui/skeleton'

export default function ZoneSelectPage() {
  const router = useRouter()
  const t = useTranslations('zone')
  const { data: zones, isLoading } = useZones()
  const { data: shiftCounts } = useZoneShiftCounts()
  const { setZone } = useAuthStore()

  const handleZoneSelect = (zone: NonNullable<typeof zones>[0]) => {
    setZone(zone)
    router.push(`/zone/${zone.slug}`)
  }

  return (
    <div className="min-h-dvh bg-cream relative noise-bg">
      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-2xl font-bold text-brown">{t('title')}</h1>
            <p className="text-brown/50 text-sm mt-1">{t('subtitle')}</p>
          </motion.div>
          <LanguageToggle />
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
