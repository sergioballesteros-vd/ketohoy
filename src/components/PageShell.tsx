'use client'
import { usePathname } from 'next/navigation'
import { pageWidthClass } from '@/lib/pageWidth'
import { AUTH_PATHS } from '@/components/Navigation'

export default function PageShell({ children, signedIn }: { children: React.ReactNode; signedIn: boolean }) {
  const pathname = usePathname()
  const hasNavigation = signedIn && !AUTH_PATHS.includes(pathname)
  // bottom padding clears the fixed tab bar including the iOS home-indicator inset
  return <div className={`mx-auto ${pageWidthClass(pathname)} ${hasNavigation ? 'pb-[calc(5rem+env(safe-area-inset-bottom))]' : ''}`}>{children}</div>
}
