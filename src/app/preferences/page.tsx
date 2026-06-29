'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Preferences = {
  id: string
  ketoMode: string
  avoidFish: boolean
  avoidPork: boolean
  avoidDairy: boolean
  maxCookingMinutes: number
}

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch('/api/preferences').then(r => r.json()).then(setPrefs)
  }, [])

  const handleSave = async () => {
    if (!prefs) return
    setSaving(true)
    await fetch('/api/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!prefs) return <div className="p-4 text-gray-500">Cargando...</div>

  return (
    <main className="p-4">
      <div className="flex items-center justify-between pt-4 pb-6">
        <h1 className="text-xl font-bold">Preferencias</h1>
        <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← Inicio</Link>
      </div>

      <div className="space-y-6">
        {/* Keto mode */}
        <div className="bg-gray-900 rounded-xl p-4">
          <label className="block font-medium mb-3">Modo keto</label>
          <div className="space-y-2">
            {[
              { value: 'strict', label: 'Keto estricto', desc: '<20g carbos/día' },
              { value: 'flexible', label: 'Keto flexible', desc: '20-50g carbos/día' },
              { value: 'low_carb', label: 'Low carb', desc: '<100g carbos/día' },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setPrefs({ ...prefs, ketoMode: opt.value })}
                className={`w-full text-left rounded-lg px-4 py-3 transition-colors ${
                  prefs.ketoMode === opt.value
                    ? 'bg-green-800 border border-green-600'
                    : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-gray-400">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Avoid ingredients */}
        <div className="bg-gray-900 rounded-xl p-4">
          <label className="block font-medium mb-3">No quiero comer</label>
          <div className="space-y-3">
            {[
              { key: 'avoidFish' as const, label: '🐟 Pescado y marisco' },
              { key: 'avoidPork' as const, label: '🐷 Cerdo y embutidos' },
              { key: 'avoidDairy' as const, label: '🧀 Lácteos' },
            ].map(opt => (
              <div key={opt.key} className="flex items-center justify-between">
                <span className="text-sm">{opt.label}</span>
                <button
                  onClick={() => setPrefs({ ...prefs, [opt.key]: !prefs[opt.key] })}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    prefs[opt.key] ? 'bg-green-600' : 'bg-gray-700'
                  }`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    prefs[opt.key] ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Max cooking time */}
        <div className="bg-gray-900 rounded-xl p-4">
          <label className="block font-medium mb-3">
            Tiempo máximo de cocina: <span className="text-green-400">{prefs.maxCookingMinutes} min</span>
          </label>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={prefs.maxCookingMinutes}
            onChange={e => setPrefs({ ...prefs, maxCookingMinutes: parseInt(e.target.value) })}
            className="w-full accent-green-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5 min</span>
            <span>60 min</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className={`w-full py-3 rounded-xl font-medium transition-colors ${
            saved
              ? 'bg-green-700 text-white'
              : 'bg-green-600 hover:bg-green-500 text-white'
          }`}
        >
          {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar preferencias'}
        </button>
      </div>

      <p className="text-xs text-gray-600 text-center mt-6 px-4">
        Esta app no sustituye el consejo médico o nutricional profesional.
      </p>
    </main>
  )
}
