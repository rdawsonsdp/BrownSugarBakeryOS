'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Skeleton } from '@/components/ui/skeleton'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { Shield, ClipboardList, Search, Zap } from 'lucide-react'

interface LastLogin {
  staffName: string
  staffId: string
  zoneSlug: string
  zoneId: string
  roleId: string
  roleName: string
}

function getLastLogin(): LastLogin | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('bakeryos-last-login')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function LoginPage() {
  const router = useRouter()
  const { locale } = useLocaleStore()
  const { selectByName, selectByRole } = useAuthStore()
  const [search, setSearch] = useState('')
  const lastLogin = useMemo(() => getLastLogin(), [])

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
      const { data } = await supabase
        .from('roles')
        .select('*')
        .order('sort_order')
        .order('name_en')
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

  const filteredStaff = useMemo(() => {
    if (!staffList) return []
    if (!search.trim()) return staffList
    const q = search.toLowerCase()
    return staffList.filter(
      (s) =>
        s.display_name.toLowerCase().includes(q) ||
        s.first_name.toLowerCase().includes(q) ||
        s.last_name.toLowerCase().includes(q)
    )
  }, [staffList, search])

  const handleNameSelect = (staff: NonNullable<typeof staffList>[0]) => {
    selectByName(staff as Parameters<typeof selectByName>[0])
    router.push('/login/pin')
  }

  const handleRoleSelect = (role: NonNullable<typeof roleTypes>[0]) => {
    selectByRole(role)
    router.push('/login/pin')
  }

  const handleQuickStart = () => {
    if (!lastLogin) return
    const staff = staffList?.find((s) => s.id === lastLogin.staffId)
    if (staff) {
      selectByName(staff as Parameters<typeof selectByName>[0])
      router.push('/login/pin')
    }
  }

  return (
    <div className="min-h-dvh bg-cream relative noise-bg">
      <div className="relative z-10 max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
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

        {/* Quick Start — returning user shortcut */}
        {lastLogin && (
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleQuickStart}
            className="w-full flex items-center gap-3 p-4 mb-5 rounded-2xl bg-gradient-to-r from-gold/10 to-gold/5 border-2 border-gold/30 hover:border-gold/50 hover:shadow-md transition-all text-left active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-gold/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gold uppercase tracking-wide">
                {locale === 'es' ? 'Inicio Rápido' : 'Quick Start'}
              </p>
              <p className="text-sm font-bold text-brown truncate">
                {lastLogin.staffName} — {lastLogin.roleName}
              </p>
            </div>
          </motion.button>
        )}

        {/* Section: By Role */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-5"
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
                    transition={{ delay: 0.05 + i * 0.04 }}
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
        <div className="flex items-center gap-3 my-4">
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
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-xs font-semibold text-brown/50 uppercase tracking-wider mb-3">
            {locale === 'es' ? 'Selecciona tu Nombre' : 'Select Your Name'}
          </h2>

          {/* Search filter */}
          {(staffList?.length ?? 0) > 8 && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brown/30" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={locale === 'es' ? 'Buscar nombre...' : 'Search name...'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brown/15 bg-white text-sm text-brown placeholder:text-brown/30 focus:border-brown/40 focus:outline-none"
              />
            </div>
          )}

          {staffLoading ? (
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredStaff.map((staff, i) => (
                <motion.button
                  key={staff.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.02 }}
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
              {filteredStaff.length === 0 && search && (
                <p className="col-span-2 text-sm text-brown/40 text-center py-4">
                  {locale === 'es' ? 'No se encontraron resultados' : 'No results found'}
                </p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
