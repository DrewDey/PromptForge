'use client'

import { useEffect, useRef } from 'react'
import {
  trackRequestAnalytics,
  type RequestAnalyticsEvent,
} from '@/lib/build-requests/analytics'

/**
 * Emits one already-bounded event after its owning UI has verified the
 * corresponding snapshot or durable application-service receipt.
 */
export function RequestAnalytics({ event }: { event: RequestAnalyticsEvent }) {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    const timeout = window.setTimeout(() => {
      if (sent.current) return
      sent.current = true
      trackRequestAnalytics(event)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [event])

  return null
}
