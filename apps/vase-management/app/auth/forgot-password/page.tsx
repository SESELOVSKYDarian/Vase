// app/auth/forgot-password/page.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError('Ingresá tu email'); return }
    setLoading(true)
    setError('')
    // Simular envío (en producción: integrar con nodemailer / resend)
    await new Promise((r) => setTimeout(r, 1200))
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" />
        </div>
        <h2 className="mb-2 font-display text-3xl font-semibold text-gray-900 dark:text-white">¡Email enviado!</h2>
        <p className="text-sm text-gray-500 mb-6">
          Si existe una cuenta con <strong>{email}</strong>, vas a recibir un link para restablecer tu contraseña en los próximos minutos.
        </p>
        <Link href="/auth/login" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={15} /> Volver al inicio de sesión
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-3xl font-semibold text-gray-900 dark:text-white">Recuperar contraseña</h2>
        <p className="text-sm text-gray-500 mt-1">Ingresá tu email y te enviamos un link de recuperación</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="w-full py-2.5 pl-9 pr-4 text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="ui-button ui-button-primary w-full"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : 'Enviar link de recuperación'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/auth/login" className="inline-flex items-center gap-1.5 font-semibold text-primary hover:text-primary/80">
          <ArrowLeft size={13} /> Volver al login
        </Link>
      </p>
    </div>
  )
}
