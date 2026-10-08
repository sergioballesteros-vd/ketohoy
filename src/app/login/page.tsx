import LoginForm from './LoginForm'
import { googleEnabled } from '@/lib/googleAuth'
import { normalizeInternalReturnTo } from '@/lib/returnTo'
import { redirect } from 'next/navigation'

// ?modo=registro opens the sign-up tab (landing CTAs link here). ?error=google comes back from a failed Google login.
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ modo?: string; error?: string; returnTo?: string | string[] }> }) {
  const { modo, error, returnTo } = await searchParams
  const destination = normalizeInternalReturnTo(Array.isArray(returnTo) ? undefined : returnTo)
  if (Array.isArray(modo) || Array.isArray(returnTo) || (modo !== undefined && modo !== 'registro')) {
    const params = new URLSearchParams()
    if (error === 'google') params.set('error', error)
    if (destination !== '/') params.set('returnTo', destination)
    redirect(`/login${params.size ? `?${params}` : ''}`)
  }
  return (
    <LoginForm
      initialError={error === 'google' ? 'No se pudo iniciar sesión con Google. Inténtalo de nuevo.' : null}
      returnTo={destination}
      google={googleEnabled()}
    />
  )
}
