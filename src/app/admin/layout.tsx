'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Users, Shield, BarChart3 } from 'lucide-react'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { cn } from '@/lib/utils/cn'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { locale } = useLocaleStore()

  // Don't wrap login/reset pages with admin chrome
  if (pathname === '/admin/login' || pathname.startsWith('/admin/reset')) {
    return <>{children}</>
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

  const adminNav = [
    { href: '/admin/staff', label: locale === 'es' ? 'Personal' : 'Staff', icon: Users },
    { href: '/admin/roles', label: locale === 'es' ? 'Roles' : 'Roles', icon: Shield },
    { href: '/admin/analytics', label: locale === 'es' ? 'Analíticas' : 'Analytics', icon: BarChart3 },
  ]

  return (
    <div>
      {/* Admin auth bar */}
      <div className="bg-gold/10 border-b border-gold/20 px-4 py-1.5 flex items-center justify-between no-print">
        <span className="text-[10px] font-bold text-gold uppercase tracking-wider">
          {locale === 'es' ? 'Modo Administrador' : 'Admin Mode'}
        </span>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1 text-[10px] font-semibold text-brown/40 hover:text-brown/70 transition-colors"
        >
          <LogOut className="w-3 h-3" />
          {locale === 'es' ? 'Cerrar sesión admin' : 'Admin sign out'}
        </button>
      </div>

      {/* Admin navigation tabs */}
      <div className="bg-white border-b border-brown/10 px-4 no-print">
        <div className="max-w-lg mx-auto flex gap-1">
          {adminNav.map((item) => {
            const isActive = pathname === item.href
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-gold text-brown'
                    : 'border-transparent text-brown/40 hover:text-brown/70'
                )}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {children}
    </div>
  )
}
