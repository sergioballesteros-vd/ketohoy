import Link from 'next/link'
import Image from 'next/image'
import { db } from '@/lib/db'
import { LogoMark } from '@/components/icons'
import { focusRing } from '@/components/ui'

const STEPS = [
  { title: 'Añade lo que tienes en casa', text: 'Elige también tu modo keto y los alimentos que quieres evitar.' },
  { title: 'Genera el menú semanal', text: 'Desayuno, comida, snack y cena para siete días.' },
  { title: 'Compra solo lo que falta', text: 'La lista de compra descuenta lo que ya tienes en la despensa.' },
]

const FAQ = [
  { q: '¿Es gratis?', a: 'Crear una cuenta y usar KetoHoy no cuesta nada.' },
  { q: '¿De dónde salen los productos?', a: 'Del catálogo público de Mercadona. Los precios y la disponibilidad pueden variar en tu tienda.' },
  { q: '¿Sustituye a un nutricionista?', a: 'No. KetoHoy da ideas de recetas y compra; no es consejo médico ni nutricional. Consulta con un profesional si tienes una condición de salud.' },
]

const cta =
  `flex h-12 items-center justify-center rounded-lg bg-[#a3e635] px-6 text-[15px] font-semibold text-forest-950 ${focusRing}`

export default async function Landing() {
  const recipes = await db.recipe.findMany({
    where: { imageUrl: { not: null } },
    orderBy: { createdAt: 'asc' },
    take: 4,
    select: { id: true, title: true, prepTimeMinutes: true, imageUrl: true },
  })

  return (
    <main className="px-5 pt-[calc(env(safe-area-inset-top)+1rem)] pb-10">
      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <LogoMark size={28} />
          <span className="font-syne text-lg font-extrabold text-forest-50">KetoHoy</span>
        </span>
        <Link href="/login" className={`flex h-11 items-center rounded-xl px-3 text-sm font-semibold text-forest-100 hover:text-forest-50 ${focusRing}`}>
          Entrar
        </Link>
      </header>

      <section className="mt-10">
        <h1 className="text-[34px] leading-[1.05] font-semibold text-forest-50">
          Menú keto semanal
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-forest-200">
          Planifica según tu despensa y tus preferencias. Compra lo que falta con una lista de productos de Mercadona.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/login?modo=registro" className={cta}>Crear cuenta gratis</Link>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="how">
        <h2 id="how" className="text-xl font-semibold text-forest-50">Cómo funciona</h2>
        <ol className="mt-4 list-decimal space-y-4 pl-5 marker:text-forest-300">
          {STEPS.map(({ title, text }) => (
            <li key={title} className="pl-1">
              <span>
                <span className="block font-semibold text-forest-50">{title}</span>
                <span className="block text-sm text-forest-300">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {recipes.length > 0 && (
        <section className="mt-8" aria-labelledby="recipes">
          <h2 id="recipes" className="text-xl font-semibold text-forest-50">Algunas recetas</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {recipes.map(r => (
              <li key={r.id}>
                <Link href={`/recipes/${r.id}`} className={`group block overflow-hidden rounded-lg bg-forest-900 ${focusRing}`}>
                  <span className="relative block aspect-[4/3] bg-forest-800">
                    <Image src={r.imageUrl!} alt="" fill sizes="(min-width: 768px) 360px, 45vw" className="object-cover" />
                  </span>
                  <span className="block p-3">
                    <span className="line-clamp-2 text-sm font-semibold text-forest-50">{r.title}</span>
                    <span className="mt-1 flex items-center gap-1 text-xs text-forest-300">
                      {r.prepTimeMinutes} min
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8" aria-labelledby="faq">
        <h2 id="faq" className="text-xl font-semibold text-forest-50">Preguntas frecuentes</h2>
        <dl className="mt-4 space-y-4">
          {FAQ.map(({ q, a }) => (
            <div key={q}>
              <dt className="font-semibold text-forest-50">{q}</dt>
              <dd className="mt-1 text-sm text-forest-300">{a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  )
}
