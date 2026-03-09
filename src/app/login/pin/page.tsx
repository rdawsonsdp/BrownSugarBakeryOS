'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { PinPad } from '@/components/pin/pin-pad'
import { useCallback, useEffect, useState } from 'react'

export default function LoginPinPage() {
  const router = useRouter()
  const { locale } = useLocaleStore()
  const { loginMode, selectedStaff, selectedRole, setVerifiedStaff, setSelectedRole } = useAuthStore()
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!loginMode) {
      router.push('/login')
    }
  }, [loginMode, router])

  if (!loginMode) return null

  const isRoleMode = loginMode === 'role'
  const headerLabel = isRoleMode
    ? (locale === 'es' ? selectedRole?.name_es : selectedRole?.name_en) || 'Role'
    : selectedStaff?.display_name || 'Staff'

  const handlePinSubmit = useCallback(async (pin: string): Promise<boolean> => {
    try {
      if (isRoleMode) {
        // Role mode: PIN identifies the person
        const verifyRes = await fetch('/api/pin-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin }),
        })
        if (!verifyRes.ok) { setError(true); return false }
        const data = await verifyRes.json()

        setVerifiedStaff(data.staff)
        setTimeout(() => router.push('/login/role'), 600)
        return true
      } else {
        // Name mode: verify PIN against the selected person
        const res = await fetch('/api/pin-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ staff_id: selectedStaff!.id, pin }),
        })

        if (!res.ok) {
          setError(true)
          return false
        }

        const data = await res.json()
        setVerifiedStaff(data.staff)

        if (data.staff.role) {
          setSelectedRole(data.staff.role)
        }
        setTimeout(() => router.push('/login/role'), 600)
        return true
      }
    } catch {
      setError(true)
      return false
    }
  }, [isRoleMode, selectedStaff, setVerifiedStaff, setSelectedRole, router])

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
            onClick={() => router.push('/login')}
            className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span className="text-sm font-bold text-white/70">{headerLabel}</span>
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 py-12 flex flex-col items-center">
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
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red text-sm mt-2 font-medium"
            >
              {locale === 'es' ? 'PIN incorrecto. Intenta de nuevo.' : 'Incorrect PIN. Try again.'}
            </motion.p>
          )}
        </motion.div>

        <PinPad onSubmit={handlePinSubmit} zoneColor="#570522" />
      </div>
    </motion.div>
  )
}
