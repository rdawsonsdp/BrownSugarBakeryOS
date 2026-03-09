'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'

interface StaffFormData {
  id?: string
  first_name?: string
  last_name?: string
  display_name?: string
  role_id: string
  preferred_language: 'en' | 'es'
}

interface AddStaffDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: StaffFormData & { pin?: string }) => void
  staff?: StaffFormData | null
  roles: { id: string; name_en: string; name_es: string; slug: string; is_manager: boolean }[]
  existingStaff?: { role_id: string; is_active: boolean }[]
  isLoading?: boolean
}

function getRoleStaffCount(roleId: string, existingStaff: { role_id: string; is_active: boolean }[]) {
  return existingStaff.filter((s) => s.role_id === roleId).length
}

export function AddStaffDialog({ open, onClose, onSave, staff, roles, existingStaff = [], isLoading }: AddStaffDialogProps) {
  const t = useTranslations('manager.staff')

  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [roleId, setRoleId] = useState('')
  const [language, setLanguage] = useState<'en' | 'es'>('en')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEdit = !!staff?.id

  useEffect(() => {
    if (open) {
      if (staff) {
        setRoleId(staff.role_id)
        setLanguage(staff.preferred_language)
      } else {
        setRoleId(roles.find((r) => !r.is_manager)?.id || '')
        setLanguage('en')
      }
      setPin('')
      setConfirmPin('')
      setErrors({})
    }
  }, [open, staff, roles])

  const selectedRole = roles.find((r) => r.id === roleId)
  const nextNumber = selectedRole
    ? getRoleStaffCount(roleId, existingStaff) + 1
    : null
  const previewName = selectedRole
    ? `${selectedRole.name_en} ${isEdit ? '' : nextNumber}`
    : ''

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!roleId) newErrors.role = t('roleRequired' as 'addStaff')

    if (!isEdit && !pin) {
      newErrors.pin = t('pinRequired')
    }
    if (pin && !/^\d{4}$/.test(pin)) {
      newErrors.pin = t('pinFormat')
    }
    if (pin && pin !== confirmPin) {
      newErrors.confirmPin = t('pinMismatch')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validate()) return

    onSave({
      id: staff?.id,
      role_id: roleId,
      preferred_language: language,
      ...(pin ? { pin } : {}),
    })
  }

  const staffRole = roles.find((r) => !r.is_manager)
  const managerRole = roles.find((r) => r.is_manager)

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>{isEdit ? t('editStaff') : t('addStaff')}</DialogTitle>
      </DialogHeader>
      <DialogContent className="space-y-4">
        {/* Role selector */}
        <div>
          <label className="text-xs font-medium text-brown/60 mb-1 block">{t('role')}</label>
          <div className="flex gap-2">
            {staffRole && (
              <button
                type="button"
                onClick={() => setRoleId(staffRole.id)}
                className={cn(
                  'flex-1 h-10 rounded-xl text-sm font-medium transition-colors border',
                  roleId === staffRole.id
                    ? 'bg-brown text-cream border-brown'
                    : 'bg-white text-brown/60 border-brown/20 hover:border-brown/40'
                )}
              >
                {t('roleStaff')}
              </button>
            )}
            {managerRole && (
              <button
                type="button"
                onClick={() => setRoleId(managerRole.id)}
                className={cn(
                  'flex-1 h-10 rounded-xl text-sm font-medium transition-colors border',
                  roleId === managerRole.id
                    ? 'bg-brown text-cream border-brown'
                    : 'bg-white text-brown/60 border-brown/20 hover:border-brown/40'
                )}
              >
                {t('roleManager')}
              </button>
            )}
          </div>
        </div>

        {/* Auto-generated name preview */}
        {!isEdit && previewName && (
          <div className="bg-cream rounded-xl p-3 border border-brown/10">
            <p className="text-xs text-brown/50 mb-1">{t('assignedName')}</p>
            <p className="text-base font-semibold text-brown">{previewName}</p>
          </div>
        )}

        {/* Current name display for edit */}
        {isEdit && staff?.display_name && (
          <div className="bg-cream rounded-xl p-3 border border-brown/10">
            <p className="text-xs text-brown/50 mb-1">{t('assignedName')}</p>
            <p className="text-base font-semibold text-brown">{staff.display_name}</p>
          </div>
        )}

        {/* PIN fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-brown/60 mb-1 block">{t('pin')}</label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder={isEdit ? '••••' : ''}
              className={errors.pin ? 'border-red' : ''}
            />
            {isEdit && <p className="text-[10px] text-brown/40 mt-1">{t('pinLeaveBlank')}</p>}
            {errors.pin && <p className="text-xs text-red mt-1">{errors.pin}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-brown/60 mb-1 block">{t('confirmPin')}</label>
            <Input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder={isEdit ? '••••' : ''}
              className={errors.confirmPin ? 'border-red' : ''}
            />
            {errors.confirmPin && <p className="text-xs text-red mt-1">{errors.confirmPin}</p>}
          </div>
        </div>
        <p className="text-[10px] text-brown/40 -mt-2">{t('pinHint')}</p>

        {/* Language preference */}
        <div>
          <label className="text-xs font-medium text-brown/60 mb-1 block">{t('language')}</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={cn(
                'flex-1 h-10 rounded-xl text-sm font-medium transition-colors border',
                language === 'en'
                  ? 'bg-brown text-cream border-brown'
                  : 'bg-white text-brown/60 border-brown/20 hover:border-brown/40'
              )}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('es')}
              className={cn(
                'flex-1 h-10 rounded-xl text-sm font-medium transition-colors border',
                language === 'es'
                  ? 'bg-brown text-cream border-brown'
                  : 'bg-white text-brown/60 border-brown/20 hover:border-brown/40'
              )}
            >
              Español
            </button>
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>{t('cancel' as 'addStaff')}</Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? '...' : (isEdit ? t('save' as 'addStaff') : t('addStaff'))}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
