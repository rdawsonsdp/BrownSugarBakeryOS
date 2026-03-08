'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Camera, CheckCircle2, AlertTriangle, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import type { TaskCompletionWithTemplate, SOPWithSteps } from '@/lib/types/database.types'

interface TaskCardProps {
  completion: TaskCompletionWithTemplate
  isExpanded: boolean
  onToggle: () => void
  onComplete: (id: string) => void
  onPhoto: (id: string) => void
  sop?: SOPWithSteps | null
}

export function TaskCard({ completion, isExpanded, onToggle, onComplete, onPhoto, sop }: TaskCardProps) {
  const t = useTranslations('dashboard')
  const { locale } = useLocaleStore()
  const template = completion.task_template
  const name = locale === 'es' ? template.name_es : template.name_en
  const description = locale === 'es' ? template.description_es : template.description_en
  const isCompleted = completion.status === 'completed'

  return (
    <motion.div
      layout
      className={cn(
        'rounded-2xl border overflow-hidden transition-colors',
        isCompleted
          ? 'bg-success/5 border-success/20'
          : template.is_critical
          ? 'bg-red/5 border-red/20'
          : 'bg-white border-brown/10'
      )}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left touch-target"
      >
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isCompleted ? 'bg-success/20 text-success' : 'bg-brown/10 text-brown/40'
        )}>
          {isCompleted ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            <span className="text-sm font-bold">{template.priority}</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('font-semibold text-sm', isCompleted && 'line-through text-brown/40')}>
              {name}
            </span>
            {template.is_critical && !isCompleted && (
              <Badge variant="critical" className="text-[10px] px-1.5 py-0">
                <AlertTriangle className="w-3 h-3 mr-0.5" />
                {t('critical')}
              </Badge>
            )}
          </div>
          {description && (
            <p className="text-xs text-brown/50 truncate mt-0.5">{description}</p>
          )}
        </div>

        {template.estimated_minutes && !isCompleted && (
          <span className="text-xs text-brown/40 flex items-center gap-1 flex-shrink-0">
            <Clock className="w-3 h-3" />
            {template.estimated_minutes}m
          </span>
        )}

        <ChevronDown className={cn(
          'w-4 h-4 text-brown/30 transition-transform flex-shrink-0',
          isExpanded && 'rotate-180'
        )} />
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* SOP Steps */}
              {sop && sop.sop_steps && sop.sop_steps.length > 0 && (
                <div className="bg-cream rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-brown/60 uppercase tracking-wider">{t('viewSOP')}</p>
                  {sop.sop_steps.map((step) => (
                    <div key={step.id} className="flex gap-2 text-sm">
                      <span className="w-5 h-5 rounded-full bg-brown/10 flex items-center justify-center text-xs font-bold text-brown/50 flex-shrink-0 mt-0.5">
                        {step.step_number}
                      </span>
                      <div>
                        <p className="font-medium text-brown">
                          {locale === 'es' ? step.title_es : step.title_en}
                        </p>
                        {(locale === 'es' ? step.description_es : step.description_en) && (
                          <p className="text-xs text-brown/50 mt-0.5">
                            {locale === 'es' ? step.description_es : step.description_en}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              {!isCompleted && (
                <div className="flex gap-2">
                  {template.requires_photo && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onPhoto(completion.id)}
                      className="flex-1"
                    >
                      <Camera className="w-4 h-4" />
                      {t('takePhoto')}
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onComplete(completion.id)}
                    className="flex-1"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {t('markComplete')}
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
