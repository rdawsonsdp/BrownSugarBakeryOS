'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

export function Medallion() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Decorative rings */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 0.2, scale: 1 }}
        transition={{ delay: 2.2, duration: 1.0 }}
        className="absolute w-52 h-52 rounded-full border-2 border-gold-light"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 0.1, scale: 1 }}
        transition={{ delay: 2.4, duration: 1.0 }}
        className="absolute w-60 h-60 rounded-full border border-gold-light"
      />

      {/* BSB Logo Coin */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          delay: 0.8,
          duration: 0.7,
          type: 'spring',
          stiffness: 200,
          damping: 15,
        }}
        className="relative w-40 h-40 flex items-center justify-center"
      >
        <Image
          src="/icons/bsb-logo-coin.svg"
          alt="Brown Sugar Bakery"
          width={160}
          height={160}
          priority
          className="drop-shadow-2xl"
        />
      </motion.div>
    </div>
  )
}
