'use client'

import { useTranslations } from 'next-intl'
import { AnimatePresence } from 'framer-motion'
import { useZones } from '@/lib/hooks/use-zones'
import { useActiveShifts } from '@/lib/hooks/use-shift'
import { useZoneStaff } from '@/lib/hooks/use-staff'
import { useSOPs } from '@/lib/hooks/use-sops'
import { ZoneHealthCard } from './zone-health-card'
import { AlertCard } from './alert-card'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getChicagoDate } from '@/lib/utils/timezone'
import { useState, useCallback } from 'react'
import { CheckCircle2, Circle, User, Plus, Edit2, ChevronDown, Printer, GripVertical, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAssignSOPStaff, useReorderSOPs, useDeleteSOP, useToggleSOPActive } from '@/lib/hooks/use-sop-mutations'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SOPEditor } from '@/components/sop/sop-editor'
import { PrintSelectDialog, PrintTaskSheet } from './print-tasks'
import type { PrintSize } from './print-tasks'
import type { SOPWithSteps } from '@/lib/types/database.types'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface OverviewTabProps {
  zoneId?: string
}

export function OverviewTab({ zoneId }: OverviewTabProps) {
  const t = useTranslations('manager')
  const { locale } = useLocaleStore()
  const zone = useAuthStore((s) => s.zone)
  const queryClient = useQueryClient()
  const { data: zones, isLoading: zonesLoading } = useZones()
  const { data: activeShifts } = useActiveShifts()
  const { data: zoneStaff } = useZoneStaff(zoneId)
  const { data: zoneSops } = useSOPs(zoneId)
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSOP, setEditingSOP] = useState<SOPWithSteps | undefined>(undefined)
  const [assignOpenId, setAssignOpenId] = useState<string | null>(null)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [printGroupKeys, setPrintGroupKeys] = useState<string[]>([])
  const [printSize, setPrintSize] = useState<PrintSize>('letter')
  const [showPrint, setShowPrint] = useState(false)
  const assignStaff = useAssignSOPStaff()
  const reorderSOPs = useReorderSOPs()
  const deleteSOP = useDeleteSOP()
  const toggleActive = useToggleSOPActive()
  const [deleteConfirm, setDeleteConfirm] = useState<{ sop: SOPWithSteps } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = useCallback(
    (groupStaffId: string | null, sops: SOPWithSteps[], event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = sops.findIndex((s) => s.id === active.id)
      const newIndex = sops.findIndex((s) => s.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return

      const reordered = arrayMove(sops, oldIndex, newIndex)
      const updates = reordered.map((sop, i) => ({ id: sop.id, sort_order: i }))
      reorderSOPs.mutate(updates)

      // Optimistic update in query cache
      queryClient.setQueryData(['sops', zoneId], (old: SOPWithSteps[] | undefined) => {
        if (!old) return old
        const updated = [...old]
        for (const u of updates) {
          const idx = updated.findIndex((s) => s.id === u.id)
          if (idx !== -1) updated[idx] = { ...updated[idx], sort_order: u.sort_order }
        }
        return updated.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      })
    },
    [queryClient, reorderSOPs, zoneId]
  )

  const handleDeleteTask = (sop: SOPWithSteps) => {
    setDeleteConfirm({ sop })
  }

  const confirmDelete = async (saveToLibrary: boolean) => {
    if (!deleteConfirm) return
    if (saveToLibrary) {
      // Move to library: set status to draft so it's removed from active task list
      // but still accessible in the SOP library
      await fetch('/api/sops', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deleteConfirm.sop.id, status: 'draft' }),
      })
      queryClient.invalidateQueries({ queryKey: ['sops'] })
    } else {
      // Permanent delete (soft-delete: is_active = false)
      deleteSOP.mutate(deleteConfirm.sop.id)
    }
    setDeleteConfirm(null)
  }

  const handlePrintSelected = (keys: string[], size: PrintSize) => {
    setPrintDialogOpen(false)
    setPrintGroupKeys(keys)
    setPrintSize(size)
    setShowPrint(true)

    // Wait for React to render, then print. Clean up via afterprint event.
    setTimeout(() => {
      const cleanup = () => {
        setShowPrint(false)
        window.removeEventListener('afterprint', cleanup)
      }
      window.addEventListener('afterprint', cleanup)
      window.print()
    }, 300)
  }

  // Fetch today's task completions for the current zone
  const { data: allCompletions } = useQuery({
    queryKey: ['all-completions-today', zoneId],
    queryFn: async () => {
      const supabase = createClient()
      const today = getChicagoDate()

      const { data, error } = await supabase
        .from('task_completions')
        .select('*, task_template:task_templates(*)')
        .gte('created_at', `${today}T00:00:00`)

      if (error) throw error
      return data
    },
  })

  const handleCreateNew = () => {
    setEditingSOP(undefined)
    setEditorOpen(true)
  }

  const handleEdit = (sop: SOPWithSteps) => {
    setEditingSOP(sop)
    setEditorOpen(true)
  }

  const handleSave = async (data: Record<string, unknown>) => {
    const method = data.id ? 'PUT' : 'POST'
    const res = await fetch('/api/sops', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ['sops'] })
      setEditorOpen(false)
      setEditingSOP(undefined)
    }
  }

  if (zonesLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    )
  }

  // Filter to current zone only
  const currentZone = zones?.find((z) => z.id === zoneId)
  const filteredZones = currentZone ? [currentZone] : zones || []

  // Calculate per-zone stats
  const zoneStats = filteredZones.map((zone) => {
    const zoneCompletions = allCompletions?.filter(
      (c) => c.task_template?.zone_id === zone.id
    ) || []
    const total = zoneCompletions.length
    const completed = zoneCompletions.filter((c) => c.status === 'completed').length
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100)
    const staffCount = activeShifts?.filter((s) => s.zone_id === zone.id).length || 0

    return { zone, total, completed, percent, staffCount }
  })

  // Group SOPs by assigned role/staff
  const roleGroups: { roleLabel: string; staffId: string | null; sops: SOPWithSteps[] }[] = []

  if (zoneSops) {
    const grouped = new Map<string, { label: string; staffId: string | null; sops: SOPWithSteps[] }>()

    for (const sop of zoneSops) {
      const key = sop.assigned_staff?.id || '__unassigned__'
      const label = sop.assigned_staff?.display_name || 'Unassigned'

      if (!grouped.has(key)) {
        grouped.set(key, { label, staffId: sop.assigned_staff?.id || null, sops: [] })
      }
      grouped.get(key)!.sops.push(sop)
    }

    const entries = Array.from(grouped.values())
    entries.sort((a, b) => {
      if (a.staffId === null) return 1
      if (b.staffId === null) return -1
      return a.label.localeCompare(b.label)
    })

    for (const entry of entries) {
      roleGroups.push({ roleLabel: entry.label, staffId: entry.staffId, sops: entry.sops })
    }
  }

  // Find overdue critical tasks for this zone only
  const overdueAlerts = allCompletions?.filter((c) => {
    if (c.status === 'completed') return false
    if (!c.task_template?.is_critical) return false
    if (dismissedAlerts.includes(c.id)) return false
    if (zoneId && c.task_template?.zone_id !== zoneId) return false
    const created = new Date(c.created_at)
    return Date.now() - created.getTime() > 30 * 60 * 1000
  }) || []

  return (
    <div className="space-y-6 p-4">
      {/* Zone Health Card */}
      <div>
        <h2 className="text-sm font-semibold text-brown/60 uppercase tracking-wider mb-3">
          {t('zoneHealth')}
        </h2>
        <div className="grid gap-3">
          {zoneStats.map(({ zone, total, completed, percent, staffCount }) => (
            <ZoneHealthCard
              key={zone.id}
              zoneName_en={zone.name_en}
              zoneName_es={zone.name_es}
              zoneColor={zone.color}
              completionPercent={percent}
              activeStaff={staffCount}
              totalTasks={total}
              completedTasks={completed}
            />
          ))}
        </div>
      </div>

      {/* Tasks organized by Role */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-brown/60 uppercase tracking-wider">
            {t('currentTasks')}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setPrintDialogOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brown/10 text-brown text-xs font-semibold hover:bg-brown/20 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brown text-cream text-xs font-semibold hover:bg-brown-light transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Task
            </button>
          </div>
        </div>

        {roleGroups.length > 0 ? (
          <div className="space-y-4">
            {roleGroups.map((group) => {
              const totalInGroup = group.sops.length
              const sopIds = group.sops.map((s) => s.id)

              return (
                <div key={group.staffId || 'unassigned'} className="space-y-1.5">
                  {/* Role header */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-brown/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-brown/40" />
                    </div>
                    <span className="text-xs font-bold text-brown">
                      {group.roleLabel}
                    </span>
                    <span className="text-[10px] text-brown/40">
                      {totalInGroup} {totalInGroup === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>

                  {/* Sortable tasks under this role */}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(group.staffId, group.sops, event)}
                  >
                    <SortableContext items={sopIds} strategy={verticalListSortingStrategy}>
                      {group.sops.map((sop) => (
                        <SortableTaskItem
                          key={sop.id}
                          sop={sop}
                          locale={locale}
                          allCompletions={allCompletions}
                          assignOpenId={assignOpenId}
                          setAssignOpenId={setAssignOpenId}
                          assignStaff={assignStaff}
                          zoneStaff={zoneStaff}
                          onEdit={handleEdit}
                          onDelete={handleDeleteTask}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-brown/40 text-center py-6">No tasks yet</p>
        )}
      </div>

      {/* Alerts */}
      <div>
        <h2 className="text-sm font-semibold text-brown/60 uppercase tracking-wider mb-3">
          {t('alerts')}
        </h2>
        <AnimatePresence mode="popLayout">
          {overdueAlerts.length > 0 ? (
            <div className="space-y-2">
              {overdueAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  title={alert.task_template?.name_en || 'Task overdue'}
                  type="overdue"
                  onDismiss={() => setDismissedAlerts((prev) => [...prev, alert.id])}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-brown/40 text-center py-6">{t('noAlerts')}</p>
          )}
        </AnimatePresence>
      </div>

      {/* SOP Editor Modal */}
      <Dialog open={editorOpen} onClose={() => { setEditorOpen(false); setEditingSOP(undefined) }} className="max-w-2xl max-h-[90vh]">
        <div className="overflow-y-auto max-h-[85vh]">
          <SOPEditor
            sop={editingSOP}
            zoneId={zoneId || zone?.id || ''}
            onSave={handleSave}
            onCancel={() => { setEditorOpen(false); setEditingSOP(undefined) }}
          />
        </div>
      </Dialog>

      {/* Delete Task Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogHeader>
          <DialogTitle>Remove Task</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-brown/70">
            Remove <strong>{deleteConfirm?.sop ? (locale === 'es' ? deleteConfirm.sop.name_es : deleteConfirm.sop.name_en) : ''}</strong> from the current task list?
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => confirmDelete(false)}>Delete Permanently</Button>
          <Button variant="primary" onClick={() => confirmDelete(true)}>Save to Library</Button>
        </DialogFooter>
      </Dialog>

      {/* Print Selection Dialog */}
      <PrintSelectDialog
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        onPrint={handlePrintSelected}
        roleGroups={roleGroups}
      />

      {/* Print-only task sheets (one page per selected role) */}
      {showPrint && (
        <PrintTaskSheet
          roleGroups={roleGroups}
          selectedKeys={printGroupKeys}
          locale={locale}
          zoneName={currentZone ? (locale === 'es' ? currentZone.name_es : currentZone.name_en) : 'All Zones'}
          pageSize={printSize}
        />
      )}
    </div>
  )
}

// ── Sortable Task Item ──────────────────────────────────────────────
interface SortableTaskItemProps {
  sop: SOPWithSteps
  locale: string
  allCompletions: Array<{ id: string; status: string; task_template?: { sop_id?: string } }> | undefined
  assignOpenId: string | null
  setAssignOpenId: (id: string | null) => void
  assignStaff: ReturnType<typeof useAssignSOPStaff>
  zoneStaff: Array<{ id: string; display_name: string; is_active: boolean }> | undefined
  onEdit: (sop: SOPWithSteps) => void
  onDelete: (sop: SOPWithSteps) => void
}

function SortableTaskItem({
  sop,
  locale,
  allCompletions,
  assignOpenId,
  setAssignOpenId,
  assignStaff,
  zoneStaff,
  onEdit,
  onDelete,
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sop.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  const completion = allCompletions?.find(
    (c) => c.task_template?.sop_id === sop.id
  )
  const isCompleted = completion?.status === 'completed'
  const sopName = locale === 'es' ? sop.name_es : sop.name_en
  const assignedName = sop.assigned_staff?.display_name
  const isAssignOpen = assignOpenId === sop.id

  return (
    <div ref={setNodeRef} style={style} className="ml-8 space-y-0">
      <div
        className={cn(
          'flex items-center gap-2 p-3 rounded-xl border transition-colors group',
          isCompleted
            ? 'bg-brown/5 border-brown/5'
            : 'bg-white border-brown/10',
          isAssignOpen && 'rounded-b-none',
          isDragging && 'shadow-lg'
        )}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="touch-none p-1 -ml-1 cursor-grab active:cursor-grabbing text-brown/20 hover:text-brown/40 transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
        ) : (
          <Circle className="w-5 h-5 text-brown/20 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              'text-sm block',
              isCompleted
                ? 'line-through text-brown/30'
                : 'text-brown font-medium'
            )}
          >
            {sopName}
          </span>
          <button
            onClick={() => setAssignOpenId(isAssignOpen ? null : sop.id)}
            className={cn(
              'inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors',
              assignedName
                ? 'bg-brown/5 border-brown/20 text-brown'
                : 'bg-cream border-dashed border-brown/20 text-brown/40'
            )}
          >
            <User className="w-3 h-3" />
            {assignedName || 'Assign'}
            <ChevronDown className={cn('w-2.5 h-2.5 transition-transform', isAssignOpen && 'rotate-180')} />
          </button>
        </div>
        {sop.is_critical && !isCompleted && (
          <span className="text-[10px] font-bold text-red uppercase">Critical</span>
        )}
        <button
          onClick={() => onEdit(sop)}
          className="p-1.5 rounded-lg text-brown/20 hover:text-brown hover:bg-brown/5 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(sop)}
          className="p-1.5 rounded-lg text-brown/20 hover:text-red hover:bg-red/5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inline assignment picker */}
      {isAssignOpen && (
        <div className="px-3 pb-3 pt-2 bg-white border border-t-0 border-brown/10 rounded-b-xl">
          <p className="text-[10px] font-semibold text-brown/50 uppercase mb-2">Assign to</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { assignStaff.mutate({ id: sop.id, assigned_staff_id: null }); setAssignOpenId(null) }}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                !sop.assigned_staff_id
                  ? 'bg-brown text-cream border-brown'
                  : 'bg-white text-brown/60 border-brown/15 hover:border-brown/30'
              )}
            >
              Unassigned
            </button>
            {zoneStaff?.filter((s) => s.is_active).map((s) => (
              <button
                key={s.id}
                onClick={() => { assignStaff.mutate({ id: sop.id, assigned_staff_id: s.id }); setAssignOpenId(null) }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                  sop.assigned_staff_id === s.id
                    ? 'bg-brown text-cream border-brown'
                    : 'bg-white text-brown/60 border-brown/15 hover:border-brown/30'
                )}
              >
                {s.display_name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
