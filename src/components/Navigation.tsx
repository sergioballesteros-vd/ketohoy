'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { HomeIcon, MealsIcon, CartIcon, ExploreIcon } from '@/components/icons'

const navItems = [
  { href: '/', label: 'Inicio', Icon: HomeIcon },
  { href: '/explore', label: 'Descubrir', Icon: ExploreIcon },
  { href: '/meals', label: 'Recetas', Icon: MealsIcon },
  { href: '/shopping-list', label: 'Compra', Icon: CartIcon },
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
                active ? 'text-[#c7f23a]' : 'text-forest-500'
              }`}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-[#a3e635]"
                />
              )}
              <Icon size={19} />
              <span className={`text-[10px] font-medium tracking-tight sm:block ${active ? 'opacity-100' : 'opacity-75'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
