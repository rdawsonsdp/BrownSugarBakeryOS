'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils/cn'

interface AppVersionProps {
  className?: string
  showBuild?: boolean
}

export function AppVersion({ className, showBuild = false }: AppVersionProps) {
  const [copied, setCopied] = useState(false)

  const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0'
  const buildId = process.env.NEXT_PUBLIC_BUILD_ID || 'dev'
  const buildDate = process.env.NEXT_PUBLIC_BUILD_DATE || ''

  const versionString = showBuild ? `v${version} (${buildId})` : `v${version}`

  const fullVersionInfo = [
    `BakeryOS v${version}`,
    `Build: ${buildId}`,
    buildDate ? `Date: ${new Date(buildDate).toLocaleDateString()}` : '',
  ].filter(Boolean).join('\n')

  const handleTap = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullVersionInfo)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API not available
    }
  }, [fullVersionInfo])

  return (
    <button
      onClick={handleTap}
      className={cn(
        'text-[11px] text-brown/30 transition-colors hover:text-brown/50 active:text-brown/60',
        copied && 'text-green-600/60',
        className
      )}
      title="Tap to copy version info"
    >
      {copied ? 'Copied!' : versionString}
    </button>
  )
}
