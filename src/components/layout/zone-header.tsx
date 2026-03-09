'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { LanguageToggle } from './language-toggle'
import { cn } from '@/lib/utils/cn'

interface ZoneHeaderProps {
  zoneName_en: string
  zoneName_es: string
  zoneColor: string
  roleName?: string
  staffName?: string
  streak?: number
  shiftType?: string
  showBack?: boolean
  backPath?: string
}

const colorMap: Record<string, string> = {
  '#D4A857': 'bg-zone-foh',
  '#C06B3E': 'bg-zone-middle',
  '#4A2C1A': 'bg-zone-boh',
}

function useCurrentTime() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  return now
}

export function ZoneHeader({
  zoneName_en,
  zoneName_es,
  zoneColor,
  roleName,
  staffName,
  streak,
  shiftType,
  showBack = false,
  backPath,
}: ZoneHeaderProps) {
  const router = useRouter()
  const { locale } = useLocaleStore()
  const zoneName = locale === 'es' ? zoneName_es : zoneName_en
  const bgClass = colorMap[zoneColor] || 'bg-brown'
  const now = useCurrentTime()

  const dayDateString = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const timeString = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  return (
    <div className={cn('relative text-white px-4 pt-4 pb-5 safe-top', bgClass)}>
      {/* Back button + language toggle row */}
      <div className="flex items-center justify-between mb-2">
        <div>
          {showBack && (
            <button
              onClick={() => backPath ? router.push(backPath) : router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors touch-target"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>
        <LanguageToggle className="bg-white/20 border-white/20 text-white" />
      </div>

      {/* Main banner: logo left, content center */}
      <div className="flex items-center gap-4">
        {/* Logo — full height of banner */}
        <div className="flex-shrink-0">
          <Image
            src="/icons/bsb-logo-coin.svg"
            alt="Brown Sugar Bakery"
            width={90}
            height={90}
            className="rounded-full"
          />
        </div>

        {/* Center content */}
        <div className="flex-1 text-center">
          <h1
            className="text-xl font-bold tracking-wide uppercase"
            style={{ fontFamily: 'var(--font-arsenal), Georgia, serif' }}
          >
            Brown Sugar Bakery
          </h1>

          {/* Day and Date */}
          <p className="text-xs font-bold text-white/90 mt-1 tracking-wide">
            {dayDateString}
          </p>

          {/* Time */}
          <p className="text-2xl font-bold mt-1 tracking-tight tabular-nums">
            {timeString}
          </p>
        </div>
      </div>

      {/* Breadcrumb bar */}
      <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-white/80 font-medium">
        <span>{zoneName}</span>
        {roleName && (
          <>
            <span className="text-white/40">/</span>
            <span>{roleName}</span>
          </>
        )}
        {shiftType && (
          <>
            <span className="text-white/40">/</span>
            <span className="capitalize">{shiftType}</span>
          </>
        )}
        {staffName && (
          <>
            <span className="text-white/40">·</span>
            <span className="font-semibold text-white/90">{staffName}</span>
          </>
        )}
        {streak !== undefined && streak > 0 && (
          <>
            <span className="text-white/40">·</span>
            <span className="font-semibold">🔥 {streak}</span>
          </>
        )}
      </div>
    </div>
  )
}
