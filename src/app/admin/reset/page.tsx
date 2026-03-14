'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLocaleStore } from '@/lib/stores/locale-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function AdminResetPage() {
  const router = useRouter()
  const { locale } = useLocaleStore()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError(locale === 'es' ? 'Ingresa tu correo' : 'Enter your email')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin/reset/confirm`,
      })

      if (resetError) {
        setError(locale === 'es' ? 'Error al enviar el correo' : 'Failed to send reset email')
        setLoading(false)
        return
      }

      setSent(true)
    } catch {
      setError(locale === 'es' ? 'Error de conexión' : 'Connection error')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-dvh bg-cream flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-brown/10 mx-auto mb-4 flex items-center justify-center">
            <Mail className="w-7 h-7 text-brown/50" />
          </div>
          <h1 className="text-xl font-bold text-brown">
            {locale === 'es' ? 'Restablecer contraseña' : 'Reset Password'}
          </h1>
          <p className="text-sm text-brown/50 mt-1">
            {locale === 'es'
              ? 'Te enviaremos un enlace para restablecer tu contraseña'
              : "We'll send a reset link to your email"}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-brown/60 mb-1">
                {locale === 'es' ? 'Correo electrónico' : 'Email'}
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red font-medium">{error}</p>}
            <Button type="submit" variant="primary" className="w-full" disabled={loading}>
              {loading
                ? (locale === 'es' ? 'Enviando...' : 'Sending...')
                : (locale === 'es' ? 'Enviar enlace' : 'Send Reset Link')}
            </Button>
            <button
              type="button"
              onClick={() => router.push('/admin/login')}
              className="flex items-center gap-1 text-xs text-brown/40 hover:text-brown/70 transition-colors mx-auto"
            >
              <ArrowLeft className="w-3 h-3" />
              {locale === 'es' ? 'Volver al login' : 'Back to login'}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-success/10 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-success" />
            </div>
            <p className="text-sm text-brown/70">
              {locale === 'es'
                ? `Se envió un enlace de restablecimiento a ${email}. Revisa tu correo.`
                : `A reset link was sent to ${email}. Check your inbox.`}
            </p>
            <Button
              variant="primary"
              className="w-full"
              onClick={() => router.push('/admin/login')}
            >
              {locale === 'es' ? 'Volver al login' : 'Back to Login'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
