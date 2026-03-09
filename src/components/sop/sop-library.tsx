'use client'

import { useState } from 'react'
import { Search, Plus, Edit2, Trash2, Eye, EyeOff, BookOpen } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useSOPLibrary } from '@/lib/hooks/use-sops'
import { useZones } from '@/lib/hooks/use-zones'
import { useCategories } from '@/lib/hooks/use-categories'
import { useDeleteSOP, useToggleSOPActive } from '@/lib/hooks/use-sop-mutations'
import { useQueryClient } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SOPEditor } from '@/components/sop/sop-editor'
import { DeleteSOPDialog } from '@/components/sop/delete-sop-dialog'
import { SaveForLaterDialog } from '@/components/sop/save-for-later-dialog'
import { cn } from '@/lib/utils/cn'
import type { SOPWithSteps, SOPStatus, Category } from '@/lib/types/database.types'

type StatusFilter = 'all' | SOPStatus

export function SOPLibrary() {
  const t = useTranslations('sop')
  const tl = useTranslations('sop.library')
  const { locale } = useLocaleStore()
  const zone = useAuthStore((s) => s.zone)
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [selectedZone, setSelectedZone] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showInactive, setShowInactive] = useState(false)

  const { data: sops, isLoading } = useSOPLibrary(selectedZone || undefined, showInactive)
  const { data: zones } = useZones()
  const { data: categories = [] } = useCategories()

  const deleteSOP = useDeleteSOP()
  const toggleActive = useToggleSOPActive()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingSOP, setEditingSOP] = useState<SOPWithSteps | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<SOPWithSteps | null>(null)
  const [saveForLaterData, setSaveForLaterData] = useState<Record<string, unknown> | null>(null)

  const filteredSOPs = sops?.filter((sop) => {
    if (statusFilter !== 'all' && sop.status !== statusFilter) return false
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

  const handleCancel = () => {
    setEditorOpen(false)
    setEditingSOP(undefined)
  }

  const handleCancelWithPrompt = (data: Record<string, unknown>) => {
    setSaveForLaterData(data)
  }

  const handleDelete = (sop: SOPWithSteps) => {
    setDeleteTarget(sop)
  }

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteSOP.mutate(deleteTarget.id)
      setDeleteTarget(null)
    }
  }

  const handleToggleActive = (sop: SOPWithSteps) => {
    toggleActive.mutate({ id: sop.id, is_active: !sop.is_active })
  }

  const handleActivate = (sop: SOPWithSteps) => {
    toggleActive.mutate({ id: sop.id, is_active: true })
  }

  // Show SOP editor full-screen
  if (editorOpen) {
    return (
      <SOPEditor
        sop={editingSOP}
        zoneId={zone?.id ?? ''}
        onSave={handleSave}
        onCancel={handleCancel}
        onCancelWithPrompt={handleCancelWithPrompt}
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

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: tl('all') },
    { key: 'published', label: tl('statusPublished') },
    { key: 'draft', label: tl('statusDraft') },
    { key: 'archived', label: tl('statusArchived') },
  ]

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brown/60" />
          <h2 className="text-sm font-semibold text-brown/60 uppercase tracking-wider">
            {tl('title')}
          </h2>
        </div>
        <Button variant="secondary" size="sm" onClick={handleCreateNew} className="gap-1">
          <Plus className="w-4 h-4" /> {t('editor.title')}
        </Button>
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

      {/* Status filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {statusFilters.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              statusFilter === f.key ? 'bg-brown text-cream' : 'bg-brown/5 text-brown/60'
            )}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={() => setShowInactive(!showInactive)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1',
            showInactive ? 'bg-brown/20 text-brown' : 'bg-brown/5 text-brown/40'
          )}
        >
          {showInactive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {tl('showInactive')}
        </button>
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
          <LibrarySOPCard
            key={sop.id}
            sop={sop}
            categories={categories}
            onEdit={() => handleEdit(sop)}
            onDelete={() => handleDelete(sop)}
            onToggleActive={() => handleToggleActive(sop)}
            onActivate={() => handleActivate(sop)}
          />
        ))}
        {filteredSOPs?.length === 0 && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-brown/15 mx-auto mb-3" />
            <p className="text-sm text-brown/40">{tl('empty')}</p>
          </div>
        )}
      </div>

      {/* Delete dialog */}
      <DeleteSOPDialog
        open={!!deleteTarget}
        sopName={deleteTarget ? (locale === 'es' ? deleteTarget.name_es : deleteTarget.name_en) : ''}
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
      />

      {/* Save for later dialog */}
      <SaveForLaterDialog
        open={!!saveForLaterData}
        onSaveAsDraft={() => {
          if (saveForLaterData) {
            handleSave({ ...saveForLaterData, status: 'draft' })
          }
          setSaveForLaterData(null)
        }}
        onDiscard={() => {
          setSaveForLaterData(null)
          setEditorOpen(false)
          setEditingSOP(undefined)
        }}
        onKeepEditing={() => {
          setSaveForLaterData(null)
          setEditorOpen(true)
        }}
      />
    </div>
  )
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

const statusColors: Record<SOPStatus, string> = {
  published: 'bg-success/10 text-success',
  draft: 'bg-warning/10 text-warning',
  archived: 'bg-brown/10 text-brown/50',
}

function LibrarySOPCard({
  sop,
  categories,
  onEdit,
  onDelete,
  onToggleActive,
  onActivate,
}: {
  sop: SOPWithSteps
  categories: Category[]
  onEdit: () => void
  onDelete: () => void
  onToggleActive: () => void
  onActivate: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const { locale } = useLocaleStore()
  const t = useTranslations('sop')
  const tl = useTranslations('sop.library')
  const te = useTranslations('sop.editor')
  const name = locale === 'es' ? sop.name_es : sop.name_en
  const description = locale === 'es' ? sop.description_es : sop.description_en

  const categoryLabel = (() => {
    const match = categories.find((c) => c.slug === sop.category)
    if (match) return locale === 'es' ? match.name_es : match.name_en
    return sop.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  })()

  return (
    <Card
      variant="default"
      className={cn('overflow-hidden transition-opacity', !sop.is_active && 'opacity-50')}
    >
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm flex-1">{name}</CardTitle>
            {!sop.is_active && (
              <Badge variant="default" className="text-[10px] bg-brown/5 text-brown/40">
                {tl('inactive')}
              </Badge>
            )}
            <Badge variant="default" className={cn('text-[10px] capitalize', statusColors[sop.status])}>
              {tl(`status${sop.status.charAt(0).toUpperCase() + sop.status.slice(1)}` as 'statusPublished')}
            </Badge>
            {sop.is_critical && (
              <Badge variant="critical" className="text-[10px]">{t('critical')}</Badge>
            )}
            <Badge variant="default" className="text-[10px] capitalize">
              {categoryLabel}
            </Badge>
          </div>
          {description && <p className="text-xs text-brown/50 mt-1">{description}</p>}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-brown/30">{sop.sop_steps?.length || 0} steps</span>
            {/* Day-of-week badges */}
            <div className="flex items-center gap-0.5">
              {sop.days_of_week && sop.days_of_week.length > 0 ? (
                DAY_KEYS.map((key, i) => (
                  <span
                    key={i}
                    className={cn(
                      'w-4 h-4 rounded-full text-[8px] font-semibold flex items-center justify-center',
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
          </div>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="pt-2">
          {/* Steps preview */}
          {sop.sop_steps && sop.sop_steps.length > 0 && (
            <div className="space-y-2 border-t border-brown/5 pt-3 mb-3">
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
          )}

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="gap-1 text-brown/50"
            >
              <Edit2 className="w-3.5 h-3.5" /> {t('editor.title')}
            </Button>
            {!sop.is_active ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onActivate() }}
                className="gap-1 text-success"
              >
                <Eye className="w-3.5 h-3.5" /> {tl('reactivate')}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onToggleActive() }}
                className="gap-1 text-brown/40"
              >
                <EyeOff className="w-3.5 h-3.5" /> {tl('deactivate')}
              </Button>
            )}
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
