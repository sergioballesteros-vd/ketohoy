'use client'
import { usePathname } from 'next/navigation'
import { pageWidthClass } from '@/lib/pageWidth'

export default function PageShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // bottom padding clears the fixed tab bar including the iOS home-indicator inset
  return <div className={`mx-auto ${pageWidthClass(pathname)} pb-[calc(5rem+env(safe-area-inset-bottom))]`}>{children}</div>
}
