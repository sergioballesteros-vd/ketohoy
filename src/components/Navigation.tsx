'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { House, Utensils, ShoppingCart, Compass, Package, CalendarDays } from 'lucide-react'
import { pageWidthClass } from '@/lib/pageWidth'

const navItems = [
  { href: '/', label: 'Inicio', Icon: House },
  { href: '/explore', label: 'Catálogo', Icon: Compass },
  { href: '/meals', label: 'Recetas', Icon: Utensils },
  { href: '/inventory', label: 'Despensa', Icon: Package },
  { href: '/weekly-plan', label: 'Plan', Icon: CalendarDays },
  { href: '/shopping-list', label: 'Compra', Icon: ShoppingCart },
]

export const AUTH_PATHS = ['/login', '/forgot-password', '/reset-password', '/verify-email']

// A recipe page belongs to "Recetas" for the tab bar.
const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`) || (href === '/meals' && pathname.startsWith('/recipes/'))

export default function Navigation() {
  const pathname = usePathname()
  if (AUTH_PATHS.includes(pathname)) return null

  // Full-bleed bar; the tabs sit in the same column as the page content so the two always line up.
  return (
    <nav
      aria-label="Principal"
      className="tab-bar fixed right-0 bottom-0 left-0 z-40 border-t border-forest-700 bg-forest-900 pb-[calc(env(safe-area-inset-bottom)+0.25rem)]"
    >
      <div className={`mx-auto flex px-0 pt-1 min-[360px]:px-1 ${pageWidthClass(pathname)}`}>
        {navItems.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#a3e635] ${
                active ? 'text-[#c7f23a]' : 'text-forest-300 hover:text-forest-50'
              }`}
            >
              {active && <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-b-full bg-[#a3e635]" />}
              <Icon size={19} aria-hidden />
              <span className="text-xs font-medium tracking-tight">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
