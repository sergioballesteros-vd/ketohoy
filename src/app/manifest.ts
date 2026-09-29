import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KetoHoy',
    short_name: 'KetoHoy',
    description: 'Planificador de comidas keto con productos de Mercadona',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c1a0d',
    theme_color: '#0c1a0d',
    icons: [
      { src: '/brand/ketohoy-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/ketohoy-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
