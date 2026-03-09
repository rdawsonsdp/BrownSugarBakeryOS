'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { Check, Store, ChefHat, Flame } from 'lucide-react'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { useZones } from '@/lib/hooks/use-zones'
import { useZoneSwitch } from '@/lib/hooks/use-zone-switch'
import { cn } from '@/lib/utils/cn'
import type { Zone } from '@/lib/types/database.types'

const iconMap: Record<string, React.ElementType> = {
  store: Store,
  'chef-hat': ChefHat,
  flame: Flame,
}

interface ZoneSwitcherProps {
  open: boolean
  onClose: () => void
  currentZoneId: string
}

export function ZoneSwitcher({ open, onClose, currentZoneId }: ZoneSwitcherProps) {
  const { locale } = useLocaleStore()
  const { data: zones } = useZones()
  const { switchZone, isSwitching } = useZoneSwitch()

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleSelect = async (zone: Zone) => {
    if (zone.id === currentZoneId) {
      onClose()
      return
    }
    await switchZone(zone)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          {/* Bottom sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative bg-white rounded-t-2xl w-full max-w-lg pb-safe"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-brown/20" />
            </div>

            <div className="px-5 pb-2">
              <h3 className="text-lg font-bold text-brown">
                {locale === 'es' ? 'Cambiar Zona' : 'Switch Zone'}
              </h3>
            </div>

            {/* Zone options */}
            <div className="px-5 pb-5 space-y-2">
              {zones?.map((zone, i) => {
                const isCurrent = zone.id === currentZoneId
                const name = locale === 'es' ? zone.name_es : zone.name_en
                const desc = locale === 'es' ? zone.description_es : zone.description_en
                const Icon = iconMap[zone.icon] || Store

                return (
                  <motion.button
                    key={zone.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleSelect(zone)}
                    disabled={isSwitching}
                    className={cn(
                      'w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-colors text-left',
                      isCurrent
                        ? 'border-current bg-brown/5'
                        : 'border-brown/10 hover:border-brown/20',
                      isSwitching && !isCurrent && 'opacity-40'
                    )}
                    style={isCurrent ? { borderColor: zone.color } : undefined}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: zone.color }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-brown">{name}</p>
                      <p className="text-xs text-brown/50 truncate">{desc}</p>
                    </div>
                    {isCurrent && (
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: zone.color }}
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </motion.button>
                )
              })}
            </div>

            {/* Cancel */}
            <div className="px-5 pb-5">
              <button
                onClick={onClose}
                className="w-full py-2.5 text-sm font-medium text-brown/50 hover:text-brown transition-colors"
              >
                {locale === 'es' ? 'Cancelar' : 'Cancel'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
