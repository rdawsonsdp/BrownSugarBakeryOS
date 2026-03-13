'use client'

import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { useLocaleStore } from '@/lib/stores/locale-store'

export function UpdateBanner() {
  const { locale } = useLocaleStore()
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const handleControllerChange = () => {
      setUpdateAvailable(true)
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    // Also check for waiting service worker on load
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        setUpdateAvailable(true)
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setUpdateAvailable(true)
          }
        })
      })
    })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  if (!updateAvailable) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gold text-brown px-4 py-2.5 flex items-center justify-between safe-top shadow-lg">
      <span className="text-xs font-semibold">{locale === 'es' ? 'Nueva versión disponible' : 'A new version is available'}</span>
      <button
        onClick={() => window.location.reload()}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brown/10 hover:bg-brown/20 transition-colors text-xs font-bold"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        {locale === 'es' ? 'Actualizar' : 'Update'}
      </button>
    </div>
  )
}
