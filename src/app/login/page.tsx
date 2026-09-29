'use client'
import { useState } from 'react'

const field = 'w-full rounded-xl px-4 py-3 text-sm outline-none'
const fieldStyle = { background: '#142514', border: '1px solid #1c321d', color: '#ecf5e0' }

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      })
      if (!res.ok) {
        setError((await res.json().catch(() => null))?.error ?? 'Error inesperado')
        return
      }
      window.location.href = '/' // full load so server components see the new session
    } catch {
      setError('No se pudo conectar. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="px-4 pt-16 pb-8">
      <h1 className="text-3xl font-bold text-center" style={{ fontFamily: 'Syne, sans-serif', color: '#ecf5e0' }}>
        KetoHoy
      </h1>
      <p className="text-sm text-center mt-2 mb-8" style={{ color: '#547856' }}>
        {mode === 'login' ? 'Inicia sesión para ver tu despensa y tu plan' : 'Crea tu cuenta'}
      </p>
      <form onSubmit={submit} className="space-y-3">
        <input name="email" type="email" required autoComplete="email" placeholder="Email" className={field} style={fieldStyle} />
        <input
          name="password"
          type="password"
          required
          minLength={mode === 'register' ? 8 : undefined}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder={mode === 'register' ? 'Contraseña (mín. 8 caracteres)' : 'Contraseña'}
          className={field}
          style={fieldStyle}
        />
        {error && <p role="alert" className="text-sm text-center" style={{ color: '#ef4444' }}>{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl py-3 font-semibold disabled:opacity-60"
          style={{ background: '#a3e635', color: '#060e07' }}
        >
          {busy ? '...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
        className="block mx-auto mt-6 text-sm"
        style={{ color: '#547856' }}
      >
        {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
      </button>
    </main>
  )
}
