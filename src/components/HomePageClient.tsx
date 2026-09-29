'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ChefHat, ChevronRight, Clock, Settings } from 'lucide-react'
import { LogoMark, CartIcon, PantryIcon, CalendarIcon } from '@/components/icons'
import { productosCount, pluralize } from '@/lib/pluralize'
import type { HomeRecipe } from '@/app/page'

type HomePageClientProps = {
  stats: {
    pantryCount: number
    recipesAvailable: number
    shoppingCount: number
    featured: HomeRecipe | null
    more: HomeRecipe[]
  }
  greeting: {
    text: string
    sub: string
  }
}

const difficultyLabel: Record<string, string> = {
  very_easy: 'Muy fácil',
  easy: 'Fácil',
  medium: 'Media',
}

function coverage(r: HomeRecipe) {
  if (r.missingCount === 0) return 'Tienes todo'
  if (r.missingCount === 1) return 'Te falta 1 ingrediente'
  return `Te faltan ${r.missingCount} ingredientes`
}

function RecipePhoto({ recipe, sizes, className }: { recipe: HomeRecipe; sizes: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-forest-800 ${className ?? ''}`}>
      {recipe.imageUrl ? (
        <Image src={recipe.imageUrl} alt="" fill sizes={sizes} className="object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-forest-500">
          <ChefHat size={36} strokeWidth={1.5} />
        </div>
      )}
    </div>
  )
}

export default function HomePageClient({ stats, greeting }: HomePageClientProps) {
  const { featured, more } = stats

  return (
    <main className="min-h-screen px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LogoMark size={24} />
          <span className="font-syne text-base font-bold text-forest-50">KetoHoy</span>
        </div>
        <Link
          href="/preferences"
          aria-label="Preferencias y cuenta"
          className="relative hit-area flex h-10 w-10 items-center justify-center rounded-full text-forest-300 transition-colors hover:bg-forest-800 hover:text-forest-50"
        >
          <Settings size={20} />
        </Link>
      </header>

      <section className="mt-6">
        <p className="text-sm font-medium text-forest-300">{greeting.text}</p>
        <h1 className="mt-1 text-[28px] leading-[1.1] font-extrabold text-forest-50">{greeting.sub}</h1>
      </section>

      {/* 1. Food first: today's pick */}
      {featured ? (
        <section className="mt-6" aria-label="Recomendación de hoy">
          <Link href={`/recipes/${featured.id}`} className="group block">
            <RecipePhoto
              recipe={featured}
              sizes="(min-width: 672px) 630px, 100vw"
              className="aspect-[4/3] rounded-3xl sm:aspect-[2/1]"
            />
            <h2 className="mt-4 text-[22px] leading-tight font-bold text-forest-50 group-hover:underline">
              {featured.title}
            </h2>
          </Link>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-forest-300">
            <span className="inline-flex items-center gap-1">
              <Clock size={14} /> {featured.prepTimeMinutes} min
            </span>
            <span aria-hidden>·</span>
            <span>{difficultyLabel[featured.difficulty] ?? featured.difficulty}</span>
            <span aria-hidden>·</span>
            <span className={featured.missingCount === 0 ? 'font-semibold text-[#a3e635]' : ''}>{coverage(featured)}</span>
          </p>
          <Link
            href={`/recipes/${featured.id}`}
            className="mt-4 flex h-12 w-full items-center justify-center rounded-2xl bg-[#a3e635] text-[15px] font-bold text-forest-950 transition-opacity hover:opacity-90 active:opacity-80"
          >
            Ver receta
          </Link>
        </section>
      ) : (
        <section className="mt-6 rounded-3xl bg-forest-800 p-6 text-center">
          <ChefHat size={32} strokeWidth={1.5} className="mx-auto text-forest-400" />
          <p className="mt-3 font-semibold text-forest-50">Aún no hay recetas para sugerirte</p>
          <p className="mt-1 text-sm text-forest-300">Revisa tus preferencias o añade productos a la despensa.</p>
        </section>
      )}

      {/* 2. Available ideas */}
      <section className="mt-8">
        <Link
          href="/meals"
          className="flex items-center justify-between gap-3 rounded-2xl border border-forest-700 px-4 py-3.5 transition-colors hover:bg-forest-800"
        >
          <span>
            {stats.recipesAvailable > 0 ? (
              <>
                <span className="font-syne text-2xl font-bold text-[#a3e635]">{stats.recipesAvailable}</span>{' '}
                <span className="text-[15px] font-semibold text-forest-50">
                  {pluralize(stats.recipesAvailable, 'receta que puedes hacer', 'recetas que puedes hacer')}
                </span>
              </>
            ) : (
              <span className="text-[15px] font-semibold text-forest-50">Explora recetas keto</span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold whitespace-nowrap text-[#a3e635]">
            Ver ideas <ChevronRight size={16} />
          </span>
        </Link>

        {more.length > 0 && (
          <div className="hide-scrollbar -mx-5 mt-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1">
            {more.map(r => (
              <Link key={r.id} href={`/recipes/${r.id}`} className="w-40 shrink-0 snap-start">
                <RecipePhoto recipe={r} sizes="160px" className="aspect-[4/3] rounded-2xl" />
                <p className="mt-2 line-clamp-2 text-sm leading-snug font-semibold text-forest-50">{r.title}</p>
                <p className="mt-0.5 text-xs text-forest-300">
                  {r.prepTimeMinutes} min · {r.missingCount === 0 ? 'Tienes todo' : `Faltan ${r.missingCount}`}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 3. Management: quiet, one grouped list */}
      <section className="mt-8" aria-label="Tu cocina">
        <h2 className="mb-1 text-xs font-semibold tracking-wider text-forest-400 uppercase">Tu cocina</h2>
        <ul className="divide-y divide-forest-800">
          {[
            {
              href: '/inventory',
              Icon: PantryIcon,
              label: 'Despensa',
              value: stats.pantryCount > 0 ? `${productosCount(stats.pantryCount)} en casa` : 'Añade lo que tienes',
            },
            {
              href: '/shopping-list',
              Icon: CartIcon,
              label: 'Lista de compra',
              value:
                stats.shoppingCount > 0
                  ? `${productosCount(stats.shoppingCount)} ${pluralize(stats.shoppingCount, 'pendiente', 'pendientes')}`
                  : 'Sin pendientes',
            },
            { href: '/weekly-plan', Icon: CalendarIcon, label: 'Plan semanal', value: 'Menú de la semana' },
          ].map(({ href, Icon, label, value }) => (
            <li key={href}>
              <Link href={href} className="flex min-h-14 items-center gap-3 py-2 transition-colors hover:text-forest-50">
                <Icon size={20} className="text-forest-300" />
                <span className="flex-1 text-[15px] font-medium text-forest-50">{label}</span>
                <span className="text-sm text-forest-300">{value}</span>
                <ChevronRight size={16} className="text-forest-500" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-8 px-2 text-center text-xs text-forest-400">
        No sustituye consejo médico o nutricional profesional.
      </p>
    </main>
  )
}
