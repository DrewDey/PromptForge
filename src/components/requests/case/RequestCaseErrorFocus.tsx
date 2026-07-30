'use client'

import { useEffect } from 'react'

export function RequestCaseErrorFocus({ focusKey }: { focusKey: string }) {
  useEffect(() => {
    const summary = document.querySelector<HTMLElement>(
      '[data-request-case-error-summary]',
    )
    summary?.focus()
  }, [focusKey])

  return null
}
