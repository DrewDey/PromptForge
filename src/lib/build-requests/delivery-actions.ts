import 'server-only'

import {
  createRequestDeliveryRevisionActionResolver,
  type RequestApplicationService,
  type RequestDeliveryRevisionActionKind,
  type RequestDeliveryRevisionActionServiceRoleRpcClient,
} from '@/lib/request-service'
import {
  REQUEST_CONTRACT_VERSION,
  RequestContractError,
  validateRequestCommandV1,
  type DeliveryReviewCheckV1,
  type RequestCaseDetailV1,
  type RequestCommandReceipt,
  type RequestParticipantCommandV1,
} from '@/lib/request-lifecycle'

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/

type DeliveryActionIdentity = {
  requestId: string
  deliveryRevisionId: string
  idempotencyKey: string
}

export type ApproveRequestDeliveryInput = DeliveryActionIdentity & {
  checks: readonly DeliveryReviewCheckV1[]
  reviewNotes: string
}

export type RequestDeliveryRepairInput = DeliveryActionIdentity & {
  checks: readonly DeliveryReviewCheckV1[]
  safetyIntegrityResult: 'pass' | 'fail'
  reason: string
  repairInstructions: string
}

export type MarkRequestDeliveryUsefulInput = DeliveryActionIdentity

export type ReportRequestDeliveryFailedCheckInput = DeliveryActionIdentity & {
  failedAcceptanceCheckId: string
  reason: string
}

export type AcknowledgeRequestDeliveryInput = DeliveryActionIdentity

export type AbandonRequestDeliveryArtifactInput = DeliveryActionIdentity & {
  artifactId: string
}

export interface RequestDeliveryActions {
  abandonArtifact(
    input: AbandonRequestDeliveryArtifactInput,
  ): Promise<RequestCommandReceipt>
  approveDelivery(input: ApproveRequestDeliveryInput): Promise<RequestCommandReceipt>
  requestRepair(input: RequestDeliveryRepairInput): Promise<RequestCommandReceipt>
  markUseful(input: MarkRequestDeliveryUsefulInput): Promise<RequestCommandReceipt>
  reportFailedAcceptanceCheck(
    input: ReportRequestDeliveryFailedCheckInput,
  ): Promise<RequestCommandReceipt>
  acknowledgeDelivery(
    input: AcknowledgeRequestDeliveryInput,
  ): Promise<RequestCommandReceipt>
}

export type CreateRequestDeliveryActionsInput = {
  /** Cookie-scoped Request service for the same authenticated actor. */
  applicationService: RequestApplicationService
  /** Service-role client used only by the narrow revision action resolver. */
  serviceRoleClient: RequestDeliveryRevisionActionServiceRoleRpcClient
}

function exactRecord(
  value: unknown,
  keys: readonly string[],
  label: string,
): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestContractError(`${label} must be an object.`)
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new RequestContractError(`${label} has unexpected fields.`)
  }
}

function uuid(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw new RequestContractError(`${label} must be a UUID.`)
  }
}

function idempotencyKey(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !IDEMPOTENCY_KEY.test(value)) {
    throw new RequestContractError(
      'idempotencyKey must be 8-128 safe characters.',
    )
  }
}

function validateIdentity(
  input: DeliveryActionIdentity,
  extraKeys: readonly string[] = [],
) {
  exactRecord(
    input,
    ['requestId', 'deliveryRevisionId', 'idempotencyKey', ...extraKeys],
    'Delivery action input',
  )
  uuid(input.requestId, 'requestId')
  uuid(input.deliveryRevisionId, 'deliveryRevisionId')
  idempotencyKey(input.idempotencyKey)
}

async function getActorDetail(
  applicationService: RequestApplicationService,
  input: DeliveryActionIdentity,
): Promise<{
  detail: RequestCaseDetailV1
  currentDelivery: RequestCaseDetailV1['deliveryRevisions'][number]
  actorId: string
}> {
  const detail = await applicationService.getRequest(input.requestId)
  if (
    detail.visibility !== 'full' ||
    detail.requestId !== input.requestId
  ) {
    throw new RequestContractError(
      'Delivery action is unavailable for the authenticated actor.',
    )
  }
  const currentDelivery = detail.deliveryRevisions.find(
    (revision) =>
      revision.isCurrent &&
      revision.deliveryRevisionId === input.deliveryRevisionId,
  )
  if (
    !currentDelivery ||
    currentDelivery.acceptedBriefRevisionId !== detail.briefRevisionId
  ) {
    throw new RequestContractError(
      'Delivery action requires the current accepted delivery revision.',
    )
  }
  return { detail, currentDelivery, actorId: detail.actor.accountId }
}

function validateReviewCoverage(
  detail: RequestCaseDetailV1,
  checks: readonly DeliveryReviewCheckV1[],
) {
  if (!Array.isArray(checks)) {
    throw new RequestContractError('Delivery review checks are required.')
  }
  const acceptedIds = detail.brief.acceptanceChecks
    .map((check) => check.acceptanceCheckId)
    .sort()
  const reviewIds = checks.map((check) => check.acceptanceCheckId).sort()
  if (
    acceptedIds.length !== reviewIds.length ||
    acceptedIds.some((id, index) => id !== reviewIds[index])
  ) {
    throw new RequestContractError(
      'Delivery review must cover each accepted check exactly once.',
    )
  }
}

async function executeValidated(
  applicationService: RequestApplicationService,
  command: RequestParticipantCommandV1,
) {
  const valid = validateRequestCommandV1(command)
  return applicationService.executeCommand(valid)
}

/**
 * Creates server-only delivery action seams. Browser data supplies only the
 * requested case/revision, idempotency intent, and human review/outcome input.
 * Current request version and manifest digest are resolved server-side and are
 * passed directly into the cookie-authenticated command without being
 * returned, logged, or projected.
 */
export function createRequestDeliveryActions(
  input: CreateRequestDeliveryActionsInput,
): RequestDeliveryActions {
  exactRecord(
    input,
    ['applicationService', 'serviceRoleClient'],
    'Request delivery action dependencies',
  )

  const resolver = createRequestDeliveryRevisionActionResolver(
    input.serviceRoleClient,
  )

  async function resolveBoundAction(
    identity: DeliveryActionIdentity,
    actorId: string,
    action: RequestDeliveryRevisionActionKind,
  ) {
    return resolver.resolveDeliveryRevisionAction({
      actorId,
      requestId: identity.requestId,
      deliveryRevisionId: identity.deliveryRevisionId,
      action,
    })
  }

  return {
    async abandonArtifact(actionInput) {
      validateIdentity(actionInput, ['artifactId'])
      uuid(actionInput.artifactId, 'artifactId')
      const detail = await input.applicationService.getRequest(actionInput.requestId)
      if (
        detail.visibility !== 'full'
        || detail.requestId !== actionInput.requestId
        || !detail.actor.roles.includes('builder')
        || !detail.actor.capabilities.includes('abandon_delivery_artifact')
        || detail.builderWorkspace?.revisionState !== 'staging'
        || detail.builderWorkspace.deliveryRevisionId !== actionInput.deliveryRevisionId
        || !detail.builderWorkspace.artifacts.some(
          artifact => artifact.artifactId === actionInput.artifactId,
        )
      ) {
        throw new RequestContractError(
          'Artifact abandonment is unavailable for the authenticated actor.',
        )
      }

      return executeValidated(input.applicationService, {
        contractVersion: REQUEST_CONTRACT_VERSION,
        kind: 'abandon_delivery_artifact',
        requestId: detail.requestId,
        expectedVersion: detail.requestVersion,
        idempotencyKey: actionInput.idempotencyKey,
        payload: {
          deliveryRevisionId: actionInput.deliveryRevisionId,
          artifactId: actionInput.artifactId,
        },
      })
    },

    async approveDelivery(actionInput) {
      validateIdentity(actionInput, ['checks', 'reviewNotes'])
      const { detail, currentDelivery, actorId } = await getActorDetail(
        input.applicationService,
        actionInput,
      )
      validateReviewCoverage(detail, actionInput.checks)
      const binding = await resolveBoundAction(actionInput, actorId, 'approve_delivery')

      return executeValidated(input.applicationService, {
        contractVersion: REQUEST_CONTRACT_VERSION,
        kind: 'approve_delivery',
        requestId: binding.requestId,
        expectedVersion: binding.requestVersion,
        idempotencyKey: actionInput.idempotencyKey,
        payload: {
          deliveryRevisionId: binding.deliveryRevisionId,
          manifestDigest: binding.manifestDigest,
          checklistVersion: currentDelivery.evidenceChecklistVersion,
          checks: actionInput.checks,
          safetyIntegrityResult: 'pass',
          reviewNotes: actionInput.reviewNotes,
        },
      })
    },

    async requestRepair(actionInput) {
      validateIdentity(actionInput, [
        'checks',
        'safetyIntegrityResult',
        'reason',
        'repairInstructions',
      ])
      const { detail, currentDelivery, actorId } = await getActorDetail(
        input.applicationService,
        actionInput,
      )
      validateReviewCoverage(detail, actionInput.checks)
      const binding = await resolveBoundAction(actionInput, actorId, 'request_repair')

      return executeValidated(input.applicationService, {
        contractVersion: REQUEST_CONTRACT_VERSION,
        kind: 'request_repair',
        requestId: binding.requestId,
        expectedVersion: binding.requestVersion,
        idempotencyKey: actionInput.idempotencyKey,
        payload: {
          deliveryRevisionId: binding.deliveryRevisionId,
          manifestDigest: binding.manifestDigest,
          checklistVersion: currentDelivery.evidenceChecklistVersion,
          checks: actionInput.checks,
          safetyIntegrityResult: actionInput.safetyIntegrityResult,
          reason: actionInput.reason,
          repairInstructions: actionInput.repairInstructions,
        },
      })
    },

    async markUseful(actionInput) {
      validateIdentity(actionInput)
      const { actorId } = await getActorDetail(
        input.applicationService,
        actionInput,
      )
      const binding = await resolveBoundAction(
        actionInput,
        actorId,
        'requester_delivery_outcome',
      )

      return executeValidated(input.applicationService, {
        contractVersion: REQUEST_CONTRACT_VERSION,
        kind: 'requester_delivery_outcome',
        requestId: binding.requestId,
        expectedVersion: binding.requestVersion,
        idempotencyKey: actionInput.idempotencyKey,
        payload: {
          deliveryRevisionId: binding.deliveryRevisionId,
          manifestDigest: binding.manifestDigest,
          outcome: 'useful',
        },
      })
    },

    async reportFailedAcceptanceCheck(actionInput) {
      validateIdentity(actionInput, ['failedAcceptanceCheckId', 'reason'])
      uuid(
        actionInput.failedAcceptanceCheckId,
        'failedAcceptanceCheckId',
      )
      const { detail, actorId } = await getActorDetail(
        input.applicationService,
        actionInput,
      )
      if (
        !detail.brief.acceptanceChecks.some(
          (check) =>
            check.acceptanceCheckId ===
            actionInput.failedAcceptanceCheckId,
        )
      ) {
        throw new RequestContractError(
          'Failed acceptance check is not part of the accepted brief.',
        )
      }
      const binding = await resolveBoundAction(
        actionInput,
        actorId,
        'requester_delivery_outcome',
      )

      return executeValidated(input.applicationService, {
        contractVersion: REQUEST_CONTRACT_VERSION,
        kind: 'requester_delivery_outcome',
        requestId: binding.requestId,
        expectedVersion: binding.requestVersion,
        idempotencyKey: actionInput.idempotencyKey,
        payload: {
          deliveryRevisionId: binding.deliveryRevisionId,
          manifestDigest: binding.manifestDigest,
          outcome: 'failed_acceptance_check',
          failedAcceptanceCheckId:
            actionInput.failedAcceptanceCheckId,
          reason: actionInput.reason,
        },
      })
    },

    async acknowledgeDelivery(actionInput) {
      validateIdentity(actionInput)
      const { detail } = await getActorDetail(
        input.applicationService,
        actionInput,
      )
      if (
        !detail.actor.roles.includes('requester') ||
        !detail.actor.capabilities.includes('acknowledge_delivery')
      ) {
        throw new RequestContractError(
          'Delivery acknowledgement is unavailable for the authenticated actor.',
        )
      }

      return executeValidated(input.applicationService, {
        contractVersion: REQUEST_CONTRACT_VERSION,
        kind: 'acknowledge_delivery',
        requestId: detail.requestId,
        expectedVersion: detail.requestVersion,
        idempotencyKey: actionInput.idempotencyKey,
        payload: {
          deliveryRevisionId: actionInput.deliveryRevisionId,
        },
      })
    },
  }
}
