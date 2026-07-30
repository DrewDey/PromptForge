'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  REQUEST_CONTRACT_VERSION,
  type RequestAcknowledgeUpdatesInputV1,
  type RequestCommandV1,
} from '@/lib/request-lifecycle'
import type {
  RequestClarificationActionState,
} from '@/components/requests/RequestClarificationAction'
import {
  getRequestApplicationService,
  requestAuthorityErrorCode,
} from '@/lib/build-requests/server'

function text(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

export async function submitClarificationAction(
  previous: RequestClarificationActionState,
  formData: FormData,
): Promise<RequestClarificationActionState> {
  const requestId = text(formData, 'requestId')
  try {
    const service = await getRequestApplicationService()
    const receipt = await service.executeCommand({
      contractVersion: REQUEST_CONTRACT_VERSION,
      kind: 'submit_clarification',
      requestId,
      expectedVersion: Number(text(formData, 'expectedVersion')),
      idempotencyKey: text(formData, 'idempotencyKey'),
      payload: {
        clarificationId: text(formData, 'clarificationId'),
        answer: text(formData, 'answer'),
      },
    })
    revalidatePath(`/requests/${requestId}`)
    revalidatePath('/my-forge')
    return {
      status: 'submitted',
      attempt: previous.attempt + 1,
      replayed: receipt.replayed,
      requestVersion: receipt.requestVersion,
    }
  } catch (error) {
    const code = requestAuthorityErrorCode(error)
    return {
      status: 'error',
      attempt: previous.attempt + 1,
      code: code === 'stale_version' || code === 'rate_limited'
        ? code
        : 'unavailable',
    }
  }
}

export async function requestCaseCommandAction(formData: FormData) {
  const kind = text(formData, 'command')
  const base = {
    contractVersion: REQUEST_CONTRACT_VERSION,
    requestId: text(formData, 'requestId'),
    expectedVersion: Number(text(formData, 'expectedVersion')),
    idempotencyKey: text(formData, 'idempotencyKey'),
  }
  let command: RequestCommandV1
  if (kind === 'submit_clarification') {
    command = {
      ...base,
      kind,
      payload: {
        clarificationId: text(formData, 'clarificationId'),
        answer: text(formData, 'answer'),
      },
    }
  } else if (kind === 'withdraw') {
    if (text(formData, 'confirmation') !== 'confirmed') {
      redirect(
        `/requests/${encodeURIComponent(base.requestId)}?actionError=confirmation_required`,
      )
    }
    command = {
      ...base,
      kind,
      payload: { reason: text(formData, 'reason') },
    }
  } else if (kind === 'start_build') {
    command = {
      ...base,
      kind,
      payload: {},
    }
  } else {
    throw new Error('This participant action is not supported by the shared case shell.')
  }
  try {
    const service = await getRequestApplicationService()
    await service.executeCommand(command)
  } catch (error) {
    const code = requestAuthorityErrorCode(error)
    const safeCode = code === 'stale_version' || code === 'rate_limited'
      ? code
      : 'unavailable'
    redirect(`/requests/${encodeURIComponent(base.requestId)}?actionError=${safeCode}`)
  }
  revalidatePath(`/requests/${base.requestId}`)
  revalidatePath('/my-forge')
}

export async function acknowledgeRequestRead(
  input: RequestAcknowledgeUpdatesInputV1,
) {
  const service = await getRequestApplicationService()
  await service.acknowledgeRequestUpdates(input).catch(() => null)
  revalidatePath('/my-forge')
}
