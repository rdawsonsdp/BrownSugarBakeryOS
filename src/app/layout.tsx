import type { Metadata, Viewport } from 'next'
import { Arsenal, Noto_Sans } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Providers } from './providers'
import { UpdateBanner } from '@/components/layout/update-banner'
import './globals.css'

const arsenal = Arsenal({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-arsenal-google',
  display: 'swap',
})

const notoSans = Noto_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-noto-sans-google',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'BakeryOS — Brown Sugar Bakery',
  description: 'Digital operations system for Brown Sugar Bakery',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BakeryOS',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#570522',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${arsenal.variable} ${notoSans.variable} min-h-dvh bg-cream text-brown antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <Providers>
            <UpdateBanner />
            {children}
          </Providers>
        </NextIntlClientProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                })
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
