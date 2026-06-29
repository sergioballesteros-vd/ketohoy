import type { Metadata } from 'next'
import './globals.css'
import Navigation from '@/components/Navigation'

export const metadata: Metadata = {
  title: 'KetoHoy',
  description: 'Planificador de comidas keto con productos de Mercadona',
}

import { ViewTransitions } from 'next-view-transitions'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransitions>
      <html lang="es">
        <body className="min-h-screen">
          <div className="max-w-2xl mx-auto pb-20">
            {children}
          </div>
          <Navigation />
        </body>
      </html>
    </ViewTransitions>
  )
}
