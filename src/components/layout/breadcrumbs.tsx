'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'
import { useAuthStore } from '@/lib/stores/auth-store'
import { useLocaleStore } from '@/lib/stores/locale-store'

interface Crumb {
  label: string
  href?: string
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const router = useRouter()
  const { locale } = useLocaleStore()
  const { zone, role, staff, isAuthenticated } = useAuthStore()

  // Don't show on splash page
  if (pathname === '/') return null

  const crumbs = buildCrumbs(pathname, locale, { zone, role, staff, isAuthenticated })

  if (crumbs.length === 0) return null

  return (
    <nav className="bg-brown/5 border-b border-brown/10 px-4 py-2 no-print">
      <div className="max-w-lg mx-auto flex items-center gap-1 text-xs overflow-x-auto">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <span key={i} className="flex items-center gap-1 whitespace-nowrap">
              {i > 0 && <ChevronRight className="w-3 h-3 text-brown/25 flex-shrink-0" />}
              {isLast || !crumb.href ? (
                <span className="font-semibold text-brown/70">{crumb.label}</span>
              ) : (
                <button
                  onClick={() => router.push(crumb.href!)}
                  className="text-brown/50 hover:text-brown transition-colors font-medium"
                >
                  {crumb.label}
                </button>
              )}
            </span>
          )
        })}
      </div>
    </nav>
  )
}

function buildCrumbs(
  pathname: string,
  locale: string,
  ctx: {
    zone: { name_en: string; name_es: string; slug: string } | null
    role: { name_en: string; name_es: string; is_manager: boolean } | null
    staff: { display_name: string } | null
    isAuthenticated: boolean
  }
): Crumb[] {
  const t = (en: string, es: string) => (locale === 'es' ? es : en)

  // Login flow
  if (pathname === '/login') {
    return [
      { label: t('Home', 'Inicio'), href: '/' },
      { label: t('Login', 'Iniciar sesión') },
    ]
  }

  if (pathname === '/login/pin') {
    return [
      { label: t('Home', 'Inicio'), href: '/' },
      { label: t('Login', 'Iniciar sesión'), href: '/login' },
      { label: 'PIN' },
    ]
  }

  if (pathname === '/login/role') {
    return [
      { label: t('Home', 'Inicio'), href: '/' },
      { label: t('Login', 'Iniciar sesión'), href: '/login' },
      { label: t('Select Role', 'Elegir rol') },
    ]
  }

  // Staff dashboard
  if (pathname.match(/^\/zone\/[^/]+\/staff$/)) {
    const zoneName = ctx.zone ? (locale === 'es' ? ctx.zone.name_es : ctx.zone.name_en) : ''
    const roleName = ctx.role ? (locale === 'es' ? ctx.role.name_es : ctx.role.name_en) : ''
    return [
      { label: t('Home', 'Inicio'), href: '/login' },
      { label: zoneName || t('Zone', 'Zona') },
      { label: roleName || t('Staff', 'Personal') },
    ]
  }

  // Manager dashboard
  if (pathname.match(/^\/zone\/[^/]+\/manager$/)) {
    const zoneName = ctx.zone ? (locale === 'es' ? ctx.zone.name_es : ctx.zone.name_en) : ''
    const roleName = ctx.role ? (locale === 'es' ? ctx.role.name_es : ctx.role.name_en) : ''
    return [
      { label: t('Home', 'Inicio'), href: '/login' },
      { label: zoneName || t('Zone', 'Zona') },
      { label: roleName || t('Manager', 'Gerente') },
    ]
  }

  // Admin pages
  if (pathname === '/admin/login') {
    return [
      { label: t('Home', 'Inicio'), href: '/login' },
      { label: t('Admin Login', 'Acceso admin') },
    ]
  }

  if (pathname.startsWith('/admin/')) {
    const section = pathname.split('/')[2]
    const sections: Record<string, { en: string; es: string }> = {
      staff: { en: 'Staff', es: 'Personal' },
      roles: { en: 'Roles & Zones', es: 'Roles y Zonas' },
      analytics: { en: 'Analytics', es: 'Analíticas' },
    }

    const adminCrumbs: Crumb[] = [
      { label: t('Home', 'Inicio'), href: '/login' },
      { label: 'Admin' },
    ]

    // Add admin nav links for sections other than current
    const currentLabel = sections[section]
    if (currentLabel) {
      adminCrumbs.push({ label: t(currentLabel.en, currentLabel.es) })
    }

    return adminCrumbs
  }

  return []
}
