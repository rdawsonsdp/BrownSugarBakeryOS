'use client'

import { useState } from 'react'
import { Search, Plus, Edit2, Settings, Trash2, EyeOff, User, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useSOPs } from '@/lib/hooks/use-sops'
import { useZones } from '@/lib/hooks/use-zones'
import { useZoneStaff } from '@/lib/hooks/use-staff'
import { useCategories } from '@/lib/hooks/use-categories'
import { useDeleteSOP, useToggleSOPActive, useAssignSOPStaff } from '@/lib/hooks/use-sop-mutations'
import { useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SOPEditor } from '@/components/sop/sop-editor'
import { DeleteSOPDialog } from '@/components/sop/delete-sop-dialog'
import { CategoriesManager } from './categories-manager'
import { cn } from '@/lib/utils/cn'
import type { SOPWithSteps, Category } from '@/lib/types/database.types'

export function TasksTab() {
  const t = useTranslations('sop')
  const { locale } = useLocaleStore()
  const zone = useAuthStore((s) => s.zone)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedZone, setSelectedZone] = useState<string>(zone?.id || '')
  const { data: sops, isLoading } = useSOPs(selectedZone || undefined)
  const { data: zones } = useZones()
  const { data: zoneStaff } = useZoneStaff(selectedZone || zone?.id)

  const { data: categories = [] } = useCategories()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSOP, setEditingSOP] = useState<SOPWithSteps | undefined>(undefined)
  const [categoriesManagerOpen, setCategoriesManagerOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SOPWithSteps | null>(null)

  const deleteSOP = useDeleteSOP()
  const toggleActive = useToggleSOPActive()
  const assignStaff = useAssignSOPStaff()

  const filteredSOPs = sops?.filter((sop) => {
    if (!search) return true
    const name = locale === 'es' ? sop.name_es : sop.name_en
    return name.toLowerCase().includes(search.toLowerCase())
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

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteSOP.mutate(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  // Show SOP editor full-screen
  if (editorOpen) {
    return (
      <SOPEditor
        sop={editingSOP}
        zoneId={zone?.id ?? ''}
        onSave={handleSave}
        onCancel={() => { setEditorOpen(false); setEditingSOP(undefined) }}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  // Find zone name for display
  const getZoneName = (zoneId: string) => {
    const z = zones?.find((z) => z.id === zoneId)
    if (!z) return ''
    return locale === 'es' ? z.name_es : z.name_en
  }

  const getZoneColor = (zoneId: string) => {
    return zones?.find((z) => z.id === zoneId)?.color
  }

  return (
    <div className="space-y-4 p-4">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-brown/60 uppercase tracking-wider">
          {t('currentTasks')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setCategoriesManagerOpen(true)}
            className="p-2 rounded-lg text-brown/40 hover:text-brown hover:bg-brown/5 transition-colors"
            title="Manage Categories"
          >
            <Settings className="w-4 h-4" />
          </button>
          <Button variant="secondary" size="sm" onClick={handleCreateNew} className="gap-1">
            <Plus className="w-4 h-4" /> {t('editor.title')}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown/30" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('title')}
          className="pl-10"
        />
      </div>

      {/* Zone filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedZone('')}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
            !selectedZone ? 'bg-brown text-cream' : 'bg-brown/5 text-brown/60'
          )}
        >
          {t('allZones')}
        </button>
        {zones?.map((z) => (
          <button
            key={z.id}
            onClick={() => setSelectedZone(z.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              selectedZone === z.id ? 'text-white' : 'bg-brown/5 text-brown/60'
            )}
            style={selectedZone === z.id ? { backgroundColor: z.color } : undefined}
          >
            {locale === 'es' ? z.name_es : z.name_en}
          </button>
        ))}
      </div>

      {/* SOP List */}
      <div className="space-y-3">
        {filteredSOPs?.map((sop) => (
          <SOPCard
            key={sop.id}
            sop={sop}
            categories={categories}
            zoneName={getZoneName(sop.zone_id)}
            zoneColor={getZoneColor(sop.zone_id)}
            staffList={zoneStaff || []}
            onEdit={() => handleEdit(sop)}
            onDelete={() => setDeleteTarget(sop)}
            onDeactivate={() => toggleActive.mutate({ id: sop.id, is_active: false })}
            onAssign={(staffId) => assignStaff.mutate({ id: sop.id, assigned_staff_id: staffId })}
          />
        ))}
        {filteredSOPs?.length === 0 && (
          <p className="text-sm text-brown/40 text-center py-6">No SOPs found</p>
        )}
      </div>

      <CategoriesManager open={categoriesManagerOpen} onClose={() => setCategoriesManagerOpen(false)} />

      <DeleteSOPDialog
        open={!!deleteTarget}
        sopName={deleteTarget ? (locale === 'es' ? deleteTarget.name_es : deleteTarget.name_en) : ''}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

interface StaffOption {
  id: string
  display_name: string
  role_id: string
  is_active: boolean
}

function SOPCard({
  sop,
  categories,
  zoneName,
  zoneColor,
  staffList,
  onEdit,
  onDelete,
  onDeactivate,
  onAssign,
}: {
  sop: SOPWithSteps
  categories: Category[]
  zoneName: string
  zoneColor?: string
  staffList: StaffOption[]
  onEdit: () => void
  onDelete: () => void
  onDeactivate: () => void
  onAssign: (staffId: string | null) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const { locale } = useLocaleStore()
  const t = useTranslations('sop')
  const te = useTranslations('sop.editor')
  const tl = useTranslations('sop.library')
  const name = locale === 'es' ? sop.name_es : sop.name_en
  const description = locale === 'es' ? sop.description_es : sop.description_en

  const categoryLabel = (() => {
    const match = categories.find((c) => c.slug === sop.category)
    if (match) return locale === 'es' ? match.name_es : match.name_en
    return sop.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  })()

  const assignedName = sop.assigned_staff?.display_name

  return (
    <Card variant="default" className="overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm flex-1">{name}</CardTitle>
            {sop.is_critical && (
              <Badge variant="critical" className="text-[10px]">{t('critical')}</Badge>
            )}
            <Badge variant="default" className="text-[10px] capitalize">
              {categoryLabel}
            </Badge>
          </div>

          {/* Zone + Assigned person row */}
          <div className="flex items-center gap-2 mt-1.5">
            {zoneName && (
              <span
                className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                style={{ backgroundColor: zoneColor || '#4A2C1A' }}
              >
                {zoneName}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); setAssignOpen(!assignOpen) }}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors',
                assignedName
                  ? 'bg-brown/5 border-brown/20 text-brown'
                  : 'bg-cream border-dashed border-brown/20 text-brown/40'
              )}
            >
              <User className="w-3 h-3" />
              {assignedName || 'Assign Role'}
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
          </div>

          {description && <p className="text-xs text-brown/50 mt-1">{description}</p>}
          {/* Day-of-week schedule badges */}
          <div className="flex items-center gap-1 mt-1.5">
            {sop.days_of_week && sop.days_of_week.length > 0 ? (
              DAY_KEYS.map((key, i) => (
                <span
                  key={i}
                  className={cn(
                    'w-5 h-5 rounded-full text-[9px] font-semibold flex items-center justify-center',
                    sop.days_of_week!.includes(i)
                      ? 'bg-brown/10 text-brown'
                      : 'text-brown/15'
                  )}
                >
                  {te(key)}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-brown/30">{te('everyDay')}</span>
            )}
          </div>
        </CardHeader>
      </button>

      {/* Inline assignment picker */}
      {assignOpen && (
        <div className="px-4 pb-3 border-t border-brown/5 pt-2">
          <p className="text-[10px] font-semibold text-brown/50 uppercase mb-2">Assign to</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { onAssign(null); setAssignOpen(false) }}
              className={cn(
                'px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                !sop.assigned_staff_id
                  ? 'bg-brown text-cream border-brown'
                  : 'bg-white text-brown/60 border-brown/15 hover:border-brown/30'
              )}
            >
              Unassigned
            </button>
            {staffList.filter((s) => s.is_active).map((s) => (
              <button
                key={s.id}
                onClick={() => { onAssign(s.id); setAssignOpen(false) }}
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

      {expanded && sop.sop_steps && (
        <CardContent className="pt-2">
          <div className="space-y-2 border-t border-brown/5 pt-3">
            {sop.sop_steps.map((step) => (
              <div key={step.id} className="flex gap-2 text-sm">
                <span className="w-5 h-5 rounded-full bg-brown/10 flex items-center justify-center text-xs font-bold text-brown/50 flex-shrink-0">
                  {step.step_number}
                </span>
                <div>
                  <p className="font-medium text-brown text-xs">
                    {locale === 'es' ? step.title_es : step.title_en}
                  </p>
                  <p className="text-xs text-brown/40">
                    {locale === 'es' ? step.description_es : step.description_en}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="gap-1 text-brown/50"
            >
              <Edit2 className="w-3.5 h-3.5" /> {t('editor.title')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDeactivate() }}
              className="gap-1 text-brown/40"
            >
              <EyeOff className="w-3.5 h-3.5" /> {tl('deactivate')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="gap-1 text-red/60"
            >
              <Trash2 className="w-3.5 h-3.5" /> {tl('delete')}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
