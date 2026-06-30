'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, PantryIcon, MealsIcon, CartIcon, CalendarIcon, ExploreIcon } from '@/components/icons'

const navItems = [
  { href: '/', label: 'Inicio', Icon: HomeIcon },
  { href: '/meals', label: 'Comidas', Icon: MealsIcon },
  { href: '/explore', label: 'Explorar', Icon: ExploreIcon },
  { href: '/inventory', label: 'Despensa', Icon: PantryIcon },
  { href: '/shopping-list', label: 'Compra', Icon: CartIcon },
  { href: '/weekly-plan', label: 'Semana', Icon: CalendarIcon },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 max-w-2xl mx-auto bg-forest-900/95 backdrop-blur-md border-t border-forest-700 pb-[calc(env(safe-area-inset-bottom)+0.25rem)]"
    >
      <div className="flex px-1 pt-1">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 rounded-2xl py-2 transition-all relative ${
                active ? 'text-[#a3e635]' : 'text-forest-500'
              }`}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-[#a3e635]"
                />
              )}
              <Icon size={19} />
              <span className="hidden text-[11px] font-medium tracking-tight sm:block">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
