import type { Metadata } from 'next'
import Link from 'next/link'
import AuthShell from '@/components/AuthShell'
import ResetForm from './ResetForm'

export const metadata: Metadata = { title: 'Nueva contraseña', robots: { index: false }, referrer: 'no-referrer' }

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams
  return (
    <AuthShell title="Elige una contraseña nueva">
      {token ? (
        <ResetForm token={token} />
      ) : (
        <p className="mt-3 text-sm text-forest-300">
          Falta el enlace.{' '}
          <Link href="/forgot-password" className="font-semibold text-[#a3e635] underline underline-offset-4">
            Pide uno nuevo
          </Link>
          .
        </p>
      )}
    </AuthShell>
  )
}
