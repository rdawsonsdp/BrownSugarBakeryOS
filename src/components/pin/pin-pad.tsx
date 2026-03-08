'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Delete } from 'lucide-react'
import { PinDot } from './pin-dot'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface PinPadProps {
  onSubmit: (pin: string) => Promise<boolean>
  zoneColor: string
  isLoading?: boolean
}

export function PinPad({ onSubmit, zoneColor, isLoading = false }: PinPadProps) {
  const [digits, setDigits] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'error' | 'success'>('idle')

  const handleDigit = useCallback(async (digit: string) => {
    if (status !== 'idle' || isLoading) return

    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(10)

    const newDigits = [...digits, digit]
    setDigits(newDigits)

    if (newDigits.length === 4) {
      const pin = newDigits.join('')
      const success = await onSubmit(pin)

      if (success) {
        setStatus('success')
      } else {
        setStatus('error')
        if (navigator.vibrate) navigator.vibrate([50, 50, 50])
        setTimeout(() => {
          setDigits([])
          setStatus('idle')
        }, 500)
      }
    }
  }, [digits, status, isLoading, onSubmit])

  const handleDelete = useCallback(() => {
    if (status !== 'idle' || digits.length === 0) return
    setDigits((d) => d.slice(0, -1))
  }, [status, digits])

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del']

  return (
    <motion.div
      animate={status === 'error' ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center gap-10"
    >
      {/* PIN Dots */}
      <div className="flex gap-5">
        {Array.from({ length: 4 }, (_, i) => (
          <PinDot
            key={i}
            index={i}
            filled={i < digits.length}
            status={status}
            zoneColor={zoneColor}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-[300px]">
        {keys.map((key, i) => {
          if (key === '') return <div key={i} />
          if (key === 'del') {
            return (
              <Button
                key="del"
                variant="ghost"
                size="xl"
                onClick={handleDelete}
                disabled={status !== 'idle' || digits.length === 0}
                className="text-brown/60"
              >
                <Delete className="w-6 h-6" />
              </Button>
            )
          }
          return (
            <Button
              key={key}
              variant="secondary"
              size="xl"
              onClick={() => handleDigit(key)}
              disabled={status !== 'idle' || digits.length >= 4}
              className={cn(
                'text-2xl font-bold shadow-sm',
                'hover:shadow-md active:shadow-none'
              )}
            >
              {key}
            </Button>
          )
        })}
      </div>
    </motion.div>
  )
}
