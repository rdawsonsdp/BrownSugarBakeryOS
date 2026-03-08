'use client'

import { ClipboardList, BookOpen, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils/cn'

interface BottomNavProps {
  activeTab: 'tasks' | 'sops' | 'profile'
  onTabChange: (tab: 'tasks' | 'sops' | 'profile') => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const t = useTranslations('dashboard')

  const tabs = [
    { id: 'tasks' as const, label: t('tasks'), icon: ClipboardList },
    { id: 'sops' as const, label: t('sops'), icon: BookOpen },
    { id: 'profile' as const, label: t('profile'), icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-brown/10 safe-bottom z-40 no-print">
      <div className="flex items-center justify-around px-4 py-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 py-2 px-4 rounded-lg transition-colors touch-target',
              activeTab === id
                ? 'text-gold'
                : 'text-brown/40 hover:text-brown/60'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
