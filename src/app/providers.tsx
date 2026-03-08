'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { AnimatePresence } from 'framer-motion'

function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useLocaleStore()
  const [messages, setMessages] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    import(`../../messages/${locale}.json`).then((mod) => setMessages(mod.default))
  }, [locale])

  if (!messages) return <>{children}</>

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30000,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </LocaleProvider>
    </QueryClientProvider>
  )
}
