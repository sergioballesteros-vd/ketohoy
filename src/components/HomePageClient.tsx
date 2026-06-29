'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { LogoMark, SettingsIcon, CartIcon, MealsIcon, PantryIcon, CalendarIcon } from '@/components/icons'

type HomePageClientProps = {
  stats: {
    pantryCount: number
    recipesAvailable: number
    shoppingCount: number
  }
  greeting: {
    text: string
    sub: string
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
}

export default function HomePageClient({ stats, greeting }: HomePageClientProps) {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <div className="relative px-5 pt-12 pb-8 overflow-hidden">
        {/* Glow blob animated with framer-motion */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.3, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute -top-8 -right-12 w-56 h-56 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, #a3e635 0%, transparent 70%)' }}
        />

        <div className="flex items-start justify-between relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <LogoMark size={36} />
              <h1 className="text-3xl font-bold leading-none font-syne text-forest-50">
                KetoHoy
              </h1>
            </div>
            <p className="text-lg font-semibold text-[#a3e635]">{greeting.text}</p>
            <p className="text-sm mt-0.5 text-forest-300">{greeting.sub}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Link
              href="/preferences"
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-colors bg-forest-800 text-forest-400 hover:bg-forest-700"
              aria-label="Preferencias"
            >
              <SettingsIcon size={18} />
            </Link>
          </motion.div>
        </div>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Stats */}
        <motion.div variants={itemVariants} className="px-5 mb-6">
          <div className="grid grid-cols-3 gap-2">
            <Link
              href="/meals"
              className="rounded-2xl p-4 text-center transition-all hover:scale-[1.02] bg-forest-800 border border-forest-700 active:scale-95"
            >
              <div className="text-3xl font-bold mb-0.5 font-syne text-[#a3e635]">
                {stats.recipesAvailable}
              </div>
              <div className="text-xs font-medium text-forest-400">recetas</div>
            </Link>
            <Link
              href="/inventory"
              className="rounded-2xl p-4 text-center transition-all hover:scale-[1.02] bg-forest-800 border border-forest-700 active:scale-95"
            >
              <div className="text-3xl font-bold mb-0.5 font-syne text-forest-50">
                {stats.pantryCount}
              </div>
              <div className="text-xs font-medium text-forest-400">en casa</div>
            </Link>
            <Link
              href="/shopping-list"
              className="rounded-2xl p-4 text-center transition-all hover:scale-[1.02] bg-forest-800 border border-forest-700 active:scale-95"
            >
              <div
                className={`text-3xl font-bold mb-0.5 font-syne ${stats.shoppingCount > 0 ? 'text-amber-500' : 'text-forest-500'}`}
              >
                {stats.shoppingCount}
              </div>
              <div className="text-xs font-medium text-forest-400">por comprar</div>
            </Link>
          </div>
        </motion.div>

        {/* Primary CTA */}
        <motion.div variants={itemVariants} className="px-5 mb-3">
          <Link
            href="/meals"
            className="flex items-center gap-4 rounded-2xl p-5 transition-all hover:scale-[1.02] active:scale-[0.98] bg-[#a3e635]"
          >
            <span className="w-12 h-12 flex items-center justify-center rounded-xl flex-shrink-0 bg-forest-950/30">
              <MealsIcon size={24} className="text-forest-600" />
            </span>
            <div className="flex-1">
              <div className="font-bold text-lg leading-tight font-syne text-forest-950">
                Dame ideas para hoy
              </div>
              <div className="text-sm font-medium mt-0.5 text-forest-600">
                {stats.recipesAvailable > 0
                  ? `${stats.recipesAvailable} recetas con lo que tienes`
                  : 'Recetas keto disponibles'}
              </div>
            </div>
            <span className="text-xl font-bold text-forest-600">→</span>
          </Link>
        </motion.div>

        {/* Secondary CTAs */}
        <motion.div variants={itemVariants} className="px-5 space-y-2">
          <Link
            href="/inventory"
            className="flex items-center gap-4 rounded-2xl p-4 transition-colors bg-forest-800 border border-forest-700 hover:bg-forest-700/80 active:scale-[0.99]"
          >
            <span className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 bg-forest-700 text-forest-400">
              <PantryIcon size={18} />
            </span>
            <div className="flex-1">
              <div className="font-semibold text-sm text-forest-50">Mi despensa</div>
              <div className="text-xs mt-0.5 text-forest-400">
                {stats.pantryCount > 0 ? `${stats.pantryCount} productos en casa` : 'Añade lo que tienes'}
              </div>
            </div>
            <span className="text-forest-500">›</span>
          </Link>

          <Link
            href="/shopping-list"
            className="flex items-center gap-4 rounded-2xl p-4 transition-colors bg-forest-800 border border-forest-700 hover:bg-forest-700/80 active:scale-[0.99]"
          >
            <span className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 bg-forest-700 text-forest-400">
              <CartIcon size={18} />
            </span>
            <div className="flex-1">
              <div className="font-semibold text-sm text-forest-50">Lista de compra</div>
              <div className="text-xs mt-0.5 text-forest-400">
                {stats.shoppingCount > 0 ? `${stats.shoppingCount} productos pendientes` : 'Sin pendientes'}
              </div>
            </div>
            {stats.shoppingCount > 0 ? (
              <span
                className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-500 text-forest-950"
              >
                {stats.shoppingCount}
              </span>
            ) : (
              <span className="text-forest-500">›</span>
            )}
          </Link>

          <Link
            href="/weekly-plan"
            className="flex items-center gap-4 rounded-2xl p-4 transition-colors bg-forest-800 border border-forest-700 hover:bg-forest-700/80 active:scale-[0.99]"
          >
            <span className="w-10 h-10 flex items-center justify-center rounded-xl flex-shrink-0 bg-forest-700 text-forest-400">
              <CalendarIcon size={18} />
            </span>
            <div className="flex-1">
              <div className="font-semibold text-sm text-forest-50">Plan semanal</div>
              <div className="text-xs mt-0.5 text-forest-400">Menú de toda la semana</div>
            </div>
            <span className="text-forest-500">›</span>
          </Link>
        </motion.div>

        <motion.p variants={itemVariants} className="text-xs text-center mt-8 pb-2 px-5 text-forest-500">
          No sustituye consejo médico o nutricional profesional.
        </motion.p>
      </motion.div>
    </main>
  )
}
