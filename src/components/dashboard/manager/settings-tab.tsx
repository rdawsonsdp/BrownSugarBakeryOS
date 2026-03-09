'use client'
import { useRouter } from 'next/navigation'
import { Users, BarChart3, LogOut, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocaleStore } from '@/lib/stores/locale-store'

interface SettingsTabProps {
  onLogout: () => void
}

export function SettingsTab({ onLogout }: SettingsTabProps) {
  const router = useRouter()
  const { locale, setLocale } = useLocaleStore()

  const sections = [
    {
      title: locale === 'es' ? 'Administracion' : 'Administration',
      items: [
        { label: locale === 'es' ? 'Roles y Zonas' : 'Roles & Zones', icon: Users, onClick: () => router.push('/admin/roles') },
        { label: locale === 'es' ? 'Analiticas' : 'Analytics', icon: BarChart3, onClick: () => router.push('/admin/analytics') },
      ],
    },
    {
      title: locale === 'es' ? 'Preferencias' : 'Preferences',
      items: [
        {
          label: locale === 'es' ? 'Idioma: Espanol' : 'Language: English',
          icon: Globe,
          onClick: () => setLocale(locale === 'es' ? 'en' : 'es'),
        },
      ],
    },
  ]

  return (
    <div className="space-y-6 p-4">
      {sections.map((section) => (
        <div key={section.title}>
          <h2 className="text-xs font-semibold text-brown/50 uppercase tracking-wider mb-2">
            {section.title}
          </h2>
          <div className="space-y-1">
            {section.items.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-brown/10 hover:border-brown/20 hover:shadow-sm transition-all text-left"
              >
                <item.icon className="w-5 h-5 text-brown/40" />
                <span className="text-sm font-medium text-brown">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="pt-4 border-t border-brown/10">
        <Button variant="danger" onClick={onLogout} className="w-full">
          <LogOut className="w-4 h-4" /> {locale === 'es' ? 'Cerrar Sesion' : 'Sign Out'}
        </Button>
      </div>
    </div>
  )
}
