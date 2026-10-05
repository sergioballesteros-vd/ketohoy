'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Check, ListPlus, Loader2 } from 'lucide-react'
import { focusRing } from '@/components/ui'
import { apiFetch } from '@/lib/apiFetch'

export default function AddMissingButton({ recipeId, allInPantry }: { recipeId: string; allInPantry: boolean }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'nothing' | 'error'>('idle')

  const add = async () => {
    setState('busy')
    try {
      const res = await apiFetch(`/api/recipes/${recipeId}/add-to-shopping-list`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setState(data.added > 0 ? 'done' : 'nothing')
    } catch {
      setState('error')
    }
  }

  if (state === 'done' || state === 'nothing') {
    return (
      <p role="status" className="flex items-center justify-center gap-2 py-3 text-sm font-semibold text-[#a3e635]">
        <Check size={16} strokeWidth={3} />
        {state === 'done' ? 'Ingredientes añadidos a tu lista.' : 'No se añadieron necesidades nuevas. Revisa tu lista.'}
        {state === 'done' && (
          <Link href="/shopping-list" className={`rounded underline underline-offset-2 ${focusRing}`}>
            Ver lista
          </Link>
        )}
      </p>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void add()}
        disabled={state === 'busy' || allInPantry}
        className={`flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#a3e635] font-semibold text-forest-950 disabled:opacity-50 ${focusRing}`}
      >
        {state === 'busy' ? <Loader2 size={18} className="animate-spin" /> : <ListPlus size={18} />}
        {allInPantry ? 'Cantidad suficiente verificada' : 'Añadir lo que falta a la lista'}
      </button>
      {state === 'error' && (
        <p role="alert" className="mt-2 text-center text-sm text-red-300">
          No se pudo añadir. Inténtalo de nuevo.
        </p>
      )}
    </>
  )
}
