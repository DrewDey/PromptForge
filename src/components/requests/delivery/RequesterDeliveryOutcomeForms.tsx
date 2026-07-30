'use client'

import { useActionState, useEffect, useRef } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import type { RequestDeliverySlotModel } from '@/lib/build-requests/delivery-view'

export const REQUEST_DELIVERY_RECEIPT_BROWSER_EVENT =
  'pathforge:request-delivery-receipt'

export type RequestDeliveryReceiptActionError =
  | 'auth_required'
  | 'forbidden'
  | 'held'
  | 'removed'
  | 'stale_version'
  | 'rate_limited'
  | 'invalid_input'
  | 'unavailable'

export type RequestDeliveryReceiptActionState = {
  submitted: boolean
  error: RequestDeliveryReceiptActionError | null
  replayed: boolean
  outcome: 'useful' | 'failed_acceptance_check' | null
  emissionKey: string | null
}

export type RequestDeliveryReceiptServerAction = (
  previousState: RequestDeliveryReceiptActionState,
  formData: FormData,
) => Promise<RequestDeliveryReceiptActionState>

export type RequestDeliveryReceiptBrowserEventDetail = {
  event: 'usefulness_recorded'
  outcome: 'helpful' | 'not_helpful'
  replayed: boolean
  emissionKey: string
}

const INITIAL_RECEIPT_STATE: RequestDeliveryReceiptActionState = {
  submitted: false,
  error: null,
  replayed: false,
  outcome: null,
  emissionKey: null,
}

const SAFE_ERROR_MESSAGES: Record<RequestDeliveryReceiptActionError, string> = {
  auth_required: 'Sign in again before recording this delivery outcome.',
  forbidden: 'The current participant cannot record this delivery outcome.',
  held: 'This case is held. No delivery outcome was recorded.',
  removed: 'This case was removed. No delivery outcome was recorded.',
  stale_version: 'The case changed. Reload before recording the outcome.',
  rate_limited: 'Too many outcome attempts were made. Wait briefly and try again.',
  invalid_input: 'The delivery outcome was incomplete or invalid.',
  unavailable: 'The private delivery outcome service is temporarily unavailable.',
}

function idempotencyIntent(requestId: string, command: string, version: number) {
  return `delivery-${requestId}-${command}-v${version}`
}

function verifiedEmissionKey(
  state: RequestDeliveryReceiptActionState,
  outcome: Exclude<RequestDeliveryReceiptActionState['outcome'], null>,
) {
  return (
    state.submitted
    && state.error === null
    && state.outcome === outcome
    && state.emissionKey !== null
    && /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(state.emissionKey)
  ) ? state.emissionKey : null
}

function CommandContext({
  command,
  model,
}: {
  command: string
  model: RequestDeliverySlotModel
}) {
  return (
    <>
      <input type="hidden" name="command" value={command} />
      <input type="hidden" name="request_id" value={model.requestId} />
      <input
        type="hidden"
        name="idempotency_intent"
        value={idempotencyIntent(model.requestId, command, model.version)}
      />
      <input
        type="hidden"
        name="delivery_revision_id"
        value={model.currentDeliveryRevisionId ?? ''}
      />
    </>
  )
}

export function RequesterDeliveryOutcomeForms({
  model,
  action,
}: {
  model: RequestDeliverySlotModel
  action: RequestDeliveryReceiptServerAction
}) {
  const [usefulState, usefulAction, usefulPending] = useActionState(
    action,
    INITIAL_RECEIPT_STATE,
  )
  const [failedState, failedAction, failedPending] = useActionState(
    action,
    INITIAL_RECEIPT_STATE,
  )
  const emittedKeys = useRef(new Set<string>())

  useEffect(() => {
    const emissionKey = verifiedEmissionKey(usefulState, 'useful')
    if (
      emissionKey !== null
      && !emittedKeys.current.has(emissionKey)
    ) {
      emittedKeys.current.add(emissionKey)
      const detail: RequestDeliveryReceiptBrowserEventDetail = {
        event: 'usefulness_recorded',
        outcome: 'helpful',
        replayed: usefulState.replayed,
        emissionKey,
      }
      window.dispatchEvent(new CustomEvent(
        REQUEST_DELIVERY_RECEIPT_BROWSER_EVENT,
        { detail },
      ))
    }
  }, [usefulState])

  useEffect(() => {
    const emissionKey = verifiedEmissionKey(
      failedState,
      'failed_acceptance_check',
    )
    if (
      emissionKey !== null
      && !emittedKeys.current.has(emissionKey)
    ) {
      emittedKeys.current.add(emissionKey)
      const detail: RequestDeliveryReceiptBrowserEventDetail = {
        event: 'usefulness_recorded',
        outcome: 'not_helpful',
        replayed: failedState.replayed,
        emissionKey,
      }
      window.dispatchEvent(new CustomEvent(
        REQUEST_DELIVERY_RECEIPT_BROWSER_EVENT,
        { detail },
      ))
    }
  }, [failedState])

  const usefulRecorded = verifiedEmissionKey(usefulState, 'useful') !== null
  const failedRecorded = (
    verifiedEmissionKey(failedState, 'failed_acceptance_check') !== null
  )
  const error = usefulState.error ?? failedState.error

  return (
    <>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <form
          action={usefulAction}
          data-request-delivery-receipt-event={
            usefulRecorded ? 'usefulness_recorded' : undefined
          }
        >
          <CommandContext command="requester_delivery_outcome_useful" model={model} />
          <input type="hidden" name="outcome" value="useful" />
          <button
            type="submit"
            disabled={usefulPending || failedPending}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 bg-surface-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-surface-700 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue"
          >
            Mark useful
            <Check className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>

      <form
        action={failedAction}
        data-request-delivery-receipt-event={
          failedRecorded ? 'usefulness_recorded' : undefined
        }
        className="mt-5 border border-red-200 bg-red-50 p-4"
      >
        <CommandContext command="requester_delivery_outcome_failed" model={model} />
        <input type="hidden" name="outcome" value="failed_acceptance_check" />
        <label htmlFor="request-delivery-failed-check" className="block text-xs font-bold text-red-950">
          Failed original acceptance check
        </label>
        <select
          id="request-delivery-failed-check"
          name="failed_acceptance_check_id"
          required
          defaultValue=""
          className="mt-2 min-h-11 w-full border border-red-300 bg-white px-3 py-2 text-base text-surface-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:text-sm"
        >
          <option value="" disabled>Select the failed check</option>
          {model.acceptanceChecks.map((item) => (
            <option key={item.id} value={item.id}>{item.label}</option>
          ))}
        </select>
        <label htmlFor="request-delivery-failure-reason" className="mt-4 block text-xs font-bold text-red-950">
          What failed?
        </label>
        <textarea
          id="request-delivery-failure-reason"
          name="reason"
          rows={3}
          required
          className="mt-2 w-full border border-red-300 bg-white px-3 py-2 text-base leading-6 text-surface-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:text-sm"
        />
        <button
          type="submit"
          disabled={usefulPending || failedPending}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-red-900 hover:bg-red-100 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue sm:w-auto"
        >
          Report failed check
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>

      {error ? (
        <p className="mt-4 text-sm font-semibold text-red-800" role="alert">
          {SAFE_ERROR_MESSAGES[error]}
        </p>
      ) : null}
    </>
  )
}
