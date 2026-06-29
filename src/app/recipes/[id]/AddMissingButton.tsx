'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AddMissingButton({ recipeId }: { recipeId: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  const handleClick = async () => {
    setLoading(true)
    const res = await fetch(`/api/recipes/${recipeId}/add-to-shopping-list`, { method: 'POST' })
    const data = await res.json()
    setLoading(false)
    if (data.added > 0) {
      setDone(true)
      setTimeout(() => router.push('/shopping-list'), 1000)
    } else {
      setDone(true) // nothing missing
    }
  }

  if (done) return (
    <div className="text-center text-green-400 py-4">
      ✓ Ingredientes añadidos a la lista de compra
    </div>
  )

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="w-full bg-orange-700 hover:bg-orange-600 disabled:opacity-50 rounded-xl py-3 text-sm font-medium transition-colors"
    >
      {loading ? 'Añadiendo...' : '🛒 Añadir ingredientes faltantes a la compra'}
    </button>
  )
}
