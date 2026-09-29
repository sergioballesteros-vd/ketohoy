'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, MealsIcon, CartIcon, ExploreIcon, PantryIcon, CalendarIcon } from '@/components/icons'
import { pageWidthClass } from '@/lib/pageWidth'

const navItems = [
  { href: '/', label: 'Inicio', Icon: HomeIcon },
  { href: '/explore', label: 'Catálogo', Icon: ExploreIcon },
  { href: '/meals', label: 'Recetas', Icon: MealsIcon },
  { href: '/inventory', label: 'Despensa', Icon: PantryIcon },
  { href: '/weekly-plan', label: 'Plan', Icon: CalendarIcon },
  { href: '/shopping-list', label: 'Compra', Icon: CartIcon },
]

// A recipe page belongs to "Recetas" for the tab bar.
const isActive = (pathname: string, href: string) =>
  href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`) || (href === '/meals' && pathname.startsWith('/recipes/'))

export default function Navigation() {
  const pathname = usePathname()
  if (pathname === '/login') return null

  // Full-bleed bar; the tabs sit in the same column as the page content so the two always line up.
  return (
    <nav
      aria-label="Principal"
      className="fixed right-0 bottom-0 left-0 z-40 border-t border-forest-700 bg-forest-900/95 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] backdrop-blur-md"
    >
      <div className={`mx-auto flex px-0 pt-1 min-[360px]:px-1 ${pageWidthClass(pathname)}`}>
        {navItems.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#a3e635] ${
                active ? 'text-[#c7f23a]' : 'text-forest-300 hover:text-forest-50'
              }`}
            >
              {active && <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-b-full bg-[#a3e635]" />}
              <Icon size={19} />
              <span className="text-[11px] font-medium tracking-tight">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
