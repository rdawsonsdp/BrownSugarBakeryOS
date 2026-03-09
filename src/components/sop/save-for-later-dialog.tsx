'use client'

import { useTranslations } from 'next-intl'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface SaveForLaterDialogProps {
  open: boolean
  onSaveAsDraft: () => void
  onDiscard: () => void
  onKeepEditing: () => void
}

export function SaveForLaterDialog({ open, onSaveAsDraft, onDiscard, onKeepEditing }: SaveForLaterDialogProps) {
  const t = useTranslations('sop.library')

  return (
    <Dialog open={open} onClose={onKeepEditing}>
      <DialogHeader>
        <DialogTitle>{t('saveForLater')}</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <p className="text-sm text-brown/70">
          {t('saveForLaterMessage')}
        </p>
      </DialogContent>
      <DialogFooter>
        <Button variant="ghost" onClick={onDiscard}>
          {t('discard')}
        </Button>
        <Button variant="secondary" onClick={onKeepEditing}>
          {t('keepEditing')}
        </Button>
        <Button variant="primary" onClick={onSaveAsDraft}>
          {t('saveAsDraft')}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
