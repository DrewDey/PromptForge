'use server'

import {
  REQUEST_CONTRACT_VERSION,
  RequestContractError,
  validateSubmitBuildRequestV1,
  type PathForgeRequestReference,
} from '@/lib/request-lifecycle'
import {
  getRequestApplicationService,
  getRequestViewerState,
  requestAuthorityErrorCode,
} from '@/lib/build-requests/server'
import {
  readRequestIntakeAcceptanceChecks,
  RequestIntakeEnvelopeError,
} from '@/lib/build-requests/intake-envelope'
import type {
  RequestIntakeError,
  RequestIntakeValues,
  RequestIntakeWorkflowAction,
  RequestIntakeWorkflowState,
} from '@/components/requests/intake'

function text(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

function valuesFromForm(formData: FormData): RequestIntakeValues {
  const referenceKind = text(formData, 'referenceKind')
  let pathforgeReference: PathForgeRequestReference | undefined
  if (referenceKind === 'project') {
    pathforgeReference = {
      kind: 'project',
      projectId: text(formData, 'referenceProjectId'),
    }
  } else if (referenceKind === 'response') {
    pathforgeReference = {
      kind: 'response',
      projectId: text(formData, 'referenceProjectId'),
      modelVariantId: text(formData, 'referenceModelVariantId'),
      responseStepNumber: Number(text(formData, 'referenceResponseStepNumber')),
    }
  }
  return {
    title: text(formData, 'title'),
    outcome: text(formData, 'outcome'),
    intendedUser: text(formData, 'intendedUser'),
    mustWorkScenario: text(formData, 'mustWorkScenario'),
    acceptanceChecks: [],
    constraints: text(formData, 'constraints'),
    pathforgeReference,
  }
}

function validationError(error: unknown): RequestIntakeError[] {
  return [{
    field: 'form',
    message: error instanceof RequestContractError ||
      error instanceof RequestIntakeEnvelopeError
      ? error.message
      : 'The brief did not match the authoritative Request contract.',
  }]
}

export const submitRequestAction: RequestIntakeWorkflowAction = async (
  previousState,
  formData,
) => {
  let values = valuesFromForm(formData)
  const idempotencyKey = text(formData, 'idempotencyKey')
  const analyticsAttempt = previousState.analyticsAttempt + 1
  try {
    const acceptanceChecks = readRequestIntakeAcceptanceChecks(formData)
    values = { ...values, acceptanceChecks: [...acceptanceChecks] }
    const viewer = await getRequestViewerState()
    if (viewer.status === 'signed_out') {
      return {
        status: 'ready',
        idempotencyKey,
        analyticsAttempt,
        values,
        errors: [],
        serviceError: 'auth_required',
      }
    }
    if (viewer.status === 'unavailable') {
      return {
        status: 'ready',
        idempotencyKey,
        analyticsAttempt,
        values,
        errors: [],
        serviceError: 'unavailable',
      }
    }
    const input = validateSubmitBuildRequestV1({
      contractVersion: REQUEST_CONTRACT_VERSION,
      idempotencyKey,
      brief: {
        ...values,
        acceptanceChecks,
      },
    })
    const service = await getRequestApplicationService()
    const receipt = await service.createRequest(input)
    return {
      status: 'submitted',
      idempotencyKey,
      analyticsAttempt,
      receipt: {
        commandId: receipt.commandId,
        requestId: receipt.requestId,
        version: receipt.requestVersion,
        eventId: receipt.eventId,
        occurredAt: receipt.occurredAt,
        lifecycle: receipt.lifecycleState,
        moderation: receipt.moderationState,
        publication: receipt.publicationState,
        replayed: receipt.replayed,
      },
      requestHref: `/requests/${encodeURIComponent(receipt.requestId)}`,
    }
  } catch (error) {
    const code = requestAuthorityErrorCode(error)
    const serviceError = code === 'not_admitted' ||
      code === 'controls_off' ||
      code === 'capacity_full' ||
      code === 'unavailable' ||
      code === 'rate_limited' ||
      code === 'duplicate' ||
      code === 'stale_version'
      ? code
      : error instanceof RequestContractError
        || error instanceof RequestIntakeEnvelopeError
        ? null
        : 'unavailable'
    return {
      status: 'ready',
      idempotencyKey,
      analyticsAttempt,
      values,
      errors: serviceError ? [] : validationError(error),
      serviceError,
    } satisfies RequestIntakeWorkflowState
  }
}
