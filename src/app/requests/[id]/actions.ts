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
  getRequestPublicApplicationService,
  getRequestPublicServerService,
  requestAuthorityErrorCode,
} from '@/lib/build-requests/server'
import {
  REQUEST_REPORT_CATEGORIES,
  requestPublicPatterns,
  type RequestPublicationCommandV1,
} from '@/lib/request-public-architecture'

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
    redirect(
      `/requests/${encodeURIComponent(base.requestId)}?actionError=unavailable`,
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

function publicActionFailure(requestId: string, error: unknown): never {
  const code = requestAuthorityErrorCode(error)
  const safeCode =
    code === 'stale_version' ||
    code === 'rate_limited' ||
    code === 'publication_blocked'
      ? code
      : 'unavailable'
  redirect(
    `/requests/${encodeURIComponent(requestId)}?actionError=${safeCode}`,
  )
}

export async function reportRequestAction(formData: FormData) {
  const requestId = text(formData, 'requestId')
  const category = text(formData, 'category')
  if (!REQUEST_REPORT_CATEGORIES.includes(
    category as (typeof REQUEST_REPORT_CATEGORIES)[number],
  )) {
    redirect(
      `/requests/${encodeURIComponent(requestId)}?actionError=unavailable`,
    )
  }
  try {
    await (await getRequestPublicApplicationService()).reportRequest({
      requestId,
      category: category as (typeof REQUEST_REPORT_CATEGORIES)[number],
      details: text(formData, 'details'),
      idempotencyKey: text(formData, 'idempotencyKey'),
    })
  } catch (error) {
    publicActionFailure(requestId, error)
  }
  revalidatePath(`/requests/${requestId}`)
}

export async function setRequestNotificationPreferenceAction(
  formData: FormData,
) {
  const requestId = text(formData, 'requestId')
  const values = formData.getAll('enabled')
  let enabled: boolean
  if (values.length === 1 && values[0] === 'no') {
    enabled = false
  } else if (
    values.length === 2 &&
    values[0] === 'no' &&
    values[1] === 'yes'
  ) {
    enabled = true
  } else {
    redirect(
      `/requests/${encodeURIComponent(requestId)}?actionError=unavailable`,
    )
  }
  try {
    await (
      await getRequestPublicApplicationService()
    ).setNotificationPreference({
      expectedPreferenceVersion: Number(
        text(formData, 'expectedPreferenceVersion'),
      ),
      transactionalEmailEnabled: enabled,
      idempotencyKey: text(formData, 'idempotencyKey'),
    })
  } catch (error) {
    const code = requestAuthorityErrorCode(error)
    const safeCode =
      code === 'stale_version' || code === 'rate_limited'
        ? code
        : 'unavailable'
    redirect(
      `/requests/${encodeURIComponent(requestId)}?actionError=${safeCode}`,
    )
  }
  revalidatePath(`/requests/${requestId}`)
  revalidatePath('/my-forge')
}

export async function requestPublicationAction(formData: FormData) {
  const requestId = text(formData, 'requestId')
  const command = text(formData, 'command')
  if (
    ![
      'propose',
      'replace_proposal',
      'requester_consent',
      'builder_consent',
      'decline',
      'withdraw',
      'submit_airlock',
    ].includes(command)
  ) {
    redirect(
      `/requests/${encodeURIComponent(requestId)}?actionError=unavailable`,
    )
  }
  if (command === 'withdraw') {
    const withdrawal = formData.getAll('publicationWithdrawal')
    if (
      withdrawal.length !== 2 ||
      withdrawal[0] !== 'no' ||
      withdrawal[1] !== 'yes'
    ) {
      redirect(
        `/requests/${encodeURIComponent(requestId)}?actionError=confirmation_required`,
      )
    }
  }
  const base = {
    requestId,
    expectedRequestVersion: Number(
      text(formData, 'expectedRequestVersion'),
    ),
    expectedProposalVersion:
      text(formData, 'expectedProposalVersion') === ''
        ? null
        : Number(text(formData, 'expectedProposalVersion')),
    idempotencyKey: text(formData, 'idempotencyKey'),
  }
  let input: RequestPublicationCommandV1
  if (command === 'propose' || command === 'replace_proposal') {
    input = {
      ...base,
      kind: command,
      payload: {
        safeTitle: text(formData, 'safeTitle'),
        safeSummary: text(formData, 'safeSummary'),
      },
    }
  } else if (command === 'requester_consent') {
    const consentValues = formData.getAll('publicationConsent')
    if (
      consentValues.length !== 2 ||
      consentValues[0] !== 'no' ||
      consentValues[1] !== 'yes'
    ) {
      redirect(
        `/requests/${encodeURIComponent(requestId)}?actionError=confirmation_required`,
      )
    }
    const attribution = text(formData, 'requesterAttribution')
    if (attribution !== 'anonymous' && attribution !== 'credited') {
      redirect(
        `/requests/${encodeURIComponent(requestId)}?actionError=unavailable`,
      )
    }
    input = {
      ...base,
      kind: command,
      payload: {
        requesterAttribution: attribution,
        publicationTermsVersion: text(
          formData,
          'publicationTermsVersion',
        ),
      },
    }
  } else if (command === 'builder_consent') {
    const consentValues = formData.getAll('publicationConsent')
    if (
      consentValues.length !== 2 ||
      consentValues[0] !== 'no' ||
      consentValues[1] !== 'yes'
    ) {
      redirect(
        `/requests/${encodeURIComponent(requestId)}?actionError=confirmation_required`,
      )
    }
    const permission = text(formData, 'reusePermission')
    if (permission !== 'view_only' && permission !== 'adapt_with_credit') {
      redirect(
        `/requests/${encodeURIComponent(requestId)}?actionError=unavailable`,
      )
    }
    input = {
      ...base,
      kind: command,
      payload: {
        reusePermission: permission,
        publicationTermsVersion: text(
          formData,
          'publicationTermsVersion',
        ),
      },
    }
  } else {
    input = {
      ...base,
      kind: command as 'decline' | 'withdraw' | 'submit_airlock',
      payload: {},
    }
  }
  let service
  let currentPublicationTermsVersion: string | null = null
  try {
    service = await getRequestPublicApplicationService()
    if (command === 'requester_consent' || command === 'builder_consent') {
      const availability = await service.getAvailability()
      currentPublicationTermsVersion =
        availability.policyVersions.publicationTerms
    }
  } catch (error) {
    publicActionFailure(requestId, error)
  }
  if (
    currentPublicationTermsVersion !== null &&
    text(formData, 'publicationTermsVersion') !==
      currentPublicationTermsVersion
  ) {
    redirect(
      `/requests/${encodeURIComponent(requestId)}?actionError=stale_version`,
    )
  }
  try {
    await service.executePublication(input)
  } catch (error) {
    publicActionFailure(requestId, error)
  }
  revalidatePath(`/requests/${requestId}`)
  revalidatePath(`/admin/build-requests/${requestId}`)
  revalidatePath('/admin/build-requests')
  revalidatePath('/requests/outcomes')
}

export async function publishRequestOutcomeAction(formData: FormData) {
  const requestId = text(formData, 'requestId')
  const proposalId = text(formData, 'proposalId')
  const expectedProposalVersion = Number(
    text(formData, 'expectedProposalVersion'),
  )
  const publishedProjectId = text(formData, 'publishedProjectId')
  const idempotencyKey = text(formData, 'idempotencyKey')
  const release = formData.getAll('publicationRelease')
  if (
    release.length !== 2 ||
    release[0] !== 'no' ||
    release[1] !== 'yes'
  ) {
    redirect(
      `/admin/build-requests/${encodeURIComponent(requestId)}?actionError=confirmation_required`,
    )
  }
  if (
    !requestPublicPatterns.uuid.test(requestId) ||
    !requestPublicPatterns.uuid.test(proposalId) ||
    !requestPublicPatterns.uuid.test(publishedProjectId) ||
    !Number.isSafeInteger(expectedProposalVersion) ||
    expectedProposalVersion < 1 ||
    expectedProposalVersion > 10_000_000 ||
    !requestPublicPatterns.key.test(idempotencyKey)
  ) {
    redirect(
      `/admin/build-requests/${encodeURIComponent(requestId)}?actionError=unavailable`,
    )
  }
  let publication: Awaited<
    ReturnType<
      Awaited<ReturnType<typeof getRequestPublicApplicationService>>[
        'getPublication'
      ]
    >
  >
  try {
    const participantService = await getRequestPublicApplicationService()
    await participantService.getOperations()
    publication = await participantService.getPublication(requestId)
  } catch (error) {
    const code = requestAuthorityErrorCode(error)
    const safeCode =
      code === 'stale_version' || code === 'publication_blocked'
        ? code
        : 'unavailable'
    redirect(
      `/admin/build-requests/${encodeURIComponent(requestId)}?actionError=${safeCode}`,
    )
  }
  if (
    publication.visibility !== 'full' ||
    !publication.capabilities.includes('publish_outcome') ||
    publication.proposal?.proposalId !== proposalId ||
    publication.proposal.proposalVersion !== expectedProposalVersion ||
    publication.proposal.status !== 'in_airlock'
  ) {
    redirect(
      `/admin/build-requests/${encodeURIComponent(requestId)}?actionError=stale_version`,
    )
  }
  try {
    await getRequestPublicServerService().publishOutcome({
      proposalId,
      publishedProjectId,
      idempotencyKey,
    })
  } catch (error) {
    const code = requestAuthorityErrorCode(error)
    const safeCode =
      code === 'stale_version' || code === 'publication_blocked'
        ? code
        : 'unavailable'
    redirect(
      `/admin/build-requests/${encodeURIComponent(requestId)}?actionError=${safeCode}`,
    )
  }
  revalidatePath(`/requests/${requestId}`)
  revalidatePath(`/admin/build-requests/${requestId}`)
  revalidatePath('/admin/build-requests')
  revalidatePath('/requests/outcomes')
}
