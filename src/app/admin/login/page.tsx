'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Loader2, ArrowLeft } from 'lucide-react'
import { useLocaleStore } from '@/lib/stores/locale-store'

export default function AdminLoginPage() {
  const router = useRouter()
  const { locale } = useLocaleStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(
          locale === 'es'
            ? 'Correo o contraseña incorrectos'
            : 'Invalid email or password'
        )
        setLoading(false)
        return
      }

      router.push('/admin/staff')
      router.refresh()
    } catch {
      setError(
        locale === 'es'
          ? 'Error al iniciar sesión'
          : 'Failed to sign in'
      )
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Back to staff login */}
        <button
          onClick={() => router.push('/login')}
          className="flex items-center gap-1 text-sm text-brown/40 hover:text-brown/60 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          {locale === 'es' ? 'Inicio de turno' : 'Staff login'}
        </button>

        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brown rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-cream" />
          </div>
          <h1 className="text-2xl font-bold text-brown">
            {locale === 'es' ? 'Acceso Administrativo' : 'Admin Access'}
          </h1>
          <p className="text-sm text-brown/50 mt-1">
            {locale === 'es'
              ? 'Inicia sesión para administrar el sistema'
              : 'Sign in to manage the system'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">
              {locale === 'es' ? 'Correo Electrónico' : 'Email'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brown/20 bg-white text-brown text-sm focus:border-brown focus:outline-none"
              placeholder="manager@bakery.com"
              required
              autoComplete="email"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-brown/60 uppercase block mb-1">
              {locale === 'es' ? 'Contraseña' : 'Password'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-brown/20 bg-white text-brown text-sm focus:border-brown focus:outline-none"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red font-medium text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brown text-cream font-bold text-sm hover:bg-brown-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {locale === 'es' ? 'Ingresando...' : 'Signing in...'}
              </>
            ) : (
              locale === 'es' ? 'Ingresar' : 'Sign In'
            )}
          </button>
        </form>

        <p className="text-[10px] text-brown/30 text-center mt-8">
          BakeryOS &middot; Brown Sugar Bakery
        </p>
      </div>
    </div>
  )
}
