'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { focusRing } from '@/components/ui'

type ToastAction = { label: string; run: () => void } | { label: string; href: string }
type ToastState = { message: string; action?: ToastAction }

const actionClass = `rounded-lg px-2 py-1 font-semibold text-[#a3e635] hover:bg-forest-600 ${focusRing}`

/**
 * One transient message above the tab bar, with an optional action (e.g. "Deshacer").
 * Destructive actions in the pantry/list use this instead of confirm dialogs.
 */
export function useToast(): { toast: ReactNode; show: (message: string, action?: ToastAction) => void } {
  const [state, setState] = useState<ToastState | null>(null)
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Hide = play the exit transition, then drop the content (so the next message is announced again).
  const hide = useCallback(() => {
    setOpen(false)
    clearTimer.current = setTimeout(() => setState(null), 200)
  }, [])

  const show = useCallback(
    (message: string, action?: ToastAction) => {
      if (timer.current) clearTimeout(timer.current)
      if (clearTimer.current) clearTimeout(clearTimer.current)
      setState({ message, action })
      setOpen(true)
      timer.current = setTimeout(hide, action ? 6000 : 3000)
    },
    [hide]
  )

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
      if (clearTimer.current) clearTimeout(clearTimer.current)
    },
    []
  )

  const action = state?.action
  // The live region stays mounted (empty = silent) so screen readers announce the message when it appears.
  const toast = (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40 flex justify-center px-4"
    >
      <div
        data-open={open}
        className="toast pointer-events-auto flex max-w-md items-center gap-3 rounded-lg bg-forest-700 py-2.5 pr-2 pl-4 text-sm text-forest-50"
      >
        {state && <span>{state.message}</span>}
        {action && 'href' in action && (
          <a href={action.href} className={actionClass}>
            {action.label}
          </a>
        )}
        {action && 'run' in action && (
          <button
            type="button"
            onClick={() => {
              if (timer.current) clearTimeout(timer.current)
              hide()
              action.run()
            }}
            className={actionClass}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )

  return { toast, show }
}
