'use client'
import { useState } from 'react'
import Link from 'next/link'
import { CalendarDays, ChefHat, Eye, EyeOff, Loader2, ShoppingCart } from 'lucide-react'
import { LogoMark } from '@/components/icons'

type Mode = 'login' | 'register'

const BENEFITS = [
  { Icon: ChefHat, title: 'Recetas con lo que tienes', text: 'Ideas keto según tu despensa y tus preferencias.' },
  { Icon: CalendarDays, title: 'Menú semanal en un clic', text: 'Desayuno, comida, snack y cena para 7 días.' },
  { Icon: ShoppingCart, title: 'Lista con precios reales', text: 'Productos de Mercadona y lo que te falta, al momento.' },
]

const input =
  'w-full rounded-xl px-4 py-3 text-[15px] outline-none transition-colors bg-forest-800 border border-forest-700 ' +
  'placeholder:text-forest-500 focus:border-[#a3e635] focus:ring-2 focus:ring-[#a3e635]/20'

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
      {/* soft lime glow, same accent as the app */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #a3e635 0%, transparent 70%)' }}
      />

      <div className="relative mx-auto w-full max-w-sm">
        <div className="flex items-center justify-center gap-3">
          <LogoMark size={44} />
          <span className="font-syne text-3xl font-extrabold" style={{ color: '#ecf5e0' }}>
            KetoHoy
          </span>
        </div>
        <h1 className="mt-6 text-center text-[26px] leading-tight font-extrabold" style={{ color: '#ecf5e0' }}>
          Tu semana keto,
          <br />
          <span style={{ color: '#a3e635' }}>resuelta.</span>
        </h1>

        <div className="mt-8 rounded-3xl p-5 border border-forest-700 bg-forest-900/80 backdrop-blur">
          <div role="tablist" className="grid grid-cols-2 gap-1 rounded-xl bg-forest-950 p-1">
            {(['login', 'register'] as const).map(m => (
              <button
                key={m}
                role="tab"
                aria-selected={mode === m}
                type="button"
                onClick={() => switchMode(m)}
                className="relative hit-area rounded-lg py-2 text-sm font-semibold transition-colors"
                style={
                  mode === m
                    ? { background: '#a3e635', color: '#060e07' }
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
                className={input}
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
                  className={`${input} pr-12`}
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
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold transition-opacity disabled:opacity-50"
              style={{ background: '#a3e635', color: '#060e07' }}
            >
              {busy && <Loader2 size={18} className="animate-spin" />}
              {mode === 'login' ? 'Entrar' : 'Crear mi cuenta'}
            </button>
          </form>
        </div>

        <ul className="mt-8 space-y-4">
          {BENEFITS.map(({ Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl"
                style={{ background: 'rgba(163,230,53,0.1)', color: '#a3e635' }}
              >
                <Icon size={18} />
              </span>
              <span>
                <span className="block text-sm font-semibold" style={{ color: '#ecf5e0' }}>{title}</span>
                <span className="block text-xs" style={{ color: '#7a9e7c' }}>{text}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center text-[11px]" style={{ color: '#6c9070' }}>
          No sustituye consejo médico o nutricional profesional.
        </p>
      </div>
    </main>
  )
}
