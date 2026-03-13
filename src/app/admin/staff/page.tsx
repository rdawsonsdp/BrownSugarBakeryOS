'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Button } from '@/components/ui/button'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils/cn'
import {
  Plus, Edit2, ArrowLeft, Search, UserX, UserCheck, Users, Shield, ClipboardList,
} from 'lucide-react'

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  display_name: string
  role_id: string
  zone_id: string
  preferred_language: 'en' | 'es'
  streak_count: number
  is_active: boolean
  phone: string | null
  email: string | null
  role: {
    id: string
    name_en: string
    name_es: string
    slug: string
    is_manager: boolean
    zone_id: string
  } | null
}

interface Role {
  id: string
  name_en: string
  name_es: string
  slug: string
  is_manager: boolean
  zone_id: string | null
}

interface Zone {
  id: string
  name_en: string
  name_es: string
  slug: string
  color: string
}

interface StaffFormData {
  id?: string
  first_name: string
  last_name: string
  display_name: string
  phone: string
  email: string
  pin: string
  confirmPin: string
  role_id: string
  zone_id: string
  preferred_language: 'en' | 'es'
}

const emptyForm: StaffFormData = {
  first_name: '',
  last_name: '',
  display_name: '',
  phone: '',
  email: '',
  pin: '',
  confirmPin: '',
  role_id: '',
  zone_id: '',
  preferred_language: 'en',
}

export default function AdminStaffPage() {
  const router = useRouter()
  const { locale } = useLocaleStore()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<StaffFormData>(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmAction, setConfirmAction] = useState<{ type: 'deactivate' | 'reactivate'; staff: StaffMember } | null>(null)
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)

  // Fetch all staff
  const { data: allStaff, isLoading: staffLoading } = useQuery<StaffMember[]>({
    queryKey: ['admin-all-staff'],
    queryFn: async () => {
      const res = await fetch('/api/staff')
      if (!res.ok) throw new Error('Failed to fetch staff')
      return res.json()
    },
  })

  // Fetch roles for form dropdown
  const { data: roles } = useQuery<Role[]>({
    queryKey: ['admin-roles-list'],
    queryFn: async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .order('sort_order')
        .order('name_en')
      return data ?? []
    },
  })

  // Fetch zones for form dropdown
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

  // Save staff mutation
  const saveStaff = useMutation({
    mutationFn: async (data: StaffFormData) => {
      const method = data.id ? 'PUT' : 'POST'
      const payload: Record<string, unknown> = {
        first_name: data.first_name,
        last_name: data.last_name || '-',
        display_name: data.display_name || `${data.first_name} ${(data.last_name || '').charAt(0)}.`.trim(),
        role_id: data.role_id,
        zone_id: data.zone_id,
        preferred_language: data.preferred_language,
        phone: data.phone || null,
        email: data.email || null,
      }
      if (data.id) payload.id = data.id
      if (data.pin) payload.pin = data.pin

      const res = await fetch('/api/staff', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save staff')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-staff'] })
      queryClient.invalidateQueries({ queryKey: ['all-active-staff'] })
      queryClient.invalidateQueries({ queryKey: ['zone-staff'] })
      setDialogOpen(false)
      setForm(emptyForm)
      setErrors({})
    },
  })

  // Deactivate/reactivate mutation
  const toggleActive = useMutation({
    mutationFn: async ({ id, activate }: { id: string; activate: boolean }) => {
      if (activate) {
        const res = await fetch('/api/staff', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, is_active: true }),
        })
        if (!res.ok) throw new Error('Failed')
        return res.json()
      } else {
        const res = await fetch(`/api/staff?id=${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error('Failed')
        return res.json()
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-staff'] })
      queryClient.invalidateQueries({ queryKey: ['all-active-staff'] })
      queryClient.invalidateQueries({ queryKey: ['zone-staff'] })
      setConfirmAction(null)
    },
  })

  // Filter staff
  const filteredStaff = useMemo(() => {
    if (!allStaff) return []
    let list = allStaff
    if (!showInactive) list = list.filter((s) => s.is_active)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (s) =>
          s.display_name.toLowerCase().includes(q) ||
          s.first_name.toLowerCase().includes(q) ||
          s.last_name.toLowerCase().includes(q)
      )
    }
    return list
  }, [allStaff, search, showInactive])

  const activeCount = allStaff?.filter((s) => s.is_active).length ?? 0
  const inactiveCount = allStaff?.filter((s) => !s.is_active).length ?? 0

  // Roles filtered by selected zone
  const rolesForZone = useMemo(() => {
    if (!roles || !form.zone_id) return roles ?? []
    return roles.filter((r) => r.zone_id === form.zone_id)
  }, [roles, form.zone_id])

  const handleEdit = (staff: StaffMember) => {
    setForm({
      id: staff.id,
      first_name: staff.first_name,
      last_name: staff.last_name === '-' ? '' : staff.last_name,
      display_name: staff.display_name,
      phone: staff.phone || '',
      email: staff.email || '',
      pin: '',
      confirmPin: '',
      role_id: staff.role_id,
      zone_id: staff.zone_id,
      preferred_language: staff.preferred_language,
    })
    setErrors({})
    setDialogOpen(true)
  }

  const handleCreate = () => {
    setForm(emptyForm)
    setErrors({})
    setDialogOpen(true)
  }

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!form.first_name.trim()) e.first_name = 'First name is required'
    if (!form.zone_id) e.zone_id = 'Zone is required'
    if (!form.role_id) e.role_id = 'Role is required'
    if (!form.id && !form.pin) e.pin = 'PIN is required for new staff'
    if (form.pin && !/^\d{4}$/.test(form.pin)) e.pin = 'PIN must be exactly 4 digits'
    if (form.pin && form.pin !== form.confirmPin) e.confirmPin = 'PINs do not match'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!validate()) return
    saveStaff.mutate(form)
  }

  // Auto-generate display name
  const updateName = (field: 'first_name' | 'last_name', value: string) => {
    setForm((f) => {
      const updated = { ...f, [field]: value }
      if (!f.id) {
        const fn = field === 'first_name' ? value : f.first_name
        const ln = field === 'last_name' ? value : f.last_name
        if (fn) {
          updated.display_name = ln ? `${fn} ${ln.charAt(0)}.` : fn
        }
      }
      return updated
    })
  }

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
            <div>
              <h1 className="text-lg font-bold">
                {locale === 'es' ? 'Gestión de Personal' : 'Staff Management'}
              </h1>
              <p className="text-white/50 text-xs">
                {activeCount} {locale === 'es' ? 'activos' : 'active'}
                {inactiveCount > 0 && ` · ${inactiveCount} ${locale === 'es' ? 'inactivos' : 'inactive'}`}
              </p>
            </div>
          </div>
          <Button variant="gold" size="sm" onClick={handleCreate} className="gap-1">
            <Plus className="w-4 h-4" /> {locale === 'es' ? 'Agregar' : 'Add'}
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Search + filter bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown/30" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={locale === 'es' ? 'Buscar personal...' : 'Search staff...'}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brown/15 bg-white text-sm text-brown placeholder:text-brown/30 focus:border-brown/40 focus:outline-none"
            />
          </div>
          {inactiveCount > 0 && (
            <button
              onClick={() => setShowInactive(!showInactive)}
              className={cn(
                'px-3 py-2 rounded-xl border text-xs font-medium transition-colors whitespace-nowrap',
                showInactive
                  ? 'bg-brown/10 border-brown/20 text-brown'
                  : 'bg-white border-brown/15 text-brown/40'
              )}
            >
              {showInactive
                ? (locale === 'es' ? 'Ocultar inactivos' : 'Hide inactive')
                : (locale === 'es' ? 'Ver inactivos' : 'Show inactive')}
            </button>
          )}
        </div>

        {/* Staff List */}
        {staffLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-brown/20 mx-auto mb-3" />
            <p className="text-sm text-brown/40">
              {search
                ? (locale === 'es' ? 'No se encontraron resultados' : 'No results found')
                : (locale === 'es' ? 'No hay personal. Haz clic en "Agregar" para crear.' : 'No staff yet. Click "Add" to create one.')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStaff.map((staff) => {
              const zone = zones?.find((z) => z.id === staff.zone_id)
              const zoneName = zone ? (locale === 'es' ? zone.name_es : zone.name_en) : '—'
              const roleName = staff.role
                ? (locale === 'es' ? staff.role.name_es : staff.role.name_en)
                : '—'
              const Icon = staff.role?.is_manager ? Shield : ClipboardList

              return (
                <div
                  key={staff.id}
                  className={cn(
                    'rounded-xl border bg-white p-3 flex items-center gap-3 transition-colors',
                    staff.is_active ? 'border-brown/10' : 'border-dashed border-brown/10 opacity-50'
                  )}
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: zone?.color ? `${zone.color}20` : 'rgba(87,5,34,0.08)', color: zone?.color || '#570522' }}
                  >
                    {staff.first_name?.[0]}{staff.last_name?.[0] !== '-' ? staff.last_name?.[0] : ''}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-brown truncate">{staff.display_name}</span>
                      {!staff.is_active && (
                        <span className="text-[9px] font-bold text-red/60 bg-red/5 px-1.5 py-0.5 rounded uppercase">
                          {locale === 'es' ? 'Inactivo' : 'Inactive'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Icon className={cn('w-3 h-3', staff.role?.is_manager ? 'text-gold' : 'text-brown/30')} />
                      <span className="text-[11px] text-brown/50 truncate">
                        {roleName}
                      </span>
                      <span className="text-brown/20">·</span>
                      {zone && (
                        <span className="flex items-center gap-1 text-[11px] text-brown/50">
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: zone.color }} />
                          {zoneName}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {staff.is_active ? (
                      <button
                        onClick={() => setConfirmAction({ type: 'deactivate', staff })}
                        className="p-1.5 rounded-lg text-brown/20 hover:text-red hover:bg-red/5 transition-colors"
                        title={locale === 'es' ? 'Desactivar' : 'Deactivate'}
                      >
                        <UserX className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmAction({ type: 'reactivate', staff })}
                        className="p-1.5 rounded-lg text-brown/20 hover:text-success hover:bg-success/5 transition-colors"
                        title={locale === 'es' ? 'Reactivar' : 'Reactivate'}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(staff)}
                      className="p-1.5 rounded-lg text-brown/20 hover:text-brown hover:bg-brown/5 transition-colors"
                      title={locale === 'es' ? 'Editar' : 'Edit'}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Staff Dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setForm(emptyForm); setErrors({}) }}>
        <DialogHeader>
          <DialogTitle>
            {form.id
              ? (locale === 'es' ? 'Editar Personal' : 'Edit Staff')
              : (locale === 'es' ? 'Nuevo Personal' : 'New Staff Member')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <DialogContent className="space-y-4">
            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">
                  {locale === 'es' ? 'Nombre' : 'First Name'}
                </label>
                <Input
                  value={form.first_name}
                  onChange={(e) => updateName('first_name', e.target.value)}
                  placeholder="Maria"
                  className={errors.first_name ? 'border-red' : ''}
                />
                {errors.first_name && <p className="text-xs text-red mt-1">{errors.first_name}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">
                  {locale === 'es' ? 'Apellido' : 'Last Name'}
                </label>
                <Input
                  value={form.last_name}
                  onChange={(e) => updateName('last_name', e.target.value)}
                  placeholder="Garcia"
                />
              </div>
            </div>

            {/* Display name */}
            <div>
              <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">
                {locale === 'es' ? 'Nombre para Mostrar' : 'Display Name'}
                <span className="text-brown/30 font-normal normal-case ml-1">
                  — {locale === 'es' ? 'como aparece en la app' : 'shown in app'}
                </span>
              </label>
              <Input
                value={form.display_name}
                onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
                placeholder="Maria G."
              />
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">
                  {locale === 'es' ? 'Teléfono' : 'Phone'}
                  <span className="text-brown/30 font-normal normal-case ml-1">({locale === 'es' ? 'opcional' : 'optional'})</span>
                </label>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="(312) 555-0123"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">
                  Email
                  <span className="text-brown/30 font-normal normal-case ml-1">({locale === 'es' ? 'opcional' : 'optional'})</span>
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="maria@example.com"
                />
              </div>
            </div>

            {/* PIN */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">PIN</label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.pin}
                  onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                  placeholder={form.id ? '••••' : ''}
                  className={errors.pin ? 'border-red' : ''}
                />
                {form.id && <p className="text-[10px] text-brown/40 mt-1">{locale === 'es' ? 'Dejar vacío para mantener' : 'Leave blank to keep current'}</p>}
                {errors.pin && <p className="text-xs text-red mt-1">{errors.pin}</p>}
              </div>
              <div>
                <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">
                  {locale === 'es' ? 'Confirmar PIN' : 'Confirm PIN'}
                </label>
                <Input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.confirmPin}
                  onChange={(e) => setForm((f) => ({ ...f, confirmPin: e.target.value.replace(/\D/g, '') }))}
                  placeholder={form.id ? '••••' : ''}
                  className={errors.confirmPin ? 'border-red' : ''}
                />
                {errors.confirmPin && <p className="text-xs text-red mt-1">{errors.confirmPin}</p>}
              </div>
            </div>
            <p className="text-[10px] text-brown/40 -mt-2">
              {locale === 'es' ? 'Código numérico de 4 dígitos' : '4-digit numeric code'}
            </p>

            {/* Zone */}
            <div>
              <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">
                {locale === 'es' ? 'Zona' : 'Zone'}
              </label>
              <select
                value={form.zone_id}
                onChange={(e) => setForm((f) => ({ ...f, zone_id: e.target.value, role_id: '' }))}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border bg-white text-brown text-sm focus:border-brown focus:outline-none',
                  errors.zone_id ? 'border-red' : 'border-brown/20'
                )}
              >
                <option value="">{locale === 'es' ? '— Seleccionar zona —' : '— Select zone —'}</option>
                {zones?.map((z) => (
                  <option key={z.id} value={z.id}>
                    {locale === 'es' ? z.name_es : z.name_en}
                  </option>
                ))}
              </select>
              {errors.zone_id && <p className="text-xs text-red mt-1">{errors.zone_id}</p>}
            </div>

            {/* Role (filtered by zone) */}
            <div>
              <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">
                {locale === 'es' ? 'Rol' : 'Role'}
              </label>
              <select
                value={form.role_id}
                onChange={(e) => setForm((f) => ({ ...f, role_id: e.target.value }))}
                disabled={!form.zone_id}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border bg-white text-brown text-sm focus:border-brown focus:outline-none',
                  !form.zone_id && 'opacity-50',
                  errors.role_id ? 'border-red' : 'border-brown/20'
                )}
              >
                <option value="">{locale === 'es' ? '— Seleccionar rol —' : '— Select role —'}</option>
                {rolesForZone.map((r) => (
                  <option key={r.id} value={r.id}>
                    {locale === 'es' ? r.name_es : r.name_en}
                    {r.is_manager ? (locale === 'es' ? ' (Gerente)' : ' (Manager)') : ''}
                  </option>
                ))}
              </select>
              {errors.role_id && <p className="text-xs text-red mt-1">{errors.role_id}</p>}
              {form.zone_id && rolesForZone.length === 0 && (
                <p className="text-[10px] text-brown/40 mt-1">
                  {locale === 'es' ? 'No hay roles en esta zona. Crea uno primero.' : 'No roles in this zone. Create one first.'}
                </p>
              )}
            </div>

            {/* Language */}
            <div>
              <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">
                {locale === 'es' ? 'Idioma preferido' : 'Preferred Language'}
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, preferred_language: 'en' }))}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                    form.preferred_language === 'en'
                      ? 'bg-brown text-cream border-brown'
                      : 'bg-white text-brown/60 border-brown/20'
                  )}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, preferred_language: 'es' }))}
                  className={cn(
                    'flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                    form.preferred_language === 'es'
                      ? 'bg-brown text-cream border-brown'
                      : 'bg-white text-brown/60 border-brown/20'
                  )}
                >
                  Español
                </button>
              </div>
            </div>
          </DialogContent>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => { setDialogOpen(false); setForm(emptyForm); setErrors({}) }}>
              {locale === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={saveStaff.isPending}>
              {saveStaff.isPending
                ? '...'
                : form.id
                  ? (locale === 'es' ? 'Guardar' : 'Save')
                  : (locale === 'es' ? 'Crear' : 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Deactivate/Reactivate Confirmation */}
      <Dialog open={!!confirmAction} onClose={() => setConfirmAction(null)}>
        <DialogHeader>
          <DialogTitle>
            {confirmAction?.type === 'deactivate'
              ? (locale === 'es' ? 'Desactivar Personal' : 'Deactivate Staff')
              : (locale === 'es' ? 'Reactivar Personal' : 'Reactivate Staff')}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-brown/70">
            {confirmAction?.type === 'deactivate'
              ? (locale === 'es'
                  ? `¿Estás seguro de desactivar a ${confirmAction.staff.display_name}? Ya no podrá iniciar sesión.`
                  : `Are you sure you want to deactivate ${confirmAction?.staff.display_name}? They will no longer be able to log in.`)
              : (locale === 'es'
                  ? `¿Reactivar a ${confirmAction?.staff.display_name}? Podrá iniciar sesión de nuevo.`
                  : `Reactivate ${confirmAction?.staff.display_name}? They will be able to log in again.`)}
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>
            {locale === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          {confirmAction?.type === 'deactivate' ? (
            <Button
              variant="danger"
              onClick={() => confirmAction && toggleActive.mutate({ id: confirmAction.staff.id, activate: false })}
              disabled={toggleActive.isPending}
            >
              {locale === 'es' ? 'Desactivar' : 'Deactivate'}
            </Button>
          ) : (
            <Button
              onClick={() => confirmAction && toggleActive.mutate({ id: confirmAction.staff.id, activate: true })}
              disabled={toggleActive.isPending}
            >
              {locale === 'es' ? 'Reactivar' : 'Reactivate'}
            </Button>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  )
}
