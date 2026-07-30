'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  REQUEST_CONTRACT_VERSION,
  type PathForgeRequestReference,
  type RequestCommandV1,
} from '@/lib/request-lifecycle'
import { parsePilotExpiryUtc } from '@/lib/build-requests/pilot-expiry'
import {
  getRequestApplicationService,
  requestAuthorityErrorCode,
} from '@/lib/build-requests/server'

function text(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

function controlFlag(formData: FormData, name: string) {
  const values = formData.getAll(name)
  if (values.length === 1 && values[0] === 'no') return false
  if (values.length === 2 && values[0] === 'no' && values[1] === 'yes') {
    return true
  }
  throw new Error('Invalid Request service control envelope.')
}

export async function updateRequestControlsAction(formData: FormData) {
  let acceptingRequests: boolean
  let assigningRequests: boolean
  try {
    acceptingRequests = controlFlag(formData, 'acceptingRequests')
    assigningRequests = controlFlag(formData, 'assigningRequests')
  } catch {
    redirect('/admin/build-requests?scope=admin&actionError=unavailable')
  }
  try {
    const service = await getRequestApplicationService()
    await service.updateControls({
      expectedControlsVersion: Number(text(formData, 'expectedControlsVersion')),
      idempotencyKey: text(formData, 'idempotencyKey'),
      acceptingRequests,
      assigningRequests,
      activeCaseCapacity: Number(text(formData, 'activeCaseCapacity')),
    })
  } catch (error) {
    const code = requestAuthorityErrorCode(error)
    const safeCode = code === 'stale_version' || code === 'rate_limited'
      ? code
      : 'unavailable'
    redirect(`/admin/build-requests?scope=admin&actionError=${safeCode}`)
  }
  revalidatePath('/requests')
  revalidatePath('/admin/build-requests')
}

export async function updatePilotAdmissionAction(formData: FormData) {
  const admissionAction = text(formData, 'admissionAction')
  if (admissionAction !== 'invite' && admissionAction !== 'revoke') {
    redirect('/admin/build-requests?scope=admin&actionError=unavailable')
  }
  const accountId = text(formData, 'accountId')
  let loaded
  try {
    const service = await getRequestApplicationService()
    const candidates = await service.listPilotAdmissionCandidates({ limit: 50 })
    const candidate = candidates.items.find((item) => item.accountId === accountId)
    loaded = { service, candidate }
  } catch (error) {
    const code = requestAuthorityErrorCode(error)
    const safeCode = code === 'stale_version' || code === 'rate_limited'
      ? code
      : 'unavailable'
    redirect(`/admin/build-requests?scope=admin&actionError=${safeCode}`)
  }
  if (!loaded.candidate) {
    redirect('/admin/build-requests?scope=admin&actionError=stale_version')
  }
  try {
    const base = {
      accountId,
      expectedAdmissionVersion: loaded.candidate.admissionVersion,
      idempotencyKey: `request-admission-${accountId}-v${loaded.candidate.admissionVersion}`,
      reason: text(formData, 'reason'),
    }
    if (admissionAction === 'invite') {
      const rawExpiry = text(formData, 'expiresAt')
      await loaded.service.inviteRequestPilotParticipant({
        ...base,
        expiresAt: parsePilotExpiryUtc(rawExpiry),
      })
    } else if (admissionAction === 'revoke') {
      await loaded.service.revokeRequestPilotParticipant(base)
    }
  } catch (error) {
    const code = requestAuthorityErrorCode(error)
    const safeCode = code === 'stale_version' || code === 'rate_limited'
      ? code
      : 'unavailable'
    redirect(`/admin/build-requests?scope=admin&actionError=${safeCode}`)
  }
  revalidatePath('/requests')
  revalidatePath('/admin/build-requests')
}

export async function adminRequestCommandAction(formData: FormData) {
  const requestId = text(formData, 'requestId')
  const expectedVersion = Number(text(formData, 'expectedVersion'))
  const idempotencyKey = text(formData, 'idempotencyKey')
  const base = {
    contractVersion: REQUEST_CONTRACT_VERSION,
    requestId,
    expectedVersion,
    idempotencyKey,
  }
  const commandName = text(formData, 'command')
  const resolution = text(formData, 'resolution')
  let command: RequestCommandV1
  if (commandName === 'close' && resolution === 'existing_resolution') {
    const kind = text(formData, 'referenceKind')
    if (kind !== 'project' && kind !== 'response') {
      redirect(
        `/admin/build-requests/${encodeURIComponent(requestId)}?actionError=unavailable`,
      )
    }
    const reference: PathForgeRequestReference = kind === 'response'
      ? {
          kind: 'response',
          projectId: text(formData, 'referenceProjectId'),
          modelVariantId: text(formData, 'referenceModelVariantId'),
          responseStepNumber: Number(text(formData, 'referenceResponseStepNumber')),
        }
      : { kind: 'project', projectId: text(formData, 'referenceProjectId') }
    command = {
      ...base,
      kind: 'close',
      payload: {
        reason: 'existing_resolution',
        resolutionReference: reference,
        note: text(formData, 'note'),
      },
    }
  } else if (commandName === 'close' && resolution === 'duplicate') {
    command = { ...base, kind: 'close', payload: { reason: 'duplicate' } }
  } else if (
    commandName === 'begin_triage' ||
    commandName === 'start_build' ||
    commandName === 'close_no_response'
  ) {
    command = { ...base, kind: commandName, payload: {} }
  } else if (commandName === 'request_clarification') {
    command = {
      ...base,
      kind: commandName,
      payload: { question: text(formData, 'question') },
    }
  } else if (commandName === 'accept') {
    command = {
      ...base,
      kind: commandName,
      payload: {
        builderId: text(formData, 'builderUserId'),
        targetDate: text(formData, 'targetDate'),
      },
    }
  } else if (commandName === 'assign_reviewer') {
    command = {
      ...base,
      kind: commandName,
      payload: { reviewerId: text(formData, 'reviewerUserId') },
    }
  } else if (
    commandName === 'reassign_triager' ||
    commandName === 'reassign_builder' ||
    commandName === 'reassign_reviewer'
  ) {
    if (text(formData, 'confirmed') !== 'yes') {
      redirect(
        `/admin/build-requests/${encodeURIComponent(requestId)}?actionError=confirmation_required`,
      )
    }
    command = commandName === 'reassign_triager'
      ? {
          ...base,
          kind: commandName,
          payload: {
            triagerId: text(formData, 'triagerUserId'),
            reason: text(formData, 'reason'),
          },
        }
      : commandName === 'reassign_builder'
        ? {
            ...base,
            kind: commandName,
            payload: {
              builderId: text(formData, 'builderUserId'),
              reason: text(formData, 'reason'),
            },
          }
        : {
            ...base,
            kind: commandName,
            payload: {
              reviewerId: text(formData, 'reviewerUserId'),
              reason: text(formData, 'reason'),
            },
          }
  } else if (
    commandName === 'place_moderation_hold' ||
    commandName === 'remove_for_moderation'
  ) {
    command = {
      ...base,
      kind: commandName,
      payload: { reason: text(formData, 'reason') },
    }
  } else if (commandName === 'release_moderation_hold') {
    command = {
      ...base,
      kind: commandName,
      payload: { resolution: text(formData, 'resolution') },
    }
  } else if (
    commandName === 'close' &&
    (
      text(formData, 'closeReason') === 'out_of_scope' ||
      text(formData, 'closeReason') === 'capacity_unavailable' ||
      text(formData, 'closeReason') === 'declined' ||
      text(formData, 'closeReason') === 'expired'
    )
  ) {
    const closeReason = text(formData, 'closeReason')
    command = {
      ...base,
      kind: 'close',
      payload: {
        reason: closeReason as 'out_of_scope' | 'capacity_unavailable' | 'declined' | 'expired',
        note: text(formData, 'note'),
      },
    }
  } else {
    redirect(
      `/admin/build-requests/${encodeURIComponent(requestId)}?actionError=unavailable`,
    )
  }
  try {
    const service = await getRequestApplicationService()
    await service.executeCommand(command)
  } catch (error) {
    const code = requestAuthorityErrorCode(error)
    const safeCode = code === 'stale_version' || code === 'rate_limited'
      ? code
      : 'unavailable'
    redirect(
      `/admin/build-requests/${encodeURIComponent(requestId)}?actionError=${safeCode}`,
    )
  }
  revalidatePath(`/requests/${requestId}`)
  revalidatePath(`/admin/build-requests/${requestId}`)
  revalidatePath('/admin/build-requests')
}
