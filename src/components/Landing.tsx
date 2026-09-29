import Link from 'next/link'
import Image from 'next/image'
import { CalendarDays, ChefHat, Clock, ShoppingCart } from 'lucide-react'
import { db } from '@/lib/db'
import { LogoMark } from '@/components/icons'
import { focusRing } from '@/components/ui'

const STEPS = [
  { Icon: ChefHat, title: 'Dinos qué tienes', text: 'Añade tu despensa y tus preferencias: keto estricto o flexible, sin pescado, cerdo o lácteos.' },
  { Icon: CalendarDays, title: 'Genera tu semana', text: 'Menú de 7 días con desayuno, comida, snack y cena, con recetas que encajan contigo.' },
  { Icon: ShoppingCart, title: 'Compra solo lo que falta', text: 'La lista se arma con productos de Mercadona y solo incluye lo que no tienes.' },
]

const FAQ = [
  { q: '¿Es gratis?', a: 'Crear una cuenta y usar KetoHoy no cuesta nada.' },
  { q: '¿De dónde salen los productos?', a: 'Del catálogo público de Mercadona. Los precios y la disponibilidad pueden variar en tu tienda.' },
  { q: '¿Sustituye a un nutricionista?', a: 'No. KetoHoy da ideas de recetas y compra; no es consejo médico ni nutricional. Consulta con un profesional si tienes una condición de salud.' },
]

const cta =
  `flex h-12 items-center justify-center rounded-2xl bg-[#a3e635] px-6 text-[15px] font-bold text-forest-950 ${focusRing}`

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
        <h1 className="hero-in text-[34px] leading-[1.05] font-extrabold text-forest-50">
          Tu semana keto, <span className="text-[#a3e635]">resuelta.</span>
        </h1>
        <p className="hero-in mt-4 max-w-xl text-base leading-relaxed text-forest-200 [animation-delay:60ms]">
          Planifica el menú de la semana con lo que ya tienes en casa y compra solo lo que falta, con productos de Mercadona.
        </p>
        <div className="hero-in mt-6 flex flex-col gap-3 sm:flex-row [animation-delay:120ms]">
          <Link href="/login?modo=registro" className={cta}>Crear cuenta gratis</Link>
          <Link href="/login" className={`flex h-12 items-center justify-center rounded-2xl border border-forest-600 px-6 text-[15px] font-semibold text-forest-50 ${focusRing}`}>
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      <section className="reveal mt-14" aria-labelledby="how">
        <h2 id="how" className="text-xl font-extrabold text-forest-50">Cómo funciona</h2>
        <ol className="mt-4 space-y-5">
          {STEPS.map(({ Icon, title, text }) => (
            <li key={title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-[#a3e635]/10 text-[#a3e635]">
                <Icon size={20} aria-hidden />
              </span>
              <span>
                <span className="block font-semibold text-forest-50">{title}</span>
                <span className="block text-sm text-forest-300">{text}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {recipes.length > 0 && (
        <section className="reveal mt-14" aria-labelledby="recipes">
          <h2 id="recipes" className="text-xl font-extrabold text-forest-50">Algunas recetas</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {recipes.map(r => (
              <li key={r.id}>
                <Link href={`/recipes/${r.id}`} className={`card-lift group block overflow-hidden rounded-2xl bg-forest-900 ${focusRing}`}>
                  <span className="card-media relative block aspect-[4/3] bg-forest-800">
                    <Image src={r.imageUrl!} alt="" fill sizes="(min-width: 768px) 360px, 45vw" className="card-img object-cover" />
                  </span>
                  <span className="block p-3">
                    <span className="line-clamp-2 text-sm font-semibold text-forest-50">{r.title}</span>
                    <span className="mt-1 flex items-center gap-1 text-xs text-forest-300">
                      <Clock size={12} aria-hidden /> {r.prepTimeMinutes} min
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="reveal mt-14" aria-labelledby="faq">
        <h2 id="faq" className="text-xl font-extrabold text-forest-50">Preguntas frecuentes</h2>
        <dl className="mt-4 space-y-4">
          {FAQ.map(({ q, a }) => (
            <div key={q}>
              <dt className="font-semibold text-forest-50">{q}</dt>
              <dd className="mt-1 text-sm text-forest-300">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="reveal mt-14 rounded-3xl border border-forest-700 bg-forest-900/80 p-6 text-center">
        <h2 className="text-xl font-extrabold text-forest-50">Empieza hoy</h2>
        <p className="mt-1 text-sm text-forest-300">Tu primer menú semanal en un par de minutos.</p>
        <Link href="/login?modo=registro" className={`mt-4 ${cta}`}>Crear cuenta gratis</Link>
      </section>

      <p className="mt-8 text-center text-xs text-forest-400">No sustituye consejo médico o nutricional profesional.</p>
    </main>
  )
}
