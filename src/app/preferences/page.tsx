'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronLeft, Loader2, LogOut } from 'lucide-react'
import type { KetoMode } from '@/lib/recipeScoring'
import { Skeleton, focusRing } from '@/components/ui'
import { apiFetch } from '@/lib/apiFetch'
import { clearShoppingListSnapshots } from '@/lib/shoppingListSnapshot'

type Preferences = {
  id: string
  ketoMode: KetoMode
  avoidFish: boolean
  avoidPork: boolean
  avoidDairy: boolean
  maxCookingMinutes: number
}

const KETO_MODES = [
  { value: 'strict' as KetoMode, label: 'Keto estricto', desc: 'Menos de 20 g de carbos al día' },
  { value: 'flexible' as KetoMode, label: 'Keto flexible', desc: '20-50 g de carbos al día' },
  { value: 'low_carb' as KetoMode, label: 'Low carb', desc: 'Menos de 100 g de carbos al día' },
]

const AVOID = [
  { key: 'avoidFish' as const, label: 'Pescado y marisco' },
  { key: 'avoidPork' as const, label: 'Cerdo y embutidos' },
  { key: 'avoidDairy' as const, label: 'Lácteos' },
]

function preferenceValues(prefs: Preferences | null) {
  if (!prefs) return null
  const { ketoMode, avoidFish, avoidPork, avoidDairy, maxCookingMinutes } = prefs
  return JSON.stringify({ ketoMode, avoidFish, avoidPork, avoidDairy, maxCookingMinutes })
}

function clearLocalFavorites() {
  try { localStorage.removeItem('ketohoy:favoriteProductIds') } catch { /* Browser storage can be disabled. */ }
}

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const allowLeave = useRef(false)
  const [saving, setSaving] = useState(false)
  const [persisted, setPersisted] = useState<Preferences | null>(null)
  const dirty = preferenceValues(prefs) !== preferenceValues(persisted)
  const saved = persisted !== null && !dirty && !saving
  const [error, setError] = useState<string | null>(null)
  const [account, setAccount] = useState<{ email: string; emailVerified: boolean } | null>(null)
  const [resend, setResend] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  useEffect(() => {
    apiFetch('/api/auth/me')
      .then(r => (r.ok ? r.json() : null))
      .then(setAccount)
      .catch(() => {})
  }, [])

  const resendVerification = async () => {
    setResend('busy')
    try {
      setResend((await apiFetch('/api/auth/resend-verification', { method: 'POST' })).ok ? 'sent' : 'error')
    } catch {
      setResend('error')
    }
  }

  useEffect(() => {
    apiFetch('/api/preferences')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((loaded: Preferences) => {
        setPrefs(loaded)
        setPersisted(loaded)
      })
      .catch(() => setError('No se pudieron cargar las preferencias'))
  }, [])

  useEffect(() => {
    if (!dirty) return
    const message = 'Tienes cambios sin guardar. ¿Quieres salir y perderlos?'
    const currentUrl = window.location.href
    const currentState: unknown = window.history.state
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (allowLeave.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    // Capture before Next's link handlers so navigation from any internal link is covered.
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(link instanceof HTMLAnchorElement) || link.target === '_blank' || link.hasAttribute('download')) return
      if (link.href === currentUrl || new URL(link.href).origin !== window.location.origin) return
      if (!window.confirm(message)) {
        event.preventDefault()
        event.stopPropagation()
      }
    }
    const navigation = (window as Window & { navigation?: EventTarget }).navigation
    let traverseConfirmed = false
    const navigate = (event: Event) => {
      if ('navigationType' in event && event.navigationType === 'traverse' && event.cancelable) {
        if (!window.confirm(message)) event.preventDefault()
        else traverseConfirmed = true
      }
    }
    const popState = (event: PopStateEvent) => {
      if (traverseConfirmed) {
        traverseConfirmed = false
        return
      }
      if (!window.confirm(message)) {
        event.stopImmediatePropagation()
        // Restore this entry before the router handles the traversal; retain its router state.
        window.history.pushState(currentState, '', currentUrl)
      }
    }
    navigation?.addEventListener('navigate', navigate)
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', click, true)
    window.addEventListener('popstate', popState, true)
    return () => {
      navigation?.removeEventListener('navigate', navigate)
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', click, true)
      window.removeEventListener('popstate', popState, true)
    }
  }, [dirty])

  const handleSave = async () => {
    if (!prefs || saving) return
    setSaving(true)
    setError(null)
    try {
      const res = await apiFetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      if (!res.ok) throw new Error('save failed')
      setPersisted(await res.json())
    } catch {
      setError('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-screen px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <Link
        href="/"
        className={`-ml-2 inline-flex h-11 items-center gap-0.5 rounded-lg pr-3 pl-1 text-sm font-semibold text-forest-300 hover:text-forest-50 ${focusRing}`}
      >
        <ChevronLeft size={18} /> Inicio
      </Link>
      <h1 className="mt-1 text-xl min-[360px]:text-2xl font-semibold text-forest-50">Preferencias</h1>
      <p className="mt-0.5 text-sm text-forest-300">Filtran las recetas y el plan semanal.</p>

      {!prefs ? (
        error ? (
          <p role="alert" className="mt-6 rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : (
          <div className="mt-6 space-y-3" aria-busy="true">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        )
      ) : (
        <>
          <section className="mt-6" aria-labelledby="keto-mode">
            <h2 id="keto-mode" className="text-xs font-semibold tracking-wider text-forest-300 uppercase">
              Modo keto
            </h2>
            <div role="group" aria-labelledby="keto-mode" className="mt-1 divide-y divide-forest-800">
              {KETO_MODES.map(({ value, label, desc }) => {
                const active = prefs.ketoMode === value
                return (
                  <label key={value} className="flex min-h-16 w-full cursor-pointer items-center gap-3 py-2">
                    <span className="flex-1">
                      <span className="block text-[15px] text-forest-50">{label}</span>
                      <span className="block text-xs text-forest-300">{desc}</span>
                    </span>
                    <input
                      type="radio"
                      name="ketoMode"
                      value={value}
                      checked={active}
                      onChange={() => setPrefs({ ...prefs, ketoMode: value })}
                      className="h-5 w-5 accent-[#a3e635]"
                    />
                  </label>
                )
              })}
            </div>
          </section>

          <section className="mt-6" aria-labelledby="avoid">
            <h2 id="avoid" className="text-xs font-semibold tracking-wider text-forest-300 uppercase">
              No quiero comer
            </h2>
            <ul className="mt-1 divide-y divide-forest-800">
              {AVOID.map(({ key, label }) => (
                <li key={key} className="flex min-h-14 items-center gap-3 py-2">
                  <span id={`avoid-${key}`} className="flex-1 text-[15px] text-forest-50">
                    {label}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs[key]}
                    aria-labelledby={`avoid-${key}`}
                    onClick={() => setPrefs({ ...prefs, [key]: !prefs[key] })}
                    className={`relative hit-area h-7 w-12 shrink-0 rounded-full transition-colors ${focusRing} ${prefs[key] ? 'bg-[#a3e635]' : 'bg-forest-700'}`}
                  >
                    <span
                      className={`absolute top-0.5 left-0 h-6 w-6 rounded-full transition-transform ${prefs[key] ? 'translate-x-[1.375rem] bg-forest-950' : 'translate-x-0.5 bg-forest-300'}`}
                    />
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6">
            <div className="flex items-baseline justify-between">
              <label htmlFor="max-time" className="text-xs font-semibold tracking-wider text-forest-300 uppercase">
                Tiempo máximo de cocina
              </label>
              <span className="text-base text-forest-50">
                {prefs.maxCookingMinutes} <span className="text-sm font-normal text-forest-300">min</span>
              </span>
            </div>
            <input
              id="max-time"
              type="range"
              min={5}
              max={60}
              step={5}
              value={prefs.maxCookingMinutes}
              onChange={e => setPrefs({ ...prefs, maxCookingMinutes: parseInt(e.target.value) })}
              className="mt-3 h-11 w-full accent-[#a3e635]"
            />
            <div className="flex justify-between text-xs text-forest-400">
              <span>5 min</span>
              <span>60 min</span>
            </div>
          </section>

          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
            className={`mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-lg font-semibold disabled:opacity-50 ${focusRing} ${
              saved ? 'bg-forest-700 text-[#a3e635]' : 'bg-[#a3e635] text-forest-950'
            }`}
          >
            {saving && <Loader2 size={18} className="animate-spin" />}
            {saved && <Check size={16} strokeWidth={3} />}
            {saving ? 'Guardando…' : saved ? 'Guardado' : 'Guardar preferencias'}
          </button>
          <p role="status" className="mt-2 text-sm text-forest-200">{saving ? 'Guardando preferencias…' : dirty ? 'Cambios sin guardar' : saved ? 'Preferencias guardadas' : ''}</p>
          {error && (
            <p role="alert" className="mt-3 text-center text-sm text-red-300">
              {error}
            </p>
          )}
        </>
      )}

      {account && (
        <section className="mt-8" aria-labelledby="account">
          <h2 id="account" className="text-xs font-semibold tracking-wider text-forest-300 uppercase">
            Cuenta
          </h2>
          <p className="mt-2 text-[15px] break-all text-forest-50">{account.email}</p>
          {account.emailVerified ? (
            <p className="mt-1 text-sm text-forest-300">Email confirmado</p>
          ) : (
            <div className="mt-1 text-sm text-forest-300">
              <p>Email sin confirmar.</p>
              <button
                type="button"
                onClick={() => void resendVerification()}
                disabled={resend === 'busy' || resend === 'sent'}
                className={`-ml-1 mt-1 inline-flex h-11 items-center rounded-lg px-1 font-semibold text-[#a3e635] underline underline-offset-4 disabled:no-underline disabled:opacity-70 ${focusRing}`}
              >
                {resend === 'sent' ? 'Enlace enviado' : 'Reenviar enlace de confirmación'}
              </button>
              <p role="status" className="text-red-300">
                {resend === 'error' ? 'No se pudo enviar. Inténtalo en un minuto.' : ''}
              </p>
            </div>
          )}
          <button
            type="button"
            disabled={exporting}
            onClick={async () => {
              setExporting(true)
              setExportError('')
              let favoriteProductIds: string[] = []
              try {
                const stored = JSON.parse(localStorage.getItem('ketohoy:favoriteProductIds') ?? '[]')
                if (Array.isArray(stored)) favoriteProductIds = stored.filter((id): id is string => typeof id === 'string')
              } catch { /* An invalid local cache does not block server data export. */ }
              try {
                const response = await apiFetch('/api/account/export', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ favoriteProductIds }),
                })
                if (!response.ok) throw new Error('export failed')
                const url = URL.createObjectURL(await response.blob())
                const link = document.createElement('a')
                link.href = url
                link.download = 'ketohoy-data-export.json'
                link.click()
                window.setTimeout(() => URL.revokeObjectURL(url), 1000)
              } catch {
                setExportError('No se pudieron exportar los datos. Inténtalo de nuevo más tarde.')
              } finally {
                setExporting(false)
              }
            }}
            className={`mt-4 inline-flex min-h-11 items-center rounded-lg px-1 font-semibold text-[#a3e635] underline underline-offset-4 disabled:opacity-60 ${focusRing}`}
          >
            {exporting ? 'Preparando descarga…' : 'Exportar mis datos'}
          </button>
          <p className="mt-1 text-xs text-forest-400">Descarga un archivo JSON con tus datos de cuenta y contenido.</p>
          <p role="status" className="text-sm text-red-300">{exportError}</p>
          <details className="mt-5 rounded-xl border border-red-900/60 p-3">
            <summary className={`min-h-11 cursor-pointer py-2 font-semibold text-red-300 ${focusRing}`}>
              Eliminar cuenta
            </summary>
            <p className="mt-2 text-sm text-forest-200">
              Se eliminarán de la base activa tu cuenta, preferencias, despensa, compras, planes y productos manuales privados. Las copias históricas expiran según su retención y no se borran instantáneamente.
            </p>
            <form
              className="mt-4 space-y-3"
              onSubmit={async event => {
                event.preventDefault()
                setDeleting(true)
                setDeleteError('')
                try {
                  const response = await apiFetch('/api/account/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ confirmEmail, password: deletePassword }),
                  })
                  if (!response.ok) {
                    setDeleteError(response.status === 400 ? 'Comprueba el email y la contraseña.' : 'No se pudo completar el borrado. Inténtalo de nuevo más tarde.')
                    return
                  }
                  allowLeave.current = true
                  clearLocalFavorites()
                  clearShoppingListSnapshots()
                  window.location.replace('/login')
                } catch {
                  setDeleteError('No se pudo completar el borrado. Inténtalo de nuevo más tarde.')
                } finally {
                  setDeleting(false)
                }
              }}
            >
              <label className="block text-sm text-forest-100">
                Escribe tu email para confirmar
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={confirmEmail}
                  onChange={event => setConfirmEmail(event.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-forest-700 bg-forest-950 px-3 text-forest-50"
                />
              </label>
              <label className="block text-sm text-forest-100">
                Contraseña actual (si tu cuenta tiene contraseña)
                <input
                  type="password"
                  autoComplete="current-password"
                  value={deletePassword}
                  onChange={event => setDeletePassword(event.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-forest-700 bg-forest-950 px-3 text-forest-50"
                />
              </label>
              <button
                type="submit"
                disabled={deleting}
                className={`min-h-11 rounded-lg bg-red-900 px-4 font-semibold text-white disabled:opacity-60 ${focusRing}`}
              >
                {deleting ? 'Eliminando cuenta…' : 'Eliminar permanentemente mi cuenta'}
              </button>
              <p role="alert" className="text-sm text-red-300">{deleteError}</p>
            </form>
          </details>
        </section>
      )}

      <button
        type="button"
        onClick={async () => {
          if (dirty && !window.confirm('Tienes cambios sin guardar. ¿Quieres salir y perderlos?')) return
          allowLeave.current = true
          try { await fetch('/api/auth/logout', { method: 'POST' }) } catch { /* Clear local private data even when the network is gone. */ } finally {
            clearLocalFavorites()
            clearShoppingListSnapshots()
            window.location.replace('/login')
          }
        }}
        className={`mx-auto mt-8 flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-forest-300 hover:text-forest-50 ${focusRing}`}
      >
        <LogOut size={16} /> Cerrar sesión
      </button>

      <p className="mt-4 px-4 pb-4 text-center text-xs text-forest-400">No sustituye consejo médico o nutricional profesional.</p>
    </main>
  )
}
