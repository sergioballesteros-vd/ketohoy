import { describe, it, expect, vi } from 'vitest'
import { CATEGORIES } from '@/lib/categories'
vi.mock('@/lib/mercadona', () => ({ searchMercadonaProducts: vi.fn(async () => []), productMatchesMercadonaCategory: vi.fn(() => true) }))
vi.mock('@/lib/rateLimit', () => ({ rateLimit: () => ({ ok: true }) }))
import { GET } from '../category/[name]/route'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ExploreClient from '@/app/explore/ExploreClient'

describe('visible catalog categories', () => {
  it('only renders chips accepted by the API, including valid empty results', async () => {
    const html = renderToStaticMarkup(createElement(ExploreClient))
    const visible = CATEGORIES.filter(({ label }) => html.includes(`>${label}</button>`))
    expect(visible.length).toBeGreaterThan(0)
    for (const { key } of visible) {
      const response = await GET(new Request(`http://localhost/api/mercadona/category/${key}`), { params: Promise.resolve({ name: key }) })
      expect(response.status, key).toBe(200)
      expect(await response.json()).toEqual({ products: [], category: key })
    }
  })
})
