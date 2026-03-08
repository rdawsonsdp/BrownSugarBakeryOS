'use client'

import { motion } from 'framer-motion'
import { ClipboardList, Shield } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface RoleCardProps {
  name: string
  description: string
  isManager: boolean
  zoneColor: string
  onClick: () => void
  index: number
}

export function RoleCard({ name, description, isManager, zoneColor, onClick, index }: RoleCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: index === 0 ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.15 + 0.2, duration: 0.4 }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-2xl border-2 border-brown/10 bg-white p-6 shadow-sm hover:shadow-lg transition-shadow'
      )}
    >
      <div className="flex flex-col items-center text-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: zoneColor }}
        >
          {isManager ? (
            <Shield className="w-8 h-8 text-white" />
          ) : (
            <ClipboardList className="w-8 h-8 text-white" />
          )}
        </div>
        <div>
          <h3 className="text-xl font-bold text-brown">{name}</h3>
          <p className="text-sm text-brown/60 mt-1">{description}</p>
        </div>
      </div>
    </motion.button>
  )
}
