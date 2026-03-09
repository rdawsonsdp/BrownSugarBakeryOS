'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { EmberParticles } from './ember-particles'
import { Medallion } from './medallion'

export function SplashScreen() {
  const router = useRouter()
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => router.push('/login'), 400)
    }, 3200)
    return () => clearTimeout(timer)
  }, [router])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 bg-brown flex flex-col items-center justify-center overflow-hidden z-50 noise-bg"
        >
          <EmberParticles />

          <div className="relative z-10 flex flex-col items-center gap-8">
            <Medallion />

            {/* Wordmark */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              className="text-center"
            >
              <h1
                className="text-4xl font-bold bg-gradient-to-r from-gold via-gold-light to-gold bg-[length:200%_auto] animate-shimmer bg-clip-text text-transparent"
                style={{ fontFamily: 'var(--font-arsenal), Georgia, serif' }}
              >
                Brown Sugar Bakery
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 2.0, duration: 0.6 }}
                className="text-cream/60 text-sm mt-3 tracking-[0.25em] uppercase"
              >
                Life Is Sweet
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
