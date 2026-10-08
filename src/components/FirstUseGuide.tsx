'use client'

import Link from 'next/link'
import { useState, useSyncExternalStore } from 'react'
import { focusRing } from '@/components/ui'

type Props = {
  userId: string
  step: 2 | 3
  onDismiss: () => void
}

export default function FirstUseGuide({ userId, step, onDismiss }: Props) {
  const storageKey = `ketohoy:first-use-guide-dismissed:${userId}`
  const [dismissedThisVisit, setDismissedThisVisit] = useState(false)
  const dismissed = useSyncExternalStore(
    callback => {
      window.addEventListener('storage', callback)
      window.addEventListener('ketohoy:first-use-guide', callback)
      return () => {
        window.removeEventListener('storage', callback)
        window.removeEventListener('ketohoy:first-use-guide', callback)
      }
    },
    () => {
      try { return localStorage.getItem(storageKey) === '1' } catch { return false }
    },
    () => false,
  )

  if (dismissed || dismissedThisVisit) return null

  const dismiss = () => {
    try {
      localStorage.setItem(storageKey, '1')
    } catch {
      // Dismiss for this visit even when the browser blocks persistence.
    }
    setDismissedThisVisit(true)
    window.dispatchEvent(new Event('ketohoy:first-use-guide'))
    onDismiss()
  }

  return (
    <section className="mt-6 rounded-xl border border-forest-700 bg-forest-900/70 p-4 sm:p-5" aria-labelledby="first-use-title">
      <p className="text-xs font-semibold tracking-wider text-[#a3e635] uppercase">Empieza por aquí</p>
      <h2 id="first-use-title" className="mt-1 text-lg font-semibold text-forest-50">Tu primer menú y compra</h2>
      <p className="mt-1 text-sm text-forest-200">Puedes dejar las preferencias como están y generar un menú; la despensa es opcional.</p>

      <ol className="mt-4 space-y-2">
        <li>
          <Link href="/preferences" className={`inline-flex min-h-11 items-center rounded px-1 text-sm text-forest-100 underline decoration-forest-500 underline-offset-4 hover:text-forest-50 ${focusRing}`}>
            1. Revisar o mantener preferencias
          </Link>
        </li>
        <li>
          <Link href="/weekly-plan" aria-current={step === 2 ? 'step' : undefined} className={`inline-flex min-h-11 items-center rounded px-1 text-sm ${step === 2 ? 'font-semibold text-[#a3e635]' : 'text-forest-100'} underline decoration-forest-500 underline-offset-4 hover:text-forest-50 ${focusRing}`}>
            2. Crear o revisar el menú
          </Link>
        </li>
        <li>
          <Link href={step === 3 ? '/weekly-plan' : '/shopping-list'} aria-current={step === 3 ? 'step' : undefined} className={`inline-flex min-h-11 items-center rounded px-1 text-sm ${step === 3 ? 'font-semibold text-[#a3e635]' : 'text-forest-100'} underline decoration-forest-500 underline-offset-4 hover:text-forest-50 ${focusRing}`}>
            3. {step === 3 ? 'Preparar la compra desde el menú' : 'Consultar la lista de compra'}
          </Link>
        </li>
      </ol>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link href="/weekly-plan" className={`inline-flex min-h-11 items-center rounded-lg bg-[#a3e635] px-4 text-sm font-semibold text-forest-950 hover:bg-lime-300 ${focusRing}`}>
          {step === 3 ? 'Preparar compra' : 'Crear menú'}
        </Link>
        <button type="button" onClick={dismiss} className={`inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-medium text-forest-200 underline underline-offset-4 hover:text-forest-50 ${focusRing}`}>
          Omitir guía
        </button>
      </div>
      <p className="mt-1 text-xs text-forest-400">Si tienes ingredientes en casa, puedes añadirlos a la despensa cuando quieras.</p>
    </section>
  )
}
