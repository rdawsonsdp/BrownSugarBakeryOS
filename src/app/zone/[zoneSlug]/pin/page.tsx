'use client'

import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { PinPad } from '@/components/pin/pin-pad'
import { ZoneHeader } from '@/components/layout/zone-header'
import { useCallback, useEffect, useState } from 'react'

export default function PinEntryPage() {
  const router = useRouter()
  const params = useParams()
  const t = useTranslations('pin')
  const { zone, role, login } = useAuthStore()
  const { locale } = useLocaleStore()
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!zone || !role) {
      router.push('/zone')
    }
  }, [zone, role, router])

  if (!zone || !role) {
    return null
  }

  const handlePinSubmit = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/pin-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          zone_id: zone.id,
          role_id: role.id,
        }),
      })

      if (!res.ok) {
        setError(true)
        return false
      }

      const data = await res.json()
      login({
        staff: data.staff,
        zone: data.zone,
        role: data.role,
        shift: data.shift,
      })

      // Set locale based on staff preference
      if (data.staff.preferred_language) {
        useLocaleStore.getState().setLocale(data.staff.preferred_language)
      }

      // Navigate to appropriate dashboard
      const dashPath = role.is_manager
        ? `/zone/${params.zoneSlug}/manager`
        : `/zone/${params.zoneSlug}/staff`

      setTimeout(() => router.push(dashPath), 600) // Wait for success animation
      return true
    } catch {
      setError(true)
      return false
    }
  }, [zone, role, login, router, params.zoneSlug])

  const roleName = locale === 'es' ? role.name_es : role.name_en

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="min-h-dvh bg-cream"
    >
      <ZoneHeader
        zoneName_en={zone.name_en}
        zoneName_es={zone.name_es}
        zoneColor={zone.color}
        roleName={roleName}
        showBack
        backPath={`/zone/${params.zoneSlug}`}
      />

      <div className="max-w-sm mx-auto px-4 py-12 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-2xl font-bold text-brown">{t('title')}</h1>
          <p className="text-brown/50 text-sm mt-1">{t('subtitle')}</p>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red text-sm mt-2 font-medium"
            >
              {t('wrong')}
            </motion.p>
          )}
        </motion.div>

        <PinPad onSubmit={handlePinSubmit} zoneColor={zone.color} />
      </div>
    </motion.div>
  )
}
