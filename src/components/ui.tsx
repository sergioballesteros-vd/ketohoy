import type { ReactNode } from 'react'
import { ketoExplanation, ketoLabel, type KetoTone } from '@/lib/ketoLabel'

// Shared visual primitives (dark green + lime). Lime = primary action, selection, success.
// Everything else is neutral forest tones; red only for "not keto".

export const focusRing = 'focus-visible:outline-2 focus-visible:outline-[#a3e635] focus-visible:outline-offset-2'

/** Small pill used for filters/categories. Active = lime fill. */
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
      className={`relative hit-area inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-[13px] font-semibold transition-colors ${focusRing} ${
        active
          ? 'bg-[#a3e635] text-forest-950'
          : 'bg-forest-800 text-forest-100 hover:bg-forest-700 active:bg-forest-700'
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

/** Dot + label, colored by tone. Shared by product and recipe keto indicators. */
export function ToneLabel({ tone, label, title }: { tone: KetoTone; label: string; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 text-[11px] font-semibold ${TONE[tone]}`}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  )
}

/** Text badge for a product's keto score; the label is the meaning, the tooltip has the scale. */
export function KetoBadge({ score }: { score: number }) {
  const { label, tone, hint } = ketoLabel(score)
  return <ToneLabel tone={tone} label={label} title={hint} />
}

/** Visible (not tooltip-only, so it works on touch) explanation of how the keto label was obtained. */
export function KetoNote({ score, source, netCarbs }: { score: number; source: string; netCarbs?: number | null }) {
  return <p className="text-xs text-forest-400">{ketoExplanation(score, source, netCarbs)}</p>
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-forest-800 ${className}`} />
}
