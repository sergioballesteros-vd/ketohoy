import type { ProductClassification } from '@/lib/productClassification'
import type { ReactNode } from 'react'
import { ketoExplanation, ketoLabel, type KetoTone } from '@/lib/ketoLabel'

// Shared visual primitives (dark green + lime). Lime = primary action, selection, success.
// Everything else is neutral forest tones; red only for "not keto".

export const focusRing = 'focus-visible:outline-2 focus-visible:outline-[#a3e635] focus-visible:outline-offset-2'

/** Filter control; only the selected option gets a filled background. */
export function Chip({
  active = false,
  onClick,
  children,
  className = '',
}: {
  active?: boolean
  onClick?: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative hit-area inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition-colors ${focusRing} ${
        active
          ? 'bg-forest-700 text-forest-50'
          : 'text-forest-200 hover:bg-forest-800'
      } ${className}`}
    >
      {children}
    </button>
  )
}

const TONE: Record<KetoTone, string> = {
  good: 'text-[#a3e635]',
  ok: 'text-forest-200',
  bad: 'text-red-300',
}

/** Shared text classification for products and recipes. */
export function ToneLabel({ tone, label, title }: { tone: KetoTone; label: string; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center text-xs ${TONE[tone]}`}>
      {label}
    </span>
  )
}

/** Text badge for a product's keto score; the label is the meaning, the tooltip has the scale. */
export function KetoBadge({ score, classification, source }: { score: number; classification?: ProductClassification; source?: string }) {
  const estimated = classification?.source === 'category_estimate' || source === 'category'
  const unknown = classification?.source === 'unknown' || source === 'unknown'
  if (estimated || unknown) return <ToneLabel tone="ok" label={classification?.label ?? (unknown ? 'Sin datos nutricionales' : 'Estimación por categoría')} title={`Sin nutrición conocida del producto · ${score}/5`} />
  const { label, tone, hint } = ketoLabel(score)
  return <ToneLabel tone={tone} label={classification?.label ?? label} title={classification?.source === 'nutrition' ? `${hint} · Datos nutricionales de Open Food Facts` : hint} />
}

/** Visible (not tooltip-only, so it works on touch) explanation of how the keto label was obtained. */
export function KetoNote({ score, source, netCarbs }: { score: number; source: string; netCarbs?: number | null }) {
  return <p className="text-xs text-forest-400">{ketoExplanation(score, source, netCarbs)}</p>
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-forest-800 ${className}`} />
}
