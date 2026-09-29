import type { Metadata } from 'next'
import AuthShell from '@/components/AuthShell'
import ForgotForm from './ForgotForm'

export const metadata: Metadata = { title: 'Recuperar contraseña', robots: { index: false } }

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Recupera tu contraseña">
      <ForgotForm />
    </AuthShell>
  )
}
