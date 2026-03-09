'use client'

import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/lib/stores/auth-store'
import { LanguageToggle } from '@/components/layout/language-toggle'
import { Shield, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export default function RoleSelectPage() {
  const router = useRouter()
  const t = useTranslations('role')
  const { setRoleType } = useAuthStore()

  const handleRoleSelect = (type: 'staff' | 'manager') => {
    setRoleType(type)
    router.push('/pin')
  }

  return (
    <div className="min-h-dvh bg-cream relative noise-bg">
      <div className="relative z-10 max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-2xl font-bold text-brown">{t('title')}</h1>
          </motion.div>
          <LanguageToggle />
        </div>

        {/* Role Cards */}
        <div className="space-y-4">
          <motion.button
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleRoleSelect('staff')}
            className="w-full text-left rounded-2xl border-2 border-brown/10 bg-white p-6 shadow-sm hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-brown">
                <ClipboardList className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-brown">{t('staff.name')}</h3>
                <p className="text-sm text-brown/60 mt-1">{t('staff.description')}</p>
              </div>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleRoleSelect('manager')}
            className="w-full text-left rounded-2xl border-2 border-brown/10 bg-white p-6 shadow-sm hover:shadow-lg transition-shadow"
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-brown">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-brown">{t('manager.name')}</h3>
                <p className="text-sm text-brown/60 mt-1">{t('manager.description')}</p>
              </div>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  )
}
