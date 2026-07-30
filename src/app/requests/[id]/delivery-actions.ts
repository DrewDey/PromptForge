'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type {
  RequestDeliveryReceiptActionState,
} from '@/components/requests/delivery'
import {
  createRequestDeliveryActions,
} from '@/lib/build-requests/delivery-actions'
import {
  RequestContractError,
  type DeliveryReviewCheckV1,
} from '@/lib/request-lifecycle'
import { RequestAuthorityError } from '@/lib/request-service'
import { getRequestApplicationService } from '@/lib/build-requests/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/

function oneText(formData: FormData, name: string) {
  const values = formData.getAll(name)
  if (values.length !== 1 || typeof values[0] !== 'string') {
    throw new RequestContractError(`${name} is invalid.`)
  }
  return values[0]
}

function identity(formData: FormData) {
  const requestId = oneText(formData, 'request_id')
  const deliveryRevisionId = oneText(formData, 'delivery_revision_id')
  const idempotencyKey = oneText(formData, 'idempotency_intent')
  if (
    !UUID.test(requestId)
    || !UUID.test(deliveryRevisionId)
    || !IDEMPOTENCY_KEY.test(idempotencyKey)
  ) throw new RequestContractError('Delivery action identity is invalid.')
  return { requestId, deliveryRevisionId, idempotencyKey }
}

function boundedText(value: string, maximum = 2_000) {
  if (value.trim().length < 1 || value.length > maximum) {
    throw new RequestContractError('Delivery action text is invalid.')
  }
  return value
}

function safeError(error: unknown): RequestDeliveryReceiptActionState['error'] {
  if (error instanceof RequestAuthorityError) {
    if (error.code === 'stale_version' || error.code === 'rate_limited') {
      return error.code
    }
  }
  return error instanceof RequestContractError ? 'invalid_input' : 'unavailable'
}

async function actions() {
  return createRequestDeliveryActions({
    applicationService: await getRequestApplicationService(),
    serviceRoleClient: createAdminClient(),
  })
}

function reviewChecks(formData: FormData, command: 'approve_delivery' | 'request_repair') {
  const suffixes = Array.from(formData.keys())
    .filter(key => key.startsWith(command === 'approve_delivery' ? 'check_pass_' : 'check_result_'))
    .map(key => key.replace(
      command === 'approve_delivery' ? 'check_pass_' : 'check_result_',
      '',
    ))
  if (suffixes.length < 1 || suffixes.length > 3 || new Set(suffixes).size !== suffixes.length) {
    throw new RequestContractError('Delivery review checks are invalid.')
  }
  return suffixes.map<DeliveryReviewCheckV1>(acceptanceCheckId => {
    if (!UUID.test(acceptanceCheckId)) {
      throw new RequestContractError('Delivery review check id is invalid.')
    }
    const result = command === 'approve_delivery'
      ? oneText(formData, `check_pass_${acceptanceCheckId}`) === acceptanceCheckId
        ? 'pass'
        : null
      : oneText(formData, `check_result_${acceptanceCheckId}`)
    if (result !== 'pass' && result !== 'fail') {
      throw new RequestContractError('Delivery review result is invalid.')
    }
    const evidenceRef = oneText(formData, `evidence_ref_${acceptanceCheckId}`)
    if (
      evidenceRef !== ''
      && !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(evidenceRef)
    ) {
      throw new RequestContractError('Delivery review evidence reference is invalid.')
    }
    return {
      acceptanceCheckId,
      result,
      evidenceRef: evidenceRef === '' ? null : evidenceRef,
    }
  })
}

export async function requestDeliveryReviewAction(formData: FormData) {
  let requestId = ''
  try {
    const command = oneText(formData, 'command')
    const actionIdentity = identity(formData)
    requestId = actionIdentity.requestId
    const parsed = command === 'approve_delivery'
      ? {
          command,
          input: {
            ...actionIdentity,
            checks: reviewChecks(formData, command),
            reviewNotes: boundedText(oneText(formData, 'review_notes')),
          },
        } as const
      : command === 'request_repair'
        ? (() => {
            const safetyIntegrityResult = oneText(formData, 'safety_integrity_result')
            if (safetyIntegrityResult !== 'pass' && safetyIntegrityResult !== 'fail') {
              throw new RequestContractError('Safety result is invalid.')
            }
            return {
              command,
              input: {
                ...actionIdentity,
                checks: reviewChecks(formData, command),
                safetyIntegrityResult,
                reason: boundedText(oneText(formData, 'reason')),
                repairInstructions: boundedText(
                  oneText(formData, 'repair_instructions'),
                ),
              },
            } as const
          })()
        : (() => {
            throw new RequestContractError('Delivery review command is invalid.')
          })()
    const adapter = await actions()
    if (parsed.command === 'approve_delivery') {
      await adapter.approveDelivery(parsed.input)
    } else {
      await adapter.requestRepair(parsed.input)
    }
  } catch (error) {
    const code = safeError(error)
    redirect(
      `/admin/build-requests/${encodeURIComponent(requestId)}?actionError=${code}`,
    )
  }
  revalidatePath(`/admin/build-requests/${requestId}`)
  revalidatePath(`/requests/${requestId}`)
}

export async function acknowledgeRequestDeliveryAction(formData: FormData) {
  let requestId = ''
  try {
    if (oneText(formData, 'command') !== 'acknowledge_delivery') {
      throw new RequestContractError('Delivery acknowledgement is invalid.')
    }
    const actionIdentity = identity(formData)
    requestId = actionIdentity.requestId
    await (await actions()).acknowledgeDelivery(actionIdentity)
  } catch (error) {
    const code = safeError(error)
    redirect(`/requests/${encodeURIComponent(requestId)}?actionError=${code}`)
  }
  revalidatePath(`/requests/${requestId}`)
  revalidatePath('/my-forge')
}

export async function recordRequestDeliveryOutcomeAction(
  _previous: RequestDeliveryReceiptActionState,
  formData: FormData,
): Promise<RequestDeliveryReceiptActionState> {
  try {
    const command = oneText(formData, 'command')
    const outcome = oneText(formData, 'outcome')
    const actionIdentity = identity(formData)
    const parsed = command === 'requester_delivery_outcome_useful' && outcome === 'useful'
      ? { command: 'useful' as const, input: actionIdentity }
      : command === 'requester_delivery_outcome_failed' && outcome === 'failed_acceptance_check'
        ? (() => {
            const failedAcceptanceCheckId = oneText(
              formData,
              'failed_acceptance_check_id',
            )
            if (!UUID.test(failedAcceptanceCheckId)) {
              throw new RequestContractError('Failed acceptance check is invalid.')
            }
            return {
            command: 'failed' as const,
            input: {
              ...actionIdentity,
              failedAcceptanceCheckId,
              reason: boundedText(oneText(formData, 'reason')),
            },
          }
          })()
        : (() => {
            throw new RequestContractError('Delivery outcome is invalid.')
          })()
    const adapter = await actions()
    const receipt = parsed.command === 'useful'
      ? await adapter.markUseful(parsed.input)
      : await adapter.reportFailedAcceptanceCheck(parsed.input)
    revalidatePath(`/requests/${actionIdentity.requestId}`)
    revalidatePath('/my-forge')
    return {
      submitted: true,
      error: null,
      replayed: receipt.replayed,
      outcome,
      emissionKey: `delivery-outcome-event:${randomBytes(24).toString('base64url')}`,
    }
  } catch (error) {
    return {
      submitted: false,
      error: safeError(error),
      replayed: false,
      outcome: null,
      emissionKey: null,
    }
  }
}
