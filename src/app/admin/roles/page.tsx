'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'
import { Plus, Edit2, Trash2, ArrowLeft, Shield, ClipboardList, MapPin, ChevronDown } from 'lucide-react'
import { useRoleSopAssignments, useAddRoleSopAssignment, useRemoveRoleSopAssignment } from '@/lib/hooks/use-role-sop-assignments'
import { useSOPs } from '@/lib/hooks/use-sops'

interface RoleFormData {
  id?: string
  name_en: string
  name_es: string
  slug: string
  is_manager: boolean
  zone_id: string | null
  sort_order: number
}

interface RoleWithZone {
  id: string
  name_en: string
  name_es: string
  slug: string
  is_manager: boolean
  zone_id: string | null
  sort_order: number | null
  zone: { id: string; name_en: string; name_es: string; slug: string; color: string } | null
}

interface Zone {
  id: string
  name_en: string
  name_es: string
  slug: string
  color: string
  is_active: boolean
}

const emptyForm: RoleFormData = {
  name_en: '',
  name_es: '',
  slug: '',
  is_manager: false,
  zone_id: null,
  sort_order: 10,
}

export default function AdminRolesPage() {
  const router = useRouter()
  const { locale } = useLocaleStore()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<RoleFormData>(emptyForm)
  const [deleteConfirm, setDeleteConfirm] = useState<RoleWithZone | null>(null)

  // Fetch roles
  const { data: roles, isLoading: rolesLoading } = useQuery<RoleWithZone[]>({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const res = await fetch('/api/roles')
      if (!res.ok) throw new Error('Failed to fetch roles')
      return res.json()
    },
  })

  // Fetch zones
  const { data: zones } = useQuery<Zone[]>({
    queryKey: ['zones'],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('zones')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
      return data ?? []
    },
  })

  // Save role mutation
  const saveRole = useMutation({
    mutationFn: async (data: RoleFormData) => {
      const method = data.id ? 'PUT' : 'POST'
      const res = await fetch('/api/roles', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save role')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
      queryClient.invalidateQueries({ queryKey: ['all-roles'] })
      queryClient.invalidateQueries({ queryKey: ['all-roles-with-zones'] })
      setDialogOpen(false)
      setForm(emptyForm)
    },
  })

  // Delete role mutation
  const deleteRole = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/roles?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete role')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] })
      queryClient.invalidateQueries({ queryKey: ['all-roles'] })
      queryClient.invalidateQueries({ queryKey: ['all-roles-with-zones'] })
      setDeleteConfirm(null)
    },
  })

  const handleEdit = (role: RoleWithZone) => {
    setForm({
      id: role.id,
      name_en: role.name_en,
      name_es: role.name_es,
      slug: role.slug,
      is_manager: role.is_manager,
      zone_id: role.zone_id,
      sort_order: role.sort_order ?? 10,
    })
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveRole.mutate(form)
  }

  // Auto-generate slug from name
  const autoSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

  // Group roles by zone
  const grouped = new Map<string, { zone: RoleWithZone['zone']; roles: RoleWithZone[] }>()
  const unassigned: RoleWithZone[] = []

  for (const role of roles ?? []) {
    if (!role.zone) {
      unassigned.push(role)
      continue
    }
    const key = role.zone.id
    if (!grouped.has(key)) {
      grouped.set(key, { zone: role.zone, roles: [] })
    }
    grouped.get(key)!.roles.push(role)
  }

  const zoneGroups = Array.from(grouped.values())

  return (
    <div className="min-h-dvh bg-cream">
      {/* Header */}
      <div className="bg-brown text-white px-4 pt-4 pb-5 safe-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-bold">Roles & Zones</h1>
          </div>
          <Button variant="gold" size="sm" onClick={handleCreate} className="gap-1">
            <Plus className="w-4 h-4" /> Add Role
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {rolesLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Roles grouped by zone */}
            {zoneGroups.map(({ zone, roles: zoneRoles }) => (
              <div key={zone!.id}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone!.color }} />
                  <h2 className="text-xs font-semibold text-brown/50 uppercase tracking-wider">
                    {locale === 'es' ? zone!.name_es : zone!.name_en}
                  </h2>
                </div>
                <div className="space-y-2">
                  {zoneRoles.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      locale={locale}
                      onEdit={() => handleEdit(role)}
                      onDelete={() => setDeleteConfirm(role)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Unassigned roles */}
            {unassigned.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-3 h-3 text-brown/30" />
                  <h2 className="text-xs font-semibold text-brown/30 uppercase tracking-wider">
                    No Zone Assigned
                  </h2>
                </div>
                <div className="space-y-2">
                  {unassigned.map((role) => (
                    <RoleCard
                      key={role.id}
                      role={role}
                      locale={locale}
                      onEdit={() => handleEdit(role)}
                      onDelete={() => setDeleteConfirm(role)}
                      unassigned
                    />
                  ))}
                </div>
              </div>
            )}

            {(!roles || roles.length === 0) && (
              <p className="text-center text-brown/40 text-sm py-8">
                No roles yet. Click &quot;Add Role&quot; to create one.
              </p>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Role Dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setForm(emptyForm) }}>
        <DialogHeader>
          <DialogTitle>{form.id ? 'Edit Role' : 'New Role'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <div className="space-y-4">
              {/* Name EN */}
              <div>
                <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">
                  Name (English)
                </label>
                <input
                  type="text"
                  value={form.name_en}
                  onChange={(e) => setForm((f) => ({
                    ...f,
                    name_en: e.target.value,
                    slug: f.id ? f.slug : autoSlug(e.target.value),
                  }))}
                  className="w-full px-3 py-2 rounded-lg border border-brown/20 bg-white text-brown text-sm focus:border-brown focus:outline-none"
                  placeholder="e.g. Cashier 1"
                  required
                />
              </div>

              {/* Name ES */}
              <div>
                <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">
                  Name (Spanish)
                </label>
                <input
                  type="text"
                  value={form.name_es}
                  onChange={(e) => setForm((f) => ({ ...f, name_es: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-brown/20 bg-white text-brown text-sm focus:border-brown focus:outline-none"
                  placeholder="e.g. Cajero 1"
                  required
                />
              </div>

              {/* Zone */}
              <div>
                <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">
                  Assigned Zone
                </label>
                <select
                  value={form.zone_id || ''}
                  onChange={(e) => setForm((f) => ({ ...f, zone_id: e.target.value || null }))}
                  className="w-full px-3 py-2 rounded-lg border border-brown/20 bg-white text-brown text-sm focus:border-brown focus:outline-none"
                >
                  <option value="">— No Zone —</option>
                  {zones?.map((z) => (
                    <option key={z.id} value={z.id}>
                      {locale === 'es' ? z.name_es : z.name_en}
                    </option>
                  ))}
                </select>
              </div>

              {/* Is Manager + Sort Order row */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">
                    Type
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, is_manager: false }))}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                        !form.is_manager
                          ? 'bg-brown text-cream border-brown'
                          : 'bg-white text-brown/60 border-brown/20'
                      )}
                    >
                      Staff
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, is_manager: true }))}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                        form.is_manager
                          ? 'bg-gold text-white border-gold'
                          : 'bg-white text-brown/60 border-brown/20'
                      )}
                    >
                      Manager
                    </button>
                  </div>
                </div>
                <div className="w-24">
                  <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">
                    Order
                  </label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-lg border border-brown/20 bg-white text-brown text-sm focus:border-brown focus:outline-none"
                    min={0}
                  />
                </div>
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); setForm(emptyForm) }}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveRole.isPending || !form.name_en || !form.name_es}>
              {saveRole.isPending ? 'Saving...' : form.id ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogHeader>
          <DialogTitle>Delete Role</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-brown/70">
            Are you sure you want to delete <strong>{deleteConfirm?.name_en}</strong>?
            This cannot be undone.
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button
            variant="danger"
            onClick={() => deleteConfirm && deleteRole.mutate(deleteConfirm.id)}
            disabled={deleteRole.isPending}
          >
            Delete
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

function RoleCard({
  role,
  locale,
  onEdit,
  onDelete,
  unassigned,
}: {
  role: RoleWithZone
  locale: string
  onEdit: () => void
  onDelete: () => void
  unassigned?: boolean
}) {
  const [showTasks, setShowTasks] = useState(false)
  const roleName = locale === 'es' ? role.name_es : role.name_en
  const Icon = role.is_manager ? Shield : ClipboardList

  return (
    <div
      className={cn(
        'rounded-xl border bg-white transition-colors overflow-hidden',
        unassigned ? 'border-dashed border-brown/10' : 'border-brown/10'
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
            role.is_manager ? 'bg-gold/10' : 'bg-brown/5'
          )}
        >
          <Icon className={cn('w-4 h-4', role.is_manager ? 'text-gold' : 'text-brown/40')} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-bold text-brown block">{roleName}</span>
          <span className="text-[10px] text-brown/40">
            {role.is_manager ? 'Manager' : 'Staff'}
            {role.sort_order != null && ` · #${role.sort_order}`}
          </span>
        </div>
        {role.zone_id && (
          <button
            onClick={() => setShowTasks(!showTasks)}
            className={cn(
              'px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1',
              showTasks ? 'bg-brown/10 text-brown' : 'bg-brown/5 text-brown/40 hover:text-brown/60'
            )}
          >
            Tasks
            <ChevronDown className={cn('w-3 h-3 transition-transform', showTasks && 'rotate-180')} />
          </button>
        )}
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-brown/20 hover:text-brown hover:bg-brown/5 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-brown/20 hover:text-red hover:bg-red/5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {showTasks && role.zone_id && (
        <RoleTaskAssignment roleId={role.id} zoneId={role.zone_id} locale={locale} />
      )}
    </div>
  )
}

function RoleTaskAssignment({ roleId, zoneId, locale }: { roleId: string; zoneId: string; locale: string }) {
  const { data: sops, isLoading: sopsLoading } = useSOPs(zoneId)
  const { data: assignments } = useRoleSopAssignments(roleId)
  const addAssignment = useAddRoleSopAssignment()
  const removeAssignment = useRemoveRoleSopAssignment()

  const assignedIds = new Set(
    (assignments ?? []).filter((a) => a.is_active).map((a) => a.sop_id)
  )

  const handleToggle = (sopId: string) => {
    if (assignedIds.has(sopId)) {
      removeAssignment.mutate({ role_id: roleId, sop_id: sopId })
    } else {
      addAssignment.mutate({ role_id: roleId, sop_id: sopId })
    }
  }

  if (sopsLoading) {
    return <div className="px-3 pb-3"><Skeleton className="h-12 w-full" /></div>
  }

  if (!sops || sops.length === 0) {
    return (
      <p className="px-3 pb-3 text-xs text-brown/30">No SOPs in this zone</p>
    )
  }

  return (
    <div className="px-3 pb-3 border-t border-brown/5 pt-2 space-y-1">
      <p className="text-[10px] font-semibold text-brown/40 uppercase tracking-wider mb-1.5">
        Assigned SOPs
      </p>
      {sops.map((sop) => {
        const isOn = assignedIds.has(sop.id)
        const name = locale === 'es' ? sop.name_es : sop.name_en
        return (
          <button
            key={sop.id}
            onClick={() => handleToggle(sop.id)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-brown/5 transition-colors text-left"
          >
            <div
              className={cn(
                'w-8 h-4 rounded-full relative transition-colors flex-shrink-0',
                isOn ? 'bg-success' : 'bg-brown/15'
              )}
            >
              <div
                className={cn(
                  'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform',
                  isOn ? 'translate-x-4' : 'translate-x-0.5'
                )}
              />
            </div>
            <span className={cn('text-xs', isOn ? 'font-medium text-brown' : 'text-brown/40')}>
              {name}
            </span>
            {sop.is_critical && (
              <span className="text-[9px] font-bold text-red uppercase ml-auto">Critical</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
