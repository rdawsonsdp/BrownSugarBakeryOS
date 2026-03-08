'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { TaskCard } from './task-card'
import { useTaskCompletions, useCompleteTask } from '@/lib/hooks/use-tasks'
import { useSOPs } from '@/lib/hooks/use-sops'
import { useRealtimeTaskCompletions } from '@/lib/hooks/use-realtime'
import { Skeleton } from '@/components/ui/skeleton'
import type { SOPWithSteps } from '@/lib/types/database.types'

interface TaskListProps {
  shiftId: string
  zoneId: string
}

export function TaskList({ shiftId, zoneId }: TaskListProps) {
  const t = useTranslations('dashboard')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { data: completions, isLoading } = useTaskCompletions(shiftId)
  const { data: sops } = useSOPs(zoneId)
  const completeTask = useCompleteTask()

  useRealtimeTaskCompletions(shiftId)

  const sopMap = (sops || []).reduce<Record<string, SOPWithSteps>>((acc, sop) => {
    acc[sop.id] = sop
    return acc
  }, {})

  const handleComplete = useCallback((id: string) => {
    completeTask.mutate({ id })
  }, [completeTask])

  const handlePhoto = useCallback((id: string) => {
    // For demo: just complete with a placeholder
    completeTask.mutate({ id, notes: 'Photo captured' })
  }, [completeTask])

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  const total = completions?.length || 0
  const completed = completions?.filter((c) => c.status === 'completed').length || 0
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="space-y-4 p-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-brown/60">{t('progress', { completed, total })}</span>
          <span className="font-bold text-brown">{percent}%</span>
        </div>
        <div className="h-2 bg-brown/10 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-gold to-success rounded-full"
          />
        </div>
      </div>

      {/* Task cards */}
      <div className="space-y-2">
        {completions?.map((completion) => (
          <TaskCard
            key={completion.id}
            completion={completion}
            isExpanded={expandedId === completion.id}
            onToggle={() => setExpandedId(expandedId === completion.id ? null : completion.id)}
            onComplete={handleComplete}
            onPhoto={handlePhoto}
            sop={completion.task_template.sop_id ? sopMap[completion.task_template.sop_id] : null}
          />
        ))}
      </div>

      {total === 0 && (
        <div className="text-center py-12 text-brown/40">
          <p className="text-lg font-semibold">No tasks for this shift</p>
        </div>
      )}
    </div>
  )
}
