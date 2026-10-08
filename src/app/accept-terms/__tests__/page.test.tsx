import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ user: { id: 'user-1' } as { id: string } | null, accepted: false }))
const redirected = vi.hoisted(() => ({ destination: '' }))
vi.mock('next/navigation', () => ({ redirect: (destination: string) => { redirected.destination = destination; throw new Error('NEXT_REDIRECT') } }))
vi.mock('@/lib/auth', () => ({ getSessionUser: async () => auth.user }))
vi.mock('@/lib/terms', () => ({ hasAcceptedCurrentTerms: () => auth.accepted }))
vi.mock('../AcceptTermsForm', () => ({ default: (props: { returnTo: string }) => props }))

import AcceptTermsPage from '../page'

describe('accept terms return destination', () => {
  beforeEach(() => {
    auth.user = { id: 'user-1' }
    auth.accepted = false
    redirected.destination = ''
  })

  it('passes a safe destination to the terms form', async () => {
    const element = await AcceptTermsPage({ searchParams: Promise.resolve({ returnTo: '/recipes/abc' }) })
    expect(element.props).toEqual({ returnTo: '/recipes/abc' })
  })

  it('uses the fallback for an unsafe destination after terms', async () => {
    const element = await AcceptTermsPage({ searchParams: Promise.resolve({ returnTo: 'https://evil.invalid' }) })
    expect(element.props).toEqual({ returnTo: '/' })
  })

  it('redirects an already accepted account to the validated destination', async () => {
    auth.accepted = true
    await expect(AcceptTermsPage({ searchParams: Promise.resolve({ returnTo: '/recipes/abc' }) })).rejects.toThrow('NEXT_REDIRECT')
    expect(redirected.destination).toBe('/recipes/abc')
  })

  it('keeps a safe destination when an unauthenticated visitor is sent to login', async () => {
    auth.user = null
    await expect(AcceptTermsPage({ searchParams: Promise.resolve({ returnTo: '/recipes/abc' }) })).rejects.toThrow('NEXT_REDIRECT')
    expect(redirected.destination).toBe('/login?returnTo=%2Frecipes%2Fabc')
  })
})
