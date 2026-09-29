'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { authButton, authInput } from '@/components/AuthShell'

export default function ForgotForm() {
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const email = new FormData(e.currentTarget).get('email')
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.status === 429) setError('Demasiados intentos. Espera un minuto.')
      else if (!res.ok) setError('Revisa el email e inténtalo de nuevo.')
      else setSent(true)
    } catch {
      setError('No se pudo conectar. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  if (sent)
    return (
      <div role="status" className="mt-3 space-y-4 text-sm text-forest-200">
        <p>Si ese email tiene cuenta, te hemos enviado un enlace para elegir una contraseña nueva. Caduca en 1 hora.</p>
        <Link href="/login" className="inline-flex h-11 items-center font-semibold text-[#a3e635] underline underline-offset-4">
          Volver a entrar
        </Link>
      </div>
    )

  return (
    <form onSubmit={submit} className="mt-3 space-y-4">
      <p className="text-sm text-forest-300">Escribe tu email y te enviamos un enlace para crear una contraseña nueva.</p>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-forest-200">Email</span>
        <input name="email" type="email" required autoComplete="email" inputMode="email" placeholder="tu@email.com" className={authInput} />
      </label>
      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className={authButton}>
        {busy && <Loader2 size={18} className="animate-spin" />} Enviar enlace
      </button>
      <Link href="/login" className="flex h-11 items-center justify-center text-sm font-semibold text-forest-300 hover:text-forest-50">
        Volver
      </Link>
    </form>
  )
}
