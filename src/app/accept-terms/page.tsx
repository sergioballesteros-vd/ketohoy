import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { hasAcceptedCurrentTerms } from '@/lib/terms'
import AcceptTermsForm from './AcceptTermsForm'
import { normalizeInternalReturnTo } from '@/lib/returnTo'

export default async function AcceptTermsPage({ searchParams }: { searchParams: Promise<{ returnTo?: string | string[] }> }) {
  const { returnTo } = await searchParams
  const destination = normalizeInternalReturnTo(Array.isArray(returnTo) ? undefined : returnTo)
  const user = await getSessionUser()
  if (!user) redirect(`/login?${new URLSearchParams({ returnTo: destination })}`)
  if (hasAcceptedCurrentTerms(user)) redirect(destination)
  return <AcceptTermsForm returnTo={destination} />
}
