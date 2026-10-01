import type { Metadata } from 'next'
import Link from 'next/link'
import AuthShell from '@/components/AuthShell'
import VerifyButton from './VerifyButton'

export const metadata: Metadata = { title: 'Confirmar email', robots: { index: false }, referrer: 'no-referrer' }

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return (
    <AuthShell title="Confirma tu email">
      {token ? (
        <VerifyButton token={token} />
      ) : (
        <p className="mt-3 text-sm text-forest-300">
          Falta el enlace. Puedes pedir otro desde{' '}
          <Link href="/preferences" className="font-semibold text-[#a3e635] underline underline-offset-4">
            Preferencias
          </Link>
          .
        </p>
      )}
    </AuthShell>
  )
}
