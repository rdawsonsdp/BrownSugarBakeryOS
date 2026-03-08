'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface PinDotProps {
  filled: boolean
  status: 'idle' | 'error' | 'success'
  zoneColor: string
  index: number
}

export function PinDot({ filled, status, zoneColor, index }: PinDotProps) {
  const statusStyles = {
    idle: filled ? '' : 'bg-brown/10',
    error: 'bg-red',
    success: 'bg-success',
  }

  return (
    <div className="w-5 h-5 flex items-center justify-center">
      <motion.div
        animate={
          status === 'error'
            ? { scale: [1, 1.3, 1] }
            : status === 'success'
            ? { scale: [1, 1.4, 1] }
            : filled
            ? { scale: [0, 1.2, 1] }
            : { scale: 1 }
        }
        transition={{ duration: status === 'error' ? 0.3 : 0.2 }}
        className={cn(
          'w-4 h-4 rounded-full transition-colors duration-200',
          statusStyles[status],
          status === 'success' && 'animate-glow-green'
        )}
        style={
          filled && status === 'idle'
            ? { backgroundColor: zoneColor }
            : undefined
        }
      />
    </div>
  )
}
