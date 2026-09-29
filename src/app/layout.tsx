import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'
import PageShell from '@/components/PageShell'

export const metadata: Metadata = {
  title: 'KetoHoy',
  description: 'Planificador de comidas keto con productos de Mercadona',
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
