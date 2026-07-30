'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export function RequestRouteError({
  reset,
  title = 'Request service unavailable',
  message = 'The secure read did not complete. No empty or completed state has been inferred.',
}: {
  reset: () => void
  title?: string
  message?: string
}) {
  const alertRef = useRef<HTMLElement>(null)

  useEffect(() => {
    alertRef.current?.focus()
  }, [])

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <section
        ref={alertRef}
        className="border-2 border-red-700 bg-red-50 p-6 text-red-950 focus:outline-3 focus:outline-offset-4 focus:outline-brand-blue"
        role="alert"
        tabIndex={-1}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-[-0.025em]">{title}</h1>
            <p className="mt-2 text-sm leading-6">{message}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 bg-surface-900 px-4 py-3 text-sm font-bold text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-brand-blue sm:w-auto"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry secure read
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}
