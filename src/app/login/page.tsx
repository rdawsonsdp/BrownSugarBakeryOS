'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/auth-store'
import { Skeleton } from '@/components/ui/skeleton'
import { LanguageToggle } from '@/components/layout/language-toggle'

export default function LoginNamePage() {
  const router = useRouter()
  const { selectStaff, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      const zone = useAuthStore.getState().zone
      const role = useAuthStore.getState().role
      if (zone && role) {
        const path = role.is_manager
          ? `/zone/${zone.slug}/manager`
          : `/zone/${zone.slug}/staff`
        router.push(path)
      }
    }
  }, [isAuthenticated, router])

  const { data: staffList, isLoading } = useQuery<{ id: string; display_name: string; first_name: string; last_name: string }[]>({
    queryKey: ['all-active-staff'],
    queryFn: async () => {
      const res = await fetch('/api/staff?all_active=true')
      if (!res.ok) throw new Error('Failed to fetch staff')
      return res.json()
    },
  })

  const handleSelect = (staff: typeof staffList extends (infer T)[] | undefined ? T : never) => {
    selectStaff(staff as Parameters<typeof selectStaff>[0])
    router.push('/login/pin')
  }

  return (
    <div className="min-h-dvh bg-cream relative noise-bg">
      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
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
              <p className="text-brown/50 text-sm">Who&apos;s clocking in?</p>
            </div>
          </motion.div>
          <LanguageToggle />
        </div>

        {/* Staff buttons */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {staffList?.map((staff, i) => (
              <motion.button
                key={staff.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelect(staff)}
                className="flex items-center gap-3 p-4 rounded-xl bg-white border-2 border-brown/10 hover:border-brown/30 hover:shadow-md transition-all text-left active:scale-[0.97]"
              >
                <div className="w-10 h-10 rounded-full bg-brown/10 flex items-center justify-center text-sm font-bold text-brown/50 flex-shrink-0">
                  {staff.first_name?.[0]}{staff.last_name?.[0]}
                </div>
                <span className="text-sm font-semibold text-brown truncate">
                  {staff.display_name}
                </span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
