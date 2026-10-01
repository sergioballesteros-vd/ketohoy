'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { LogoMark } from '@/components/icons'
import { authButton, authInput } from '@/components/AuthShell'

type Mode = 'login' | 'register'

export default function LoginForm({ initialMode }: { initialMode: Mode }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
  }

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
    <main className="relative min-h-screen overflow-hidden px-5 pt-14 pb-10">
      <div className="relative mx-auto w-full max-w-sm">
        <div className="flex items-center justify-center gap-3">
          <LogoMark size={44} />
          <span className="font-syne text-3xl font-extrabold" style={{ color: '#ecf5e0' }}>
            KetoHoy
          </span>
        </div>
        <h1 className="mt-8 text-2xl font-semibold text-forest-50">
          {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </h1>

        <div className="mt-4">
          <div role="group" aria-label="Acceso a tu cuenta" className="grid grid-cols-2 gap-1 border-b border-forest-700 pb-2">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                aria-pressed={mode === m}
                type="button"
                onClick={() => switchMode(m)}
                className="relative hit-area rounded-lg py-2 text-sm font-semibold transition-colors"
                style={
                  mode === m
                    ? { background: '#1c321d', color: '#eef5ef' }
                    : { color: '#7a9e7c' }
                }
              >
                {m === 'login' ? 'Entrar' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium" style={{ color: '#aac4ac' }}>Email</span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                inputMode="email"
                placeholder="tu@email.com"
                className={authInput}
                style={{ color: '#ecf5e0' }}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 flex items-baseline justify-between text-xs font-medium" style={{ color: '#aac4ac' }}>
                Contraseña
                {mode === 'register' && <span style={{ color: '#6c9070' }}>mínimo 8 caracteres</span>}
              </span>
              <span className="relative block">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={mode === 'register' ? 8 : undefined}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  className={`${authInput} pr-12`}
                  style={{ color: '#ecf5e0' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center"
                  style={{ color: '#7a9e7c' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            {mode === 'login' && (
              <Link
                href="/forgot-password"
                className="-mt-2 flex h-11 items-center text-sm font-medium underline underline-offset-4"
                style={{ color: '#aac4ac' }}
              >
                ¿Olvidaste tu contraseña?
              </Link>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-xl px-3 py-2 text-sm"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className={authButton}
            >
              {busy && <Loader2 size={18} className="animate-spin" />}
              {mode === 'login' ? 'Entrar' : 'Crear mi cuenta'}
            </button>
          </form>
        </div>

        <p className="mt-8 text-center text-xs" style={{ color: '#6c9070' }}>
          No sustituye consejo médico o nutricional profesional.
        </p>
      </div>
    </main>
  )
}
