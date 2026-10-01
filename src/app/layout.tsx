import type { Metadata, Viewport } from 'next'
import { DM_Sans, Syne } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'
import PageShell from '@/components/PageShell'
import { cookies } from 'next/headers'
import { appUrl } from '@/lib/appUrl'

// Self-hosted at build time (no request to Google from the browser). Same weights as the old
// Google Fonts URL: Syne 600-800, DM Sans is one variable file (wght + opsz axes), Syne only 600-800.
const syne = Syne({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--nf-syne', display: 'swap' })
const dmSans = DM_Sans({ subsets: ['latin'], axes: ['opsz'], variable: '--nf-dm-sans', display: 'swap' })

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
    <html lang="es" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="min-h-screen">
        <PageShell signedIn={signedIn}>{children}</PageShell>
        {signedIn && <Navigation />}
      </body>
    </html>
  )
}
