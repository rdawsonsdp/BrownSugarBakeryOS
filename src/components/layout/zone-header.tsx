'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Badge } from '@/components/ui/badge'
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

  return (
    <div className={cn('relative text-white px-4 py-4 safe-top', bgClass)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => backPath ? router.push(backPath) : router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors touch-target"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-bold">{zoneName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {roleName && <Badge variant="zone" className="bg-white/20 text-xs">{roleName}</Badge>}
              {staffName && <span className="text-sm text-white/80">{staffName}</span>}
              {streak !== undefined && streak > 0 && (
                <span className="text-sm">🔥 {streak}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {shiftType && (
            <Badge variant="zone" className="bg-white/20 text-xs capitalize">{shiftType}</Badge>
          )}
          <LanguageToggle className="bg-white/20 border-white/20 text-white" />
        </div>
      </div>
    </div>
  )
}
