'use client'

import { useState } from 'react'
import { GripVertical, Trash2, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/lib/hooks/use-categories'
import type { Category } from '@/lib/types/database.types'

interface CategoriesManagerProps {
  open: boolean
  onClose: () => void
}

interface EditableCategory {
  id: string
  name_en: string
  name_es: string
  sort_order: number
  isNew?: boolean
}

export function CategoriesManager({ open, onClose }: CategoriesManagerProps) {
  const t = useTranslations('common')
  const { locale } = useLocaleStore()
  const { data: categories = [] } = useCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [items, setItems] = useState<EditableCategory[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)

  // Sync items from server data when opening
  const syncFromServer = () => {
    setItems(categories.map((c) => ({
      id: c.id,
      name_en: c.name_en,
      name_es: c.name_es,
      sort_order: c.sort_order,
    })))
    setDirty(false)
  }

  // Reset on open
  if (open && items.length === 0 && categories.length > 0) {
    syncFromServer()
  }

  const handleClose = () => {
    setItems([])
    setDirty(false)
    setDeleteConfirm(null)
    onClose()
  }

  const updateField = (index: number, field: 'name_en' | 'name_es', value: string) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
    setDirty(true)
  }

  const addCategory = () => {
    const tempId = `new_${Date.now()}`
    setItems((prev) => [...prev, {
      id: tempId,
      name_en: '',
      name_es: '',
      sort_order: prev.length,
      isNew: true,
    }])
    setDirty(true)
  }

  const removeCategory = (id: string) => {
    const item = items.find((i) => i.id === id)
    if (!item) return

    if (item.isNew) {
      setItems((prev) => prev.filter((i) => i.id !== id))
    } else {
      setDeleteConfirm(id)
    }
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    await deleteCategory.mutateAsync(deleteConfirm)
    setItems((prev) => prev.filter((i) => i.id !== deleteConfirm))
    setDeleteConfirm(null)
  }

  // Drag-to-reorder
  const handleDragStart = (index: number) => {
    setDragIdx(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === index) return
    setItems((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(index, 0, moved)
      return next
    })
    setDragIdx(index)
    setDirty(true)
  }

  const handleDragEnd = () => {
    setDragIdx(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.isNew) {
          if (item.name_en.trim()) {
            await createCategory.mutateAsync({
              name_en: item.name_en.trim(),
              name_es: item.name_es.trim() || item.name_en.trim(),
            })
          }
        } else {
          const original = categories.find((c) => c.id === item.id)
          if (original && (original.name_en !== item.name_en || original.name_es !== item.name_es || original.sort_order !== i)) {
            await updateCategory.mutateAsync({
              id: item.id,
              name_en: item.name_en,
              name_es: item.name_es,
              sort_order: i,
            })
          }
        }
      }
      setDirty(false)
      handleClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onClose={handleClose}>
        <DialogHeader>
          <DialogTitle>
            {locale === 'es' ? 'Administrar Categorías' : 'Manage Categories'}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg border border-brown/10 bg-white',
                  dragIdx === index && 'opacity-50'
                )}
              >
                <GripVertical className="w-4 h-4 text-brown/20 cursor-grab flex-shrink-0" />
                <Input
                  value={item.name_en}
                  onChange={(e) => updateField(index, 'name_en', e.target.value)}
                  placeholder="English"
                  className="h-8 text-sm flex-1"
                />
                <Input
                  value={item.name_es}
                  onChange={(e) => updateField(index, 'name_es', e.target.value)}
                  placeholder="Español"
                  className="h-8 text-sm flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeCategory(item.id)}
                  className="p-1.5 rounded text-brown/30 hover:text-red hover:bg-red/5 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={addCategory} className="w-full mt-3 gap-1">
            <Plus className="w-4 h-4" /> {t('add')}
          </Button>
        </DialogContent>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>{t('cancel')}</Button>
          <Button variant="primary" onClick={handleSave} disabled={!dirty || saving}>
            {saving ? '...' : t('save')}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogHeader>
          <DialogTitle>{t('confirm')}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <p className="text-sm text-brown/70">
            {locale === 'es'
              ? '¿Estás seguro de que quieres eliminar esta categoría? Las SOPs que la usan mantendrán su valor actual.'
              : 'Are you sure you want to remove this category? SOPs using it will keep their current category value.'}
          </p>
        </DialogContent>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>{t('cancel')}</Button>
          <Button variant="primary" onClick={confirmDelete} className="bg-red hover:bg-red/90">
            {t('delete')}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  )
}
