'use client'

import { AlertTriangle } from 'lucide-react'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface IncompleteTasksDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  incompleteCount: number
  totalCount: number
}

export function IncompleteTasksDialog({
  open,
  onClose,
  onConfirm,
  incompleteCount,
  totalCount,
}: IncompleteTasksDialogProps) {
  const { locale } = useLocaleStore()

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <DialogTitle>
            {locale === 'es' ? 'Tareas incompletas' : 'Incomplete Tasks'}
          </DialogTitle>
        </div>
      </DialogHeader>
      <DialogContent>
        <p className="text-sm text-brown/70">
          {locale === 'es'
            ? `Tienes ${incompleteCount} de ${totalCount} tareas sin completar. ¿Estás seguro de que quieres cerrar sesión?`
            : `You have ${incompleteCount} of ${totalCount} tasks still incomplete. Are you sure you want to sign out?`}
        </p>
      </DialogContent>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          {locale === 'es' ? 'Volver' : 'Go Back'}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {locale === 'es' ? 'Cerrar sesión' : 'Sign Out'}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
