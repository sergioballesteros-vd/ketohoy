import LoginForm from './LoginForm'
import { googleEnabled } from '@/lib/googleAuth'

// ?modo=registro opens the sign-up tab (landing CTAs link here). ?error=google comes back from a failed Google login.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ modo?: string; error?: string }> }) {
  const { modo, error } = await searchParams
  return (
    <LoginForm
      initialMode={modo === 'registro' ? 'register' : 'login'}
      initialError={error === 'google' ? 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.' : null}
      google={googleEnabled()}
    />
  )
}
