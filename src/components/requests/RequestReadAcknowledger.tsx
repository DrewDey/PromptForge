'use client'

import { useEffect, useRef } from 'react'

export function RequestReadAcknowledger({
  action,
  requestId,
  expectedEventSequence,
  idempotencyKey,
}: {
  action: (input: {
    requestId: string
    expectedEventSequence: number
    idempotencyKey: string
  }) => Promise<void>
  requestId: string
  expectedEventSequence: number
  idempotencyKey: string
}) {
  const sent = useRef(false)
  useEffect(() => {
    if (sent.current) return
    sent.current = true
    void action({ requestId, expectedEventSequence, idempotencyKey })
  }, [action, expectedEventSequence, idempotencyKey, requestId])
  return null
}
