'use client'
import { useState, useCallback, useRef } from 'react'
import { ChevronDown, StickyNote } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { cn } from '@/lib/utils/cn'

interface ShiftNotesProps {
  shiftId: string
  previousNotes?: string | null
  currentNotes?: string
  onSave: (notes: string) => void
}

export function ShiftNotes({ shiftId, previousNotes, currentNotes = '', onSave }: ShiftNotesProps) {
  const { locale } = useLocaleStore()
  const [expanded, setExpanded] = useState(!!previousNotes)
  const [notes, setNotes] = useState(currentNotes)
  const debounceRef = useRef<NodeJS.Timeout>(undefined)

  const handleChange = useCallback((value: string) => {
    setNotes(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => onSave(value), 2000)
  }, [onSave])

  const handleBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    onSave(notes)
  }, [notes, onSave])

  return (
    <div className="rounded-2xl border border-brown/10 bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <StickyNote className="w-4 h-4 text-brown/40" />
        <span className="flex-1 text-sm font-semibold text-brown">
          {locale === 'es' ? 'Notas del Turno' : 'Shift Notes'}
        </span>
        {previousNotes && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold font-medium">
            {locale === 'es' ? 'Notas previas' : 'Previous notes'}
          </span>
        )}
        <ChevronDown className={cn('w-4 h-4 text-brown/30 transition-transform', expanded && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {previousNotes && (
                <div className="bg-gold/5 rounded-xl p-3 border border-gold/10">
                  <p className="text-[10px] font-bold text-gold uppercase tracking-wider mb-1">
                    {locale === 'es' ? 'Del turno anterior' : 'From previous shift'}
                  </p>
                  <p className="text-sm text-brown/70 whitespace-pre-wrap">{previousNotes}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-bold text-brown/40 uppercase tracking-wider mb-1">
                  {locale === 'es' ? 'Tus notas' : 'Your notes'}
                </p>
                <textarea
                  value={notes}
                  onChange={(e) => handleChange(e.target.value)}
                  onBlur={handleBlur}
                  placeholder={locale === 'es' ? 'Notas para el siguiente turno...' : 'Notes for the next shift...'}
                  className="w-full px-3 py-2 rounded-xl border border-brown/10 bg-cream text-sm text-brown placeholder:text-brown/30 resize-none focus:border-brown/30 focus:outline-none"
                  rows={3}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
