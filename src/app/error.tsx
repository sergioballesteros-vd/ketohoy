'use client'
import { TriangleAlert } from 'lucide-react'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="px-4 py-24 text-center">
      <TriangleAlert size={36} strokeWidth={1.5} className="mx-auto mb-3 text-forest-500" />
      <h1 className="text-xl font-bold text-forest-50">Algo ha fallado</h1>
      <p className="mt-1 text-sm text-forest-300">No es culpa tuya. Inténtalo de nuevo.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex h-11 items-center rounded-full bg-[#a3e635] px-5 text-sm font-bold text-forest-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a3e635]"
      >
        Reintentar
      </button>
    </main>
  )
}
