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
import type { RequestPublicPolicyVersionsV1 } from '@/lib/request-public-architecture'

type RequestIntakeServiceError = NonNullable<RequestIntakeFormProps['serviceError']>
type RequestIntakeFailureError = Exclude<RequestIntakeServiceError, 'already_active'>

export type RequestIntakeWorkflowState =
  | {
      status: 'ready'
      idempotencyKey: string
      analyticsAttempt: number
      values?: Partial<RequestIntakeValues>
      errors?: readonly RequestIntakeError[]
      serviceError?: RequestIntakeServiceError | null
      policyVersions?: RequestPublicPolicyVersionsV1
    }
  | {
      status: 'submitted'
      idempotencyKey: string
      analyticsAttempt: number
      receipt: RequestSubmissionReceiptView
      requestHref: string
    }

export type RequestIntakeWorkflowAction = (
  previousState: RequestIntakeWorkflowState,
  formData: FormData,
) => Promise<RequestIntakeWorkflowState>

const analyticsFailureReason: Record<
  RequestIntakeFailureError,
  RequestAnalyticsFailureReason
> = {
  auth_required: 'auth_required',
  not_admitted: 'not_admitted',
  controls_off: 'controls_closed',
  capacity_full: 'capacity_full',
  unavailable: 'service_unavailable',
  rate_limited: 'rate_limited',
  duplicate: 'duplicate',
  stale_version: 'stale_version',
  readiness_incomplete: 'service_unavailable',
  risk_grant_required: 'service_unavailable',
  forbidden_input: 'forbidden_input',
  invalid_reference: 'invalid_reference',
  unknown: 'unknown',
}

export function RequestIntakeWorkflow({
  action,
  initialState,
  policyVersions,
}: {
  action: RequestIntakeWorkflowAction
  initialState: RequestIntakeWorkflowState
  policyVersions: RequestPublicPolicyVersionsV1
}) {
  const [state, formAction, pending] = useActionState(action, initialState)

  if (state.status === 'submitted') {
    return (
      <>
        <RequestAnalytics
          emissionKey={`intake:${state.analyticsAttempt}:submitted`}
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
      {serviceError && serviceError !== 'already_active' ? (
        <RequestAnalytics
          emissionKey={`intake:${state.analyticsAttempt}:failed:${serviceError}`}
          event={{
            eventName: 'intake_failed',
            surface: 'request_intake',
            reason: analyticsFailureReason[serviceError],
          }}
        />
      ) : errors.length > 0 ? (
        <RequestAnalytics
          emissionKey={`intake:${state.analyticsAttempt}:failed:client_validation`}
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
        policyVersions={state.policyVersions ?? policyVersions}
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
