'use client'

import { useEffect, useRef } from 'react'
import {
  trackRequestAnalytics,
  type RequestAnalyticsEvent,
} from '@/lib/build-requests/analytics'

type RequestAnalyticsTransport = (
  event: RequestAnalyticsEvent,
) => Promise<boolean> | boolean

/**
 * Emits each explicit categorical transition once. The caller owns a stable
 * local emission key (for example an attempt ordinal plus event category);
 * that key is never transported and must never contain a case identifier.
 */
export function RequestAnalytics({
  event,
  emissionKey,
  transport = trackRequestAnalytics,
}: {
  event: RequestAnalyticsEvent
  emissionKey: string
  /** Deterministic fixture seam; production callers use the bounded default. */
  transport?: RequestAnalyticsTransport
}) {
  const sentKeys = useRef(new Set<string>())

  useEffect(() => {
    if (sentKeys.current.has(emissionKey)) return
    const timeout = window.setTimeout(() => {
      if (sentKeys.current.has(emissionKey)) return
      sentKeys.current.add(emissionKey)
      void transport(event)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [emissionKey, event, transport])

  return null
}
