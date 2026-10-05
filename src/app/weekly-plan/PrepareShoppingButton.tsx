'use client'
import Link from 'next/link'
import { useRef, useState } from 'react'
import { focusRing } from '@/components/ui'
import { apiFetch } from '@/lib/apiFetch'

type Summary = { needs: number; created: number; updated: number; unchanged: number; unknown: number; historical: number }
export default function PrepareShoppingButton({ planId, incomplete, disabled }: { planId: string; incomplete: boolean; disabled: boolean }) {
  const active = useRef(false)
  const [preparing, setPreparing] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const prepare = async () => {
    if (active.current) return
    active.current = true
    setPreparing(true); setSummary(null); setError(null)
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 30_000)
    try {
      const response = await apiFetch('/api/weekly-plan/shopping-list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId }), signal: controller.signal })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo preparar la compra')
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error && err.name !== 'AbortError' ? err.message : 'No se pudo confirmar la compra semanal. Puedes reintentar sin duplicar necesidades.')
    } finally {
      window.clearTimeout(timeout); active.current = false; setPreparing(false)
    }
  }
  return <div className="mt-3 max-w-xl">
    <button type="button" onClick={() => void prepare()} disabled={preparing || incomplete || disabled} aria-busy={preparing}
      className={`min-h-11 w-full rounded-xl bg-[#a3e635] px-3 py-2 text-sm font-semibold text-forest-950 disabled:opacity-50 sm:w-auto ${focusRing}`}>
      {preparing ? 'Preparando compra…' : 'Preparar compra de esta semana'}
    </button>
    {incomplete && <p className="mt-1 text-sm text-forest-200">Plan incompleto: genera las 28 comidas para preparar la compra semanal.</p>}
    <div role="status" aria-label="Preparación de compra semanal" aria-live="polite" aria-atomic="true" className="text-sm text-forest-200">
      {preparing && <p className="mt-1">Calculando necesidades y stock de esta semana…</p>}
      {summary && <p className="mt-1">
        Compra preparada: {summary.needs} necesidades pendientes ({summary.created} nuevas, {summary.updated} actualizadas, {summary.unchanged} sin cambios).
        {summary.unknown > 0 && ` ${summary.unknown} cantidades no verificadas: revisa las necesidades antes de elegir paquetes.`}
        {summary.historical > 0 && ` ${summary.historical} necesidades ya compradas; se conserva su histórico.`}
        {' '}<Link href="/shopping-list" className={`inline-flex min-h-11 items-center rounded-lg font-semibold text-[#a3e635] underline ${focusRing}`}>Ver lista de compra</Link>
      </p>}
    </div>
    {error && <p role="alert" className="mt-1 text-sm text-red-300">{error} Vuelve a intentarlo con el botón.</p>}
  </div>
}
