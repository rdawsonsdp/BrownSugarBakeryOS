'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus } from 'lucide-react'
import { useActiveShifts } from '@/lib/hooks/use-shift'
import { useZoneStaff, useCreateStaff, useUpdateStaff, useDeactivateStaff, useReactivateStaff } from '@/lib/hooks/use-staff'
import { useAuthStore } from '@/lib/stores/auth-store'
import { StaffRow } from './staff-row'
import { AddStaffDialog } from './add-staff-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getChicagoDate } from '@/lib/utils/timezone'
import { formatRelative } from '@/lib/utils/format'

interface StaffFormData {
  id?: string
  first_name: string
  last_name: string
  display_name: string
  role_id: string
  preferred_language: 'en' | 'es'
  pin?: string
}

export function TeamTab() {
  const t = useTranslations('manager')
  const ts = useTranslations('manager.staff')
  const zone = useAuthStore((s) => s.zone)

  const { data: activeShifts } = useActiveShifts(zone?.id)
  const { data: allStaff, isLoading } = useZoneStaff(zone?.id)
  const createStaff = useCreateStaff()
  const updateStaff = useUpdateStaff()
  const deactivateStaff = useDeactivateStaff()
  const reactivateStaff = useReactivateStaff()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffFormData | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'deactivate' | 'reactivate' | 'delete'; id: string; name: string } | null>(null)

  // Fetch roles (global, not zone-specific)
  const { data: roles } = useQuery({
    queryKey: ['all-roles'],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('roles')
        .select('*')
        .order('sort_order')
        .order('name_en')
      return data ?? []
    },
  })

  // Fetch completion stats per staff
  const { data: staffStats } = useQuery({
    queryKey: ['staff-stats'],
    queryFn: async () => {
      const supabase = createClient()
      const today = getChicagoDate()

      const { data: completions } = await supabase
        .from('task_completions')
        .select('staff_id, status')
        .gte('created_at', `${today}T00:00:00`)

      const stats: Record<string, { total: number; completed: number; overdue: number }> = {}

      completions?.forEach((c) => {
        if (!stats[c.staff_id]) {
          stats[c.staff_id] = { total: 0, completed: 0, overdue: 0 }
        }
        stats[c.staff_id].total++
        if (c.status === 'completed') stats[c.staff_id].completed++
      })

      return stats
    },
  })

  // Build a set of currently active staff IDs
  const activeStaffIds = new Set(activeShifts?.map((s) => s.staff_id) ?? [])
  const activeShiftByStaff = new Map(activeShifts?.map((s) => [s.staff_id, s]) ?? [])

  const handleSave = async (data: StaffFormData) => {
    if (data.id) {
      await updateStaff.mutateAsync({ ...data, id: data.id })
    } else {
      await createStaff.mutateAsync({
        first_name: data.first_name,
        last_name: data.last_name,
        display_name: data.display_name,
        pin: data.pin!,
        role_id: data.role_id,
        zone_id: zone!.id,
        preferred_language: data.preferred_language,
      })
    }
    setDialogOpen(false)
    setEditingStaff(null)
  }

  const handleDeactivate = async () => {
    if (confirmDialog?.id) {
      await deactivateStaff.mutateAsync(confirmDialog.id)
      setConfirmDialog(null)
    }
  }

  const handleReactivate = async () => {
    if (confirmDialog?.id) {
      await reactivateStaff.mutateAsync(confirmDialog.id)
      setConfirmDialog(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-brown/60 uppercase tracking-wider">
          {t('myTeam')}
        </h2>
        <Button variant="secondary" size="sm" onClick={() => { setEditingStaff(null); setDialogOpen(true) }} className="gap-1">
          <Plus className="w-4 h-4" /> {ts('addStaffOrRole')}
        </Button>
      </div>

      {allStaff && allStaff.length > 0 ? (
        allStaff.map((member) => {
          const stats = staffStats?.[member.id]
          const percent = stats
            ? stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100)
            : 0
          const shift = activeShiftByStaff.get(member.id)

          return (
            <StaffRow
              key={member.id}
              id={member.id}
              name={member.display_name}
              completionPercent={percent}
              streak={member.streak_count}
              lastActive={shift ? formatRelative(shift.started_at) : undefined}
              overdueCount={stats?.overdue || 0}
              roleName={member.role?.is_manager ? ts('roleManager') : ts('roleStaff')}
              isActive={member.is_active}
              onEdit={() => {
                setEditingStaff({
                  id: member.id,
                  first_name: member.first_name,
                  last_name: member.last_name,
                  display_name: member.display_name,
                  role_id: member.role_id,
                  preferred_language: member.preferred_language,
                })
                setDialogOpen(true)
              }}
              onDelete={() => setConfirmDialog({ type: 'delete', id: member.id, name: member.display_name })}
              onDeactivate={() => setConfirmDialog({ type: 'deactivate', id: member.id, name: member.display_name })}
              onReactivate={() => setConfirmDialog({ type: 'reactivate', id: member.id, name: member.display_name })}
            />
          )
        })
      ) : (
        <p className="text-sm text-brown/40 text-center py-6">
          {ts('noStaff')}
        </p>
      )}

      {/* Add/Edit dialog */}
      <AddStaffDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingStaff(null) }}
        onSave={handleSave}
        staff={editingStaff}
        roles={roles ?? []}
        isLoading={createStaff.isPending || updateStaff.isPending}
      />

      {/* Deactivate/Reactivate confirmation */}
      <Dialog open={!!confirmDialog} onClose={() => setConfirmDialog(null)}>
        <DialogHeader>
          <DialogTitle>
            {confirmDialog?.type === 'delete' ? ts('deleteTitle')
              : confirmDialog?.type === 'deactivate' ? ts('deactivate')
              : ts('reactivate')}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-brown/70">
            {confirmDialog?.type === 'delete'
              ? ts('deleteConfirm', { name: confirmDialog.name })
              : confirmDialog?.type === 'deactivate'
              ? ts('deactivateConfirm', { name: confirmDialog.name })
              : ts('reactivateConfirm', { name: confirmDialog?.name ?? '' })
            }
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setConfirmDialog(null)}>
            {t('cancel' as 'overview')}
          </Button>
          {confirmDialog?.type === 'delete' ? (
            <Button variant="danger" onClick={handleDeactivate} disabled={deactivateStaff.isPending}>
              {ts('deleteTitle')}
            </Button>
          ) : confirmDialog?.type === 'deactivate' ? (
            <Button variant="danger" onClick={handleDeactivate} disabled={deactivateStaff.isPending}>
              {ts('deactivate')}
            </Button>
          ) : (
            <Button variant="primary" onClick={handleReactivate} disabled={reactivateStaff.isPending}>
              {ts('reactivate')}
            </Button>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  )
}
