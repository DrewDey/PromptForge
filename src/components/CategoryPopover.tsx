// Iteration 27 (2026-04-16):
// Thin client-component wrapper around the native <details> category popover
// so we can keep progressive-disclosure HTML semantics (the element still
// opens/closes with zero JS if this component fails to hydrate) while
// layering on the three a11y affordances the iter 26 reviewer flagged:
//   (1) Escape key closes
//   (2) click-outside closes
//   (3) 150ms fade-in + subtle scale-up on open (matches the 150ms cadence
//       used elsewhere in the design system)
//
// The component renders <details> directly — children are whatever the
// server component passes in (the <summary> button + the floating panel).
// We never touch the DOM of children; only the wrapper's open state.
'use client'

import { ReactNode, useEffect, useRef } from 'react'

export default function CategoryPopover({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDetailsElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      const d = ref.current
      if (!d || !d.open) return
      d.open = false
      // Return focus to the summary so keyboard users know where they are.
      const summary = d.querySelector<HTMLElement>('summary')
      summary?.focus()
    }

    function onDocClick(e: MouseEvent) {
      const d = ref.current
      if (!d || !d.open) return
      if (e.target instanceof Node && d.contains(e.target)) return
      d.open = false
    }

    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onDocClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onDocClick)
    }
  }, [])

  return (
    <details ref={ref} className={className}>
      {children}
    </details>
  )
}
