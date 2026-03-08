'use client'

import { motion } from 'framer-motion'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils/cn'
import type { Zone } from '@/lib/types/database.types'
import { Store, ChefHat, Flame } from 'lucide-react'

const iconMap: Record<string, React.ElementType> = {
  store: Store,
  'chef-hat': ChefHat,
  flame: Flame,
}

const colorMap: Record<string, { bg: string; border: string; glow: string }> = {
  '#e68c3b': { bg: 'from-zone-foh/20 to-zone-foh/5', border: 'border-zone-foh', glow: 'shadow-zone-foh/20' },
  '#ba5b28': { bg: 'from-zone-middle/20 to-zone-middle/5', border: 'border-zone-middle', glow: 'shadow-zone-middle/20' },
  '#570522': { bg: 'from-zone-boh/20 to-zone-boh/5', border: 'border-zone-boh', glow: 'shadow-zone-boh/20' },
}

interface ZoneCardProps {
  zone: Zone
  activeCount?: number
  onClick: () => void
  index: number
}

export function ZoneCard({ zone, activeCount = 0, onClick, index }: ZoneCardProps) {
  const { locale } = useLocaleStore()
  const t = useTranslations('zone')
  const name = locale === 'es' ? zone.name_es : zone.name_en
  const description = locale === 'es' ? zone.description_es : zone.description_en
  const colors = colorMap[zone.color] || colorMap['#D4A857']
  const Icon = iconMap[zone.icon] || Store

  return (
    <motion.button
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 + 0.2, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-2xl border-2 p-5 bg-gradient-to-br transition-shadow',
        colors.bg, colors.border,
        'hover:shadow-lg', colors.glow
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: zone.color }}
        >
          <Icon className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-brown">{name}</h3>
          <p className="text-sm text-brown/60 mt-0.5">{description}</p>
          {activeCount > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-success font-medium">
                {t('activeStaff', { count: activeCount })}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.button>
  )
}
