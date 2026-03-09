'use client'
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Undo2, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ToastProps {
  message: string
  undoLabel?: string
  onUndo: () => void
  onDismiss: () => void
  duration?: number // ms, default 5000
  visible: boolean
}

export function UndoToast({ message, undoLabel = 'Undo', onUndo, onDismiss, duration = 5000, visible }: ToastProps) {
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [visible, duration, onDismiss])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="fixed bottom-24 left-4 right-4 z-50 max-w-lg mx-auto"
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-brown text-cream shadow-lg">
            <span className="flex-1 text-sm font-medium">{message}</span>
            <button
              onClick={onUndo}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/20 text-sm font-bold hover:bg-white/30 transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
              {undoLabel}
            </button>
            <button onClick={onDismiss} className="p-1 text-cream/60 hover:text-cream">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
