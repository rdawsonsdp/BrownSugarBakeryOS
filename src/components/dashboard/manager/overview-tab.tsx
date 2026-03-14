'use client'

import { useTranslations } from 'next-intl'
import { useZones, useZoneRoles } from '@/lib/hooks/use-zones'
import { useActiveShifts } from '@/lib/hooks/use-shift'
import { useZoneStaff } from '@/lib/hooks/use-staff'
import { useSOPs } from '@/lib/hooks/use-sops'
import { useDayAssignments, useStartDay } from '@/lib/hooks/use-day-assignments'
import { ZoneHealthCard } from './zone-health-card'
import { AssignmentPlanner } from './assignment-planner'
import { Skeleton } from '@/components/ui/skeleton'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getChicagoDate } from '@/lib/utils/timezone'
import { useState, useCallback, useMemo } from 'react'
import { CheckCircle2, Circle, User, Plus, Edit2, ChevronDown, Printer, GripVertical, Trash2, RotateCcw, RefreshCw, StickyNote, Play, Loader2, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useAssignSOPStaff, useReorderSOPs, useDeleteSOP } from '@/lib/hooks/use-sop-mutations'
import { useResetTasks } from '@/lib/hooks/use-reset-tasks'
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
  const managerStaff = useAuthStore((s) => s.staff)
  const queryClient = useQueryClient()
  const { data: zones, isLoading: zonesLoading } = useZones()
  const { data: activeShifts } = useActiveShifts(zoneId)
  const { data: zoneStaff } = useZoneStaff(zoneId)
  const { data: zoneSops } = useSOPs(zoneId)
  const { data: zoneRoles } = useZoneRoles(zoneId || '')
  const { data: dayAssignments } = useDayAssignments(zoneId)
  const startDay = useStartDay()
  const [dayStartedOverride, setDayStartedOverride] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [confirmStartOpen, setConfirmStartOpen] = useState(false)

  // Check if the day has been started (any assignment marked 'started')
  const dayStarted = dayStartedOverride || (dayAssignments?.some((a) => a.status === 'started') ?? false)
  const assignedCount = dayAssignments?.filter((a) => a.staff_id).length ?? 0

  // Quick-add state
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddName, setQuickAddName] = useState('')
  const [quickAddAssign, setQuickAddAssign] = useState<string | null>(null)
  const [quickAddSaving, setQuickAddSaving] = useState(false)

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
  const resetTasks = useResetTasks()
  const [deleteConfirm, setDeleteConfirm] = useState<{ sop: SOPWithSteps } | null>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)

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
    refetchInterval: 30_000, // Refresh every 30s as safety net
  })

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['all-completions-today'] }),
      queryClient.invalidateQueries({ queryKey: ['active-shifts'] }),
      queryClient.invalidateQueries({ queryKey: ['sops'] }),
      queryClient.invalidateQueries({ queryKey: ['zone-staff'] }),
    ])
    // Brief delay so spinner is visible
    setTimeout(() => setRefreshing(false), 500)
  }, [queryClient])

  // Build per-role slots for zone health card
  const roleSlots = useMemo(() => {
    if (!zoneRoles || !zoneId) return []

    return zoneRoles
      .filter((r) => !r.is_manager)
      .sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
      .map((role) => {
        // Find active shift for this role
        const shift = activeShifts?.find(
          (s: Record<string, unknown>) => s.role_id === role.id
        )
        const staffName = shift?.staff?.display_name || null

        // Count completions for this shift
        let completed = 0
        let total = 0
        if (shift && allCompletions) {
          const shiftCompletions = allCompletions.filter(
            (c: Record<string, unknown>) => c.shift_id === shift.id
          )
          total = shiftCompletions.length
          completed = shiftCompletions.filter(
            (c: Record<string, unknown>) => c.status === 'completed'
          ).length
        }

        return {
          roleId: role.id,
          roleName: locale === 'es' ? role.name_es : role.name_en,
          staffName,
          completed,
          total,
        }
      })
  }, [zoneRoles, zoneId, activeShifts, allCompletions, locale])

  // Build shift notes from active shifts
  const shiftNotes = useMemo(() => {
    if (!activeShifts) return []
    return activeShifts
      .filter((s: Record<string, unknown>) => s.notes)
      .map((s: Record<string, unknown>) => ({
        id: s.id as string,
        staffName: (s.staff as Record<string, unknown>)?.display_name as string || '?',
        roleName: locale === 'es'
          ? ((s.role as Record<string, unknown>)?.name_es as string || '')
          : ((s.role as Record<string, unknown>)?.name_en as string || ''),
        notes: s.notes as string,
        shiftType: s.shift_type as string,
      }))
  }, [activeShifts, locale])

  // Build mapping: role placeholder staff_id → real person staff_id via active shifts
  const placeholderToRealStaff = useMemo(() => {
    const map = new Map<string, string>()
    if (!activeShifts || !zoneSops) return map

    // roleId → real staff_id from active shifts
    const roleToRealStaff = new Map<string, string>()
    for (const shift of activeShifts) {
      if (shift.role_id && shift.staff_id) {
        roleToRealStaff.set(shift.role_id as string, shift.staff_id as string)
      }
    }

    // placeholder staff_id → real staff_id via the placeholder's role_id
    for (const sop of zoneSops) {
      if (sop.assigned_staff?.id && sop.assigned_staff?.role_id) {
        const realStaffId = roleToRealStaff.get(sop.assigned_staff.role_id)
        if (realStaffId) {
          map.set(sop.assigned_staff.id, realStaffId)
        }
      }
    }

    return map
  }, [activeShifts, zoneSops])

  // Build mapping: placeholder staff_id → real person display name
  const placeholderToRealName = useMemo(() => {
    const map = new Map<string, string>()
    if (!activeShifts || !zoneSops) return map

    for (const sop of zoneSops) {
      const placeholderId = sop.assigned_staff?.id
      if (!placeholderId) continue
      const realStaffId = placeholderToRealStaff.get(placeholderId)
      if (!realStaffId) continue
      const shift = activeShifts.find((s) => (s.staff_id as string) === realStaffId)
      const realName = (shift?.staff as Record<string, unknown>)?.display_name as string
      if (realName) map.set(placeholderId, realName)
    }

    return map
  }, [activeShifts, zoneSops, placeholderToRealStaff])

  const handleQuickAdd = async () => {
    if (!quickAddName.trim() || !zoneId) return
    setQuickAddSaving(true)
    try {
      const res = await fetch('/api/sops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_en: quickAddName.trim(),
          name_es: quickAddName.trim(),
          zone_id: zoneId,
          status: 'published',
          is_active: true,
          is_critical: false,
          assigned_staff_id: quickAddAssign,
          steps: [],
        }),
      })
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ['sops'] })
        setQuickAddName('')
        setQuickAddAssign(null)
        setQuickAddOpen(false)
      }
    } catch { /* */ }
    setQuickAddSaving(false)
  }

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
      const placeholderName = sop.assigned_staff?.display_name
      const realName = sop.assigned_staff?.id ? placeholderToRealName.get(sop.assigned_staff.id) : undefined
      const label = realName
        ? `${realName} — ${placeholderName}`
        : placeholderName || (locale === 'es' ? 'Sin asignar' : 'Unassigned')

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

  const handleStartDay = () => {
    if (!managerStaff || !zoneId) return
    startDay.mutate(
      { zone_id: zoneId, manager_staff_id: managerStaff.id },
      {
        onSuccess: () => {
          setConfirmStartOpen(false)
          setDayStartedOverride(true)
          queryClient.invalidateQueries({ queryKey: ['day-assignments'] })
          queryClient.invalidateQueries({ queryKey: ['active-shifts'] })
          queryClient.invalidateQueries({ queryKey: ['all-completions-today'] })
        },
      }
    )
  }

  return (
    <div className="space-y-6 p-4">
      {/* Step 1: Role Assignments (shown before day starts) */}
      {!dayStarted && zoneId && (
        <AssignmentPlanner zoneId={zoneId} />
      )}

      {/* Zone Health Card (shown after day starts) */}
      {dayStarted && (
        <>
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                {t('zoneHealth')}
              </h2>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brown/5 text-brown/60 text-xs font-semibold hover:bg-brown/10 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
                {locale === 'es' ? 'Actualizar' : 'Refresh'}
              </button>
            </div>
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
                  roleSlots={zone.id === zoneId ? roleSlots : undefined}
                />
              ))}
            </div>
          </div>

          {/* Shift Notes from active shifts */}
          {shiftNotes.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                <StickyNote className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                {locale === 'es' ? 'Notas del Turno' : 'Shift Notes'}
              </h2>
              <div className="space-y-2">
                {shiftNotes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white border border-brown/10 rounded-xl p-3"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-brown">{note.staffName}</span>
                      <span className="text-[10px] text-brown/40">{note.roleName}</span>
                      <span className="text-[10px] text-brown/30 capitalize ml-auto">{note.shiftType}</span>
                    </div>
                    <p className="text-sm text-brown/70 whitespace-pre-wrap">{note.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Step 2: Tasks (shown when at least 1 person assigned OR day started) */}
      {(assignedCount > 0 || dayStarted) && (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            {t('currentTasks')}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setResetConfirmOpen(true)}
              disabled={resetTasks.isPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-text-primary text-xs font-semibold hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              <RotateCcw className={cn('w-3.5 h-3.5', resetTasks.isPending && 'animate-spin')} /> {locale === 'es' ? 'Reiniciar' : 'Reset Tasks'}
            </button>
            <button
              onClick={() => setPrintDialogOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" /> {locale === 'es' ? 'Imprimir' : 'Print'}
            </button>
            <button
              onClick={() => setQuickAddOpen(!quickAddOpen)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> {locale === 'es' ? 'Agregar' : 'Quick Add'}
            </button>
          </div>
        </div>

        {/* Quick Add Form */}
        {quickAddOpen && (
          <div className="bg-white border border-border rounded-xl p-3 space-y-3 mb-3">
            <input
              value={quickAddName}
              onChange={(e) => setQuickAddName(e.target.value)}
              placeholder={locale === 'es' ? 'Nombre de la tarea...' : 'Task name...'}
              className="w-full px-3 py-2 rounded-lg border border-border text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd() }}
            />
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setQuickAddAssign(null)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                  quickAddAssign === null
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-text-secondary border-border'
                )}
              >
                {locale === 'es' ? 'Sin asignar' : 'Unassigned'}
              </button>
              {zoneStaff?.filter((s) => s.is_active).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setQuickAddAssign(s.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                    quickAddAssign === s.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-text-secondary border-border'
                  )}
                >
                  {s.display_name}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button
                onClick={handleCreateNew}
                className="text-xs text-primary font-medium hover:text-primary-dark transition-colors"
              >
                {locale === 'es' ? 'Editor completo →' : 'Full editor →'}
              </button>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setQuickAddOpen(false); setQuickAddName(''); setQuickAddAssign(null) }}>
                  {locale === 'es' ? 'Cancelar' : 'Cancel'}
                </Button>
                <Button variant="primary" size="sm" onClick={handleQuickAdd} disabled={!quickAddName.trim() || quickAddSaving}>
                  {quickAddSaving ? '...' : (locale === 'es' ? 'Agregar' : 'Add')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {roleGroups.length > 0 ? (
          <div className="space-y-4">
            {roleGroups.map((group) => {
              const totalInGroup = group.sops.length
              const sopIds = group.sops.map((s) => s.id)

              return (
                <div key={group.staffId || 'unassigned'} className="space-y-1.5">
                  {/* Role header */}
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-text-muted" />
                    </div>
                    <span className="text-xs font-bold text-text-primary">
                      {group.roleLabel}
                    </span>
                    <span className="text-[10px] text-text-muted">
                      {totalInGroup} {totalInGroup === 1 ? (locale === 'es' ? 'tarea' : 'task') : (locale === 'es' ? 'tareas' : 'tasks')}
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
                          placeholderToRealStaff={placeholderToRealStaff}
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
          <p className="text-sm text-text-muted text-center py-6">{locale === 'es' ? 'Aún no hay tareas' : 'No tasks yet'}</p>
        )}
      </div>
      )}

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
          <DialogTitle>{locale === 'es' ? 'Eliminar tarea' : 'Delete Task'}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-text-secondary">
            {locale === 'es' ? 'Eliminar' : 'Delete'} <strong>{deleteConfirm?.sop ? (locale === 'es' ? deleteConfirm.sop.name_es : deleteConfirm.sop.name_en) : ''}</strong>?
            {' '}{locale === 'es' ? 'Se moverá a la biblioteca como borrador.' : 'It will be moved to the library as a draft.'}
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>{locale === 'es' ? 'Cancelar' : 'Cancel'}</Button>
          <Button variant="danger" onClick={() => confirmDelete(true)}>{locale === 'es' ? 'Eliminar' : 'Remove'}</Button>
        </DialogFooter>
      </Dialog>

      {/* Reset Tasks Confirmation */}
      <Dialog open={resetConfirmOpen} onClose={() => setResetConfirmOpen(false)}>
        <DialogHeader>
          <DialogTitle>{locale === 'es' ? 'Reiniciar tareas' : 'Reset All Tasks'}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-text-secondary">
            {locale === 'es'
              ? 'Esto eliminará todas las tareas completadas de los turnos activos de hoy y las regenerará desde las SOPs actuales. Esta acción no se puede deshacer.'
              : 'This will delete all task completions for today\'s active shifts and regenerate them from current SOPs. This cannot be undone.'}
          </p>
          {resetTasks.isError && (
            <p className="text-sm text-red mt-2 font-medium">
              {locale === 'es' ? 'Error al reiniciar tareas. Intenta de nuevo.' : 'Failed to reset tasks. Please try again.'}
            </p>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setResetConfirmOpen(false)}>
            {locale === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button
            variant="danger"
            disabled={resetTasks.isPending}
            onClick={() => {
              if (!zoneId) return
              resetTasks.mutate(zoneId, {
                onSuccess: () => setResetConfirmOpen(false),
              })
            }}
          >
            {resetTasks.isPending
              ? (locale === 'es' ? 'Reiniciando...' : 'Resetting...')
              : (locale === 'es' ? 'Reiniciar' : 'Reset Tasks')}
          </Button>
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

      {/* Step 3: Start Day button (shown before day starts, when at least 1 assigned) */}
      {!dayStarted && assignedCount > 0 && (
        <div className="pt-2 pb-4">
          <Button
            variant="primary"
            className="w-full py-3 text-base font-bold"
            onClick={() => setConfirmStartOpen(true)}
          >
            <Play className="w-5 h-5 mr-2" />
            {locale === 'es'
              ? `Comenzar el Día (${assignedCount} asignados)`
              : `Start Day (${assignedCount} assigned)`}
          </Button>
        </div>
      )}

      {/* Start Day Confirmation */}
      <Dialog open={confirmStartOpen} onClose={() => setConfirmStartOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {locale === 'es' ? 'Comenzar el Día' : 'Start the Day'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-2">
            <p className="text-sm text-brown/70">
              {locale === 'es'
                ? `Se crearán turnos y tareas para ${assignedCount} miembros del equipo:`
                : `This will create shifts and tasks for ${assignedCount} team member${assignedCount !== 1 ? 's' : ''}:`}
            </p>
            <div className="space-y-1.5 pl-2">
              {dayAssignments
                ?.filter((a) => a.staff_id && a.staff)
                .map((a) => (
                  <div key={a.id} className="flex items-center gap-2 text-sm">
                    <UserCheck className="w-3.5 h-3.5 text-success" />
                    <span className="font-medium text-brown">{a.staff!.display_name}</span>
                    <span className="text-brown/40">—</span>
                    <span className="text-brown/60">
                      {locale === 'es' ? a.role.name_es : a.role.name_en}
                    </span>
                  </div>
                ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmStartOpen(false)}>
              {locale === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button
              variant="primary"
              onClick={handleStartDay}
              disabled={startDay.isPending}
            >
              {startDay.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  {locale === 'es' ? 'Iniciando...' : 'Starting...'}
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-1" />
                  {locale === 'es' ? 'Confirmar' : 'Confirm'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Sortable Task Item ──────────────────────────────────────────────
interface SortableTaskItemProps {
  sop: SOPWithSteps
  locale: string
  allCompletions: Array<{ id: string; status: string; staff_id: string; task_template?: { sop_id?: string } }> | undefined
  placeholderToRealStaff: Map<string, string>
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
  placeholderToRealStaff,
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

  // Resolve placeholder staff ID to real person's staff ID for matching
  const realStaffId = sop.assigned_staff_id
    ? placeholderToRealStaff.get(sop.assigned_staff_id) || sop.assigned_staff_id
    : null
  const isCompleted = allCompletions?.some(
    (c) =>
      c.task_template?.sop_id === sop.id &&
      (!realStaffId || c.staff_id === realStaffId) &&
      c.status === 'completed'
  ) || false
  const sopName = locale === 'es' ? sop.name_es : sop.name_en
  const assignedName = sop.assigned_staff?.display_name
  const isAssignOpen = assignOpenId === sop.id

  return (
    <div ref={setNodeRef} style={style} className="ml-8 space-y-0">
      <div
        className={cn(
          'flex items-center gap-2 p-3 rounded-xl border transition-colors group',
          isCompleted
            ? 'bg-cream-dark border-border/50'
            : 'bg-white border-border',
          isAssignOpen && 'rounded-b-none',
          isDragging && 'shadow-lg'
        )}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="touch-none p-1 -ml-1 cursor-grab active:cursor-grabbing text-text-muted hover:text-text-muted transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {isCompleted ? (
          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
        ) : (
          <Circle className="w-5 h-5 text-text-muted flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              'text-sm block',
              isCompleted
                ? 'line-through text-text-muted'
                : 'text-text-primary font-medium'
            )}
          >
            {sopName}
          </span>
          <button
            onClick={() => setAssignOpenId(isAssignOpen ? null : sop.id)}
            className={cn(
              'inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors',
              assignedName
                ? 'bg-cream-dark border-border text-text-primary'
                : 'bg-cream border-dashed border-border text-text-muted'
            )}
          >
            <User className="w-3 h-3" />
            {assignedName || (locale === 'es' ? 'Asignar' : 'Assign')}
            <ChevronDown className={cn('w-2.5 h-2.5 transition-transform', isAssignOpen && 'rotate-180')} />
          </button>
        </div>
        {sop.is_critical && !isCompleted && (
          <span className="text-[10px] font-bold text-red uppercase">{locale === 'es' ? 'Crítico' : 'Critical'}</span>
        )}
        <button
          onClick={() => onEdit(sop)}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-cream-dark transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(sop)}
          className="p-1.5 rounded-lg text-text-muted hover:text-red hover:bg-red/5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inline assignment picker */}
      {isAssignOpen && (
        <div className="px-3 pb-3 pt-2 bg-white border border-t-0 border-border rounded-b-xl">
          <p className="text-[10px] font-semibold text-text-secondary uppercase mb-2">{locale === 'es' ? 'Asignar a' : 'Assign to'}</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { assignStaff.mutate({ id: sop.id, assigned_staff_id: null }); setAssignOpenId(null) }}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                !sop.assigned_staff_id
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-text-secondary border-border hover:border-border'
              )}
            >
              {locale === 'es' ? 'Sin asignar' : 'Unassigned'}
            </button>
            {zoneStaff?.filter((s) => s.is_active).map((s) => (
              <button
                key={s.id}
                onClick={() => { assignStaff.mutate({ id: sop.id, assigned_staff_id: s.id }); setAssignOpenId(null) }}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                  sop.assigned_staff_id === s.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-text-secondary border-border hover:border-border'
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
