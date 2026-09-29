import LoginForm from './LoginForm'

// ?modo=registro opens the sign-up tab (landing CTAs link here).
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ modo?: string }> }) {
  const { modo } = await searchParams
  return <LoginForm initialMode={modo === 'registro' ? 'register' : 'login'} />
}
