'use server'

import {
  REQUEST_CONTRACT_VERSION,
  RequestContractError,
  validateSubmitBuildRequestV1,
  type PathForgeRequestReference,
} from '@/lib/request-lifecycle'
import {
  getRequestApplicationService,
  getRequestViewer,
  requestAuthorityErrorCode,
} from '@/lib/build-requests/server'
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
    acceptanceChecks: formData
      .getAll('acceptanceChecks')
      .filter((value): value is string => typeof value === 'string'),
    constraints: text(formData, 'constraints'),
    pathforgeReference,
  }
}

function validationError(error: unknown): RequestIntakeError[] {
  return [{
    field: 'form',
    message: error instanceof RequestContractError
      ? error.message
      : 'The brief did not match the authoritative Request contract.',
  }]
}

export const submitRequestAction: RequestIntakeWorkflowAction = async (
  previousState,
  formData,
) => {
  const values = valuesFromForm(formData)
  const idempotencyKey = text(formData, 'idempotencyKey')
  const analyticsAttempt = previousState.analyticsAttempt + 1
  try {
    const viewer = await getRequestViewer()
    if (!viewer) {
      return {
        status: 'ready',
        idempotencyKey,
        analyticsAttempt,
        values,
        errors: [],
        serviceError: 'auth_required',
      }
    }
    const checks = values.acceptanceChecks
    const acceptanceChecks = checks.length === 1
      ? [checks[0]] as const
      : checks.length === 2
        ? [checks[0], checks[1]] as const
        : [checks[0], checks[1], checks[2]] as const
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
