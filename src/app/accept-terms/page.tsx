import { redirect } from 'next/navigation'
import { getSessionUser } from '@/lib/auth'
import { hasAcceptedCurrentTerms } from '@/lib/terms'
import AcceptTermsForm from './AcceptTermsForm'

export default async function AcceptTermsPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (hasAcceptedCurrentTerms(user)) redirect('/')
  return <AcceptTermsForm />
}
