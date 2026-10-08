'use client'

import Link from 'next/link'
import { ChevronRight, Settings } from 'lucide-react'
import { LogoMark } from '@/components/icons'
import { RecipeImage, RecipeImageAttribution } from '@/components/RecipeImage'
import { productosCount, pluralize } from '@/lib/pluralize'
import { recipeAvailabilityLabel } from '@/lib/recipeAvailability'
import type { HomeRecipe } from '@/app/page'
import FirstUseGuide from '@/components/FirstUseGuide'
import { useRef } from 'react'

type HomePageClientProps = {
  userId: string
  stats: {
    pantryCount: number
    recipesAvailable: number
    shoppingCount: number
    onboarding: { show: boolean; step: 2 | 3 }
    featured: HomeRecipe | null
    more: HomeRecipe[]
  }
}

const difficultyLabel: Record<string, string> = {
  very_easy: 'Muy fácil',
  easy: 'Fácil',
  medium: 'Media',
}

function coverage(r: HomeRecipe) {
  return recipeAvailabilityLabel(r.availability)
}

function RecipePhoto({ recipe, sizes, className }: { recipe: HomeRecipe; sizes: string; className?: string }) {
  return <RecipeImage title={recipe.title} sizes={sizes} className={className ?? ''} />
}

export default function HomePageClient({ userId, stats }: HomePageClientProps) {
  const { featured, more } = stats
  const headingRef = useRef<HTMLHeadingElement>(null)

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
        <h1 ref={headingRef} tabIndex={-1} className="rounded text-2xl font-semibold text-forest-50 focus:outline-2 focus:outline-offset-4 focus:outline-[#a3e635]">Hoy</h1>
      </section>

      {stats.onboarding.show && (
        <FirstUseGuide userId={userId} step={stats.onboarding.step} onDismiss={() => headingRef.current?.focus({ preventScroll: true })} />
      )}

      {/* 1. Food first: today's pick */}
      {featured ? (
        <section className="mt-6" aria-label="Recomendación de hoy">
          <Link href={`/recipes/${featured.id}`} className="group block">
            <RecipePhoto
              recipe={featured}
              sizes="(min-width: 672px) 630px, 100vw"
              className="aspect-[2/1] rounded-lg"
            />
            <h2 className="mt-4 text-[22px] leading-tight font-semibold text-forest-50 group-hover:underline">
              {featured.title}
            </h2>
          </Link>
          <RecipeImageAttribution title={featured.title} />
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-sm text-forest-300">
            <span className="inline-flex items-center gap-1">
              {featured.prepTimeMinutes} min
            </span>
            <span aria-hidden>·</span>
            <span>{difficultyLabel[featured.difficulty] ?? featured.difficulty}</span>
            <span aria-hidden>·</span>
            <span className={featured.availability.ready ? 'font-semibold text-[#a3e635]' : ''}>{coverage(featured)}</span>
          </p>
        </section>
      ) : (
        <section className="mt-6 py-3">
          <p className="mt-3 font-semibold text-forest-50">Aún no hay recetas para sugerirte</p>
          <p className="mt-1 text-sm text-forest-300">Revisa tus preferencias o añade productos a la despensa.</p>
        </section>
      )}

      {/* 2. Available ideas */}
      <section className="mt-8">
        <Link
          href="/meals"
          className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 hover:text-forest-50"
        >
          <span>
            {stats.recipesAvailable > 0 ? (
              <>
                <span className="text-sm text-forest-200">{stats.recipesAvailable}</span>{' '}
                <span className="text-sm text-forest-200">
                  {pluralize(stats.recipesAvailable, 'receta con ingredientes en tu despensa', 'recetas con ingredientes en tu despensa')}
                </span>
              </>
            ) : (
              <span className="text-sm text-forest-200">Explora recetas keto</span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-0.5 text-sm font-semibold whitespace-nowrap text-[#a3e635]">
            Ver ideas <ChevronRight size={16} />
          </span>
        </Link>

        {more.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-4">
            {more.map(r => (
              <div key={r.id} className="min-w-0 rounded-lg">
                <Link href={`/recipes/${r.id}`} className="block">
                  <RecipePhoto recipe={r} sizes="(min-width: 640px) 180px, 45vw" className="aspect-[4/3] rounded-lg" />
                  <p className="mt-2 line-clamp-2 text-sm leading-snug font-semibold text-forest-50">{r.title}</p>
                  <p className="mt-0.5 text-xs text-forest-300">{r.prepTimeMinutes} min · {coverage(r)}</p>
                </Link>
                <RecipeImageAttribution title={r.title} />
              </div>
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
              label: 'Despensa',
              value: stats.pantryCount > 0 ? `${productosCount(stats.pantryCount)} en casa` : 'Añade lo que tienes',
            },
            {
              href: '/shopping-list',
              label: 'Lista de compra',
              value:
                stats.shoppingCount > 0
                  ? `${productosCount(stats.shoppingCount)} ${pluralize(stats.shoppingCount, 'pendiente', 'pendientes')}`
                  : 'Sin pendientes',
            },
            { href: '/weekly-plan', label: 'Plan semanal', value: 'Ver menú' },
          ].map(({ href, label, value }) => (
            <li key={href}>
              <Link href={href} className="flex min-h-14 items-center gap-3 py-2 transition-colors hover:text-forest-50">
                <span className="min-w-0 flex-1 text-[15px] font-medium text-forest-50">{label}</span>
                <span className="max-w-[55%] text-right text-sm text-forest-300">{value}</span>
                <ChevronRight size={16} className="text-forest-500" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
