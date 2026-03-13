'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, Wifi } from 'lucide-react'
import { useLocaleStore } from '@/lib/stores/locale-store'

export function OfflineBanner() {
  const { locale } = useLocaleStore()
  const [isOnline, setIsOnline] = useState(true)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowReconnected(true)
      setTimeout(() => setShowReconnected(false), 2000)
    }
    const handleOffline = () => {
      setIsOnline(false)
      setShowReconnected(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-warning text-brown overflow-hidden z-50 no-print"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold">
            <WifiOff className="w-3.5 h-3.5" />
            {locale === 'es' ? 'Sin conexión. Los cambios se sincronizarán al reconectarse.' : "You're offline. Changes will sync when connected."}
          </div>
        </motion.div>
      )}
      {showReconnected && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-success text-white overflow-hidden z-50"
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold">
            <Wifi className="w-3.5 h-3.5" />
            {locale === 'es' ? '¡Conectado de nuevo!' : 'Back online!'}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
