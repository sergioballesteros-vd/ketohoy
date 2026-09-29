'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { focusRing } from '@/components/ui'

const FOCUSABLE = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

type SheetProps = {
  /** id of the element that names the dialog: the `title` heading, or one rendered by the caller in `children` */
  labelId: string
  title?: ReactNode
  /** extra icon buttons in the header, left of the close button */
  actions?: ReactNode
  /** sticky action zone below the scrollable content */
  footer?: ReactNode
  onClose: () => void
  children: ReactNode
}

/**
 * Bottom sheet (centered dialog from sm up): Escape closes, Tab stays inside, the page behind does not
 * scroll, focus goes to the close button and returns to the trigger on close.
 */
export default function Sheet({ labelId, title, actions, footer, onClose, children }: SheetProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  // callers pass inline handlers; a ref keeps the effect below from re-running (and stealing focus) each render
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Esc / overlay / X play the exit animation, then call onClose. Reduced motion closes at once.
  // Buttons the caller renders (footer, children) call their own handlers and close immediately.
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const close = useCallback(() => {
    if (closeTimer.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return onCloseRef.current()
    setClosing(true)
    closeTimer.current = setTimeout(() => onCloseRef.current(), 180)
  }, [])

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return close()
      if (e.key !== 'Tab' || !dialogRef.current) return
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
      if (closeTimer.current) clearTimeout(closeTimer.current)
    }
  }, [close])

  return (
    <div
      className="sheet-overlay fixed inset-0 z-50 flex items-end justify-center bg-forest-950/80 sm:items-center"
      data-closing={closing ? '' : undefined}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
    >
      <div
        ref={dialogRef}
        className="sheet-panel flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-forest-900 sm:rounded-3xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3">
          <div className="flex items-center justify-between gap-2">
            {title ? (
              <h2 id={labelId} className="text-lg font-bold text-forest-50">
                {title}
              </h2>
            ) : (
              <span />
            )}
            <div className="flex gap-1">
              {actions}
              <button
                ref={closeRef}
                type="button"
                onClick={close}
                aria-label="Cerrar"
                className={`relative hit-area flex h-10 w-10 items-center justify-center rounded-full text-forest-200 hover:bg-forest-800 ${focusRing}`}
              >
                <X size={20} />
              </button>
            </div>
          </div>
          {children}
          <div className="h-4" />
        </div>
        {footer && (
          <div className="border-t border-forest-800 bg-forest-900 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
