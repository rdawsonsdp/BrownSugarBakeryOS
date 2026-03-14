'use client'

import { useState, useMemo } from 'react'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useZoneRoles } from '@/lib/hooks/use-zones'
import { useZoneStaff } from '@/lib/hooks/use-staff'
import {
  useDayAssignments,
  useUpsertAssignment,
  useClearAssignment,
} from '@/lib/hooks/use-day-assignments'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'
import {
  Sun,
  UserPlus,
  UserCheck,
  X,
  ChevronDown,
} from 'lucide-react'

interface AssignmentPlannerProps {
  zoneId: string
}

export function AssignmentPlanner({ zoneId }: AssignmentPlannerProps) {
  const { locale } = useLocaleStore()
  const staff = useAuthStore((s) => s.staff)
  const { data: zoneRoles, isLoading: rolesLoading } = useZoneRoles(zoneId)
  const { data: zoneStaff, isLoading: staffLoading } = useZoneStaff(zoneId)
  const { data: assignments, isLoading: assignmentsLoading } = useDayAssignments(zoneId)
  const upsertAssignment = useUpsertAssignment()
  const clearAssignment = useClearAssignment()
  const [openRoleId, setOpenRoleId] = useState<string | null>(null)

  // Non-manager roles only (these are the assignable slots)
  const assignableRoles = useMemo(() => {
    if (!zoneRoles) return []
    return zoneRoles
      .filter((r: { is_manager: boolean }) => !r.is_manager)
      .sort((a: { sort_order: number }, b: { sort_order: number }) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  }, [zoneRoles])

  // Non-manager staff only (managers don't get assigned to staff roles)
  const assignableStaff = useMemo(() => {
    if (!zoneStaff) return []
    return zoneStaff.filter((s) => !s.role?.is_manager)
  }, [zoneStaff])

  // Map role_id -> assignment
  const assignmentByRole = useMemo(() => {
    const map = new Map<string, NonNullable<typeof assignments>[number]>()
    if (assignments) {
      for (const a of assignments) {
        map.set(a.role_id, a)
      }
    }
    return map
  }, [assignments])

  // Staff already assigned to a role (so they're not shown in other dropdowns)
  const assignedStaffIds = useMemo(() => {
    const set = new Set<string>()
    if (assignments) {
      for (const a of assignments) {
        if (a.staff_id) set.add(a.staff_id)
      }
    }
    return set
  }, [assignments])

  const handleAssign = (roleId: string, staffId: string) => {
    if (!staff) return
    upsertAssignment.mutate({
      zone_id: zoneId,
      role_id: roleId,
      staff_id: staffId,
      assigned_by: staff.id,
    })
    setOpenRoleId(null)
  }

  const handleClear = (assignmentId: string) => {
    clearAssignment.mutate({ id: assignmentId, zoneId })
  }

  const isLoading = rolesLoading || staffLoading || assignmentsLoading

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center">
          <Sun className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-brown">
            {locale === 'es' ? 'Asignar Roles' : 'Assign Roles'}
          </h2>
          <p className="text-xs text-brown/50">
            {locale === 'es'
              ? 'Asigna personal a los roles para hoy'
              : 'Assign staff to roles for today'}
          </p>
        </div>
      </div>

      {/* Role slots */}
      <div className="space-y-2">
        {assignableRoles.map((role: { id: string; name_en: string; name_es: string; sort_order: number }) => {
          const assignment = assignmentByRole.get(role.id)
          const assignedStaff = assignment?.staff
          const roleName = locale === 'es' ? role.name_es : role.name_en
          const isOpen = openRoleId === role.id

          // Available staff for this dropdown (not already assigned, unless to this role)
          const available = assignableStaff.filter(
            (s) => !assignedStaffIds.has(s.id) || assignment?.staff_id === s.id
          )

          return (
            <Card key={role.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-3 p-3">
                  {/* Role label */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-brown">{roleName}</span>
                  </div>

                  {/* Assignment control */}
                  {assignedStaff ? (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 bg-success/10 text-success px-2.5 py-1.5 rounded-lg">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold">{assignedStaff.display_name}</span>
                      </div>
                      <button
                        onClick={() => handleClear(assignment.id)}
                        className="p-1 rounded-md text-brown/30 hover:text-red hover:bg-red/5 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setOpenRoleId(isOpen ? null : role.id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 border-dashed text-xs font-medium transition-colors',
                        isOpen
                          ? 'border-gold bg-gold/5 text-gold'
                          : 'border-brown/15 text-brown/40 hover:border-gold/40 hover:text-brown/60'
                      )}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      {locale === 'es' ? 'Asignar' : 'Assign'}
                      <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
                    </button>
                  )}
                </div>

                {/* Staff picker dropdown */}
                {isOpen && (
                  <div className="border-t border-brown/5 bg-cream/50 p-2">
                    {available.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        {available.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleAssign(role.id, s.id)}
                            className="flex items-center gap-2 p-2 rounded-lg bg-white border border-brown/10 hover:border-gold/30 hover:shadow-sm transition-all text-left"
                          >
                            <div className="w-7 h-7 rounded-full bg-gold/10 flex items-center justify-center text-[10px] font-bold text-gold flex-shrink-0">
                              {s.first_name?.[0]}{s.last_name?.[0]}
                            </div>
                            <span className="text-xs font-medium text-brown truncate">
                              {s.display_name}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-brown/40 text-center py-2">
                        {locale === 'es' ? 'Todos asignados' : 'All staff assigned'}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
