'use client'

import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useZoneRoles } from '@/lib/hooks/use-zones'
import { RoleCard } from '@/components/role/role-card'
import { ZoneHeader } from '@/components/layout/zone-header'
import { Skeleton } from '@/components/ui/skeleton'
import { useEffect } from 'react'

export default function RoleSelectPage() {
  const router = useRouter()
  const params = useParams()
  const t = useTranslations('role')
  const { locale } = useLocaleStore()
  const { zone, setRole } = useAuthStore()

  const { data: roles, isLoading } = useZoneRoles(zone?.id || '')

  useEffect(() => {
    if (!zone) {
      router.push('/zone')
    }
  }, [zone, router])

  if (!zone) {
    return null
  }

  const handleRoleSelect = (role: NonNullable<typeof roles>[0]) => {
    setRole(role)
    router.push(`/zone/${params.zoneSlug}/pin`)
  }

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="min-h-dvh bg-cream"
    >
      <ZoneHeader
        zoneName_en={zone.name_en}
        zoneName_es={zone.name_es}
        zoneColor={zone.color}
        showBack
        backPath="/zone"
      />

      <div className="max-w-lg mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-brown">{t('title')}</h1>
        </motion.div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-4">
            {roles
              ?.sort((a, b) => (a.is_manager ? 1 : 0) - (b.is_manager ? 1 : 0))
              .map((role, i) => (
                <RoleCard
                  key={role.id}
                  name={locale === 'es' ? role.name_es : role.name_en}
                  description={locale === 'es' ? (role.description_es || '') : (role.description_en || '')}
                  isManager={role.is_manager}
                  zoneColor={zone.color}
                  onClick={() => handleRoleSelect(role)}
                  index={i}
                />
              ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
