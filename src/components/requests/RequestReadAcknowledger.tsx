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
    void action({ requestId, expectedEventSequence, idempotencyKey }).catch(() => {
      // Best-effort acknowledgment never changes local unread truth. The
      // authority will project unread again on the next participant-safe read.
    })
  }, [action, expectedEventSequence, idempotencyKey, requestId])
  return null
}
