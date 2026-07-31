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
  getRequestPublicApplicationService,
  requestAuthorityErrorCode,
} from '@/lib/build-requests/server'
import {
  REQUEST_INTAKE_AUDIENCES,
  REQUEST_READINESS_GATES,
  type RequestOperatorMembershipStateV1,
  type RequestOperatorRoleV1,
  type RequestReadinessGate,
  type RequestReportStatusV1,
} from '@/lib/request-public-architecture'

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

function redirectPublicActionError(error: unknown): never {
  const code = requestAuthorityErrorCode(error)
  const safeCode =
    code === 'stale_version' ||
    code === 'rate_limited' ||
    code === 'capacity_full' ||
    code === 'readiness_incomplete' ||
    code === 'publication_blocked' ||
    code === 'operator_unavailable'
      ? code
      : 'unavailable'
  redirect(`/admin/build-requests?scope=admin&actionError=${safeCode}`)
}

export async function updateRequestPublicControlsAction(formData: FormData) {
  const flagNames = [
    'acceptingRequests',
    'assigningRequests',
    'operatorRosterRequired',
    'publicIntakeRiskScreening',
    'transactionalNotificationsEnabled',
    'publicationConsentEnabled',
    'publicationAirlockEnabled',
    'publicOutcomesEnabled',
  ] as const
  let flags: Record<(typeof flagNames)[number], boolean>
  try {
    if (!controlFlag(formData, 'controlConfirmation')) {
      throw new Error('Request control update was not confirmed.')
    }
    flags = Object.fromEntries(
      flagNames.map((name) => [name, controlFlag(formData, name)]),
    ) as Record<(typeof flagNames)[number], boolean>
  } catch {
    redirect('/admin/build-requests?scope=admin&actionError=unavailable')
  }
  const intakeAudience = text(formData, 'intakeAudience')
  if (!REQUEST_INTAKE_AUDIENCES.includes(
    intakeAudience as (typeof REQUEST_INTAKE_AUDIENCES)[number],
  )) {
    redirect('/admin/build-requests?scope=admin&actionError=unavailable')
  }
  try {
    await (await getRequestPublicApplicationService()).setControls({
      expectedControlsVersion: Number(
        text(formData, 'expectedControlsVersion'),
      ),
      idempotencyKey: text(formData, 'idempotencyKey'),
      ...flags,
      intakeAudience: intakeAudience as (typeof REQUEST_INTAKE_AUDIENCES)[number],
      activeCaseCapacity: Number(text(formData, 'activeCaseCapacity')),
      fulfillmentCaseCapacity: Number(
        text(formData, 'fulfillmentCaseCapacity'),
      ),
      actorHourlyIntakeLimit: Number(
        text(formData, 'actorHourlyIntakeLimit'),
      ),
      networkHourlyIntakeLimit: Number(
        text(formData, 'networkHourlyIntakeLimit'),
      ),
      globalDailyIntakeLimit: Number(
        text(formData, 'globalDailyIntakeLimit'),
      ),
      policyVersions: {
        terms: text(formData, 'termsVersion'),
        privacy: text(formData, 'privacyVersion'),
        acceptableUse: text(formData, 'acceptableUseVersion'),
        requesterRights: text(formData, 'requesterRightsVersion'),
        publicationTerms: text(formData, 'publicationTermsVersion'),
      },
    })
  } catch (error) {
    redirectPublicActionError(error)
  }
  revalidatePath('/requests')
  revalidatePath('/requests/new')
  revalidatePath('/requests/outcomes')
  revalidatePath('/admin/build-requests')
}

export async function updateRequestOperatorAction(formData: FormData) {
  const target = /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}):(triager|builder|reviewer):(0|[1-9][0-9]{0,6})$/i
    .exec(text(formData, 'membershipTarget'))
  const state = text(formData, 'state')
  if (
    !target ||
    !['active', 'paused', 'revoked'].includes(state)
  ) {
    redirect('/admin/build-requests?scope=admin&actionError=unavailable')
  }
  const [, accountId, role, rawExpectedVersion] = target
  const expectedMembershipVersion = Number(rawExpectedVersion)
  const operatorQuery = text(formData, 'operatorQuery')
  if (operatorQuery.length > 80 || /[\0\r\n]/.test(operatorQuery)) {
    redirect('/admin/build-requests?scope=admin&actionError=unavailable')
  }
  let availableFrom: string | null
  let availableUntil: string | null
  try {
    availableFrom = parsePilotExpiryUtc(text(formData, 'availableFrom'))
    availableUntil = parsePilotExpiryUtc(text(formData, 'availableUntil'))
    if (
      availableUntil !== null &&
      (
        availableFrom === null ||
        Date.parse(availableUntil) <= Date.parse(availableFrom)
      )
    ) throw new Error('invalid_operator_availability')
  } catch {
    redirect('/admin/build-requests?scope=admin&actionError=unavailable')
  }
  let loaded
  try {
    const service = await getRequestPublicApplicationService()
    const directory = await service.listOperators({
      query: operatorQuery,
      limit: 100,
    })
    const candidate = directory.items.find((item) => item.accountId === accountId)
    loaded = { service, candidate }
  } catch (error) {
    redirectPublicActionError(error)
  }
  if (!loaded.candidate) {
    redirect('/admin/build-requests?scope=admin&actionError=stale_version')
  }
  const membership = loaded.candidate.memberships.find(
    (item) => item.role === role,
  )
  if ((membership?.version ?? 0) !== expectedMembershipVersion) {
    redirect('/admin/build-requests?scope=admin&actionError=stale_version')
  }
  try {
    await loaded.service.setOperatorMembership({
      accountId,
      role: role as RequestOperatorRoleV1,
      expectedMembershipVersion,
      state: state as RequestOperatorMembershipStateV1,
      maxActiveCases: Number(text(formData, 'maxActiveCases')),
      availableFrom,
      availableUntil,
      reason: text(formData, 'reason'),
      idempotencyKey: text(formData, 'idempotencyKey'),
    })
  } catch (error) {
    redirectPublicActionError(error)
  }
  revalidatePath('/admin/build-requests')
}

export async function updateRequestReadinessAction(formData: FormData) {
  const gate = text(formData, 'gate')
  const state = text(formData, 'state')
  if (
    !REQUEST_READINESS_GATES.includes(
      gate as (typeof REQUEST_READINESS_GATES)[number],
    ) ||
    (state !== 'confirmed' && state !== 'revoked')
  ) {
    redirect('/admin/build-requests?scope=admin&actionError=unavailable')
  }
  const rawValidUntil = text(formData, 'validUntil')
  if (state === 'revoked' && rawValidUntil !== '') {
    redirect('/admin/build-requests?scope=admin&actionError=unavailable')
  }
  let validUntil: string | null
  try {
    validUntil = parsePilotExpiryUtc(rawValidUntil)
  } catch {
    redirect('/admin/build-requests?scope=admin&actionError=unavailable')
  }
  try {
    await (await getRequestPublicApplicationService()).recordReadiness({
      gate: gate as RequestReadinessGate,
      expectedEvidenceVersion: Number(
        text(formData, 'expectedEvidenceVersion'),
      ),
      state,
      evidenceReference: text(formData, 'evidenceReference'),
      validUntil,
      note: text(formData, 'note'),
      idempotencyKey: text(formData, 'idempotencyKey'),
    })
  } catch (error) {
    redirectPublicActionError(error)
  }
  revalidatePath('/admin/build-requests')
}

export async function updateRequestReportAction(formData: FormData) {
  const expectedStatus = text(formData, 'expectedStatus')
  const nextStatus = text(formData, 'nextStatus')
  if (
    !['open', 'reviewing'].includes(expectedStatus) ||
    !['reviewing', 'resolved', 'dismissed'].includes(nextStatus) ||
    (
      expectedStatus === 'open'
        ? nextStatus !== 'reviewing'
        : !['resolved', 'dismissed'].includes(nextStatus)
    )
  ) {
    redirect('/admin/build-requests?scope=admin&actionError=unavailable')
  }
  try {
    await (await getRequestPublicApplicationService()).setReportStatus({
      reportId: text(formData, 'reportId'),
      expectedStatus: expectedStatus as Extract<
        RequestReportStatusV1,
        'open' | 'reviewing'
      >,
      nextStatus: nextStatus as Extract<
        RequestReportStatusV1,
        'reviewing' | 'resolved' | 'dismissed'
      >,
      resolutionNote: nextStatus === 'reviewing'
        ? null
        : text(formData, 'resolutionNote'),
      idempotencyKey: text(formData, 'idempotencyKey'),
    })
  } catch (error) {
    redirectPublicActionError(error)
  }
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
    const safeCode =
      code === 'stale_version' ||
      code === 'rate_limited' ||
      code === 'capacity_full' ||
      code === 'operator_unavailable'
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
