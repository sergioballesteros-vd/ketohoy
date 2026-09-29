import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'
import PageShell from '@/components/PageShell'
import { cookies } from 'next/headers'
import { appUrl } from '@/lib/appUrl'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: { default: 'KetoHoy', template: '%s · KetoHoy' },
  description: 'Planificador de comidas keto con productos de Mercadona',
  applicationName: 'KetoHoy',
  // Default deny: the app screens are private. Public pages (recipes) opt in with robots.index = true.
  robots: { index: false, follow: false },
  openGraph: { siteName: 'KetoHoy', locale: 'es_ES', type: 'website' },
}

export const viewport: Viewport = { themeColor: '#0c1a0d' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Cookie presence only (no DB hit): signed-out visitors don't get the app tab bar.
  const signedIn = (await cookies()).has('session')
  return (
    <html lang="es">
      <body className="min-h-screen">
        <PageShell>{children}</PageShell>
        {signedIn && <Navigation />}
      </body>
    </html>
  )
}
