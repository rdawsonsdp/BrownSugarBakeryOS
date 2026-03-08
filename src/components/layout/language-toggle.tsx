'use client'

import { useLocaleStore } from '@/lib/stores/locale-store'
import { cn } from '@/lib/utils/cn'

export function LanguageToggle({ className }: { className?: string }) {
  const { locale, toggleLocale } = useLocaleStore()

  return (
    <button
      onClick={toggleLocale}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-brown/10 text-sm font-medium text-brown shadow-sm hover:shadow transition-all touch-target',
        className
      )}
      aria-label="Toggle language"
    >
      <span className={cn('transition-opacity', locale === 'en' ? 'opacity-100' : 'opacity-40')}>EN</span>
      <span className="text-brown/20">/</span>
      <span className={cn('transition-opacity', locale === 'es' ? 'opacity-100' : 'opacity-40')}>ES</span>
    </button>
  )
}
