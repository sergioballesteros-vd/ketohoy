'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { authButton } from '@/components/AuthShell'

// Explicit click → POST: opening the link alone never consumes the token (mail scanners prefetch links).
export default function VerifyButton({ token }: { token: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | string>('idle')

  const verify = async () => {
    setState('busy')
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      setState(res.ok ? 'ok' : ((await res.json().catch(() => null))?.error ?? 'Error inesperado'))
    } catch {
      setState('No se pudo conectar. Inténtalo de nuevo.')
    }
  }

  if (state === 'ok')
    return (
      <div role="status" className="mt-3 space-y-4 text-sm text-forest-200">
        <p>Email confirmado.</p>
        <Link href="/" className={authButton}>
          Ir a KetoHoy
        </Link>
      </div>
    )

  return (
    <div className="mt-3 space-y-4">
      <p className="text-sm text-forest-300">Pulsa para confirmar que este email es tuyo.</p>
      {state !== 'idle' && state !== 'busy' && (
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {state}
        </p>
      )}
      <button type="button" onClick={() => void verify()} disabled={state === 'busy'} className={authButton}>
        {state === 'busy' && <Loader2 size={18} className="animate-spin" />} Confirmar email
      </button>
    </div>
  )
}
