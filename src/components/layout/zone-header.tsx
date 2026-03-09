'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { LanguageToggle } from './language-toggle'
import { ZoneSwitcher } from './zone-switcher'
import { cn } from '@/lib/utils/cn'

interface ZoneHeaderProps {
  zoneId?: string
  zoneName_en: string
  zoneName_es: string
  zoneColor: string
  roleName?: string
  staffName?: string
  streak?: number
  shiftType?: string
  showBack?: boolean
  backPath?: string
  isManager?: boolean
  compact?: boolean
  rightSlot?: React.ReactNode
}

const colorMap: Record<string, string> = {
  '#D4A857': 'bg-zone-foh',
  '#C06B3E': 'bg-zone-middle',
  '#4A2C1A': 'bg-zone-boh',
}

function useCurrentTime(showSeconds: boolean) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const ms = showSeconds ? 1000 : 60_000
    const interval = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(interval)
  }, [showSeconds])

  return now
}

export function ZoneHeader({
  zoneId,
  zoneName_en,
  zoneName_es,
  zoneColor,
  roleName,
  staffName,
  streak,
  shiftType,
  showBack = false,
  backPath,
  isManager = false,
  compact = false,
  rightSlot,
}: ZoneHeaderProps) {
  const router = useRouter()
  const { locale } = useLocaleStore()
  const zoneName = locale === 'es' ? zoneName_es : zoneName_en
  const bgClass = colorMap[zoneColor] || 'bg-brown'
  const now = useCurrentTime(!compact)
  const [switcherOpen, setSwitcherOpen] = useState(false)

  const timeString = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    ...(compact ? {} : { second: '2-digit' }),
    hour12: true,
  })

  const dateString = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <>
      <div className={cn(
        'relative text-white safe-top transition-colors duration-500',
        compact ? 'px-4 pt-3 pb-3' : 'px-4 pt-4 pb-5',
        bgClass
      )}>
        {/* Top row: back + right controls */}
        <div className="flex items-center justify-between mb-1.5">
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
          <div className="flex items-center gap-2">
            {rightSlot}
            <LanguageToggle className="bg-white/20 border-white/20 text-white" />
          </div>
        </div>

        {compact ? (
          /* ═══ Compact layout: single row with time + breadcrumb ═══ */
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-white/80 font-medium flex-wrap">
              {isManager ? (
                <button
                  onClick={() => setSwitcherOpen(true)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <span>{zoneName}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              ) : (
                <span className="font-semibold">{zoneName}</span>
              )}
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
                <span className="font-semibold">🔥 {streak}</span>
              )}
            </div>
            <div className="text-right flex-shrink-0 ml-3">
              <p className="text-lg font-bold tabular-nums leading-tight">{timeString}</p>
              <p className="text-[10px] text-white/60">{dateString}</p>
            </div>
          </div>
        ) : (
          /* ═══ Full layout: logo + title + time + breadcrumb ═══ */
          <>
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <Image
                  src="/icons/bsb-logo-coin.svg"
                  alt="Brown Sugar Bakery"
                  width={90}
                  height={90}
                  className="rounded-full"
                />
              </div>
              <div className="flex-1 text-center">
                <h1
                  className="text-xl font-bold tracking-wide uppercase"
                  style={{ fontFamily: 'var(--font-arsenal), Georgia, serif' }}
                >
                  Brown Sugar Bakery
                </h1>
                <p className="text-xs font-bold text-white/90 mt-1 tracking-wide">
                  {now.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                <p className="text-2xl font-bold mt-1 tracking-tight tabular-nums">
                  {timeString}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-white/80 font-medium">
              {isManager ? (
                <button
                  onClick={() => setSwitcherOpen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                  aria-label="Switch zone"
                >
                  <span>{zoneName}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              ) : (
                <span>{zoneName}</span>
              )}
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
          </>
        )}
      </div>

      {isManager && zoneId && (
        <ZoneSwitcher
          open={switcherOpen}
          onClose={() => setSwitcherOpen(false)}
          currentZoneId={zoneId}
        />
      )}
    </>
  )
}
