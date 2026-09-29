'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { authButton, authInput } from '@/components/AuthShell'

export default function ResetForm({ token }: { token: string }) {
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const password = new FormData(e.currentTarget).get('password')
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      if (!res.ok) setError((await res.json().catch(() => null))?.error ?? 'Error inesperado')
      else setDone(true)
    } catch {
      setError('No se pudo conectar. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  if (done)
    return (
      <div role="status" className="mt-3 space-y-4 text-sm text-forest-200">
        <p>Contraseña cambiada. Se cerraron tus otras sesiones.</p>
        <Link href="/login" className={authButton}>
          Entrar
        </Link>
      </div>
    )

  return (
    <form onSubmit={submit} className="mt-3 space-y-4">
      <label className="block">
        <span className="mb-1.5 flex items-baseline justify-between text-xs font-medium text-forest-200">
          Contraseña nueva <span className="text-forest-400">mínimo 8 caracteres</span>
        </span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={authInput} />
      </label>
      {error && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}{' '}
          <Link href="/forgot-password" className="font-semibold underline underline-offset-4">
            Pedir otro enlace
          </Link>
        </p>
      )}
      <button type="submit" disabled={busy} className={authButton}>
        {busy && <Loader2 size={18} className="animate-spin" />} Guardar contraseña
      </button>
    </form>
  )
}
