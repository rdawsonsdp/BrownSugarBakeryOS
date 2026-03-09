'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, GripVertical, Trash2, Camera, AlertTriangle, Type, Mic, ImageIcon, ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog, DialogHeader, DialogTitle, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils/cn'
import { VoiceInput } from './voice-input'
import { PhotoInput } from './photo-input'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { useCategories, useCreateCategory } from '@/lib/hooks/use-categories'
import type { SOPWithSteps } from '@/lib/types/database.types'

interface SOPEditorProps {
  sop?: SOPWithSteps
  zoneId: string
  onSave: (data: Record<string, unknown>) => void
  onCancel: () => void
}

interface StepDraft {
  id?: string
  title_en: string
  title_es: string
  description_en: string
  description_es: string
  requires_photo: boolean
  estimated_minutes: number | null
}

type InputMode = 'text' | 'voice' | 'photo'

export function SOPEditor({ sop, zoneId, onSave, onCancel }: SOPEditorProps) {
  const t = useTranslations('sop.editor')
  const [nameEn, setNameEn] = useState(sop?.name_en || '')
  const [nameEs, setNameEs] = useState(sop?.name_es || '')
  const [descEn, setDescEn] = useState(sop?.description_en || '')
  const [descEs, setDescEs] = useState(sop?.description_es || '')
  const [category, setCategory] = useState(sop?.category || 'opening')
  const [isCritical, setIsCritical] = useState(sop?.is_critical || false)
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>(sop?.days_of_week ?? [])
  const [steps, setSteps] = useState<StepDraft[]>(
    sop?.sop_steps?.map((s) => ({
      id: s.id,
      title_en: s.title_en,
      title_es: s.title_es,
      description_en: s.description_en || '',
      description_es: s.description_es || '',
      requires_photo: s.requires_photo,
      estimated_minutes: s.estimated_minutes,
    })) || []
  )

  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [categorySearch, setCategorySearch] = useState('')
  const categoryRef = useRef<HTMLDivElement>(null)
  const zone = useAuthStore((s) => s.zone)
  const { locale } = useLocaleStore()
  const { data: categories = [] } = useCategories()
  const createCategory = useCreateCategory()

  const addStep = () => {
    setSteps([...steps, {
      title_en: '', title_es: '', description_en: '', description_es: '',
      requires_photo: false, estimated_minutes: null,
    }])
  }

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const updateStep = (index: number, field: keyof StepDraft, value: unknown) => {
    setSteps(steps.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  const handleSave = (status: 'draft' | 'published') => {
    onSave({
      id: sop?.id,
      name_en: nameEn,
      name_es: nameEs,
      description_en: descEn || null,
      description_es: descEs || null,
      category,
      zone_id: zoneId,
      is_critical: isCritical,
      days_of_week: daysOfWeek.length > 0 ? daysOfWeek : null,
      status,
      steps: steps.map((s) => ({
        title_en: s.title_en,
        title_es: s.title_es,
        description_en: s.description_en || null,
        description_es: s.description_es || null,
        requires_photo: s.requires_photo,
        estimated_minutes: s.estimated_minutes,
      })),
    })
  }

  // Handle voice transcript — append to field value
  const appendToField = useCallback((setter: React.Dispatch<React.SetStateAction<string>>) => {
    return (text: string) => {
      setter((prev) => prev ? `${prev} ${text}` : text)
    }
  }, [])

  const appendToStep = useCallback((index: number, field: 'title_en' | 'title_es' | 'description_en' | 'description_es') => {
    return (text: string) => {
      setSteps((prev) => prev.map((s, i) =>
        i === index ? { ...s, [field]: s[field] ? `${s[field]} ${text}` : text } : s
      ))
    }
  }, [])

  // Build field options for photo OCR assignment
  const buildFieldOptions = () => {
    const options: { key: string; label: string }[] = [
      { key: 'nameEn', label: t('photoFieldNameEn') },
      { key: 'nameEs', label: t('photoFieldNameEs') },
      { key: 'descEn', label: t('photoFieldDescEn') },
      { key: 'descEs', label: t('photoFieldDescEs') },
    ]
    steps.forEach((_, i) => {
      options.push(
        { key: `step_${i}_title_en`, label: t('photoFieldStepTitle', { number: i + 1 }) + ' (EN)' },
        { key: `step_${i}_title_es`, label: t('photoFieldStepTitle', { number: i + 1 }) + ' (ES)' },
        { key: `step_${i}_desc_en`, label: t('photoFieldStepDesc', { number: i + 1 }) + ' (EN)' },
        { key: `step_${i}_desc_es`, label: t('photoFieldStepDesc', { number: i + 1 }) + ' (ES)' },
      )
    })
    return options
  }

  // Handle photo text assignment to a specific field
  const handlePhotoText = (text: string, fieldKey: string) => {
    if (fieldKey === 'nameEn') setNameEn((prev) => prev ? `${prev} ${text}` : text)
    else if (fieldKey === 'nameEs') setNameEs((prev) => prev ? `${prev} ${text}` : text)
    else if (fieldKey === 'descEn') setDescEn((prev) => prev ? `${prev} ${text}` : text)
    else if (fieldKey === 'descEs') setDescEs((prev) => prev ? `${prev} ${text}` : text)
    else if (fieldKey.startsWith('step_')) {
      const parts = fieldKey.split('_')
      const idx = parseInt(parts[1])
      const fieldMap: Record<string, keyof StepDraft> = {
        title_en: 'title_en', title_es: 'title_es',
        desc_en: 'description_en', desc_es: 'description_es',
      }
      const mapKey = `${parts[2]}_${parts[3]}`
      const stepField = fieldMap[mapKey]
      if (stepField) {
        setSteps((prev) => prev.map((s, i) =>
          i === idx ? { ...s, [stepField]: s[stepField as keyof StepDraft] ? `${s[stepField as keyof StepDraft]} ${text}` : text } : s
        ))
      }
    }
  }

  // Close combo-box on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false)
        setCategorySearch('')
      }
    }
    if (categoryOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [categoryOpen])

  const filteredCategories = categories.filter((c) => {
    if (!categorySearch) return true
    const name = locale === 'es' ? c.name_es : c.name_en
    return name.toLowerCase().includes(categorySearch.toLowerCase())
  })

  const selectedCategoryLabel = (() => {
    const match = categories.find((c) => c.slug === category)
    if (match) return locale === 'es' ? match.name_es : match.name_en
    return category
  })()

  const handleCreateCategory = async () => {
    if (!categorySearch.trim()) return
    const result = await createCategory.mutateAsync({ name_en: categorySearch.trim(), name_es: categorySearch.trim() })
    setCategory(result.slug)
    setCategorySearch('')
    setCategoryOpen(false)
  }

  return (
    <div className="space-y-6 p-4 pb-24">
      <h2 className="text-xl font-bold text-brown">{t('title')}</h2>

      {/* Input mode selector */}
      <div className="flex gap-1 bg-brown/5 rounded-xl p-1">
        <button
          onClick={() => setInputMode('text')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
            inputMode === 'text'
              ? 'bg-white text-brown shadow-sm'
              : 'text-brown/40 hover:text-brown/60'
          )}
        >
          <Type className="w-4 h-4" />
          {t('modeText')}
        </button>
        <button
          onClick={() => setInputMode('voice')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
            inputMode === 'voice'
              ? 'bg-brown-light text-cream shadow-sm'
              : 'text-brown-light/60 hover:text-brown-light'
          )}
        >
          <Mic className="w-4 h-4" />
          {t('modeVoice')}
        </button>
        <button
          onClick={() => setInputMode('photo')}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
            inputMode === 'photo'
              ? 'bg-info text-white shadow-sm'
              : 'text-info/60 hover:text-info'
          )}
        >
          <ImageIcon className="w-4 h-4" />
          {t('modePhoto')}
        </button>
      </div>

      {/* Standard form fields */}
      <>

      {/* Bilingual name fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-brown/60 mb-1 block">{t('nameEn')}</label>
          <div className="flex gap-1.5">
            <Input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="flex-1" />
            {inputMode === 'voice' && (
              <VoiceInput lang="en-US" onTranscript={appendToField(setNameEn)} />
            )}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-brown/60 mb-1 block">{t('nameEs')}</label>
          <div className="flex gap-1.5">
            <Input value={nameEs} onChange={(e) => setNameEs(e.target.value)} className="flex-1" />
            {inputMode === 'voice' && (
              <VoiceInput lang="es-ES" onTranscript={appendToField(setNameEs)} />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-brown/60 mb-1 block">{t('descriptionEn')}</label>
          <div className="flex gap-1.5">
            <Input value={descEn} onChange={(e) => setDescEn(e.target.value)} className="flex-1" />
            {inputMode === 'voice' && (
              <VoiceInput lang="en-US" onTranscript={appendToField(setDescEn)} />
            )}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-brown/60 mb-1 block">{t('descriptionEs')}</label>
          <div className="flex gap-1.5">
            <Input value={descEs} onChange={(e) => setDescEs(e.target.value)} className="flex-1" />
            {inputMode === 'voice' && (
              <VoiceInput lang="es-ES" onTranscript={appendToField(setDescEs)} />
            )}
          </div>
        </div>
      </div>

      {/* Photo mode button */}
      {inputMode === 'photo' && (
        <Button
          variant="secondary"
          onClick={() => setPhotoDialogOpen(true)}
          className="w-full gap-2"
        >
          <ImageIcon className="w-4 h-4" /> {t('modePhoto')} — {t('photoCapture')} / {t('photoUpload')}
        </Button>
      )}

      {/* Category and flags */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 relative" ref={categoryRef}>
          <label className="text-xs font-medium text-brown/60 mb-1 block">{t('category')}</label>
          <button
            type="button"
            onClick={() => setCategoryOpen(!categoryOpen)}
            className="w-full h-11 rounded-xl border border-brown/20 bg-white px-4 text-brown text-left flex items-center justify-between"
          >
            <span>{selectedCategoryLabel}</span>
            <ChevronDown className={cn('w-4 h-4 text-brown/40 transition-transform', categoryOpen && 'rotate-180')} />
          </button>
          {categoryOpen && (
            <div className="absolute z-20 top-full mt-1 w-full bg-white border border-brown/20 rounded-xl shadow-lg overflow-hidden">
              <div className="p-2 border-b border-brown/10">
                <Input
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder={locale === 'es' ? 'Buscar o crear...' : 'Search or create...'}
                  className="h-9 text-sm"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCategory(c.slug)
                      setCategoryOpen(false)
                      setCategorySearch('')
                    }}
                    className={cn(
                      'w-full px-4 py-2.5 text-left text-sm flex items-center justify-between hover:bg-brown/5',
                      category === c.slug && 'bg-brown/5 font-medium'
                    )}
                  >
                    <span>{locale === 'es' ? c.name_es : c.name_en}</span>
                    {category === c.slug && <Check className="w-4 h-4 text-brown" />}
                  </button>
                ))}
                {categorySearch.trim() && filteredCategories.length === 0 && (
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="w-full px-4 py-2.5 text-left text-sm text-brown/60 hover:bg-brown/5 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {locale === 'es' ? 'Crear' : 'Create'} &ldquo;{categorySearch.trim()}&rdquo;
                  </button>
                )}
                {categorySearch.trim() && filteredCategories.length > 0 && !filteredCategories.some(c => (locale === 'es' ? c.name_es : c.name_en).toLowerCase() === categorySearch.trim().toLowerCase()) && (
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    className="w-full px-4 py-2.5 text-left text-sm text-brown/60 hover:bg-brown/5 flex items-center gap-2 border-t border-brown/10"
                  >
                    <Plus className="w-4 h-4" />
                    {locale === 'es' ? 'Crear' : 'Create'} &ldquo;{categorySearch.trim()}&rdquo;
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setIsCritical(!isCritical)}
          className={cn(
            'h-11 px-4 rounded-xl border flex items-center gap-2 text-sm font-medium transition-colors',
            isCritical ? 'bg-red/10 border-red/30 text-red' : 'bg-white border-brown/20 text-brown/40'
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          Critical
        </button>
      </div>

      {/* Day-of-week schedule */}
      <div>
        <label className="text-xs font-medium text-brown/60 mb-2 block">{t('schedule')}</label>
        <div className="flex gap-1.5">
          {([
            { day: 0, key: 'sun' },
            { day: 1, key: 'mon' },
            { day: 2, key: 'tue' },
            { day: 3, key: 'wed' },
            { day: 4, key: 'thu' },
            { day: 5, key: 'fri' },
            { day: 6, key: 'sat' },
          ] as const).map(({ day, key }) => {
            const active = daysOfWeek.includes(day)
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  const next = active
                    ? daysOfWeek.filter((d) => d !== day)
                    : [...daysOfWeek, day]
                  // If all 7 selected, reset to empty (= every day)
                  setDaysOfWeek(next.length === 7 ? [] : next)
                }}
                className={cn(
                  'w-9 h-9 rounded-full text-xs font-semibold transition-colors',
                  active
                    ? 'bg-brown text-cream'
                    : 'bg-brown/5 text-brown/30 border border-brown/10'
                )}
              >
                {t(key)}
              </button>
            )
          })}
        </div>
        {daysOfWeek.length === 0 && (
          <p className="text-[10px] text-brown/40 mt-1">{t('everyDay')}</p>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-brown/60 uppercase tracking-wider">Steps</h3>
        {steps.map((step, index) => (
          <Card key={index} variant="flat" className="p-3">
            <div className="flex items-start gap-2">
              <GripVertical className="w-4 h-4 text-brown/20 mt-3 flex-shrink-0 cursor-grab" />
              <div className="flex-1 space-y-2">
                <div className="flex gap-2">
                  <span className="w-6 h-6 rounded-full bg-brown/10 flex items-center justify-center text-xs font-bold text-brown/50 flex-shrink-0 mt-1">
                    {index + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-1.5">
                      <Input
                        value={step.title_en}
                        onChange={(e) => updateStep(index, 'title_en', e.target.value)}
                        placeholder="Step title (EN)"
                        className="text-sm h-9 flex-1"
                      />
                      {inputMode === 'voice' && (
                        <VoiceInput lang="en-US" onTranscript={appendToStep(index, 'title_en')} />
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <Input
                        value={step.title_es}
                        onChange={(e) => updateStep(index, 'title_es', e.target.value)}
                        placeholder="Título del paso (ES)"
                        className="text-sm h-9 flex-1"
                      />
                      {inputMode === 'voice' && (
                        <VoiceInput lang="es-ES" onTranscript={appendToStep(index, 'title_es')} />
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 ml-8">
                  <div className="flex gap-1.5">
                    <Input
                      value={step.description_en}
                      onChange={(e) => updateStep(index, 'description_en', e.target.value)}
                      placeholder="Description (EN)"
                      className="text-xs h-8 flex-1"
                    />
                    {inputMode === 'voice' && (
                      <VoiceInput lang="en-US" onTranscript={appendToStep(index, 'description_en')} className="w-8 h-8" />
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      value={step.description_es}
                      onChange={(e) => updateStep(index, 'description_es', e.target.value)}
                      placeholder="Descripción (ES)"
                      className="text-xs h-8 flex-1"
                    />
                    {inputMode === 'voice' && (
                      <VoiceInput lang="es-ES" onTranscript={appendToStep(index, 'description_es')} className="w-8 h-8" />
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-8">
                  <button
                    onClick={() => updateStep(index, 'requires_photo', !step.requires_photo)}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded text-xs',
                      step.requires_photo ? 'bg-gold/10 text-gold' : 'bg-brown/5 text-brown/40'
                    )}
                  >
                    <Camera className="w-3 h-3" /> Photo
                  </button>
                  <button
                    onClick={() => removeStep(index)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red/60 hover:bg-red/5"
                  >
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        <Button variant="secondary" size="sm" onClick={addStep} className="w-full">
          <Plus className="w-4 h-4" /> {t('addStep')}
        </Button>
      </div>

      </>

      {/* Action buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-brown/10 px-4 pt-4 pb-16 flex gap-3">
        <Button variant="ghost" onClick={onCancel} className="flex-1">{t('saveDraft')}</Button>
        <Button variant="secondary" onClick={() => handleSave('draft')} className="flex-1">{t('saveDraft')}</Button>
        <Button variant="primary" onClick={() => handleSave('published')} className="flex-1">{t('publish')}</Button>
      </div>

      {/* Photo OCR dialog */}
      <Dialog open={photoDialogOpen} onClose={() => setPhotoDialogOpen(false)}>
        <DialogHeader>
          <DialogTitle>{t('modePhoto')}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <PhotoInput
            lang="eng"
            onTextExtracted={(text, fieldKey) => {
              handlePhotoText(text, fieldKey)
              setPhotoDialogOpen(false)
            }}
            onClose={() => setPhotoDialogOpen(false)}
            fieldOptions={buildFieldOptions()}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
