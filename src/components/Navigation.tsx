'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, PantryIcon, MealsIcon, CartIcon, CalendarIcon } from '@/components/icons'

const navItems = [
  { href: '/', label: 'Inicio', Icon: HomeIcon },
  { href: '/inventory', label: 'Despensa', Icon: PantryIcon },
  { href: '/meals', label: 'Comidas', Icon: MealsIcon },
  { href: '/shopping-list', label: 'Compra', Icon: CartIcon },
  { href: '/weekly-plan', label: 'Semana', Icon: CalendarIcon },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-forest-900/95 backdrop-blur-md border-t border-forest-700"
    >
      <div className="flex">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center pt-2 pb-3 transition-all relative ${
                active ? 'text-[#a3e635]' : 'text-forest-500'
              }`}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-b-full bg-[#a3e635]"
                />
              )}
              <Icon size={20} />
              <span className="text-xs font-medium mt-1 tracking-tight">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
