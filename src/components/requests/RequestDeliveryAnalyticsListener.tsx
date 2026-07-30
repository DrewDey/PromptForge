'use client'

import { useEffect, useRef } from 'react'
import {
  REQUEST_DELIVERY_INTERACTION_BROWSER_EVENT,
  REQUEST_DELIVERY_RECEIPT_BROWSER_EVENT,
  type RequestDeliveryInteractionBrowserEventDetail,
  type RequestDeliveryReceiptBrowserEventDetail,
} from '@/components/requests/delivery'
import { trackRequestAnalytics } from '@/lib/build-requests/analytics'

export function RequestDeliveryAnalyticsListener({
  surface,
}: {
  surface: 'request_case' | 'admin_requests'
}) {
  const sentReceiptKeys = useRef(new Set<string>())

  useEffect(() => {
    function interaction(event: Event) {
      const detail = (event as CustomEvent<unknown>).detail
      if (
        !detail
        || typeof detail !== 'object'
        || (detail as RequestDeliveryInteractionBrowserEventDetail).event !== 'delivery_opened'
        || !['open', 'download', 'preview'].includes(
          (detail as RequestDeliveryInteractionBrowserEventDetail).interaction,
        )
      ) return
      void trackRequestAnalytics({ eventName: 'delivery_opened', surface })
    }

    function receipt(event: Event) {
      if (surface !== 'request_case') return
      const detail = (event as CustomEvent<unknown>).detail
      if (!detail || typeof detail !== 'object') return
      const value = detail as RequestDeliveryReceiptBrowserEventDetail
      if (
        value.event !== 'usefulness_recorded'
        || !['helpful', 'not_helpful'].includes(value.outcome)
        || typeof value.replayed !== 'boolean'
        || !/^delivery-outcome-event:[A-Za-z0-9_-]{32}$/.test(value.emissionKey)
        || sentReceiptKeys.current.has(value.emissionKey)
      ) return
      sentReceiptKeys.current.add(value.emissionKey)
      void trackRequestAnalytics({
        eventName: 'usefulness_recorded',
        surface: 'request_case',
        usefulness: value.outcome,
        replayed: value.replayed,
      })
    }

    window.addEventListener(REQUEST_DELIVERY_INTERACTION_BROWSER_EVENT, interaction)
    window.addEventListener(REQUEST_DELIVERY_RECEIPT_BROWSER_EVENT, receipt)
    return () => {
      window.removeEventListener(REQUEST_DELIVERY_INTERACTION_BROWSER_EVENT, interaction)
      window.removeEventListener(REQUEST_DELIVERY_RECEIPT_BROWSER_EVENT, receipt)
    }
  }, [surface])

  return null
}
