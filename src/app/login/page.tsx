'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Skeleton } from '@/components/ui/skeleton'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { Shield, ClipboardList } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const { locale } = useLocaleStore()
  const { selectByName, selectByRole, logout } = useAuthStore()

  // Clear stale session on mount
  useEffect(() => {
    logout()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch all active staff
  const { data: staffList, isLoading: staffLoading } = useQuery<
    { id: string; display_name: string; first_name: string; last_name: string }[]
  >({
    queryKey: ['all-active-staff'],
    queryFn: async () => {
      const res = await fetch('/api/staff?all_active=true')
      if (!res.ok) throw new Error('Failed to fetch staff')
      return res.json()
    },
  })

  // Fetch roles (Staff / Manager type buttons)
  const { data: roleTypes, isLoading: rolesLoading } = useQuery({
    queryKey: ['login-role-types'],
    queryFn: async () => {
      const supabase = createClient()
      // Get distinct role types (one Staff, one Manager) for the login buttons
      const { data } = await supabase
        .from('roles')
        .select('*')
        .order('sort_order')
        .order('name_en')
      // Deduplicate by is_manager to show just Staff and Manager buttons
      const seen = new Set<boolean>()
      const unique: typeof data = []
      for (const r of data ?? []) {
        if (!seen.has(r.is_manager)) {
          seen.add(r.is_manager)
          unique.push(r)
        }
      }
      return unique
    },
  })

  const handleNameSelect = (staff: NonNullable<typeof staffList>[0]) => {
    selectByName(staff as Parameters<typeof selectByName>[0])
    router.push('/login/pin')
  }

  const handleRoleSelect = (role: NonNullable<typeof roleTypes>[0]) => {
    selectByRole(role)
    router.push('/login/pin')
  }

  return (
    <div className="min-h-dvh bg-cream relative noise-bg">
      <div className="relative z-10 max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <Image
              src="/icons/bsb-logo-coin.svg"
              alt="BSB"
              width={50}
              height={50}
              className="rounded-full"
            />
            <div>
              <h1
                className="text-lg font-bold text-brown uppercase tracking-wide"
                style={{ fontFamily: 'var(--font-arsenal), Georgia, serif' }}
              >
                Brown Sugar Bakery
              </h1>
              <p className="text-brown/50 text-sm">
                {locale === 'es' ? 'Selecciona tu Rol o Nombre' : 'Select Your Role or Name'}
              </p>
            </div>
          </motion.div>
          <LanguageToggle />
        </div>

        {/* Section: By Role */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <h2 className="text-xs font-semibold text-brown/50 uppercase tracking-wider mb-3">
            {locale === 'es' ? 'Selecciona tu Rol' : 'Select Your Role'}
          </h2>
          {rolesLoading ? (
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {roleTypes?.map((role, i) => {
                const roleName = locale === 'es' ? role.name_es : role.name_en
                const Icon = role.is_manager ? Shield : ClipboardList

                return (
                  <motion.button
                    key={role.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    onClick={() => handleRoleSelect(role)}
                    className={`flex items-center gap-3 p-4 rounded-xl bg-white border-2 hover:shadow-sm transition-all text-left active:scale-[0.97] ${
                      role.is_manager
                        ? 'border-gold/30 hover:border-gold'
                        : 'border-brown/10 hover:border-brown/30'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      role.is_manager ? 'bg-gold/10' : 'bg-brown/5'
                    }`}>
                      <Icon className={`w-5 h-5 ${role.is_manager ? 'text-gold' : 'text-brown/40'}`} />
                    </div>
                    <span className="text-sm font-bold text-brown">
                      {roleName}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-brown/10" />
          <span className="text-[11px] font-medium text-brown/30 uppercase">
            {locale === 'es' ? 'o' : 'or'}
          </span>
          <div className="flex-1 h-px bg-brown/10" />
        </div>

        {/* Section: By Name */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xs font-semibold text-brown/50 uppercase tracking-wider mb-3">
            {locale === 'es' ? 'Selecciona tu Nombre' : 'Select Your Name'}
          </h2>
          {staffLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {staffList?.map((staff, i) => (
                <motion.button
                  key={staff.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.03 }}
                  onClick={() => handleNameSelect(staff)}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-white border-2 border-brown/10 hover:border-brown/30 hover:shadow-sm transition-all text-left active:scale-[0.97]"
                >
                  <div className="w-8 h-8 rounded-full bg-brown/10 flex items-center justify-center text-xs font-bold text-brown/50 flex-shrink-0">
                    {staff.first_name?.[0]}{staff.last_name?.[0]}
                  </div>
                  <span className="text-sm font-semibold text-brown truncate">
                    {staff.display_name}
                  </span>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
