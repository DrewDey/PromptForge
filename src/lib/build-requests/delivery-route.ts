import 'server-only'

import { createHash } from 'node:crypto'
import {
  REQUEST_CONTRACT_VERSION,
  RequestContractError,
  validateRequestCommandV1,
  type RequestBuilderEvidenceV1,
} from '@/lib/request-lifecycle'
import {
  createRequestDeliveryPreparationReplayResolver,
  createRequestStagedArtifactCustodyService,
  RequestAuthorityError,
  type RequestApplicationService,
  type RequestRpcClient,
} from '@/lib/request-service'

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/

export type RequestDeliveryRouteErrorCode =
  | 'auth_required'
  | 'forbidden'
  | 'held'
  | 'removed'
  | 'stale_version'
  | 'rate_limited'
  | 'artifact_staging_limit'
  | 'invalid_upload'
  | 'integrity_failed'
  | 'unavailable'

export class RequestDeliveryRouteError extends Error {
  readonly code: RequestDeliveryRouteErrorCode

  constructor(code: RequestDeliveryRouteErrorCode) {
    super(code)
    this.name = 'RequestDeliveryRouteError'
    this.code = code
  }
}

export type RequestDeliverySubmissionResult =
  | { requestVersion: number; submissionStatus: 'submitted' }
  | { requestVersion: number; submissionStatus: 'sealed_waiting_for_reviewer' }

export function requireRequestDeliveryViewer(
  viewer: { status: 'signed_in'; user: { id: string } }
    | { status: 'signed_out' }
    | { status: 'unavailable' },
) {
  if (viewer.status === 'signed_out') {
    throw new RequestDeliveryRouteError('auth_required')
  }
  if (viewer.status === 'unavailable') {
    throw new RequestDeliveryRouteError('unavailable')
  }
  return viewer.user.id
}

function exactRecord(value: unknown, keys: readonly string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestContractError('Delivery input must be an object.')
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (
    actual.length !== expected.length
    || actual.some((key, index) => key !== expected[index])
  ) {
    throw new RequestContractError('Delivery input has unexpected fields.')
  }
  return value as Record<string, unknown>
}

function string(value: unknown, pattern?: RegExp) {
  if (typeof value !== 'string' || (pattern && !pattern.test(value))) {
    throw new RequestContractError('Delivery input is invalid.')
  }
  return value
}

function version(value: unknown) {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RequestContractError('Delivery version is invalid.')
  }
  return value as number
}

function normalizedText(value: unknown, label: string, maximum: number) {
  const normalized = string(value).trim()
  if (normalized.length < 1 || normalized.length > maximum) {
    throw new RequestContractError(`${label} is invalid.`)
  }
  return normalized
}

export function deriveRequestDeliveryRouteIdempotencyKey(
  phase: 'seal' | 'submit',
  input: string,
) {
  const digest = createHash('sha256').update(`${phase}:${input}`).digest('base64url')
  return `request-delivery-${phase}-${digest}`
}

function evidence(value: unknown): RequestBuilderEvidenceV1[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 3) {
    throw new RequestContractError('Delivery evidence is invalid.')
  }
  const seen = new Set<string>()
  return value.map(item => {
    const row = exactRecord(
      item,
      ['acceptanceCheckId', 'result', 'evidenceText', 'evidenceRef'],
    )
    const result = row.result
    if (!['pass', 'fail', 'not_run'].includes(result as string)) {
      throw new RequestContractError('Delivery evidence result is invalid.')
    }
    const acceptanceCheckId = string(row.acceptanceCheckId, UUID)
    if (seen.has(acceptanceCheckId)) {
      throw new RequestContractError('Delivery evidence checks must be distinct.')
    }
    seen.add(acceptanceCheckId)
    const evidenceRef = row.evidenceRef === null
      ? null
      : string(row.evidenceRef, /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/)
    return {
      acceptanceCheckId,
      result: result as RequestBuilderEvidenceV1['result'],
      evidenceText: row.evidenceText === null
        ? null
        : normalizedText(row.evidenceText, 'Delivery evidence text', 2_000),
      evidenceRef,
    }
  })
}

function sameEvidence(
  left: readonly RequestBuilderEvidenceV1[],
  right: readonly RequestBuilderEvidenceV1[],
) {
  return (
    left.length === right.length
    && left.every((item, index) => {
      const other = right[index]
      return (
        other !== undefined
        && item.acceptanceCheckId === other.acceptanceCheckId
        && item.result === other.result
        && item.evidenceText === other.evidenceText
        && item.evidenceRef === other.evidenceRef
      )
    })
  )
}

export function parseRequestDeliveryPreparationInput(raw: unknown) {
  const input = exactRecord(raw, [
    'requestId',
    'expectedVersion',
    'deliveryRevisionId',
    'idempotencyKey',
    'revisionLabel',
    'summary',
    'builderEvidence',
    'builderAttestation',
  ])
  if (input.builderAttestation !== 'confirmed') {
    throw new RequestContractError('Builder attestation is required.')
  }
  return {
    requestId: string(input.requestId, UUID),
    expectedVersion: version(input.expectedVersion),
    deliveryRevisionId: string(input.deliveryRevisionId, UUID),
    idempotencyKey: string(input.idempotencyKey, IDEMPOTENCY_KEY),
    revisionLabel: normalizedText(input.revisionLabel, 'Delivery revision label', 80),
    summary: normalizedText(input.summary, 'Delivery summary', 2_000),
    builderEvidence: evidence(input.builderEvidence),
    builderAttestation: 'confirmed' as const,
  }
}

export function parseRequestDeliverySubmissionInput(raw: unknown) {
  const input = exactRecord(raw, [
    'requestId',
    'expectedVersion',
    'deliveryRevisionId',
    'idempotencyKey',
  ])
  return {
    requestId: string(input.requestId, UUID),
    expectedVersion: version(input.expectedVersion),
    deliveryRevisionId: string(input.deliveryRevisionId, UUID),
    idempotencyKey: string(input.idempotencyKey, IDEMPOTENCY_KEY),
  }
}

export function parseRequestDeliveryAbandonInput(raw: unknown) {
  const input = exactRecord(raw, [
    'requestId',
    'deliveryRevisionId',
    'artifactId',
    'idempotencyKey',
  ])
  return {
    requestId: string(input.requestId, UUID),
    deliveryRevisionId: string(input.deliveryRevisionId, UUID),
    artifactId: string(input.artifactId, UUID),
    idempotencyKey: string(input.idempotencyKey, IDEMPOTENCY_KEY),
  }
}

export async function prepareRequestDeliveryRevision(
  raw: unknown,
  dependencies: {
    applicationService: RequestApplicationService
    serviceRoleClient: RequestRpcClient
  },
) {
  const input = parseRequestDeliveryPreparationInput(raw)
  const {
    requestId,
    deliveryRevisionId,
    expectedVersion,
    idempotencyKey,
    builderEvidence,
  } = input
  if (idempotencyKey !== `delivery-prepare-${deliveryRevisionId}`) {
    throw new RequestContractError('Delivery preparation intent is invalid.')
  }
  const detail = await dependencies.applicationService.getRequest(requestId)
  const workspace = detail.visibility === 'full' ? detail.builderWorkspace : null
  const versionMatches = workspace?.revisionState === 'staging'
    ? detail.requestVersion === expectedVersion
    : workspace?.revisionState === 'prepared' || workspace?.revisionState === 'sealed'
      ? detail.requestVersion === expectedVersion + 1
      : false
  if (
    detail.visibility !== 'full'
    || detail.moderationState !== 'clear'
    || !versionMatches
    || !detail.actor.roles.includes('builder')
    || workspace?.deliveryRevisionId !== deliveryRevisionId
    || !['staging', 'prepared', 'sealed'].includes(workspace.revisionState)
    || workspace.artifacts.length < 1
    || (
      workspace.revisionState === 'staging'
      && !detail.actor.capabilities.includes('prepare_delivery_revision')
    )
  ) {
    throw new RequestDeliveryRouteError(
      detail.visibility === 'held'
        ? 'held'
        : detail.visibility === 'removed'
          ? 'removed'
          : 'forbidden',
    )
  }
  const acceptedIds = detail.brief.acceptanceChecks.map(item => item.acceptanceCheckId)
  if (
    builderEvidence.length !== acceptedIds.length
    || builderEvidence.some((item, index) => item.acceptanceCheckId !== acceptedIds[index])
  ) {
    throw new RequestContractError('Delivery evidence must match every accepted check.')
  }
  if (
    workspace.revisionState !== 'staging'
    && (
      workspace.revisionLabel !== input.revisionLabel
      || workspace.summary !== input.summary
      || !sameEvidence(workspace.builderEvidence, builderEvidence)
    )
  ) {
    throw new RequestContractError(
      'Prepared delivery retry must match the recorded revision.',
    )
  }
  if (workspace.revisionState === 'sealed') {
    if (!workspace.sealReceiptId) {
      throw new RequestDeliveryRouteError('unavailable')
    }
    return { requestVersion: detail.requestVersion }
  }
  const command = validateRequestCommandV1({
    contractVersion: REQUEST_CONTRACT_VERSION,
    kind: 'prepare_delivery_revision',
    requestId,
    expectedVersion,
    idempotencyKey,
    payload: {
      deliveryRevisionId,
      acceptedBriefRevisionId: workspace.acceptedBriefRevisionId,
      activeBuilderAssignmentId: workspace.activeBuilderAssignmentId,
      revisionLabel: workspace.revisionState === 'prepared'
        ? workspace.revisionLabel ?? ''
        : input.revisionLabel,
      summary: workspace.revisionState === 'prepared'
        ? workspace.summary ?? ''
        : input.summary,
      builderEvidence: workspace.revisionState === 'prepared'
        ? workspace.builderEvidence
        : builderEvidence,
      approvedPathForgeReference: workspace.approvedPathForgeReference ?? undefined,
    },
  })
  const preparation = await dependencies.applicationService.executeCommand(command)
  const sealed = await createRequestStagedArtifactCustodyService(
    dependencies.serviceRoleClient,
  ).sealDeliveryRevision({
    requestId,
    deliveryRevisionId,
    preparationReceiptId: preparation.commandId,
    idempotencyKey: deriveRequestDeliveryRouteIdempotencyKey('seal', idempotencyKey),
    artifacts: workspace.artifacts.map(artifact => ({
      artifactOrdinal: artifact.artifactOrdinal,
      artifactId: artifact.artifactId,
    })),
  })
  if (
    sealed.requestId !== requestId
    || sealed.deliveryRevisionId !== deliveryRevisionId
  ) {
    throw new RequestDeliveryRouteError('unavailable')
  }
  return { requestVersion: preparation.requestVersion }
}

export async function submitRequestDeliveryRevision(
  raw: unknown,
  dependencies: {
    applicationService: RequestApplicationService
    serviceRoleClient: RequestRpcClient
  },
) {
  const input = parseRequestDeliverySubmissionInput(raw)
  const {
    requestId,
    deliveryRevisionId,
    expectedVersion,
    idempotencyKey,
  } = input
  if (
    idempotencyKey
    !== `delivery-seal-submit-${deliveryRevisionId}-${expectedVersion}`
  ) {
    throw new RequestContractError('Delivery submission intent is invalid.')
  }
  let detail = await dependencies.applicationService.getRequest(requestId)
  let workspace = detail.visibility === 'full' ? detail.builderWorkspace : null
  let submissionExpectedVersion = expectedVersion
  const submittedRevision = detail.visibility === 'full'
    ? detail.deliveryRevisions.find(revision => (
        revision.isCurrent && revision.deliveryRevisionId === deliveryRevisionId
      ))
    : undefined
  if (
    detail.visibility === 'full'
    && detail.moderationState === 'clear'
    && detail.actor.roles.includes('builder')
    && submittedRevision
    && ['review_pending', 'delivery_ready', 'delivered', 'completed'].includes(
      detail.lifecycleState,
    )
  ) {
    return {
      requestVersion: detail.requestVersion,
      submissionStatus: 'submitted',
    } satisfies RequestDeliverySubmissionResult
  }
  if (
    detail.visibility === 'full'
    && detail.moderationState === 'clear'
    && detail.actor.roles.includes('builder')
    && workspace?.deliveryRevisionId === deliveryRevisionId
    && workspace.revisionState === 'prepared'
  ) {
    const replayBinding = await createRequestDeliveryPreparationReplayResolver(
      dependencies.serviceRoleClient,
    ).resolveDeliveryPreparationReplay({
      actorId: detail.actor.accountId,
      requestId,
      deliveryRevisionId,
    })
    const preparation = await dependencies.applicationService.executeCommand(
      validateRequestCommandV1({
        contractVersion: REQUEST_CONTRACT_VERSION,
        kind: 'prepare_delivery_revision',
        requestId,
        expectedVersion: replayBinding.expectedRequestVersion,
        idempotencyKey: replayBinding.idempotencyKey,
        payload: {
          deliveryRevisionId,
          acceptedBriefRevisionId: workspace.acceptedBriefRevisionId,
          activeBuilderAssignmentId: workspace.activeBuilderAssignmentId,
          revisionLabel: workspace.revisionLabel ?? '',
          summary: workspace.summary ?? '',
          builderEvidence: workspace.builderEvidence,
          approvedPathForgeReference: workspace.approvedPathForgeReference ?? undefined,
        },
      }),
    )
    if (preparation.commandId !== replayBinding.preparationReceiptId) {
      throw new RequestDeliveryRouteError('unavailable')
    }
    await createRequestStagedArtifactCustodyService(
      dependencies.serviceRoleClient,
    ).sealDeliveryRevision({
      requestId,
      deliveryRevisionId,
      preparationReceiptId: replayBinding.preparationReceiptId,
      idempotencyKey: deriveRequestDeliveryRouteIdempotencyKey(
        'seal',
        replayBinding.idempotencyKey,
      ),
      artifacts: workspace.artifacts.map(artifact => ({
        artifactOrdinal: artifact.artifactOrdinal,
        artifactId: artifact.artifactId,
      })),
    })
    detail = await dependencies.applicationService.getRequest(requestId)
    workspace = detail.visibility === 'full' ? detail.builderWorkspace : null
    submissionExpectedVersion = detail.requestVersion
  }
  const requestedCommand = detail.visibility === 'full'
    && detail.actor.capabilities.includes('submit_delivery')
    ? 'submit_delivery'
    : detail.visibility === 'full'
      && detail.actor.capabilities.includes('resubmit_delivery')
      ? 'resubmit_delivery'
      : null
  const isExactSealedWorkspace = (
    detail.visibility === 'full'
    && detail.moderationState === 'clear'
    && detail.actor.roles.includes('builder')
    && workspace?.deliveryRevisionId === deliveryRevisionId
    && workspace.revisionState === 'sealed'
    && workspace.sealReceiptId !== null
  )
  if (requestedCommand === null && isExactSealedWorkspace) {
    return {
      requestVersion: detail.requestVersion,
      submissionStatus: 'sealed_waiting_for_reviewer',
    } satisfies RequestDeliverySubmissionResult
  }
  if (
    detail.visibility !== 'full'
    || detail.moderationState !== 'clear'
    || detail.requestVersion !== submissionExpectedVersion
    || !detail.actor.roles.includes('builder')
    || requestedCommand === null
    || workspace?.deliveryRevisionId !== deliveryRevisionId
    || workspace.revisionState !== 'sealed'
    || !workspace.sealReceiptId
  ) {
    throw new RequestDeliveryRouteError(
      detail.visibility === 'held'
        ? 'held'
        : detail.visibility === 'removed'
          ? 'removed'
          : 'forbidden',
    )
  }

  const receipt = await dependencies.applicationService.executeCommand(
    validateRequestCommandV1({
      contractVersion: REQUEST_CONTRACT_VERSION,
      kind: requestedCommand,
      requestId,
      expectedVersion: submissionExpectedVersion,
      idempotencyKey: deriveRequestDeliveryRouteIdempotencyKey('submit', idempotencyKey),
      payload: { deliveryRevisionId, sealReceiptId: workspace.sealReceiptId },
    }),
  )
  return {
    requestVersion: receipt.requestVersion,
    submissionStatus: 'submitted',
  } satisfies RequestDeliverySubmissionResult
}

export function requestDeliveryRouteErrorCode(
  error: unknown,
): RequestDeliveryRouteErrorCode {
  if (error instanceof RequestDeliveryRouteError) return error.code
  if (error instanceof RequestAuthorityError) {
    if (
      error.code === 'stale_version'
      || error.code === 'rate_limited'
      || error.code === 'artifact_staging_limit'
    ) return error.code
  }
  if (error instanceof RequestContractError) return 'invalid_upload'
  return 'unavailable'
}

export function requestDeliveryRouteErrorStatus(
  code: RequestDeliveryRouteErrorCode,
) {
  if (code === 'auth_required') return 401
  if (code === 'forbidden' || code === 'held' || code === 'removed') return 403
  if (code === 'rate_limited') return 429
  if (code === 'stale_version' || code === 'artifact_staging_limit') return 409
  if (code === 'unavailable') return 503
  return 400
}
