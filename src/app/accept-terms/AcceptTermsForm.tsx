'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { authButton } from '@/components/AuthShell'

export default function AcceptTermsForm() {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/accept-terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptTerms: true, confirmAdult: true }),
      })
      if (!response.ok) {
        setError((await response.json().catch(() => null))?.error ?? 'No se pudo guardar la aceptación.')
        return
      }
      window.location.assign('/')
    } catch {
      setError('No se pudo conectar. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen px-5 pt-14 pb-10">
      <section className="mx-auto w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-forest-50">Antes de continuar</h1>
        <p className="mt-3 text-sm leading-6 text-forest-200">Hemos actualizado los términos de KetoHoy. Confirma que eres mayor de edad y acepta los términos para seguir usando tu cuenta.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="flex items-start gap-3 text-sm leading-5 text-forest-200">
            <input name="confirmAdult" type="checkbox" required className="mt-1 accent-[#a3e635]" />
            <span>Confirmo que tengo 18 años o más.</span>
          </label>
          <label className="flex items-start gap-3 text-sm leading-5 text-forest-200">
            <input name="acceptTerms" type="checkbox" required className="mt-1 accent-[#a3e635]" />
            <span>Acepto los <Link href="/legal#terminos" target="_blank" className="underline">Términos de uso</Link>.</span>
          </label>
          <p className="text-sm leading-5 text-forest-300">Puedes consultar la <Link href="/legal#privacidad" target="_blank" className="underline">Política de privacidad</Link>. La aceptación de términos es independiente del aviso de privacidad.</p>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          <button type="submit" disabled={busy} className={authButton}>
            {busy && <Loader2 size={18} className="animate-spin" />}
            Aceptar y continuar
          </button>
        </form>
      </section>
    </main>
  )
}
