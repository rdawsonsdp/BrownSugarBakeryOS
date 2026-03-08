'use client'

import * as React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  return (
    <div className={cn('w-full', className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{ value?: string; activeTab?: string; onSelect?: (v: string) => void }>, {
            activeTab: value,
            onSelect: onValueChange,
          })
        }
        return child
      })}
    </div>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
  activeTab?: string
  onSelect?: (value: string) => void
}

export function TabsList({ children, className, activeTab, onSelect }: TabsListProps) {
  return (
    <div className={cn('flex bg-cream-dark rounded-xl p-1 gap-1', className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{ activeTab?: string; onSelect?: (v: string) => void }>, {
            activeTab,
            onSelect,
          })
        }
        return child
      })}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
  activeTab?: string
  onSelect?: (value: string) => void
}

export function TabsTrigger({ value, children, className, activeTab, onSelect }: TabsTriggerProps) {
  const isActive = activeTab === value
  return (
    <button
      onClick={() => onSelect?.(value)}
      className={cn(
        'relative flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors touch-target',
        isActive ? 'text-brown' : 'text-brown/50 hover:text-brown/70',
        className
      )}
    >
      {isActive && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute inset-0 bg-white rounded-lg shadow-sm"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
  activeTab?: string
}

export function TabsContent({ value, children, className, activeTab }: TabsContentProps) {
  if (activeTab !== value) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('mt-4', className)}
    >
      {children}
    </motion.div>
  )
}
