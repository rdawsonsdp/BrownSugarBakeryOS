'use client'

import { motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface AlertCardProps {
  title: string
  description?: string
  type: 'overdue' | 'critical' | 'alert'
  onDismiss?: () => void
}

export function AlertCard({ title, description, type, onDismiss }: AlertCardProps) {
  const colors = {
    overdue: 'bg-red/5 border-red/20 text-red',
    critical: 'bg-red/5 border-red/20 text-red',
    alert: 'bg-warning/5 border-warning/20 text-warning',
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      className={cn('rounded-xl border p-3 flex items-start gap-3', colors[type])}
    >
      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-xs opacity-70 mt-0.5">{description}</p>}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="p-1 hover:bg-black/5 rounded">
          <X className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  )
}
