'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/lib/stores/auth-store'
import { PinPad } from '@/components/pin/pin-pad'
import { useCallback, useEffect, useState } from 'react'

export default function PinEntryPage() {
  const router = useRouter()
  const t = useTranslations('pin')
  const { roleType, setRole } = useAuthStore()
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!roleType) {
      router.push('/role')
    }
  }, [roleType, router])

  if (!roleType) return null

  const handlePinSubmit = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/pin-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pin,
          role_type: roleType,
        }),
      })

      if (!res.ok) {
        setError(true)
        return false
      }

      const data = await res.json()

      // Store the verified staff info
      useAuthStore.getState().login({
        staff: data.staff,
        zone: data.zone,
        role: data.role,
        shift: data.shift,
      })

      // Staff go directly to dashboard (zone is predetermined)
      // Managers go to zone selection
      if (roleType === 'staff' && data.zone && data.shift) {
        setTimeout(() => router.push(`/zone/${data.zone.slug}/staff`), 600)
      } else {
        setTimeout(() => router.push('/zone'), 600)
      }
      return true
    } catch {
      setError(true)
      return false
    }
  }, [roleType, router])

  const roleLabel = roleType === 'manager' ? 'Shift Manager' : 'Staff'

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="min-h-dvh bg-cream"
    >
      {/* Simple header */}
      <div className="bg-brown text-white px-4 pt-4 pb-5 safe-top">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => router.push('/role')}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span className="text-sm font-bold text-white/70">{roleLabel}</span>
        </div>
      </div>

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

        <PinPad onSubmit={handlePinSubmit} zoneColor="#570522" />
      </div>
    </motion.div>
  )
}
