import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'
import PageShell from '@/components/PageShell'
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <PageShell>{children}</PageShell>
        <Navigation />
      </body>
    </html>
  )
}
