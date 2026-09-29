'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Beef, Check, ChevronLeft, Fish, Leaf, Loader2, LogOut, Milk, Salad, Scale } from 'lucide-react'
import type { KetoMode } from '@/lib/recipeScoring'
import { Skeleton, focusRing } from '@/components/ui'
import { apiFetch } from '@/lib/apiFetch'

type Preferences = {
  id: string
  ketoMode: KetoMode
  avoidFish: boolean
  avoidPork: boolean
  avoidDairy: boolean
  maxCookingMinutes: number
}

const KETO_MODES = [
  { value: 'strict' as KetoMode, label: 'Keto estricto', desc: 'Menos de 20 g de carbos al día', Icon: Leaf },
  { value: 'flexible' as KetoMode, label: 'Keto flexible', desc: '20-50 g de carbos al día', Icon: Salad },
  { value: 'low_carb' as KetoMode, label: 'Low carb', desc: 'Menos de 100 g de carbos al día', Icon: Scale },
]

const AVOID = [
  { key: 'avoidFish' as const, label: 'Pescado y marisco', Icon: Fish },
  { key: 'avoidPork' as const, label: 'Cerdo y embutidos', Icon: Beef },
  { key: 'avoidDairy' as const, label: 'Lácteos', Icon: Milk },
]

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [account, setAccount] = useState<{ email: string; emailVerified: boolean } | null>(null)
  const [resend, setResend] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle')

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
      .then(setPrefs)
      .catch(() => setError('No se pudieron cargar las preferencias'))
  }, [])

  const handleSave = async () => {
    if (!prefs) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await apiFetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      })
      if (!res.ok) throw new Error('save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaved(false)
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
      <h1 className="mt-1 text-xl min-[360px]:text-2xl font-bold text-forest-50">Preferencias</h1>
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
            <div role="radiogroup" aria-labelledby="keto-mode" className="mt-1 divide-y divide-forest-800">
              {KETO_MODES.map(({ value, label, desc, Icon }) => {
                const active = prefs.ketoMode === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPrefs({ ...prefs, ketoMode: value })}
                    className={`flex min-h-16 w-full items-center gap-3 py-2 text-left ${focusRing}`}
                  >
                    <Icon size={20} className={active ? 'text-[#a3e635]' : 'text-forest-300'} />
                    <span className="flex-1">
                      <span className={`block text-[15px] font-semibold ${active ? 'text-[#a3e635]' : 'text-forest-50'}`}>{label}</span>
                      <span className="block text-xs text-forest-300">{desc}</span>
                    </span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full ${active ? 'bg-[#a3e635] text-forest-950' : 'border border-forest-500'}`}
                      aria-hidden
                    >
                      {active && <Check size={12} strokeWidth={3} />}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="mt-6" aria-labelledby="avoid">
            <h2 id="avoid" className="text-xs font-semibold tracking-wider text-forest-300 uppercase">
              No quiero comer
            </h2>
            <ul className="mt-1 divide-y divide-forest-800">
              {AVOID.map(({ key, label, Icon }) => (
                <li key={key} className="flex min-h-14 items-center gap-3 py-2">
                  <Icon size={20} className="text-forest-300" />
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
              <span className="font-syne text-2xl font-bold text-[#a3e635]">
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
            disabled={saving}
            className={`mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-2xl font-bold disabled:opacity-50 ${focusRing} ${
              saved ? 'bg-forest-700 text-[#a3e635]' : 'bg-[#a3e635] text-forest-950'
            }`}
          >
            {saving && <Loader2 size={18} className="animate-spin" />}
            {saved && <Check size={16} strokeWidth={3} />}
            {saving ? 'Guardando…' : saved ? 'Guardado' : 'Guardar preferencias'}
          </button>
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
        </section>
      )}

      <button
        type="button"
        onClick={async () => {
          await fetch('/api/auth/logout', { method: 'POST' })
          window.location.replace('/login')
        }}
        className={`mx-auto mt-8 flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-forest-300 hover:text-forest-50 ${focusRing}`}
      >
        <LogOut size={16} /> Cerrar sesión
      </button>

      <p className="mt-4 px-4 pb-4 text-center text-xs text-forest-400">No sustituye consejo médico o nutricional profesional.</p>
    </main>
  )
}
