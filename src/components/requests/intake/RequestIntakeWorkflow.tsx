'use client'

import { useActionState } from 'react'
import { RequestAnalytics } from '@/components/requests/RequestAnalytics'
import {
  RequestSubmissionReceipt,
  type RequestSubmissionReceiptView,
} from '@/components/requests/service'
import {
  trackRequestAnalytics,
  type RequestAnalyticsFailureReason,
} from '@/lib/build-requests/analytics'
import {
  RequestIntakeForm,
  type RequestIntakeError,
  type RequestIntakeFormProps,
  type RequestIntakeValues,
} from './RequestIntakeForm'

type RequestIntakeServiceError = NonNullable<RequestIntakeFormProps['serviceError']>

export type RequestIntakeWorkflowState =
  | {
      status: 'ready'
      idempotencyKey: string
      values?: Partial<RequestIntakeValues>
      errors?: readonly RequestIntakeError[]
      serviceError?: RequestIntakeServiceError | null
    }
  | {
      status: 'submitted'
      idempotencyKey: string
      receipt: RequestSubmissionReceiptView
      requestHref: string
    }

export type RequestIntakeWorkflowAction = (
  previousState: RequestIntakeWorkflowState,
  formData: FormData,
) => Promise<RequestIntakeWorkflowState>

const analyticsFailureReason: Record<
  RequestIntakeServiceError,
  RequestAnalyticsFailureReason
> = {
  auth_required: 'auth_required',
  controls_off: 'controls_closed',
  capacity_full: 'capacity_full',
  unavailable: 'service_unavailable',
  rate_limited: 'rate_limited',
  duplicate: 'duplicate',
  stale_version: 'stale_version',
  forbidden_input: 'forbidden_input',
  invalid_reference: 'invalid_reference',
  unknown: 'unknown',
}

export function RequestIntakeWorkflow({
  action,
  initialState,
}: {
  action: RequestIntakeWorkflowAction
  initialState: RequestIntakeWorkflowState
}) {
  const [state, formAction, pending] = useActionState(action, initialState)

  if (state.status === 'submitted') {
    return (
      <>
        <RequestAnalytics
          event={{
            eventName: 'submitted',
            surface: 'request_intake',
            replayed: state.receipt.replayed,
          }}
        />
        <RequestSubmissionReceipt
          receipt={state.receipt}
          requestHref={state.requestHref}
        />
      </>
    )
  }

  const serviceError = state.serviceError ?? null
  const errors = [...(state.errors ?? [])]

  return (
    <>
      {serviceError ? (
        <RequestAnalytics
          event={{
            eventName: 'intake_failed',
            surface: 'request_intake',
            reason: analyticsFailureReason[serviceError],
          }}
        />
      ) : errors.length > 0 ? (
        <RequestAnalytics
          event={{
            eventName: 'intake_failed',
            surface: 'request_intake',
            reason: 'client_validation',
          }}
        />
      ) : null}
      <RequestIntakeForm
        action={formAction}
        idempotencyKey={state.idempotencyKey}
        defaultValues={state.values}
        errors={errors}
        pending={pending}
        serviceError={serviceError}
        onIntakeStarted={() => {
          void trackRequestAnalytics({
            eventName: 'intake_started',
            surface: 'request_intake',
          })
        }}
      />
    </>
  )
}
