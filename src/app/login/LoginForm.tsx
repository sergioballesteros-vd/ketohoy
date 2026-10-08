'use client'
import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { LogoMark } from '@/components/icons'
import { authButton, authInput } from '@/components/AuthShell'
import { normalizeInternalReturnTo } from '@/lib/returnTo'
import { clearShoppingListSnapshots } from '@/lib/shoppingListSnapshot'

type Mode = 'login' | 'register'

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
)

export default function LoginForm({ initialError = null, returnTo, google = false }: { initialError?: string | null; returnTo: string; google?: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const mode: Mode = searchParams.get('modo') === 'registro' ? 'register' : 'login'
  const [error, setError] = useState<string | null>(initialError)
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const switchMode = (next: Mode) => {
    const params = new URLSearchParams()
    if (next === 'register') params.set('modo', 'registro')
    if (returnTo !== '/') params.set('returnTo', returnTo)
    router.push(`${pathname}${params.size ? `?${params}` : ''}`)
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
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
          ...(mode === 'register' && { acceptTerms: form.get('acceptTerms') === 'on', confirmAdult: form.get('confirmAdult') === 'on' }),
        }),
      })
      if (!res.ok) {
        setError((await res.json().catch(() => null))?.error ?? 'Error inesperado')
        return
      }
      const data = await res.json()
      clearShoppingListSnapshots()
      const destination = normalizeInternalReturnTo(returnTo)
      const next = data.termsRequired
        ? `/accept-terms?${new URLSearchParams({ returnTo: destination })}`
        : destination
      window.location.assign(next) // full load so server components see the new session
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

          {google && (
            <>
              {/* Plain link, not a form: the CSP's form-action 'self' would block the redirect to Google. */}
              <a
                href={`/api/auth/google?${new URLSearchParams({ returnTo: normalizeInternalReturnTo(returnTo) })}`}
                onClick={clearShoppingListSnapshots}
                className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-xl text-sm font-semibold"
                style={{ background: '#eef5ef', color: '#1c321d' }}
              >
                <GoogleG />
                Continuar con Google
              </a>
              <div className="mt-5 flex items-center gap-3 text-xs" style={{ color: '#6c9070' }}>
                <span className="h-px flex-1" style={{ background: '#1c321d' }} />
                o con email
                <span className="h-px flex-1" style={{ background: '#1c321d' }} />
              </div>
            </>
          )}

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

            {mode === 'register' && (
              <div className="space-y-3 text-sm leading-5" style={{ color: '#aac4ac' }}>
                <label className="flex items-start gap-3">
                  <input name="confirmAdult" type="checkbox" required className="mt-1 accent-[#a3e635]" />
                  <span>Confirmo que tengo 18 años o más.</span>
                </label>
                <label className="flex items-start gap-3">
                  <input name="acceptTerms" type="checkbox" required className="mt-1 accent-[#a3e635]" />
                  <span>Acepto los <Link href="/legal#terminos" target="_blank" className="underline">Términos de uso</Link>.</span>
                </label>
                <p>Consulta también la <Link href="/legal#privacidad" target="_blank" className="underline">Política de privacidad</Link>. La usamos para informarte sobre el tratamiento necesario para prestar el servicio.</p>
              </div>
            )}

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
