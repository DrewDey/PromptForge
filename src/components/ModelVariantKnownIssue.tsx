'use client'

import { TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type ModelVariantKnownIssueProps = {
  id: string
  explanation: string
  label?: string
  className?: string
  focusable?: boolean
  inlineOnMobile?: boolean
  placement?: 'start' | 'end'
}

export function modelVariantKnownIssueTooltipText(explanation: string) {
  return `Known issue — Historical run preserved for comparison. ${explanation}`
}

export function ModelVariantKnownIssue({
  id,
  explanation,
  label = 'Known issue',
  className = '',
  focusable = false,
  inlineOnMobile = false,
  placement = 'start',
}: ModelVariantKnownIssueProps) {
  const tooltipText = modelVariantKnownIssueTooltipText(explanation)
  const rootRef = useRef<HTMLSpanElement>(null)
  const dismissedRef = useRef(false)
  const [dismissed, setDismissed] = useState(false)
  const setTooltipDismissed = (nextDismissed: boolean) => {
    dismissedRef.current = nextDismissed
    setDismissed(nextDismissed)
  }

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const ownsTarget = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false
      const owner = root.closest('.model-known-issue-owner')
      return root.contains(target) || Boolean(owner?.contains(target))
    }
    const handleFocus = (event: FocusEvent) => {
      if (!ownsTarget(event.target)) return
      dismissedRef.current = false
      setDismissed(false)
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (dismissedRef.current) return
      if (!root.matches(':hover') && !ownsTarget(document.activeElement)) return
      dismissedRef.current = true
      setDismissed(true)
      event.preventDefault()
      event.stopImmediatePropagation()
    }

    document.addEventListener('focusin', handleFocus, true)
    document.addEventListener('keydown', handleEscape, true)
    return () => {
      document.removeEventListener('focusin', handleFocus, true)
      document.removeEventListener('keydown', handleEscape, true)
    }
  }, [])

  return (
    <span
      ref={rootRef}
      className={[
        'model-known-issue',
        placement === 'end' ? 'model-known-issue-placement-end' : '',
        inlineOnMobile ? 'model-known-issue-inline-mobile' : '',
        dismissed ? 'is-tooltip-dismissed' : '',
        className,
      ].filter(Boolean).join(' ')}
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={focusable ? id : undefined}
      onMouseEnter={() => setTooltipDismissed(false)}
      data-model-known-issue
      data-known-issue-dismissed={dismissed ? 'true' : 'false'}
      data-known-issue-explanation={explanation}
    >
      <span className="model-known-issue-chip">
        <TriangleAlert aria-hidden="true" />
        <span>{label}</span>
      </span>
      <span id={id} role="tooltip" className="model-known-issue-tooltip">
        {tooltipText}
      </span>
    </span>
  )
}
