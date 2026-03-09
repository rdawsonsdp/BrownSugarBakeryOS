'use client'

import { useTranslations } from 'next-intl'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DeleteSOPDialogProps {
  open: boolean
  sopName: string
  onConfirm: () => void
  onClose: () => void
}

export function DeleteSOPDialog({ open, sopName, onConfirm, onClose }: DeleteSOPDialogProps) {
  const t = useTranslations('sop.library')

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{t('delete')}</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <p className="text-sm text-brown/70">
          {t('deleteConfirm', { name: sopName })}
        </p>
      </DialogContent>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          {t('keepEditing')}
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {t('delete')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
