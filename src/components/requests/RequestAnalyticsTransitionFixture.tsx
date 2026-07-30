'use client'

import { useCallback, useState } from 'react'
import { RequestAnalytics } from './RequestAnalytics'
import type { RequestAnalyticsEvent } from '@/lib/build-requests/analytics'

/**
 * Non-production deterministic fixture for the analytics transition contract.
 * It records categories only and never calls the analytics endpoint.
 */
export function RequestAnalyticsTransitionFixture() {
  const [phase, setPhase] = useState<'failed' | 'submitted'>('failed')
  const [renderTick, setRenderTick] = useState(0)
  const [counts, setCounts] = useState({ failed: 0, submitted: 0 })
  const transport = useCallback((event: RequestAnalyticsEvent) => {
    setCounts((current) => (
      event.eventName === 'intake_failed'
        ? { ...current, failed: current.failed + 1 }
        : event.eventName === 'submitted'
          ? { ...current, submitted: current.submitted + 1 }
          : current
    ))
    return true
  }, [])

  const event: RequestAnalyticsEvent = phase === 'failed'
    ? {
        eventName: 'intake_failed',
        surface: 'request_intake',
        reason: 'client_validation',
      }
    : {
        eventName: 'submitted',
        surface: 'request_intake',
        replayed: false,
      }

  return (
    <section
      className="mx-auto max-w-2xl border border-surface-300 bg-white p-6"
      data-request-analytics-transition
      data-failed-count={counts.failed}
      data-submitted-count={counts.submitted}
      data-render-tick={renderTick}
      aria-labelledby="request-analytics-transition-heading"
    >
      <RequestAnalytics
        event={event}
        emissionKey={`fixture-attempt-${phase === 'failed' ? 1 : 2}:${phase}`}
        transport={transport}
      />
      <h1 id="request-analytics-transition-heading" className="text-2xl font-black">
        Request analytics transition fixture
      </h1>
      <p className="mt-2 text-sm leading-6 text-surface-600">
        A failed intake category must emit once, followed by one submitted
        category only after the fixture marks a durable receipt as verified.
      </p>
      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="border border-surface-200 p-3">
          <dt className="text-xs font-bold uppercase">Intake failed</dt>
          <dd className="mt-1 text-xl font-black">{counts.failed}</dd>
        </div>
        <div className="border border-surface-200 p-3">
          <dt className="text-xs font-bold uppercase">Submitted</dt>
          <dd className="mt-1 text-xl font-black">{counts.submitted}</dd>
        </div>
      </dl>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className="min-h-11 border border-surface-400 px-4 py-3 font-bold"
          data-analytics-rerender
          onClick={() => setRenderTick((value) => value + 1)}
        >
          Rerender current state
        </button>
        <button
          type="button"
          className="min-h-11 bg-surface-900 px-4 py-3 font-bold text-white"
          data-analytics-submit
          onClick={() => setPhase('submitted')}
        >
          Verify durable receipt
        </button>
      </div>
    </section>
  )
}
