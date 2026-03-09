'use client'

import { useState, useRef, useEffect } from 'react'
import { User, Flame, AlertTriangle, MoreVertical, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

interface StaffRowProps {
  id?: string
  name: string
  completionPercent: number
  streak: number
  lastActive?: string
  overdueCount: number
  roleName?: string
  isActive?: boolean
  onEdit?: () => void
  onDeactivate?: () => void
  onReactivate?: () => void
  onDelete?: () => void
}

export function StaffRow({
  name, completionPercent, streak, lastActive, overdueCount,
  roleName, isActive = true, onEdit, onDeactivate, onReactivate, onDelete,
}: StaffRowProps) {
  const t = useTranslations('manager.staff')
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const hasActions = onEdit || onDeactivate || onReactivate

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl bg-white border border-brown/10',
      !isActive && 'opacity-50'
    )}>
      <div className="w-10 h-10 rounded-full bg-cream-dark flex items-center justify-center flex-shrink-0">
        <User className="w-5 h-5 text-brown/40" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-brown truncate">{name}</span>
          {streak > 0 && isActive && (
            <span className="text-xs flex items-center gap-0.5 text-gold">
              <Flame className="w-3 h-3" /> {streak}
            </span>
          )}
          {roleName && (
            <Badge variant="default" className="text-[10px]">{roleName}</Badge>
          )}
          {!isActive && (
            <Badge variant="warning" className="text-[10px]">{t('inactive')}</Badge>
          )}
        </div>
        {lastActive && (
          <p className="text-xs text-brown/40">{lastActive}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {overdueCount > 0 && isActive && (
          <Badge variant="critical" className="text-[10px] gap-0.5">
            <AlertTriangle className="w-3 h-3" /> {overdueCount}
          </Badge>
        )}
        {isActive && (
          <div className={cn(
            'text-sm font-bold',
            completionPercent >= 80 ? 'text-success' :
            completionPercent >= 50 ? 'text-warning' : 'text-red'
          )}>
            {completionPercent}%
          </div>
        )}

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-brown/30 hover:text-red hover:bg-red/5 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {/* Action menu */}
        {hasActions && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-lg text-brown/30 hover:text-brown hover:bg-brown/5 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-brown/10 py-1 z-10 min-w-[140px]">
                {onEdit && (
                  <button
                    onClick={() => { setMenuOpen(false); onEdit() }}
                    className="w-full text-left px-4 py-2 text-sm text-brown hover:bg-brown/5 transition-colors"
                  >
                    {t('edit' as 'addStaff')}
                  </button>
                )}
                {isActive && onDeactivate && (
                  <button
                    onClick={() => { setMenuOpen(false); onDeactivate() }}
                    className="w-full text-left px-4 py-2 text-sm text-red hover:bg-red/5 transition-colors"
                  >
                    {t('deactivate')}
                  </button>
                )}
                {!isActive && onReactivate && (
                  <button
                    onClick={() => { setMenuOpen(false); onReactivate() }}
                    className="w-full text-left px-4 py-2 text-sm text-success hover:bg-success/5 transition-colors"
                  >
                    {t('reactivate')}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
