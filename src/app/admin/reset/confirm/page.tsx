'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KeyRound, CheckCircle2 } from 'lucide-react'

export default function AdminResetConfirmPage() {
  const router = useRouter()
  const { locale } = useLocaleStore()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  // Supabase processes the token from the URL hash on load
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError(locale === 'es' ? 'Mínimo 8 caracteres' : 'Minimum 8 characters')
      return
    }

    if (password !== confirmPassword) {
      setError(locale === 'es' ? 'Las contraseñas no coinciden' : 'Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({ password })

      if (updateError) {
        setError(locale === 'es' ? 'Error al actualizar' : 'Failed to update password')
        setLoading(false)
        return
      }

      setDone(true)
    } catch {
      setError(locale === 'es' ? 'Error de conexión' : 'Connection error')
    }
    setLoading(false)
  }

  if (!sessionReady && !done) {
    return (
      <div className="min-h-dvh bg-cream flex items-center justify-center p-4">
        <p className="text-sm text-brown/50">
          {locale === 'es' ? 'Verificando enlace...' : 'Verifying link...'}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-brown/10 mx-auto mb-4 flex items-center justify-center">
            <KeyRound className="w-7 h-7 text-brown/50" />
          </div>
          <h1 className="text-xl font-bold text-brown">
            {locale === 'es' ? 'Nueva contraseña' : 'New Password'}
          </h1>
        </div>

        {!done ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-brown/60 mb-1">
                {locale === 'es' ? 'Nueva contraseña' : 'New Password'}
              </label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={locale === 'es' ? '8+ caracteres' : '8+ characters'}
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-brown/60 mb-1">
                {locale === 'es' ? 'Confirmar contraseña' : 'Confirm Password'}
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={locale === 'es' ? 'Repite la contraseña' : 'Repeat password'}
              />
            </div>
            {error && <p className="text-sm text-red font-medium">{error}</p>}
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading
                ? (locale === 'es' ? 'Guardando...' : 'Saving...')
                : (locale === 'es' ? 'Actualizar contraseña' : 'Update Password')}
            </Button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-success/10 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <p className="text-sm text-brown/70">
              {locale === 'es' ? 'Contraseña actualizada.' : 'Password updated.'}
            </p>
            <Button variant="primary" className="w-full" onClick={() => router.push('/admin/login')}>
              {locale === 'es' ? 'Ir al login' : 'Go to Login'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
