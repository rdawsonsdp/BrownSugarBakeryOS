'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils/cn'

interface StaffFormData {
  id?: string
  first_name: string
  last_name: string
  display_name: string
  role_id: string
  preferred_language: 'en' | 'es'
}

interface AddStaffDialogProps {
  open: boolean
  onClose: () => void
  onSave: (data: StaffFormData & { pin?: string }) => void
  staff?: StaffFormData | null
  roles: { id: string; name_en: string; name_es: string; slug: string; is_manager: boolean }[]
  isLoading?: boolean
}

export function AddStaffDialog({ open, onClose, onSave, staff, roles, isLoading }: AddStaffDialogProps) {
  const t = useTranslations('manager.staff')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [roleId, setRoleId] = useState('')
  const [language, setLanguage] = useState<'en' | 'es'>('en')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const isEdit = !!staff?.id

  useEffect(() => {
    if (open) {
      if (staff) {
        setFirstName(staff.first_name)
        setLastName(staff.last_name)
        setDisplayName(staff.display_name)
        setRoleId(staff.role_id)
        setLanguage(staff.preferred_language)
      } else {
        setFirstName('')
        setLastName('')
        setDisplayName('')
        setRoleId(roles.find((r) => !r.is_manager)?.id || '')
        setLanguage('en')
      }
      setPin('')
      setConfirmPin('')
      setErrors({})
    }
  }, [open, staff, roles])

  // Auto-generate display name
  useEffect(() => {
    if (!isEdit || !staff?.display_name) {
      if (firstName && lastName) {
        setDisplayName(`${firstName} ${lastName.charAt(0)}.`)
      }
    }
  }, [firstName, lastName, isEdit, staff?.display_name])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!firstName.trim()) newErrors.firstName = t('firstNameRequired')
    if (!lastName.trim()) newErrors.lastName = t('lastNameRequired')

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
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      display_name: displayName.trim(),
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
        {/* Name fields */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-brown/60 mb-1 block">{t('firstName')}</label>
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={errors.firstName ? 'border-red' : ''}
            />
            {errors.firstName && <p className="text-xs text-red mt-1">{errors.firstName}</p>}
          </div>
          <div>
            <label className="text-xs font-medium text-brown/60 mb-1 block">{t('lastName')}</label>
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={errors.lastName ? 'border-red' : ''}
            />
            {errors.lastName && <p className="text-xs text-red mt-1">{errors.lastName}</p>}
          </div>
        </div>

        {/* Display name */}
        <div>
          <label className="text-xs font-medium text-brown/60 mb-1 block">{t('displayName')}</label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>

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
