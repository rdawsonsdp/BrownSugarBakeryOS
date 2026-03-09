'use client'

import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Printer } from 'lucide-react'
import { TaskCard } from './task-card'
import { useTaskCompletions, useCompleteTask } from '@/lib/hooks/use-tasks'
import { useSOPs } from '@/lib/hooks/use-sops'
import { useRealtimeTaskCompletions } from '@/lib/hooks/use-realtime'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Skeleton } from '@/components/ui/skeleton'
import { PrintSelectDialog, PrintTaskSheet } from '@/components/dashboard/manager/print-tasks'
import type { PrintSize } from '@/components/dashboard/manager/print-tasks'
import type { SOPWithSteps } from '@/lib/types/database.types'

interface TaskListProps {
  shiftId: string
  zoneId: string
}

export function TaskList({ shiftId, zoneId }: TaskListProps) {
  const t = useTranslations('dashboard')
  const staff = useAuthStore((s) => s.staff)
  const zone = useAuthStore((s) => s.zone)
  const { locale } = useLocaleStore()
  // Default: all tasks expanded
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const { data: completions, isLoading } = useTaskCompletions(shiftId)
  const { data: sops } = useSOPs(zoneId)
  const completeTask = useCompleteTask()

  // Print state
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [printGroupKeys, setPrintGroupKeys] = useState<string[]>([])
  const [printSize, setPrintSize] = useState<PrintSize>('letter')
  const [showPrint, setShowPrint] = useState(false)

  useRealtimeTaskCompletions(shiftId)

  const sopMap = (sops || []).reduce<Record<string, SOPWithSteps>>((acc, sop) => {
    acc[sop.id] = sop
    return acc
  }, {})

  const handleComplete = useCallback((id: string) => {
    completeTask.mutate({ id })
  }, [completeTask])

  const handlePhoto = useCallback((id: string) => {
    completeTask.mutate({ id, notes: 'Photo captured' })
  }, [completeTask])

  const handleToggle = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Build a role group for print (single group = this staff member's tasks)
  const printRoleGroups = useMemo(() => {
    if (!completions || !sops) return []
    const staffSops = completions
      .map((c) => c.task_template.sop_id ? sopMap[c.task_template.sop_id] : null)
      .filter((s): s is SOPWithSteps => s !== null)
    // Deduplicate
    const seen = new Set<string>()
    const unique: SOPWithSteps[] = []
    for (const s of staffSops) {
      if (!seen.has(s.id)) {
        seen.add(s.id)
        unique.push(s)
      }
    }
    return [{
      roleLabel: staff?.display_name || 'Staff',
      staffId: staff?.id || null,
      sops: unique,
    }]
  }, [completions, sops, sopMap, staff])

  const handlePrintSelected = (keys: string[], size: PrintSize) => {
    setPrintDialogOpen(false)
    setPrintGroupKeys(keys)
    setPrintSize(size)
    setShowPrint(true)

    setTimeout(() => {
      const cleanup = () => {
        setShowPrint(false)
        window.removeEventListener('afterprint', cleanup)
      }
      window.addEventListener('afterprint', cleanup)
      window.print()
    }, 300)
  }

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
  const zoneName = zone ? (locale === 'es' ? zone.name_es : zone.name_en) : ''

  return (
    <div className="space-y-4 p-4">
      {/* Progress bar + print button */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-brown/60">{t('progress', { completed, total })}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPrintDialogOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brown/10 text-brown text-xs font-semibold hover:bg-brown/20 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <span className="font-bold text-brown">{percent}%</span>
          </div>
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

      {/* Task cards — all expanded by default */}
      <div className="space-y-2">
        {completions?.map((completion) => (
          <TaskCard
            key={completion.id}
            completion={completion}
            isExpanded={!collapsedIds.has(completion.id)}
            onToggle={() => handleToggle(completion.id)}
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

      {/* Print dialog */}
      <PrintSelectDialog
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        onPrint={handlePrintSelected}
        roleGroups={printRoleGroups}
      />

      {/* Print sheet (portal to body) */}
      {showPrint && (
        <PrintTaskSheet
          roleGroups={printRoleGroups}
          selectedKeys={printGroupKeys}
          locale={locale}
          zoneName={zoneName}
          pageSize={printSize}
        />
      )}
    </div>
  )
}
