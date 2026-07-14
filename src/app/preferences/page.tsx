'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { KetoMode } from '@/lib/recipeScoring'

type Preferences = {
  id: string
  ketoMode: KetoMode
  avoidFish: boolean
  avoidPork: boolean
  avoidDairy: boolean
  maxCookingMinutes: number
}

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/preferences').then(r => r.json()).then(setPrefs)
  }, [])

  const handleSave = async () => {
    if (!prefs) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const res = await fetch('/api/preferences', {
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

  if (!prefs) return <div className="p-4" style={{ color: '#547856' }}>Cargando...</div>

  return (
    <main className="px-4 pt-4 pb-8">
      <div className="flex items-center justify-between pt-2 pb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'Syne, sans-serif', color: '#ecf5e0' }}>
          Preferencias
        </h1>
        <Link href="/" className="text-sm transition-colors" style={{ color: '#547856' }}>← Inicio</Link>
      </div>

      <div className="space-y-4 pb-4">
        {/* Keto mode */}
        <div className="rounded-2xl p-4" style={{ background: '#142514', border: '1px solid #1c321d' }}>
          <label className="block font-semibold mb-3" style={{ color: '#ecf5e0' }}>Modo keto</label>
          <div className="space-y-2">
            {[
              { value: 'strict' as KetoMode, label: 'Keto estricto', desc: '<20g carbos/día', emoji: '🥑' },
              { value: 'flexible' as KetoMode, label: 'Keto flexible', desc: '20-50g carbos/día', emoji: '🍳' },
              { value: 'low_carb' as KetoMode, label: 'Low carb', desc: '<100g carbos/día', emoji: '🥗' },
            ].map(opt => {
              const active = prefs.ketoMode === opt.value
              return (
                <button
                  key={opt.value}
                  onClick={() => setPrefs({ ...prefs, ketoMode: opt.value })}
                  className="w-full text-left rounded-xl px-4 py-3 transition-all flex items-center gap-3"
                  style={active
                    ? { background: 'rgba(163,230,53,0.12)', border: '1px solid rgba(163,230,53,0.3)' }
                    : { background: '#1c321d', border: '1px solid transparent' }
                  }
                >
                  <span className="text-xl">{opt.emoji}</span>
                  <div className="flex-1">
                    <div
                      className="font-semibold text-sm"
                      style={{ color: active ? '#a3e635' : '#ecf5e0' }}
                    >
                      {opt.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: '#547856' }}>{opt.desc}</div>
                  </div>
                  {active && <span className="text-sm" style={{ color: '#a3e635' }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Avoid ingredients */}
        <div className="rounded-2xl p-4" style={{ background: '#142514', border: '1px solid #1c321d' }}>
          <label className="block font-semibold mb-3" style={{ color: '#ecf5e0' }}>No quiero comer</label>
          <div className="space-y-3">
            {[
              { key: 'avoidFish' as const, label: 'Pescado y marisco', emoji: '🐟' },
              { key: 'avoidPork' as const, label: 'Cerdo y embutidos', emoji: '🐷' },
              { key: 'avoidDairy' as const, label: 'Lácteos', emoji: '🧀' },
            ].map(opt => (
              <div key={opt.key} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <span>{opt.emoji}</span>
                  <span className="text-sm" style={{ color: '#ecf5e0' }}>{opt.label}</span>
                </div>
                <button
                  onClick={() => setPrefs({ ...prefs, [opt.key]: !prefs[opt.key] })}
                  className="w-12 h-6 rounded-full transition-all relative flex-shrink-0"
                  style={{ background: prefs[opt.key] ? '#a3e635' : '#1c321d' }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
                    style={{
                      background: prefs[opt.key] ? '#060e07' : '#3b5e3c',
                      transform: prefs[opt.key] ? 'translateX(1.5rem)' : 'translateX(0.125rem)',
                    }}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Max cooking time */}
        <div className="rounded-2xl p-4" style={{ background: '#142514', border: '1px solid #1c321d' }}>
          <label className="block font-semibold mb-1" style={{ color: '#ecf5e0' }}>
            Tiempo máximo de cocina
          </label>
          <p className="text-3xl font-bold mb-4" style={{ fontFamily: 'Syne, sans-serif', color: '#a3e635' }}>
            {prefs.maxCookingMinutes} <span className="text-lg font-normal" style={{ color: '#547856' }}>min</span>
          </p>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={prefs.maxCookingMinutes}
            onChange={e => setPrefs({ ...prefs, maxCookingMinutes: parseInt(e.target.value) })}
            className="w-full"
            style={{ accentColor: '#a3e635' }}
          />
          <div className="flex justify-between text-xs mt-1" style={{ color: '#3b5e3c' }}>
            <span>5 min</span>
            <span>60 min</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl font-bold text-sm transition-all"
          style={saved
            ? { background: '#264227', color: '#a3e635' }
            : { background: '#a3e635', color: '#060e07' }
          }
        >
          {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar preferencias'}
        </button>
        {error && <p className="text-sm text-center" style={{ color: '#ef4444' }}>{error}</p>}
      </div>

      <p className="text-xs text-center mt-4 px-4" style={{ color: '#264227' }}>
        No sustituye consejo médico o nutricional profesional.
      </p>
    </main>
  )
}
