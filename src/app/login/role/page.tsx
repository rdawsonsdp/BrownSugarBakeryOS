'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, ClipboardList, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { cn } from '@/lib/utils/cn'

export default function LoginRolePage() {
  const router = useRouter()
  const { locale } = useLocaleStore()
  const { selectedStaff, zone, login } = useAuthStore()
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedStaff || !zone) {
      router.push('/login')
    }
  }, [selectedStaff, zone, router])

  // Fetch roles for the selected zone
  const { data: roles } = useQuery({
    queryKey: ['zone-roles', zone?.id],
    queryFn: async () => {
      if (!zone?.id) return []
      const supabase = createClient()
      const { data } = await supabase
        .from('roles')
        .select('*')
        .eq('zone_id', zone.id)
        .order('sort_order')
        .order('name_en')
      return data ?? []
    },
    enabled: !!zone?.id,
  })

  if (!selectedStaff || !zone) return null

  const handleRoleSelect = async (role: NonNullable<typeof roles>[0]) => {
    setLoading(role.id)
    try {
      const res = await fetch('/api/start-shift', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: selectedStaff.id,
          zone_id: zone.id,
          role_id: role.id,
        }),
      })

      if (!res.ok) throw new Error('Failed to start shift')

      const data = await res.json()

      login({
        staff: data.staff,
        zone: data.zone,
        role: data.role,
        shift: data.shift,
      })

      const dashPath = role.is_manager
        ? `/zone/${zone.slug}/manager`
        : `/zone/${zone.slug}/staff`

      router.push(dashPath)
    } catch (err) {
      console.error('Failed to start shift:', err)
      setLoading(null)
    }
  }

  const zoneName = locale === 'es' ? zone.name_es : zone.name_en

  return (
    <div className="min-h-dvh bg-cream relative noise-bg">
      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-brown/50 text-sm mb-1">{zoneName} — {selectedStaff.display_name}</p>
            <h1 className="text-2xl font-bold text-brown">Select Your Role</h1>
            <p className="text-brown/50 text-sm mt-1">What are you doing today?</p>
          </motion.div>
          <button
            onClick={() => router.push('/login/zone')}
            className="p-2 rounded-lg text-brown/40 hover:text-brown hover:bg-brown/5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
        </div>

        {/* Role Cards */}
        <div className="space-y-3">
          {roles?.map((role, i) => {
            const name = locale === 'es' ? role.name_es : role.name_en
            const isLoading = loading === role.id
            const Icon = role.is_manager ? Shield : ClipboardList

            return (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => handleRoleSelect(role)}
                disabled={!!loading}
                className={cn(
                  'w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-left transition-all',
                  'bg-white hover:shadow-md active:scale-[0.98]',
                  role.is_manager ? 'border-gold/30 hover:border-gold' : 'border-brown/10 hover:border-brown/30',
                  loading && !isLoading && 'opacity-40'
                )}
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0',
                    role.is_manager ? 'bg-gold/10' : 'bg-brown/5'
                  )}
                >
                  {isLoading ? (
                    <Loader2 className="w-6 h-6 text-brown/40 animate-spin" />
                  ) : (
                    <Icon className={cn('w-6 h-6', role.is_manager ? 'text-gold' : 'text-brown/40')} />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-brown">{name}</h3>
                  {role.is_manager && (
                    <p className="text-xs text-brown/50 mt-0.5">Manage team, tasks, and operations</p>
                  )}
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
