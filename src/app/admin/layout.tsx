'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'
import { useLocaleStore } from '@/lib/stores/locale-store'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { locale } = useLocaleStore()

  // Don't wrap the login page with admin chrome
  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
    router.refresh()
  }

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
      {children}
    </div>
  )
}
