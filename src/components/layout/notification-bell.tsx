'use client'
import { useState, useRef, useEffect } from 'react'
import { Bell, X, AlertTriangle, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { cn } from '@/lib/utils/cn'
import { motion, AnimatePresence } from 'framer-motion'

interface AlertRow {
  id: string
  created_at: string
  task_template: {
    name_en: string
    name_es: string
    is_critical: boolean
    zone_id: string
  } | null
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)
  const { locale } = useLocaleStore()
  const zone = useAuthStore((s) => s.zone)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const { data: alerts = [] } = useQuery({
    queryKey: ['overdue-alerts', zone?.id],
    queryFn: async () => {
      const supabase = createClient()
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const today = new Date().toISOString().split('T')[0]

      const { data } = await supabase
        .from('task_completions')
        .select('id, created_at, task_template:task_templates(name_en, name_es, is_critical, zone_id)')
        .eq('status', 'pending')
        .lt('created_at', thirtyMinAgo)
        .gte('created_at', `${today}T00:00:00`)

      return ((data as unknown as AlertRow[]) ?? []).filter(
        (d) => d.task_template?.is_critical && (!zone || d.task_template?.zone_id === zone.id)
      )
    },
    refetchInterval: 60000,
    enabled: !!zone,
  })

  const visibleAlerts = alerts.filter((a) => !dismissed.has(a.id))
  const count = visibleAlerts.length

  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id))
  const clearAll = () => setDismissed(new Set(alerts.map((a) => a.id)))

  const minutesAgo = (dateStr: string) => {
    const mins = Math.round((Date.now() - new Date(dateStr).getTime()) / 60000)
    return mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          open ? 'bg-white/30' : 'hover:bg-white/20'
        )}
      >
        <Bell className="w-5 h-5 text-white" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red text-white text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px]">
            {count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-brown/10 overflow-hidden z-50"
          >
            <div className="px-3 py-2 border-b border-brown/10 flex items-center justify-between">
              <span className="text-xs font-bold text-brown uppercase tracking-wide">
                {locale === 'es' ? 'Alertas' : 'Alerts'}
              </span>
              {count > 0 && (
                <button onClick={clearAll} className="text-[10px] text-brown/40 hover:text-brown">
                  {locale === 'es' ? 'Limpiar todo' : 'Clear all'}
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {visibleAlerts.length === 0 ? (
                <p className="text-sm text-brown/40 text-center py-6">
                  {locale === 'es' ? 'Sin alertas' : 'No alerts'}
                </p>
              ) : (
                visibleAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-2 px-3 py-2.5 border-b border-brown/5 last:border-0">
                    <AlertTriangle className="w-4 h-4 text-red flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-brown truncate">
                        {locale === 'es' ? alert.task_template?.name_es : alert.task_template?.name_en}
                      </p>
                      <p className="text-[10px] text-brown/40 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {minutesAgo(alert.created_at)}
                      </p>
                    </div>
                    <button onClick={() => dismiss(alert.id)} className="p-1 text-brown/20 hover:text-brown/60">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
