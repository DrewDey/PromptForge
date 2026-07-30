'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { RequestAnalytics } from './RequestAnalytics'

export type RequestClarificationActionState =
  | { status: 'ready'; attempt: number }
  | {
      status: 'submitted'
      attempt: number
      replayed: boolean
      requestVersion: number
    }
  | {
      status: 'error'
      attempt: number
      code: 'stale_version' | 'rate_limited' | 'unavailable'
    }

export type RequestClarificationServerAction = (
  previous: RequestClarificationActionState,
  formData: FormData,
) => Promise<RequestClarificationActionState>

const errorCopy = {
  stale_version: 'The case changed before this clarification was recorded. Reload the current case.',
  rate_limited: 'Clarification submission is temporarily limited. Wait before trying again.',
  unavailable: 'The service could not verify this clarification. No success is claimed.',
} as const

export function RequestClarificationAction({
  action,
  requestId,
  requestVersion,
  clarificationId,
  idempotencyKey,
}: {
  action: RequestClarificationServerAction
  requestId: string
  requestVersion: number
  clarificationId: string
  idempotencyKey: string
}) {
  const [state, formAction, pending] = useActionState(action, {
    status: 'ready',
    attempt: 0,
  } satisfies RequestClarificationActionState)

  if (state.status === 'submitted') {
    return (
      <div role="status">
        <RequestAnalytics
          emissionKey={`clarification:${state.attempt}:${state.requestVersion}:${state.replayed}`}
          event={{
            eventName: 'clarification_submitted',
            surface: 'request_case',
            replayed: state.replayed,
          }}
        />
        <p>Clarification recorded with a durable receipt.</p>
        <Link href={`/requests/${encodeURIComponent(requestId)}`}>Reload current case</Link>
      </div>
    )
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="expectedVersion" value={requestVersion} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="clarificationId" value={clarificationId} />
      {state.status === 'error' ? (
        <p role="alert">{errorCopy[state.code]}</p>
      ) : null}
      <label>
        Clarification answer
        <textarea name="answer" minLength={2} maxLength={2000} rows={4} required />
      </label>
      <button type="submit" disabled={pending}>
        {pending ? 'Submitting…' : 'Submit clarification'}
      </button>
    </form>
  )
}
