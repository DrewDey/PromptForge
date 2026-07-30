import {
  REQUEST_CONTRACT_VERSION,
  REQUEST_MAX_ASSIGNMENT_HISTORY,
  REQUEST_MAX_DELIVERY_REVISIONS,
  REQUEST_CLOSE_REASONS,
  REQUEST_LIFECYCLE_STATES,
  REQUEST_MODERATION_STATES,
  REQUEST_PUBLICATION_STATES,
  REQUEST_ACTOR_ROLES,
  DELIVERY_MEDIA_TYPES,
  RequestContractError,
  type RequestCommandReceipt,
  type RequestCommandV1,
  type RequestAvailabilityV1,
  type RequestAcknowledgeUpdatesInputV1,
  type RequestAssignedQueueQueryV1,
  type RequestCaseDetailV1,
  type RequestCaseDetailResultV1,
  type RequestRestrictedCaseDetailV1,
  type RequestCaseSummary,
  type RequestBuilderWorkspaceV1,
  type RequestControlsReceiptV1,
  type RequestControlsUpdateInputV1,
  type DeliveryMediaType,
  type DeliveryRevisionPreparationV1,
  type DeliveryRevisionSubmissionV1,
  type RequestDeliveryArtifactReaderResultV1,
  type RequestEventListQueryV1,
  type RequestEventPageV1,
  type RequestEligibleAssigneeQueryV1,
  type RequestEligibleAssigneeV1,
  type InviteRequestPilotParticipantInputV1,
  type RevokeRequestPilotParticipantInputV1,
  type RequestPilotAdmissionReceiptV1,
  type RequestPilotAdmissionCandidateV1,
  type RequestPilotAdmissionListQueryV1,
  type DeidentifyRequestAccountInputV1,
  type DeidentifyRequestAccountReceiptV1,
  type RequestListQueryV1,
  type RequestPageV1,
  type RequestParticipantCommandV1,
  type RequestQueueSummaryV1,
  type RequestQueueScope,
  type RequestUnreadStateV1,
  type SubmitBuildRequestV1,
  validateRequestCommandV1,
  validateRequestControlsUpdateInputV1,
  validateRfc3339Timestamp,
  validateSubmitBuildRequestV1,
} from './request-lifecycle'

export const REQUEST_RPC = {
  submit: 'submit_build_request_v1',
  command: 'build_request_command_v1',
  availability: 'get_build_request_availability_v1',
  listMine: 'list_my_build_requests_v1',
  listAssignedQueue: 'list_build_request_queue_v1',
  getRequest: 'get_build_request_v1',
  resolveDeliveryArtifactReader: 'resolve_build_request_delivery_artifact_v1',
  updateControls: 'set_build_request_controls_v1',
  setPilotAdmission: 'set_build_request_pilot_admission_v1',
  listPilotAdmissions: 'list_build_request_pilot_admissions_v1',
  deidentifyAccount: 'deidentify_build_request_account_v1',
  listRequestEvents: 'list_build_request_events_v1',
  acknowledgeUpdates: 'acknowledge_build_request_updates_v1',
  listEligibleAssignees: 'list_build_request_eligible_assignees_v1',
} as const

export const REQUEST_SERVER_RPC = {
  resolveDeliveryArtifactObject: 'resolve_build_request_delivery_artifact_object_v1',
  prepareStagedArtifactObject: 'prepare_build_request_delivery_artifact_object_v1',
  attestStagedArtifactObject: 'attest_build_request_delivery_artifact_object_v1',
  sealDeliveryRevision: 'seal_build_request_delivery_revision_v1',
  resolveDeliveryArtifactCustody: 'resolve_build_request_delivery_artifact_custody_v1',
  resolveDeliveryRevisionAction: 'resolve_build_request_delivery_revision_action_v1',
  resolveDeliveryArtifactCleanup: 'resolve_build_request_delivery_artifact_cleanup_v1',
  expireAuditTombstone: 'expire_build_request_audit_tombstone_v1',
  expireAccountDeidentificationReceipt:
    'expire_build_request_account_deidentification_receipt_v1',
  retireDeliveryRevision: 'retire_build_request_delivery_revision_v1',
} as const

type RequestRpcFunctionName =
  | (typeof REQUEST_RPC)[keyof typeof REQUEST_RPC]
  | (typeof REQUEST_SERVER_RPC)[keyof typeof REQUEST_SERVER_RPC]

export const REQUEST_AUTHORITY_ERROR_CODES = [
  'controls_off',
  'capacity_full',
  'unavailable',
  'rate_limited',
  'duplicate',
  'stale_version',
  'not_admitted',
  'not_found',
  'invalid_transition',
  'delivery_revision_limit',
] as const
export type RequestAuthorityErrorCode =
  | (typeof REQUEST_AUTHORITY_ERROR_CODES)[number]
  | 'unknown'

export function parseRequestAuthorityErrorCode(details: unknown): RequestAuthorityErrorCode {
  const match =
    typeof details === 'string' ? /^request_authority:([a-z_]+)$/.exec(details) : null
  return match &&
    REQUEST_AUTHORITY_ERROR_CODES.includes(
      match[1] as (typeof REQUEST_AUTHORITY_ERROR_CODES)[number],
    )
    ? (match[1] as (typeof REQUEST_AUTHORITY_ERROR_CODES)[number])
    : 'unknown'
}

type RequestRpcError = {
  code?: string
  message: string
  details?: string | null
  hint?: string | null
}

type RequestRpcResult = {
  data: unknown
  error: RequestRpcError | null
}

/**
 * Minimal structural type accepted by the service. A server Supabase client
 * satisfies this without exposing `.from()` to Request-domain consumers.
 */
export type RequestRpcClient = {
  rpc: (
    functionName: string,
    parameters: Record<string, unknown>,
  ) => PromiseLike<RequestRpcResult>
}

export interface RequestApplicationService {
  getAvailability(): Promise<RequestAvailabilityV1>
  listMyRequests(query?: RequestListQueryV1): Promise<RequestPageV1<RequestCaseSummary>>
  listAssignedQueue(
    query: RequestAssignedQueueQueryV1,
  ): Promise<RequestPageV1<RequestQueueSummaryV1>>
  getRequest(id: string): Promise<RequestCaseDetailResultV1>
  listRequestEvents(query: RequestEventListQueryV1): Promise<RequestEventPageV1>
  acknowledgeRequestUpdates(
    input: RequestAcknowledgeUpdatesInputV1,
  ): Promise<RequestUnreadStateV1>
  listEligibleAssignees(
    query: RequestEligibleAssigneeQueryV1,
  ): Promise<RequestPageV1<RequestEligibleAssigneeV1>>
  resolveDeliveryArtifactReader(
    deliveryArtifactId: string,
  ): Promise<RequestDeliveryArtifactReaderResultV1>
  updateControls(input: RequestControlsUpdateInputV1): Promise<RequestControlsReceiptV1>
  inviteRequestPilotParticipant(
    input: InviteRequestPilotParticipantInputV1,
  ): Promise<RequestPilotAdmissionReceiptV1>
  revokeRequestPilotParticipant(
    input: RevokeRequestPilotParticipantInputV1,
  ): Promise<RequestPilotAdmissionReceiptV1>
  listPilotAdmissionCandidates(
    query?: RequestPilotAdmissionListQueryV1,
  ): Promise<RequestPageV1<RequestPilotAdmissionCandidateV1>>
  /**
   * Account-scoped authority for authenticated admins and trusted account
   * deletion flows. It is never a case action or participant UI capability.
   */
  deidentifyRequestAccount(
    input: DeidentifyRequestAccountInputV1,
  ): Promise<DeidentifyRequestAccountReceiptV1>
  createRequest(input: SubmitBuildRequestV1): Promise<RequestCommandReceipt>
  executeCommand(command: RequestParticipantCommandV1): Promise<RequestCommandReceipt>
}

export type ResolveDeliveryArtifactObjectInputV1 = {
  artifactId: string
  deliveryRevisionId: string
}

export type RequestArtifactRetentionStateV1 =
  | 'retained'
  | 'preserved_by_hold'
  | 'cleanup_eligible'

export type RequestArtifactRetentionAuthorityV1 = {
  /** Database-derived cleanup authority; server routes must not recompute it. */
  retentionState: RequestArtifactRetentionStateV1
  /** Immutable terminal retention deadline when one exists. */
  accessUntil: string | null
}

/**
 * Server-only custody/cleanup authority. It may intentionally resolve object
 * identity for held, removed, or retention-expired artifacts so trusted
 * cleanup can preserve or remove the correct object.
 *
 * This result never authorizes participant access and must never be returned
 * from participant-facing routes, actions, receipts, or
 * RequestApplicationService methods. A participant reader route must first
 * receive `status: 'ready'` from resolveDeliveryArtifactReader.
 */
export type RequestDeliveryArtifactObjectV1 = RequestArtifactRetentionAuthorityV1 & {
  artifactId: string
  deliveryRevisionId: string
  manifestDigest: string
  objectIdentity: string
}

export interface RequestDeliveryArtifactObjectResolver {
  resolveDeliveryArtifactObject(
    input: ResolveDeliveryArtifactObjectInputV1,
  ): Promise<RequestDeliveryArtifactObjectV1>
}

export type ResolveDeliveryArtifactCleanupInputV1 = {
  requestId: string
  deliveryRevisionId: string
  artifactId: string
}

export type RequestDeliveryArtifactCleanupAuthorityV1 =
  RequestArtifactRetentionAuthorityV1 & {
    requestId: string
    deliveryRevisionId: string
    artifactId: string
    objectIdentity: string
    sha256: string
    byteLength: number
    detectedMediaType: DeliveryMediaType
    custodyState: 'staged' | 'attested' | 'abandoned'
  }

export interface RequestDeliveryArtifactCleanupResolver {
  resolveDeliveryArtifactCleanup(
    input: ResolveDeliveryArtifactCleanupInputV1,
  ): Promise<RequestDeliveryArtifactCleanupAuthorityV1>
}

export type ExpireBuildRequestAuditTombstoneInputV1 = {
  requestId: string
  idempotencyKey: string
}

export type ExpireBuildRequestAuditTombstoneReceiptV1 = {
  contractVersion: typeof REQUEST_CONTRACT_VERSION
  requestId: string
  cleaned: boolean
  replayed: boolean
  aggregateDigest: string
  occurredAt: string
}

export interface RequestAuditTombstoneCleanupService {
  expireBuildRequestAuditTombstone(
    input: ExpireBuildRequestAuditTombstoneInputV1,
  ): Promise<ExpireBuildRequestAuditTombstoneReceiptV1>
}

export type ExpireRequestAccountDeidentificationReceiptInputV1 = {
  receiptId: string
}

export type ExpireRequestAccountDeidentificationReceiptReceiptV1 = {
  contractVersion: typeof REQUEST_CONTRACT_VERSION
  receiptId: string
  expired: boolean
  occurredAt: string
}

export interface RequestAccountDeidentificationReceiptCleanupService {
  expireRequestAccountDeidentificationReceipt(
    input: ExpireRequestAccountDeidentificationReceiptInputV1,
  ): Promise<ExpireRequestAccountDeidentificationReceiptReceiptV1>
}

export type RetireBuildRequestDeliveryRevisionInputV1 = {
  requestId: string
  deliveryRevisionId: string
  expectedVersion: number
  idempotencyKey: string
}

export type RetireBuildRequestDeliveryRevisionReceiptV1 = {
  requestId: string
  deliveryRevisionId: string
  revisionState: 'abandoned'
  retiredAt: string
  replayed: boolean
}

export interface RequestDeliveryRevisionRetirementService {
  retireBuildRequestDeliveryRevision(
    input: RetireBuildRequestDeliveryRevisionInputV1,
  ): Promise<RetireBuildRequestDeliveryRevisionReceiptV1>
}

export type RequestDeliveryRevisionActionKind =
  | 'approve_delivery'
  | 'request_repair'
  | 'requester_delivery_outcome'

export type ResolveDeliveryRevisionActionInputV1 = {
  actorId: string
  requestId: string
  deliveryRevisionId: string
  action: RequestDeliveryRevisionActionKind
}

export type RequestDeliveryRevisionActionBindingV1 = {
  requestId: string
  deliveryRevisionId: string
  requestVersion: number
  manifestDigest: string
  action: RequestDeliveryRevisionActionKind
}

/**
 * A trusted service-role RPC client used only after the surrounding server
 * action has independently authenticated its cookie/session actor.
 */
export type RequestDeliveryRevisionActionServiceRoleRpcClient = RequestRpcClient

export interface RequestDeliveryRevisionActionResolver {
  resolveDeliveryRevisionAction(
    input: ResolveDeliveryRevisionActionInputV1,
  ): Promise<RequestDeliveryRevisionActionBindingV1>
}

export type PrepareStagedArtifactObjectInputV1 = {
  requestId: string
  deliveryRevisionId: string
  artifactId: string
  stageReceiptId: string
}

export type RequestStagedArtifactObjectV1 = {
  stageReceiptId: string
  requestId: string
  expectedRequestVersion: number
  deliveryRevisionId: string
  artifactId: string
  acceptedBriefRevisionId: string
  activeBuilderAssignmentId: string
  artifactOrdinal: number
  sha256: string
  byteLength: number
  detectedMediaType: DeliveryMediaType
  scannerVersion: string
  objectIdentity: string
}

export type ResolveDeliveryArtifactCustodyInputV1 = {
  requestId: string
  deliveryRevisionId: string
  artifactId: string
}

export type RequestDeliveryArtifactCustodyBindingV1 =
  RequestArtifactRetentionAuthorityV1 & {
  requestVersion: number
  requestId: string
  deliveryRevisionId: string
  artifactId: string
  stageReceiptId: string
  acceptedBriefRevisionId: string
  activeBuilderAssignmentId: string
  artifactOrdinal: number
  sha256: string
  byteLength: number
  detectedMediaType: DeliveryMediaType
  scannerVersion: string
  objectIdentity: string
  attestationReceiptId: string
  attestationVersion: number
  }

export type RequestStagedArtifactAttestationInputV1 = RequestStagedArtifactObjectV1 & {
  idempotencyKey: string
  scanVerdict: 'clean'
}

export type RequestStagedArtifactAttestationReceiptV1 = {
  attestationReceiptId: string
  requestId: string
  deliveryRevisionId: string
  artifactId: string
  artifactOrdinal: number
  attestationVersion: number
  replayed: boolean
  attestedAt: string
}

export type RequestSealedArtifactBindingV1 = {
  artifactOrdinal: number
  artifactId: string
}

export type SealDeliveryRevisionInputV1 = {
  requestId: string
  deliveryRevisionId: string
  preparationReceiptId: string
  idempotencyKey: string
  artifacts: readonly RequestSealedArtifactBindingV1[]
}

export type RequestDeliveryRevisionSealReceiptV1 = {
  sealReceiptId: string
  requestId: string
  deliveryRevisionId: string
  /** Server-only authority digest; never place in browser props, forms, or analytics. */
  manifestDigest: string
  manifestContractVersion: typeof REQUEST_DELIVERY_MANIFEST_VERSION
  policyVersion: typeof REQUEST_DELIVERY_POLICY_VERSION
  artifactCount: number
  totalBytes: number
  replayed: boolean
  sealedAt: string
}

export const REQUEST_DELIVERY_MANIFEST_VERSION = 'request-delivery-manifest-v1' as const
export const REQUEST_DELIVERY_POLICY_VERSION = 'request-delivery-passive-v1' as const
export const REQUEST_RIGHTS_SNAPSHOT_VERSION = 'request-rights-v1' as const
export const REQUEST_DELIVERY_MANIFEST_CANONICALIZATION = {
  objectKeys: 'recursive_lexicographic',
  acceptedClarificationOrder: 'sequence',
  builderEvidenceOrder: 'acceptance_check_ordinal_then_id',
  artifactOrder: 'artifact_ordinal',
  encoding: 'utf8',
  digest: 'sha256_lowercase_hex',
  explicitNulls: [
    'acceptedBrief.pathforgeReference',
    'builderEvidence.evidenceText',
    'builderEvidence.evidenceRef',
    'approvedPathForgeReference',
  ],
} as const

export type RequestCanonicalDeliveryManifestArtifactV1 = {
  artifactId: string
  artifactOrdinal: number
  safeName: string
  sha256: string
  byteLength: number
  mediaType: DeliveryMediaType
}

export type RequestAcceptedClarificationV1 = {
  clarificationId: string
  sequence: number
  question: string
  answer: string
}

export type RequestDeliveryManifestV1 = {
  version: typeof REQUEST_DELIVERY_MANIFEST_VERSION
  policyVersion: typeof REQUEST_DELIVERY_POLICY_VERSION
  requestId: string
  deliveryRevisionId: string
  acceptedBriefRevisionId: string
  acceptedBrief: {
    title: string
    outcome: string
    intendedUser: string
    mustWorkScenario: string
    constraints: string
    pathforgeReference:
      | null
      | { kind: 'project'; projectId: string }
      | {
          kind: 'response'
          projectId: string
          modelVariantId: string
          responseStepNumber: number
        }
    acceptanceChecks:
      | readonly [{ acceptanceCheckId: string; ordinal: 1; text: string }]
      | readonly [
          { acceptanceCheckId: string; ordinal: 1; text: string },
          { acceptanceCheckId: string; ordinal: 2; text: string },
        ]
      | readonly [
          { acceptanceCheckId: string; ordinal: 1; text: string },
          { acceptanceCheckId: string; ordinal: 2; text: string },
          { acceptanceCheckId: string; ordinal: 3; text: string },
        ]
  }
  /**
   * Immutable participant-safe clarification snapshot captured by the
   * acceptance transition. Only answered clarifications are valid.
   */
  acceptedClarifications: readonly RequestAcceptedClarificationV1[]
  acceptedClarificationCount: number
  acceptedClarificationDigest: string
  clarificationAcceptanceCutoff: string
  builderAssignmentId: string
  revisionLabel: string
  summary: string
  artifactCount: number
  totalBytes: number
  evidenceChecklistVersion: number
  rightsSnapshot: {
    version: typeof REQUEST_RIGHTS_SNAPSHOT_VERSION
    builderIsAuthor: true
    requesterRights: readonly ['non_exclusive_use', 'download']
    confidential: false
    exclusive: false
    workForHire: false
  }
  builderEvidence: readonly {
    acceptanceCheckId: string
    result: 'pass' | 'fail' | 'not_run'
    evidenceText: string | null
    evidenceRef: string | null
  }[]
  approvedPathForgeReference:
    | null
    | { kind: 'project'; projectId: string }
    | {
        kind: 'response'
        projectId: string
        modelVariantId: string
        responseStepNumber: number
      }
  artifacts: readonly RequestCanonicalDeliveryManifestArtifactV1[]
}

export type RequestCanonicalDeliveryManifestV1 = RequestDeliveryManifestV1

export interface RequestStagedArtifactCustodyService {
  resolveDeliveryArtifactCustody(
    input: ResolveDeliveryArtifactCustodyInputV1,
  ): Promise<RequestDeliveryArtifactCustodyBindingV1>
  prepareStagedArtifactObject(
    input: PrepareStagedArtifactObjectInputV1,
  ): Promise<RequestStagedArtifactObjectV1>
  attestStagedArtifactObject(
    input: RequestStagedArtifactAttestationInputV1,
  ): Promise<RequestStagedArtifactAttestationReceiptV1>
  sealDeliveryRevision(
    input: SealDeliveryRevisionInputV1,
  ): Promise<RequestDeliveryRevisionSealReceiptV1>
}

export class RequestAuthorityError extends Error {
  readonly code: RequestAuthorityErrorCode

  constructor(error: RequestRpcError) {
    super('Request authority could not complete the operation.')
    this.name = 'RequestAuthorityError'
    this.code = parseRequestAuthorityErrorCode(error.details)
  }
}

type ReceiptRow = {
  contract_version: unknown
  command_id: unknown
  request_id: unknown
  request_version: unknown
  event_id: unknown
  lifecycle_state: unknown
  moderation_state: unknown
  publication_state: unknown
  close_reason: unknown
  replayed: unknown
  occurred_at: unknown
  authority_result?: unknown
}

const AUTHORITY_RESULT_KEYS = [
  'clarificationId',
  'assignmentId',
  'deliveryRevisionId',
  'artifactId',
  'evidenceChecklistVersion',
  'rightsSnapshotVersion',
] as const

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === 'string' && values.includes(value)
}

const REQUEST_CAPABILITIES = [
  'view_case',
  'begin_triage',
  'request_clarification',
  'submit_clarification',
  'accept',
  'assign_reviewer',
  'reassign_triager',
  'reassign_builder',
  'reassign_reviewer',
  'start_build',
  'prepare_delivery_revision',
  'stage_delivery_artifact',
  'abandon_delivery_artifact',
  'submit_delivery',
  'resubmit_delivery',
  'approve_delivery',
  'request_repair',
  'requester_delivery_outcome',
  'acknowledge_delivery',
  'close',
  'close_no_response',
  'withdraw',
  'place_moderation_hold',
  'release_moderation_hold',
  'remove_for_moderation',
] as const

const REQUEST_EVENT_KINDS = [
  'request_submitted',
  'triage_started',
  'clarification_requested',
  'clarification_submitted',
  'request_accepted',
  'reviewer_assigned',
  'triager_reassigned',
  'builder_reassigned',
  'reviewer_reassigned',
  'build_started',
  'delivery_revision_prepared',
  'delivery_artifact_staged',
  'delivery_artifact_abandoned',
  'delivery_submitted',
  'delivery_resubmitted',
  'delivery_approved',
  'delivery_repair_requested',
  'delivery_acknowledged',
  'requester_outcome_recorded',
  'request_closed',
  'request_withdrawn',
  'moderation_hold_placed',
  'moderation_hold_released',
  'moderation_removed',
  'account_deidentified',
  'delivery_revision_retired',
] as const

const REQUEST_EVENT_ACTOR_ROLES = [...REQUEST_ACTOR_ROLES, 'operator'] as const

const REQUEST_CURSOR_PATTERN =
  /^rq1_[A-Za-z0-9_-]{8,400}\.[A-Za-z0-9_-]{16,128}$/
const REQUEST_EVENT_CURSOR_PATTERN =
  /^rqe1_[A-Za-z0-9_-]{8,400}\.[A-Za-z0-9_-]{16,128}$/
const REQUEST_URL_LIKE =
  /\b(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|io|dev|app)(?:\/|\b))/i
const REQUEST_EMAIL_LIKE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const REQUEST_SECRET_LIKE =
  /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{12,}|(?:api|access|secret|private)[_-]?key\s*[:=]|bearer\s+[A-Za-z0-9._~+/-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i

function strictRecord(value: unknown, allowedKeys: readonly string[], label: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestContractError(`${label} must be an object.`)
  }
  const record = value as Record<string, unknown>
  if (Object.keys(record).some((key) => !allowedKeys.includes(key))) {
    throw new RequestContractError(`${label} contains an unexpected field.`)
  }
  return record
}

function boundedText(value: unknown, label: string, maximum: number, minimum = 0) {
  if (
    typeof value !== 'string' ||
    value.trim().length < minimum ||
    value.length > maximum ||
    value !== value.trim() ||
    /[\0\r]/.test(value)
  ) {
    throw new RequestContractError(`${label} is invalid.`)
  }
  return value
}

function safeProjectedText(value: unknown, label: string, maximum: number, minimum = 0) {
  const textValue = boundedText(value, label, maximum, minimum)
  if (
    /\b(?:https?:\/\/|www\.|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}|sk-(?:proj-)?[A-Za-z0-9_-]{12,}|bearer\s+[A-Za-z0-9._~+/-]{12,})/i.test(
      textValue,
    )
  ) {
    throw new RequestContractError(`${label} contains unsafe projected content.`)
  }
  return textValue
}

function boundedInteger(value: unknown, label: string, minimum: number, maximum: number) {
  if (!Number.isSafeInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new RequestContractError(`${label} is invalid.`)
  }
  return value as number
}

function timestamp(value: unknown, label: string) {
  validateRfc3339Timestamp(value, label)
  return value
}

function calendarDate(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RequestContractError(`${label} is invalid.`)
  }
  const [year, month, day] = value.split('-').map(Number)
  const leapYear =
    year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth[month - 1]
  ) {
    throw new RequestContractError(`${label} is invalid.`)
  }
  return value
}

function uuid(value: unknown, label: string) {
  if (typeof value !== 'string') throw new RequestContractError(`${label} is invalid.`)
  validateUuid(value, label)
  return value
}

function sha256(value: unknown, label: string) {
  if (typeof value !== 'string' || !/^[0-9a-f]{64}$/i.test(value)) {
    throw new RequestContractError(`${label} is invalid.`)
  }
  return value
}

function boundedArray(value: unknown, label: string, maximum: number) {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new RequestContractError(`${label} is invalid.`)
  }
  return value
}

function parsePathForgeReference(value: unknown) {
  const row = strictRecord(
    value,
    ['kind', 'projectId', 'modelVariantId', 'responseStepNumber'],
    'PathForge reference',
  )
  if (row.kind === 'project') {
    if ('modelVariantId' in row || 'responseStepNumber' in row) {
      throw new RequestContractError('Project reference contains response fields.')
    }
    return { kind: 'project' as const, projectId: uuid(row.projectId, 'projectId') }
  }
  if (row.kind === 'response') {
    return {
      kind: 'response' as const,
      projectId: uuid(row.projectId, 'projectId'),
      modelVariantId: uuid(row.modelVariantId, 'modelVariantId'),
      responseStepNumber: boundedInteger(row.responseStepNumber, 'responseStepNumber', 1, 100),
    }
  }
  throw new RequestContractError('PathForge reference kind is invalid.')
}

export function parseRequestDeliveryManifestV1(
  value: unknown,
): RequestDeliveryManifestV1 {
  const row = strictRecord(
    value,
    [
      'version',
      'policyVersion',
      'requestId',
      'deliveryRevisionId',
      'acceptedBriefRevisionId',
      'acceptedBrief',
      'acceptedClarifications',
      'acceptedClarificationCount',
      'acceptedClarificationDigest',
      'clarificationAcceptanceCutoff',
      'builderAssignmentId',
      'revisionLabel',
      'summary',
      'artifactCount',
      'totalBytes',
      'evidenceChecklistVersion',
      'rightsSnapshot',
      'builderEvidence',
      'approvedPathForgeReference',
      'artifacts',
    ],
    'Delivery manifest',
  )
  if (
    row.version !== REQUEST_DELIVERY_MANIFEST_VERSION ||
    row.policyVersion !== REQUEST_DELIVERY_POLICY_VERSION
  ) {
    throw new RequestContractError('Delivery manifest version is invalid.')
  }
  uuid(row.requestId, 'manifest requestId')
  uuid(row.deliveryRevisionId, 'manifest deliveryRevisionId')
  uuid(row.acceptedBriefRevisionId, 'manifest acceptedBriefRevisionId')
  uuid(row.builderAssignmentId, 'manifest builderAssignmentId')

  const brief = strictRecord(
    row.acceptedBrief,
    [
      'title',
      'outcome',
      'intendedUser',
      'mustWorkScenario',
      'constraints',
      'pathforgeReference',
      'acceptanceChecks',
    ],
    'Manifest accepted brief',
  )
  safeProjectedText(brief.title, 'manifest brief title', 120, 4)
  safeProjectedText(brief.outcome, 'manifest brief outcome', 4_000, 20)
  safeProjectedText(brief.intendedUser, 'manifest brief intendedUser', 1_000, 2)
  safeProjectedText(
    brief.mustWorkScenario,
    'manifest brief mustWorkScenario',
    1_000,
    10,
  )
  safeProjectedText(brief.constraints, 'manifest brief constraints', 2_000)
  if (brief.pathforgeReference !== null) {
    parsePathForgeReference(brief.pathforgeReference)
  }
  const acceptanceChecks = boundedArray(
    brief.acceptanceChecks,
    'manifest acceptanceChecks',
    3,
  )
  if (acceptanceChecks.length < 1) {
    throw new RequestContractError('Manifest acceptance checks are required.')
  }
  const acceptanceIds = acceptanceChecks.map((item, index) => {
    const check = strictRecord(
      item,
      ['acceptanceCheckId', 'ordinal', 'text'],
      'Manifest acceptance check',
    )
    const acceptanceCheckId = uuid(
      check.acceptanceCheckId,
      'manifest acceptanceCheckId',
    )
    if (check.ordinal !== index + 1) {
      throw new RequestContractError(
        'Manifest acceptance check sequence is invalid.',
      )
    }
    safeProjectedText(check.text, 'manifest acceptance check text', 500, 4)
    return acceptanceCheckId
  })
  if (new Set(acceptanceIds).size !== acceptanceIds.length) {
    throw new RequestContractError(
      'Manifest acceptance check identities are not unique.',
    )
  }

  const clarifications = boundedArray(
    row.acceptedClarifications,
    'acceptedClarifications',
    3,
  )
  const clarificationIds = new Set<string>()
  clarifications.forEach((item, index) => {
    const clarification = strictRecord(
      item,
      ['clarificationId', 'sequence', 'question', 'answer'],
      'Accepted clarification',
    )
    const clarificationId = uuid(
      clarification.clarificationId,
      'accepted clarificationId',
    )
    if (
      clarificationIds.has(clarificationId) ||
      clarification.sequence !== index + 1
    ) {
      throw new RequestContractError(
        'Accepted clarification identity or sequence is invalid.',
      )
    }
    clarificationIds.add(clarificationId)
    safeProjectedText(
      clarification.question,
      'accepted clarification question',
      2_000,
      1,
    )
    // A null or empty answer is forbidden: acceptance must snapshot the exact
    // complete answered set, never a pending clarification.
    safeProjectedText(
      clarification.answer,
      'accepted clarification answer',
      4_000,
      1,
    )
  })
  if (
    boundedInteger(
      row.acceptedClarificationCount,
      'acceptedClarificationCount',
      0,
      3,
    ) !== clarifications.length
  ) {
    throw new RequestContractError(
      'Accepted clarification count does not match its snapshot.',
    )
  }
  sha256(row.acceptedClarificationDigest, 'acceptedClarificationDigest')
  timestamp(
    row.clarificationAcceptanceCutoff,
    'clarificationAcceptanceCutoff',
  )

  safeProjectedText(row.revisionLabel, 'manifest revisionLabel', 80, 1)
  safeProjectedText(row.summary, 'manifest summary', 2_000, 1)
  const artifactCount = boundedInteger(
    row.artifactCount,
    'manifest artifactCount',
    1,
    5,
  )
  const totalBytes = boundedInteger(
    row.totalBytes,
    'manifest totalBytes',
    1,
    12_000_000,
  )
  boundedInteger(
    row.evidenceChecklistVersion,
    'manifest evidenceChecklistVersion',
    1,
    10_000,
  )
  const rights = strictRecord(
    row.rightsSnapshot,
    [
      'version',
      'builderIsAuthor',
      'requesterRights',
      'confidential',
      'exclusive',
      'workForHire',
    ],
    'Manifest rights snapshot',
  )
  if (
    rights.version !== REQUEST_RIGHTS_SNAPSHOT_VERSION ||
    rights.builderIsAuthor !== true ||
    JSON.stringify(rights.requesterRights) !==
      JSON.stringify(['non_exclusive_use', 'download']) ||
    rights.confidential !== false ||
    rights.exclusive !== false ||
    rights.workForHire !== false
  ) {
    throw new RequestContractError('Manifest rights snapshot is invalid.')
  }
  const evidence = boundedArray(
    row.builderEvidence,
    'manifest builderEvidence',
    3,
  )
  if (evidence.length !== acceptanceIds.length) {
    throw new RequestContractError(
      'Manifest builder evidence must cover every acceptance check.',
    )
  }
  evidence.forEach((item, index) => {
    const entry = strictRecord(
      item,
      ['acceptanceCheckId', 'result', 'evidenceText', 'evidenceRef'],
      'Manifest builder evidence',
    )
    if (
      uuid(entry.acceptanceCheckId, 'manifest evidence acceptanceCheckId') !==
        acceptanceIds[index] ||
      !['pass', 'fail', 'not_run'].includes(entry.result as string)
    ) {
      throw new RequestContractError('Manifest builder evidence is invalid.')
    }
    if (entry.evidenceText !== null) {
      safeProjectedText(entry.evidenceText, 'manifest evidence text', 2_000, 1)
    }
    if (
      entry.evidenceRef !== null &&
      (typeof entry.evidenceRef !== 'string' ||
        !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(entry.evidenceRef))
    ) {
      throw new RequestContractError('Manifest evidence reference is invalid.')
    }
  })
  if (row.approvedPathForgeReference !== null) {
    parsePathForgeReference(row.approvedPathForgeReference)
  }
  const artifacts = boundedArray(row.artifacts, 'manifest artifacts', 5)
  if (artifacts.length !== artifactCount) {
    throw new RequestContractError(
      'Manifest artifact count does not match its artifacts.',
    )
  }
  const artifactIds = new Set<string>()
  let computedTotalBytes = 0
  artifacts.forEach((item, index) => {
    const artifact = strictRecord(
      item,
      [
        'artifactId',
        'artifactOrdinal',
        'safeName',
        'sha256',
        'byteLength',
        'mediaType',
      ],
      'Manifest artifact',
    )
    const artifactId = uuid(artifact.artifactId, 'manifest artifactId')
    if (artifactIds.has(artifactId) || artifact.artifactOrdinal !== index + 1) {
      throw new RequestContractError(
        'Manifest artifact identity or sequence is invalid.',
      )
    }
    artifactIds.add(artifactId)
    safeProjectedText(artifact.safeName, 'manifest artifact safeName', 180, 1)
    sha256(artifact.sha256, 'manifest artifact sha256')
    computedTotalBytes += boundedInteger(
      artifact.byteLength,
      'manifest artifact byteLength',
      1,
      4_000_000,
    )
    if (!isOneOf(artifact.mediaType, DELIVERY_MEDIA_TYPES)) {
      throw new RequestContractError('Manifest artifact media type is invalid.')
    }
  })
  if (computedTotalBytes !== totalBytes) {
    throw new RequestContractError(
      'Manifest total bytes do not match its artifacts.',
    )
  }
  return row as unknown as RequestDeliveryManifestV1
}

function parseEventAxes(value: unknown, label: string) {
  const row = strictRecord(
    value,
    ['lifecycleState', 'moderationState', 'publicationState', 'closeReason'],
    label,
  )
  if (
    !isOneOf(row.lifecycleState, REQUEST_LIFECYCLE_STATES) ||
    !isOneOf(row.moderationState, REQUEST_MODERATION_STATES) ||
    !isOneOf(row.publicationState, REQUEST_PUBLICATION_STATES) ||
    !(row.closeReason === null || isOneOf(row.closeReason, REQUEST_CLOSE_REASONS)) ||
    ((row.lifecycleState === 'closed') !== (row.closeReason !== null))
  ) {
    throw new RequestContractError(`${label} is invalid.`)
  }
  return row
}

export function parseRequestEventPageV1(value: unknown): RequestEventPageV1 {
  const events = strictRecord(value, ['items', 'nextCursor'], 'Request event page')
  const eventItems = boundedArray(events.items, 'Request events', 50)
  let priorSequence = Number.POSITIVE_INFINITY
  eventItems.forEach((item) => {
    const event = strictRecord(
      item,
      [
        'eventId',
        'sequence',
        'kind',
        'label',
        'actorRole',
        'actor',
        'occurredAt',
        'oldAxes',
        'newAxes',
        'reason',
        'reference',
      ],
      'Request event',
    )
    uuid(event.eventId, 'eventId')
    const sequence = boundedInteger(event.sequence, 'event sequence', 1, 10_000_000)
    if (sequence >= priorSequence) {
      throw new RequestContractError('Request events must be newest-first.')
    }
    priorSequence = sequence
    if (
      !isOneOf(event.kind, REQUEST_EVENT_KINDS) ||
      !isOneOf(event.actorRole, REQUEST_EVENT_ACTOR_ROLES)
    ) {
      throw new RequestContractError('Request event kind or actor role is invalid.')
    }
    safeProjectedText(event.label, 'event label', 160, 1)
    if (event.actorRole === 'system') {
      if (event.actor !== null) {
        throw new RequestContractError(
          'Service-generated request event cannot claim human attribution.',
        )
      }
    } else if (event.actor === null) {
      throw new RequestContractError('Human request event requires safe attribution.')
    } else {
      parseAttribution(event.actor, 'Event actor')
    }
    timestamp(event.occurredAt, 'event occurredAt')
    if (event.oldAxes !== null) parseEventAxes(event.oldAxes, 'old event axes')
    parseEventAxes(event.newAxes, 'new event axes')
    if (event.reason !== null) safeProjectedText(event.reason, 'event reason', 2_000, 1)
    if (event.reference !== null) parsePathForgeReference(event.reference)
  })
  if (
    events.nextCursor !== null &&
    (typeof events.nextCursor !== 'string' ||
      !REQUEST_EVENT_CURSOR_PATTERN.test(events.nextCursor))
  ) {
    throw new RequestContractError('Request event cursor is invalid.')
  }
  return events as unknown as RequestEventPageV1
}

const SUMMARY_KEYS = [
  'contractVersion',
  'requestId',
  'requestVersion',
  'lifecycleState',
  'moderationState',
  'publicationState',
  'closeReason',
  'resolutionReference',
  'title',
  'activeActorRoles',
  'nextActions',
  'unread',
  'submittedAt',
  'updatedAt',
] as const

export function parseRequestUnreadStateV1(value: unknown): RequestUnreadStateV1 {
  const unread = strictRecord(
    value,
    ['unreadCount', 'latestEventSequence', 'lastReadEventSequence'],
    'Request unread state',
  )
  boundedInteger(unread.unreadCount, 'unreadCount', 0, 100_000)
  boundedInteger(unread.latestEventSequence, 'latestEventSequence', 0, 10_000_000)
  if (unread.lastReadEventSequence !== null) {
    boundedInteger(unread.lastReadEventSequence, 'lastReadEventSequence', 0, 10_000_000)
    if ((unread.lastReadEventSequence as number) > (unread.latestEventSequence as number)) {
      throw new RequestContractError('Request unread state is inconsistent.')
    }
  }
  const visibleBoundary = (unread.lastReadEventSequence as number | null) ?? 0
  const visibleSequenceSpan = (unread.latestEventSequence as number) - visibleBoundary
  if (
    (unread.unreadCount as number) > visibleSequenceSpan ||
    ((unread.unreadCount as number) === 0) !== (visibleSequenceSpan === 0)
  ) {
    throw new RequestContractError(
      'Request unread count is inconsistent with the visible event boundary.',
    )
  }
  return unread as unknown as RequestUnreadStateV1
}

function parseSummaryRecord(
  value: unknown,
  allowedKeys: readonly string[] = SUMMARY_KEYS,
): RequestCaseSummary {
  const row = strictRecord(value, allowedKeys, 'Request summary')
  if (row.contractVersion !== REQUEST_CONTRACT_VERSION) {
    throw new RequestContractError('Request summary contract version is invalid.')
  }
  const lifecycleState = isOneOf(row.lifecycleState, REQUEST_LIFECYCLE_STATES)
    ? row.lifecycleState
    : null
  const closeReason =
    row.closeReason === null || isOneOf(row.closeReason, REQUEST_CLOSE_REASONS)
      ? row.closeReason
      : undefined
  if (
    lifecycleState === null ||
    closeReason === undefined ||
    (lifecycleState === 'closed') !== (closeReason !== null)
  ) {
    throw new RequestContractError('Request summary lifecycle closure is invalid.')
  }
  const resolutionReference =
    row.resolutionReference === null ? null : parsePathForgeReference(row.resolutionReference)
  if (
    (row.moderationState === 'clear' &&
      closeReason === 'existing_resolution') !==
    (resolutionReference !== null)
  ) {
    throw new RequestContractError('Request summary resolution reference is inconsistent.')
  }
  const roles = boundedArray(row.activeActorRoles, 'activeActorRoles', 5)
  if (
    roles.some(
      (role) =>
        !isOneOf(role, REQUEST_ACTOR_ROLES) ||
        role === 'system',
    ) ||
    new Set(roles).size !== roles.length
  ) {
    throw new RequestContractError('Request summary actor roles are invalid.')
  }
  const actions = boundedArray(row.nextActions, 'nextActions', 24).map((value) => {
    const action = strictRecord(
      value,
      ['kind', 'label', 'requiresConfirmation'],
      'Request next action',
    )
    if (
      !isOneOf(action.kind, REQUEST_CAPABILITIES) ||
      typeof action.requiresConfirmation !== 'boolean'
    ) {
      throw new RequestContractError('Request next action is invalid.')
    }
    boundedText(action.label, 'next action label', 120, 1)
    return action
  })
  if (new Set(actions.map((action) => action.kind)).size !== actions.length) {
    throw new RequestContractError('Request next actions must be distinct.')
  }
  parseRequestUnreadStateV1(row.unread)
  if (
    !isOneOf(row.moderationState, REQUEST_MODERATION_STATES) ||
    !isOneOf(row.publicationState, REQUEST_PUBLICATION_STATES)
  ) {
    throw new RequestContractError('Request summary axes are invalid.')
  }
  uuid(row.requestId, 'requestId')
  boundedInteger(row.requestVersion, 'requestVersion', 0, 10_000_000)
  boundedText(row.title, 'title', 120, 1)
  timestamp(row.submittedAt, 'submittedAt')
  timestamp(row.updatedAt, 'updatedAt')
  void actions
  return row as unknown as RequestCaseSummary
}

export function parseRequestCaseSummary(value: unknown): RequestCaseSummary {
  return parseSummaryRecord(value)
}

export function parseRequestAvailabilityV1(value: unknown): RequestAvailabilityV1 {
  const row = strictRecord(
    value,
    [
      'intakeEligibility',
      'controlsVersion',
      'acceptingRequests',
      'assigningRequests',
      'activeCaseCount',
      'activeCaseCapacity',
      'remainingCapacity',
      'unavailableReason',
    ],
    'Request availability',
  )
  const controlsVersion = boundedInteger(row.controlsVersion, 'controlsVersion', 0, 10_000_000)
  const activeCaseCount = boundedInteger(row.activeCaseCount, 'activeCaseCount', 0, 4)
  const activeCaseCapacity = boundedInteger(row.activeCaseCapacity, 'activeCaseCapacity', 1, 4)
  const remainingCapacity = boundedInteger(row.remainingCapacity, 'remainingCapacity', 0, 4)
  if (
    ![
      'sign_in_required',
      'not_admitted',
      'already_active',
      'controls_off',
      'available',
    ].includes(row.intakeEligibility as string) ||
    typeof row.acceptingRequests !== 'boolean' ||
    typeof row.assigningRequests !== 'boolean' ||
    !['controls_off', 'capacity_full', 'unavailable', null].includes(
      row.unavailableReason as string | null,
    ) ||
    remainingCapacity !== Math.max(0, activeCaseCapacity - activeCaseCount)
  ) {
    throw new RequestContractError('Request availability is inconsistent.')
  }
  if (row.unavailableReason !== 'unavailable') {
    const expectedOperationalReason =
      row.acceptingRequests === false
        ? 'controls_off'
        : activeCaseCount >= activeCaseCapacity
          ? 'capacity_full'
          : null
    if (row.unavailableReason !== expectedOperationalReason) {
      throw new RequestContractError(
        'Request operational availability is inconsistent.',
      )
    }
  }
  void controlsVersion
  return row as unknown as RequestAvailabilityV1
}

export function parseRequestPageV1(value: unknown): RequestPageV1<RequestCaseSummary> {
  const row = strictRecord(value, ['items', 'nextCursor'], 'Request page')
  const items = boundedArray(row.items, 'Request page items', 50).map(parseRequestCaseSummary)
  if (
    row.nextCursor !== null &&
    (typeof row.nextCursor !== 'string' ||
      !REQUEST_CURSOR_PATTERN.test(row.nextCursor))
  ) {
    throw new RequestContractError('Request page cursor is invalid.')
  }
  return { items, nextCursor: row.nextCursor as RequestPageV1<RequestCaseSummary>['nextCursor'] }
}

export function parseRequestAssignedQueuePageV1(
  value: unknown,
  expectedScope?: RequestQueueScope,
): RequestPageV1<RequestQueueSummaryV1> {
  const page = strictRecord(value, ['items', 'nextCursor'], 'Request queue page')
  const items = boundedArray(page.items, 'Request queue items', 50).map((item) => {
    const keys = [
      ...SUMMARY_KEYS,
      'actorRole',
      'targetDate',
    ]
    const row = strictRecord(item, keys, 'Request queue summary')
    if (
      !['admin', 'triager', 'builder', 'reviewer'].includes(row.actorRole as string) ||
      (expectedScope !== undefined && row.actorRole !== expectedScope)
    ) {
      throw new RequestContractError('Request queue actor role is invalid.')
    }
    if (
      row.targetDate !== null &&
      (typeof row.targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.targetDate))
    ) {
      throw new RequestContractError('Request queue target date is invalid.')
    }
    const { actorRole, targetDate, ...summary } = row
    void targetDate
    parseSummaryRecord(summary)
    if (
      actorRole !== 'admin' &&
      !(row.activeActorRoles as unknown[]).includes(actorRole)
    ) {
      throw new RequestContractError(
        'Request queue scope role is not active on the case.',
      )
    }
    return row as unknown as RequestQueueSummaryV1
  })
  if (
    page.nextCursor !== null &&
    (typeof page.nextCursor !== 'string' ||
      !REQUEST_CURSOR_PATTERN.test(page.nextCursor))
  ) {
    throw new RequestContractError('Request queue cursor is invalid.')
  }
  return {
    items,
    nextCursor: page.nextCursor as RequestPageV1<RequestQueueSummaryV1>['nextCursor'],
  }
}

export function parseRequestEligibleAssigneePageV1(
  value: unknown,
): RequestPageV1<RequestEligibleAssigneeV1> {
  const page = strictRecord(value, ['items', 'nextCursor'], 'Eligible assignee page')
  const items = boundedArray(page.items, 'Eligible assignees', 50).map((item) => {
    const candidate = strictRecord(
      item,
      ['accountId', 'displayName'],
      'Eligible assignee',
    )
    uuid(candidate.accountId, 'Eligible assignee account id')
    safeProjectedText(candidate.displayName, 'Eligible assignee display name', 120, 1)
    return candidate as unknown as RequestEligibleAssigneeV1
  })
  if (
    page.nextCursor !== null &&
    (typeof page.nextCursor !== 'string' ||
      !REQUEST_CURSOR_PATTERN.test(page.nextCursor))
  ) {
    throw new RequestContractError('Eligible assignee cursor is invalid.')
  }
  return {
    items,
    nextCursor: page.nextCursor as RequestPageV1<RequestEligibleAssigneeV1>['nextCursor'],
  }
}

export function parseRequestPilotAdmissionCandidatePageV1(
  value: unknown,
): RequestPageV1<RequestPilotAdmissionCandidateV1> {
  const page = strictRecord(
    value,
    ['items', 'nextCursor'],
    'Pilot admission candidate page',
  )
  const items = boundedArray(page.items, 'Pilot admission candidates', 50).map(
    (item) => {
      const row = strictRecord(
        item,
        [
          'accountId',
          'displayName',
          'admissionVersion',
          'admitted',
          'expiresAt',
        ],
        'Pilot admission candidate',
      )
      uuid(row.accountId, 'Pilot admission candidate account id')
      safeProjectedText(
        row.displayName,
        'Pilot admission candidate display name',
        120,
        1,
      )
      const version = boundedInteger(
        row.admissionVersion,
        'Pilot admission candidate version',
        0,
        10_000_000,
      )
      if (typeof row.admitted !== 'boolean') {
        throw new RequestContractError(
          'Pilot admission candidate state is invalid.',
        )
      }
      if (row.expiresAt !== null) {
        timestamp(row.expiresAt, 'Pilot admission candidate expiresAt')
      }
      if (
        (version === 0 && (row.admitted !== false || row.expiresAt !== null)) ||
        (row.admitted === false && row.expiresAt !== null)
      ) {
        throw new RequestContractError(
          'Pilot admission candidate version is inconsistent.',
        )
      }
      return row as unknown as RequestPilotAdmissionCandidateV1
    },
  )
  if (
    page.nextCursor !== null &&
    (typeof page.nextCursor !== 'string' ||
      !REQUEST_CURSOR_PATTERN.test(page.nextCursor))
  ) {
    throw new RequestContractError('Pilot admission candidate cursor is invalid.')
  }
  return {
    items,
    nextCursor:
      page.nextCursor as RequestPageV1<RequestPilotAdmissionCandidateV1>['nextCursor'],
  }
}

function parseAttribution(value: unknown, label: string) {
  const row = strictRecord(value, ['displayName', 'deidentified'], label)
  boundedText(row.displayName, `${label} displayName`, 120, 1)
  if (typeof row.deidentified !== 'boolean') {
    throw new RequestContractError(`${label} deidentified flag is invalid.`)
  }
  return row
}

function parseReviewChecks(value: unknown, acceptanceIds: readonly string[]) {
  const checks = boundedArray(value, 'delivery review checks', 3)
  if (checks.length !== acceptanceIds.length) {
    throw new RequestContractError('Delivery review checks must cover every acceptance check.')
  }
  return checks.map((item, index) => {
    const row = strictRecord(
      item,
      ['acceptanceCheckId', 'result', 'evidenceRef'],
      'Delivery review check',
    )
    const id = uuid(row.acceptanceCheckId, 'acceptanceCheckId')
    if (id !== acceptanceIds[index]) {
      throw new RequestContractError('Delivery review acceptance check is invalid.')
    }
    if (row.result !== 'pass' && row.result !== 'fail') {
      throw new RequestContractError('Delivery review check result is invalid.')
    }
    if (
      row.evidenceRef !== null &&
      (typeof row.evidenceRef !== 'string' ||
        !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(row.evidenceRef))
    ) {
      throw new RequestContractError('Delivery review evidence reference is invalid.')
    }
    return row
  })
}

function parseDeliveryRevision(
  value: unknown,
  briefRevisionId: string,
  acceptanceIds: readonly string[],
  builderAssignments: Set<string>,
) {
  const row = strictRecord(
    value,
    [
      'deliveryRevisionId',
      'acceptedBriefRevisionId',
      'activeBuilderAssignmentId',
      'sealReceiptId',
      'artifactCount',
      'totalBytes',
      'evidenceChecklistVersion',
      'rightsSnapshotVersion',
      'revisionLabel',
      'summary',
      'builderEvidence',
      'approvedPathForgeReference',
      'revisionNumber',
      'authoredBy',
      'submittedAt',
      'isCurrent',
      'artifacts',
      'reviews',
    ],
    'Delivery revision',
  )
  const deliveryRevisionId = uuid(row.deliveryRevisionId, 'deliveryRevisionId')
  if (
    uuid(row.acceptedBriefRevisionId, 'acceptedBriefRevisionId') !== briefRevisionId ||
    !builderAssignments.has(
      uuid(row.activeBuilderAssignmentId, 'activeBuilderAssignmentId'),
    )
  ) {
    throw new RequestContractError('Delivery revision authority binding is invalid.')
  }
  uuid(row.sealReceiptId, 'sealReceiptId')
  const artifactCount = boundedInteger(row.artifactCount, 'artifactCount', 1, 5)
  const totalBytes = boundedInteger(row.totalBytes, 'totalBytes', 1, 12_000_000)
  boundedInteger(row.evidenceChecklistVersion, 'evidenceChecklistVersion', 1, 10_000)
  boundedInteger(row.rightsSnapshotVersion, 'rightsSnapshotVersion', 1, 10_000)
  boundedInteger(row.revisionNumber, 'revisionNumber', 1, 10_000)
  boundedText(row.revisionLabel, 'revisionLabel', 80, 1)
  boundedText(row.summary, 'delivery summary', 2_000, 1)
  parseAttribution(row.authoredBy, 'Delivery author')
  timestamp(row.submittedAt, 'submittedAt')
  if (typeof row.isCurrent !== 'boolean') {
    throw new RequestContractError('Delivery revision current marker is invalid.')
  }
  if (row.approvedPathForgeReference !== null) {
    parsePathForgeReference(row.approvedPathForgeReference)
  }
  const evidence = boundedArray(row.builderEvidence, 'builderEvidence', 3)
  if (evidence.length !== acceptanceIds.length) {
    throw new RequestContractError('Builder evidence must cover every acceptance check.')
  }
  evidence.forEach((item, index) => {
    const evidenceRow = strictRecord(
      item,
      ['acceptanceCheckId', 'result', 'evidenceText', 'evidenceRef'],
      'Builder evidence',
    )
    const id = uuid(evidenceRow.acceptanceCheckId, 'acceptanceCheckId')
    if (id !== acceptanceIds[index]) {
      throw new RequestContractError('Builder evidence acceptance check is invalid.')
    }
    if (!['pass', 'fail', 'not_run'].includes(evidenceRow.result as string)) {
      throw new RequestContractError('Builder evidence result is invalid.')
    }
    if (evidenceRow.evidenceText !== null) {
      boundedText(evidenceRow.evidenceText, 'evidenceText', 2_000, 1)
    }
    if (
      evidenceRow.evidenceRef !== null &&
      (typeof evidenceRow.evidenceRef !== 'string' ||
        !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(evidenceRow.evidenceRef))
    ) {
      throw new RequestContractError('Builder evidence reference is invalid.')
    }
  })
  const artifacts = boundedArray(row.artifacts, 'delivery artifacts', 5)
  if (artifacts.length !== artifactCount) {
    throw new RequestContractError('Delivery artifact count is inconsistent.')
  }
  let computedBytes = 0
  artifacts.forEach((item, index) => {
    const artifact = strictRecord(
      item,
      [
        'artifactId',
        'artifactOrdinal',
        'normalizedName',
        'detectedMediaType',
        'byteLength',
        'sha256',
        'integrityStatus',
        'scanState',
        'scanVerdict',
        'findingCodes',
        'readerHref',
      ],
      'Delivery artifact',
    )
    uuid(artifact.artifactId, 'artifactId')
    if (artifact.artifactOrdinal !== index + 1) {
      throw new RequestContractError('Delivery artifacts must be ordinal-sorted and contiguous.')
    }
    boundedText(artifact.normalizedName, 'normalizedName', 120, 1)
    if (!isOneOf(artifact.detectedMediaType, DELIVERY_MEDIA_TYPES)) {
      throw new RequestContractError('Delivery artifact media type is invalid.')
    }
    computedBytes += boundedInteger(artifact.byteLength, 'byteLength', 1, 4_000_000)
    sha256(artifact.sha256, 'artifact sha256')
    if (
      !['pending', 'verified', 'failed'].includes(artifact.integrityStatus as string) ||
      !['pending', 'complete'].includes(artifact.scanState as string) ||
      !['clean', 'rejected', 'held', null].includes(artifact.scanVerdict as string | null)
    ) {
      throw new RequestContractError('Delivery artifact integrity state is invalid.')
    }
    boundedArray(artifact.findingCodes, 'findingCodes', 20).forEach((code) => {
      if (typeof code !== 'string' || !/^[a-z0-9][a-z0-9_.:-]{0,79}$/i.test(code)) {
        throw new RequestContractError('Delivery artifact finding code is invalid.')
      }
    })
    if (artifact.readerHref !== undefined) validateReaderHref(artifact.readerHref)
  })
  if (computedBytes !== totalBytes) {
    throw new RequestContractError('Delivery artifact byte total is inconsistent.')
  }
  boundedArray(row.reviews, 'delivery reviews', 20).forEach((item) => {
    const review = strictRecord(
      item,
      [
        'deliveryRevisionId',
        'checklistVersion',
        'checks',
        'safetyIntegrityResult',
        'verdict',
        'reason',
        'reviewNotes',
        'repairInstructions',
        'reviewer',
        'reviewedAt',
        'isCurrent',
      ],
      'Delivery review',
    )
    if (uuid(review.deliveryRevisionId, 'review deliveryRevisionId') !== deliveryRevisionId) {
      throw new RequestContractError('Delivery review revision binding is invalid.')
    }
    boundedInteger(review.checklistVersion, 'checklistVersion', 1, 10_000)
    const checks = parseReviewChecks(review.checks, acceptanceIds)
    if (
      !['pass', 'fail'].includes(review.safetyIntegrityResult as string) ||
      !['approve', 'repair'].includes(review.verdict as string)
    ) {
      throw new RequestContractError('Delivery review decision is invalid.')
    }
    if (
      review.verdict === 'approve' &&
      (review.safetyIntegrityResult !== 'pass' ||
        checks.some((check) => check.result !== 'pass') ||
        review.reason !== null ||
        review.repairInstructions !== null ||
        typeof review.reviewNotes !== 'string')
    ) {
      throw new RequestContractError('Delivery approval shape is invalid.')
    }
    if (review.verdict === 'repair') {
      if (
        review.reviewNotes !== null ||
        (review.safetyIntegrityResult === 'pass' &&
          checks.every((check) => check.result === 'pass'))
      ) {
        throw new RequestContractError('Delivery repair shape is invalid.')
      }
      boundedText(review.reason, 'review reason', 2_000, 1)
      boundedText(review.repairInstructions, 'repairInstructions', 2_000, 1)
    }
    if (review.reviewNotes !== null) boundedText(review.reviewNotes, 'reviewNotes', 2_000)
    parseAttribution(review.reviewer, 'Delivery reviewer')
    timestamp(review.reviewedAt, 'reviewedAt')
    if (typeof review.isCurrent !== 'boolean') {
      throw new RequestContractError('Delivery review current marker is invalid.')
    }
  })
  return row
}

function parseBuilderWorkspace(
  value: unknown,
  briefRevisionId: string,
  acceptanceIds: readonly string[],
  builderAssignments: Set<string>,
): RequestBuilderWorkspaceV1 {
  const row = strictRecord(
    value,
    [
      'deliveryRevisionId',
      'acceptedBriefRevisionId',
      'activeBuilderAssignmentId',
      'revisionState',
      'revisionLabel',
      'summary',
      'builderEvidence',
      'approvedPathForgeReference',
      'artifacts',
      'sealReceiptId',
    ],
    'Builder workspace',
  )
  uuid(row.deliveryRevisionId, 'builder workspace deliveryRevisionId')
  if (
    uuid(row.acceptedBriefRevisionId, 'builder workspace acceptedBriefRevisionId') !==
      briefRevisionId ||
    !builderAssignments.has(
      uuid(
        row.activeBuilderAssignmentId,
        'builder workspace activeBuilderAssignmentId',
      ),
    ) ||
    !['staging', 'prepared', 'sealed'].includes(row.revisionState as string)
  ) {
    throw new RequestContractError('Builder workspace authority binding is invalid.')
  }

  const evidence = boundedArray(row.builderEvidence, 'builder workspace evidence', 3)
  if (row.revisionState === 'staging') {
    if (
      row.revisionLabel !== null ||
      row.summary !== null ||
      evidence.length !== 0 ||
      row.approvedPathForgeReference !== null ||
      row.sealReceiptId !== null
    ) {
      throw new RequestContractError('Staging builder workspace shape is invalid.')
    }
  } else {
    boundedText(row.revisionLabel, 'builder workspace revisionLabel', 80, 1)
    boundedText(row.summary, 'builder workspace summary', 2_000, 1)
    if (evidence.length !== acceptanceIds.length) {
      throw new RequestContractError(
        'Builder workspace evidence must cover every acceptance check.',
      )
    }
    if (row.approvedPathForgeReference !== null) {
      parsePathForgeReference(row.approvedPathForgeReference)
    }
    if (row.revisionState === 'sealed') {
      uuid(row.sealReceiptId, 'builder workspace sealReceiptId')
    } else if (row.sealReceiptId !== null) {
      throw new RequestContractError(
        'Only a sealed builder workspace may include a seal receipt.',
      )
    }
  }

  evidence.forEach((item, index) => {
    const evidenceRow = strictRecord(
      item,
      ['acceptanceCheckId', 'result', 'evidenceText', 'evidenceRef'],
      'Builder workspace evidence',
    )
    if (
      uuid(evidenceRow.acceptanceCheckId, 'builder workspace acceptanceCheckId') !==
        acceptanceIds[index] ||
      !['pass', 'fail', 'not_run'].includes(evidenceRow.result as string)
    ) {
      throw new RequestContractError('Builder workspace evidence is invalid.')
    }
    if (evidenceRow.evidenceText !== null) {
      boundedText(evidenceRow.evidenceText, 'builder workspace evidenceText', 2_000, 1)
    }
    if (
      evidenceRow.evidenceRef !== null &&
      (typeof evidenceRow.evidenceRef !== 'string' ||
        !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/.test(evidenceRow.evidenceRef))
    ) {
      throw new RequestContractError('Builder workspace evidence reference is invalid.')
    }
  })

  const ordinals = new Set<number>()
  let priorOrdinal = 0
  const artifacts = boundedArray(row.artifacts, 'builder workspace artifacts', 5)
  artifacts.forEach((item) => {
    const artifact = strictRecord(
      item,
      [
        'artifactId',
        'artifactOrdinal',
        'normalizedName',
        'detectedMediaType',
        'byteLength',
        'sha256',
        'integrityStatus',
        'scanState',
        'scanVerdict',
        'findingCodes',
      ],
      'Builder workspace artifact',
    )
    uuid(artifact.artifactId, 'builder workspace artifactId')
    const ordinal = boundedInteger(
      artifact.artifactOrdinal,
      'builder workspace artifactOrdinal',
      1,
      5,
    )
    if (ordinals.has(ordinal) || ordinal <= priorOrdinal) {
      throw new RequestContractError(
        'Builder workspace artifacts must have distinct ascending ordinals.',
      )
    }
    ordinals.add(ordinal)
    priorOrdinal = ordinal
    boundedText(artifact.normalizedName, 'builder workspace normalizedName', 120, 1)
    if (!isOneOf(artifact.detectedMediaType, DELIVERY_MEDIA_TYPES)) {
      throw new RequestContractError('Builder workspace media type is invalid.')
    }
    boundedInteger(artifact.byteLength, 'builder workspace byteLength', 1, 4_000_000)
    sha256(artifact.sha256, 'builder workspace artifact sha256')
    if (
      !['pending', 'verified', 'failed'].includes(artifact.integrityStatus as string) ||
      !['pending', 'complete'].includes(artifact.scanState as string) ||
      !['clean', 'rejected', 'held', null].includes(artifact.scanVerdict as string | null)
    ) {
      throw new RequestContractError('Builder workspace artifact state is invalid.')
    }
    boundedArray(artifact.findingCodes, 'builder workspace findingCodes', 20).forEach(
      (code) => {
        if (typeof code !== 'string' || !/^[a-z0-9][a-z0-9_.:-]{0,79}$/i.test(code)) {
          throw new RequestContractError(
            'Builder workspace artifact finding code is invalid.',
          )
        }
      },
    )
  })
  if (row.revisionState !== 'staging' && artifacts.length < 1) {
    throw new RequestContractError('Prepared builder workspace requires an artifact.')
  }
  return row as unknown as RequestBuilderWorkspaceV1
}

export function parseRequestCaseDetailV1(value: unknown): RequestCaseDetailV1 {
  const detailKeys = [
    ...SUMMARY_KEYS,
    'visibility',
    'targetDate',
    'closureNote',
    'briefRevisionId',
    'brief',
    'participants',
    'assignments',
    'clarifications',
    'deliveryRevisions',
    'requesterOutcomes',
    'builderWorkspace',
    'events',
    'notices',
    'actor',
  ]
  const row = strictRecord(value, detailKeys, 'Request detail')
  if (row.visibility !== 'full') {
    throw new RequestContractError('Full request detail visibility is invalid.')
  }
  parseSummaryRecord(row, detailKeys)
  if (row.targetDate !== null) {
    calendarDate(row.targetDate, 'Request target date')
  }
  if (
    ['submitted', 'triage', 'clarification_requested'].includes(
      row.lifecycleState as string,
    ) &&
    row.targetDate !== null
  ) {
    throw new RequestContractError(
      'A pre-acceptance request cannot have a target date.',
    )
  }
  if (
    [
      'accepted',
      'building',
      'review_pending',
      'delivery_ready',
      'delivered',
      'repair_required',
      'completed',
    ].includes(row.lifecycleState as string) &&
    row.targetDate === null
  ) {
    throw new RequestContractError(
      'An accepted request must have a target date.',
    )
  }
  const closureNoteReasons = [
    'existing_resolution',
    'duplicate',
    'out_of_scope',
    'capacity_unavailable',
    'declined',
    'withdrawn',
    'expired',
    'failed_review',
  ]
  if (closureNoteReasons.includes(row.closeReason as string)) {
    safeProjectedText(row.closureNote, 'closure note', 2_000, 1)
  } else if (row.closeReason === 'withdrawn' && row.closureNote !== null) {
    safeProjectedText(row.closureNote, 'closure note', 2_000, 1)
  } else if (row.closureNote !== null) {
    throw new RequestContractError(
      'Closure note is invalid for this request lifecycle.',
    )
  }
  const briefRevisionId = uuid(row.briefRevisionId, 'briefRevisionId')
  const brief = strictRecord(
    row.brief,
    [
      'title',
      'outcome',
      'intendedUser',
      'mustWorkScenario',
      'acceptanceChecks',
      'constraints',
      'pathforgeReference',
    ],
    'Request brief',
  )
  boundedText(brief.title, 'brief title', 120, 4)
  boundedText(brief.outcome, 'brief outcome', 4_000, 20)
  boundedText(brief.intendedUser, 'brief intendedUser', 1_000, 2)
  boundedText(brief.mustWorkScenario, 'brief mustWorkScenario', 1_000, 10)
  boundedText(brief.constraints, 'brief constraints', 2_000)
  if (brief.pathforgeReference !== null) parsePathForgeReference(brief.pathforgeReference)
  const acceptanceChecks = boundedArray(brief.acceptanceChecks, 'acceptanceChecks', 3)
  if (acceptanceChecks.length < 1) throw new RequestContractError('Acceptance checks are required.')
  const acceptanceIds: string[] = []
  const acceptanceIdSet = new Set<string>()
  acceptanceChecks.forEach((item, index) => {
    const check = strictRecord(
      item,
      ['acceptanceCheckId', 'ordinal', 'text'],
      'Acceptance check',
    )
    const id = uuid(check.acceptanceCheckId, 'acceptanceCheckId')
    if (acceptanceIdSet.has(id) || check.ordinal !== index + 1) {
      throw new RequestContractError('Acceptance check identity or order is invalid.')
    }
    acceptanceIdSet.add(id)
    acceptanceIds.push(id)
    boundedText(check.text, 'acceptance check text', 500, 4)
  })
  const participants = boundedArray(row.participants, 'participants', 8)
  participants.forEach((item) => {
    const participant = strictRecord(
      item,
      ['role', 'displayName', 'deidentified'],
      'Request participant',
    )
    if (
      !['requester', 'triager', 'builder', 'reviewer'].includes(participant.role as string) ||
      typeof participant.deidentified !== 'boolean'
    ) {
      throw new RequestContractError('Request participant is invalid.')
    }
    boundedText(participant.displayName, 'participant displayName', 120, 1)
  })
  const assignments = boundedArray(
    row.assignments,
    'assignments',
    REQUEST_MAX_ASSIGNMENT_HISTORY,
  )
  const builderAssignments = new Set<string>()
  let hasActiveReviewer = false
  assignments.forEach((item) => {
    const assignment = strictRecord(
      item,
      ['assignmentId', 'role', 'active', 'assignedAt', 'endedAt'],
      'Request assignment',
    )
    const assignmentId = uuid(assignment.assignmentId, 'assignmentId')
    if (!['builder', 'reviewer'].includes(assignment.role as string)) {
      throw new RequestContractError('Request assignment role is invalid.')
    }
    if (typeof assignment.active !== 'boolean') {
      throw new RequestContractError('Request assignment active flag is invalid.')
    }
    timestamp(assignment.assignedAt, 'assignedAt')
    if (assignment.endedAt !== null) timestamp(assignment.endedAt, 'endedAt')
    if (assignment.active && assignment.endedAt !== null) {
      throw new RequestContractError('Active assignment cannot have an end timestamp.')
    }
    if (assignment.role === 'builder') {
      builderAssignments.add(assignmentId)
    } else if (assignment.active) {
      hasActiveReviewer = true
    }
  })
  const clarifications = boundedArray(row.clarifications, 'clarifications', 3)
  let unansweredClarificationCount = 0
  clarifications.forEach((item, index) => {
    const clarification = strictRecord(
      item,
      ['clarificationId', 'sequence', 'question', 'answer', 'requestedAt', 'answeredAt'],
      'Request clarification',
    )
    uuid(clarification.clarificationId, 'clarificationId')
    if (clarification.sequence !== index + 1) {
      throw new RequestContractError('Clarification sequence is invalid.')
    }
    boundedText(clarification.question, 'clarification question', 2_000, 1)
    if (clarification.answer !== null) {
      boundedText(clarification.answer, 'answer', 4_000, 1)
    } else {
      unansweredClarificationCount += 1
    }
    timestamp(clarification.requestedAt, 'requestedAt')
    if (clarification.answeredAt !== null) {
      timestamp(clarification.answeredAt, 'answeredAt')
    }
    if (
      (clarification.answer === null) !==
      (clarification.answeredAt === null)
    ) {
      throw new RequestContractError(
        'Clarification answer and answer timestamp are inconsistent.',
      )
    }
  })
  if (
    [
      'accepted',
      'building',
      'review_pending',
      'repair_required',
      'delivery_ready',
      'delivered',
      'completed',
    ].includes(row.lifecycleState as string) &&
    unansweredClarificationCount !== 0
  ) {
    throw new RequestContractError(
      'Accepted request scope contains an unanswered clarification.',
    )
  }
  if (
    row.lifecycleState === 'clarification_requested' &&
    (unansweredClarificationCount !== 1 ||
      clarifications.at(-1)?.answer !== null)
  ) {
    throw new RequestContractError(
      'Clarification-requested state requires one final unanswered clarification.',
    )
  }
  const revisions = boundedArray(
    row.deliveryRevisions,
    'deliveryRevisions',
    REQUEST_MAX_DELIVERY_REVISIONS,
  )
  let currentRevisionCount = 0
  const revisionIds = new Set<string>()
  const currentRevisionIds = new Set<string>()
  revisions.forEach((revision) => {
    const parsed = parseDeliveryRevision(
      revision,
      briefRevisionId,
      acceptanceIds,
      builderAssignments,
    )
    const revisionId = parsed.deliveryRevisionId as string
    if (revisionIds.has(revisionId)) {
      throw new RequestContractError('Delivery revision identity is duplicated.')
    }
    revisionIds.add(revisionId)
    if (parsed.isCurrent === true) {
      currentRevisionCount += 1
      currentRevisionIds.add(revisionId)
    }
  })
  if (currentRevisionCount > 1) {
    throw new RequestContractError('Only one delivery revision may be current.')
  }
  const outcomeRevisionIds = new Set<string>()
  boundedArray(
    row.requesterOutcomes,
    'requester outcomes',
    REQUEST_MAX_DELIVERY_REVISIONS,
  ).forEach((item) => {
    const outcome = strictRecord(
      item,
      [
        'outcomeId',
        'deliveryRevisionId',
        'acceptedBriefRevisionId',
        'outcome',
        'acceptanceCheckId',
        'reason',
        'occurredAt',
        'isCurrent',
      ],
      'Requester outcome',
    )
    uuid(outcome.outcomeId, 'requester outcomeId')
    const deliveryRevisionId = uuid(
      outcome.deliveryRevisionId,
      'requester outcome deliveryRevisionId',
    )
    const acceptedBriefRevisionId = uuid(
      outcome.acceptedBriefRevisionId,
      'requester outcome acceptedBriefRevisionId',
    )
    if (acceptedBriefRevisionId !== briefRevisionId) {
      throw new RequestContractError(
        'Requester outcome accepted brief binding is invalid.',
      )
    }
    if (
      !revisionIds.has(deliveryRevisionId) ||
      outcomeRevisionIds.has(deliveryRevisionId)
    ) {
      throw new RequestContractError(
        'Requester outcome revision binding is invalid.',
      )
    }
    outcomeRevisionIds.add(deliveryRevisionId)
    if (outcome.outcome === 'useful') {
      if (outcome.acceptanceCheckId !== null || outcome.reason !== null) {
        throw new RequestContractError('Useful requester outcome shape is invalid.')
      }
    } else if (outcome.outcome === 'failed_acceptance_check') {
      const acceptanceCheckId = uuid(
        outcome.acceptanceCheckId,
        'requester outcome acceptanceCheckId',
      )
      if (!acceptanceIdSet.has(acceptanceCheckId)) {
        throw new RequestContractError(
          'Requester outcome acceptance check binding is invalid.',
        )
      }
      if (outcome.reason !== null) {
        safeProjectedText(outcome.reason, 'requester outcome reason', 2_000, 1)
      }
    } else {
      throw new RequestContractError('Requester outcome kind is invalid.')
    }
    timestamp(outcome.occurredAt, 'requester outcome occurredAt')
    if (
      typeof outcome.isCurrent !== 'boolean' ||
      outcome.isCurrent !== currentRevisionIds.has(deliveryRevisionId)
    ) {
      throw new RequestContractError(
        'Requester outcome current revision marker is invalid.',
      )
    }
  })
  parseRequestEventPageV1(row.events)
  const notices = boundedArray(row.notices, 'Request notices', 2)
  const noticeKinds = new Set<string>()
  notices.forEach((item) => {
    const notice = strictRecord(
      item,
      ['kind', 'label', 'effectiveUntil'],
      'Request notice',
    )
    if (
      !['retention', 'moderation_hold'].includes(notice.kind as string) ||
      noticeKinds.has(notice.kind as string)
    ) {
      throw new RequestContractError('Request notice kind is invalid or duplicated.')
    }
    noticeKinds.add(notice.kind as string)
    safeProjectedText(notice.label, 'notice label', 240, 1)
    if (notice.effectiveUntil !== null) {
      timestamp(notice.effectiveUntil, 'notice effectiveUntil')
    }
  })
  if (
    row.moderationState === 'held' &&
    !noticeKinds.has('moderation_hold')
  ) {
    throw new RequestContractError('Held request requires a moderation notice.')
  }
  const actor = strictRecord(
    row.actor,
    [
      'accountId',
      'roles',
      'operatorAuthority',
      'capabilities',
      'allowedCloseReasons',
      'unreadCount',
    ],
    'Request actor',
  )
  uuid(actor.accountId, 'actor accountId')
  const actorRoles = boundedArray(actor.roles, 'actor roles', 5)
  if (
    actorRoles.some(
      (role) => !isOneOf(role, REQUEST_ACTOR_ROLES) || role === 'system',
    )
  ) {
    throw new RequestContractError('Request actor roles are invalid.')
  }
  if (new Set(actorRoles).size !== actorRoles.length) {
    throw new RequestContractError('Request actor roles must be distinct.')
  }
  if (actor.operatorAuthority !== 'none' && actor.operatorAuthority !== 'admin') {
    throw new RequestContractError('Request operator authority is invalid.')
  }
  if (actorRoles.length === 0 && actor.operatorAuthority !== 'admin') {
    throw new RequestContractError(
      'Unassigned request actor requires admin operator authority.',
    )
  }
  const capabilities = boundedArray(actor.capabilities, 'actor capabilities', 24)
  if (capabilities.some((capability) => !isOneOf(capability, REQUEST_CAPABILITIES))) {
    throw new RequestContractError('Request actor capabilities are invalid.')
  }
  if (new Set(capabilities).size !== capabilities.length) {
    throw new RequestContractError('Request actor capabilities must be distinct.')
  }
  const closeReasonOrder = [
    'existing_resolution',
    'duplicate',
    'out_of_scope',
    'capacity_unavailable',
    'declined',
    'expired',
  ] as const
  const allowedCloseReasons = boundedArray(
    actor.allowedCloseReasons,
    'allowed close reasons',
    closeReasonOrder.length,
  )
  let priorCloseReasonIndex = -1
  allowedCloseReasons.forEach((reason) => {
    const index = closeReasonOrder.indexOf(
      reason as (typeof closeReasonOrder)[number],
    )
    if (index < 0 || index <= priorCloseReasonIndex) {
      throw new RequestContractError(
        'Allowed close reasons are invalid or out of order.',
      )
    }
    priorCloseReasonIndex = index
  })
  const canAdministrativeClose =
    actorRoles.includes('triager') && capabilities.includes('close')
  if (!canAdministrativeClose && allowedCloseReasons.length !== 0) {
    throw new RequestContractError(
      'Allowed close reasons require the active triager close capability.',
    )
  }
  if (canAdministrativeClose) {
    const earlyReasons = closeReasonOrder.slice(0, 5)
    let validStateReasons: readonly (readonly string[])[] = []
    if (row.lifecycleState === 'submitted' || row.lifecycleState === 'triage') {
      validStateReasons = [earlyReasons]
    } else if (row.lifecycleState === 'clarification_requested') {
      validStateReasons = [earlyReasons, [...earlyReasons, 'expired']]
    } else if (
      ['accepted', 'building', 'repair_required', 'review_pending'].includes(
        row.lifecycleState as string,
      )
    ) {
      validStateReasons = [['declined']]
    }
    if (
      !validStateReasons.some(
        (expected) =>
          expected.length === allowedCloseReasons.length &&
          expected.every((reason, index) => reason === allowedCloseReasons[index]),
      )
    ) {
      throw new RequestContractError(
        'Allowed close reasons are invalid for this lifecycle state.',
      )
    }
  }
  if (
    (capabilities.includes('submit_delivery') ||
      capabilities.includes('resubmit_delivery')) &&
    (!actorRoles.includes('builder') || !hasActiveReviewer)
  ) {
    throw new RequestContractError(
      'Delivery submission capability requires an active builder and reviewer.',
    )
  }
  if (
    capabilities.includes('acknowledge_delivery') &&
    (row.lifecycleState !== 'delivery_ready' || !actorRoles.includes('requester'))
  ) {
    throw new RequestContractError(
      'Delivery acknowledgement capability is invalid for this lifecycle state.',
    )
  }
  if (
    (capabilities.includes('reassign_builder') ||
      capabilities.includes('reassign_reviewer')) &&
    !actorRoles.includes('triager')
  ) {
    throw new RequestContractError(
      'Assignment recovery capability requires triage authority.',
    )
  }
  if (
    assignments.length >= REQUEST_MAX_ASSIGNMENT_HISTORY &&
    (capabilities.includes('reassign_builder') ||
      capabilities.includes('reassign_reviewer'))
  ) {
    throw new RequestContractError(
      'Assignment recovery capability exceeds the V1 history limit.',
    )
  }
  if (
    [
      'request_clarification',
      'accept',
      'assign_reviewer',
      'close',
      'close_no_response',
    ].some((capability) => capabilities.includes(capability)) &&
    !actorRoles.includes('triager')
  ) {
    throw new RequestContractError(
      'Substantive triage capability requires the active case triager.',
    )
  }
  if (
    [
      'begin_triage',
      'reassign_triager',
      'place_moderation_hold',
      'release_moderation_hold',
      'remove_for_moderation',
    ].some((capability) => capabilities.includes(capability)) &&
    actor.operatorAuthority !== 'admin'
  ) {
    throw new RequestContractError(
      'Operator capability requires global admin authority.',
    )
  }
  if (
    revisions.length >= REQUEST_MAX_DELIVERY_REVISIONS &&
    capabilities.some((capability) =>
      [
        'stage_delivery_artifact',
        'abandon_delivery_artifact',
        'prepare_delivery_revision',
        'submit_delivery',
        'resubmit_delivery',
      ].includes(capability as string),
    )
  ) {
    throw new RequestContractError(
      'Delivery revision capability exceeds the V1 repair limit.',
    )
  }
  const summaryActions = row.nextActions as Array<{ kind: string }>
  if (summaryActions.some((action) => !capabilities.includes(action.kind))) {
    throw new RequestContractError('Request next action is not executable by the actor.')
  }
  boundedInteger(actor.unreadCount, 'actor unreadCount', 0, 100_000)
  if (
    row.builderWorkspace !== null &&
    capabilities.includes('reassign_builder')
  ) {
    throw new RequestContractError(
      'Builder reassignment is unavailable while delivery work is in progress.',
    )
  }
  if (revisions.length >= REQUEST_MAX_DELIVERY_REVISIONS) {
    if (row.builderWorkspace !== null) {
      throw new RequestContractError(
        'Builder workspace exceeds the V1 delivery revision limit.',
      )
    }
  } else if (actorRoles.includes('builder')) {
    if (row.builderWorkspace !== null) {
      parseBuilderWorkspace(
        row.builderWorkspace,
        briefRevisionId,
        acceptanceIds,
        builderAssignments,
      )
    }
  } else if (row.builderWorkspace !== null) {
    throw new RequestContractError(
      'Builder workspace must be hidden from non-builder actors.',
    )
  }
  return row as unknown as RequestCaseDetailV1
}

export function parseRequestRestrictedCaseDetailV1(
  value: unknown,
): RequestRestrictedCaseDetailV1 {
  const row = strictRecord(
    value,
    [
      'visibility',
      'contractVersion',
      'requestId',
      'requestVersion',
      'lifecycleState',
      'moderationState',
      'publicationState',
      'closeReason',
      'safeLabel',
      'unread',
      'submittedAt',
      'updatedAt',
      'events',
      'notices',
      'actor',
    ],
    'Restricted request detail',
  )
  if (
    (row.visibility !== 'held' && row.visibility !== 'removed') ||
    row.moderationState !== row.visibility ||
    row.contractVersion !== REQUEST_CONTRACT_VERSION ||
    !isOneOf(row.lifecycleState, REQUEST_LIFECYCLE_STATES) ||
    !isOneOf(row.publicationState, REQUEST_PUBLICATION_STATES) ||
    !(row.closeReason === null || isOneOf(row.closeReason, REQUEST_CLOSE_REASONS)) ||
    ((row.lifecycleState === 'closed') !== (row.closeReason !== null))
  ) {
    throw new RequestContractError('Restricted request status is invalid.')
  }
  uuid(row.requestId, 'requestId')
  boundedInteger(row.requestVersion, 'requestVersion', 0, 10_000_000)
  safeProjectedText(row.safeLabel, 'restricted request label', 120, 1)
  parseRequestUnreadStateV1(row.unread)
  timestamp(row.submittedAt, 'submittedAt')
  timestamp(row.updatedAt, 'updatedAt')
  parseRequestEventPageV1(row.events)
  const notices = boundedArray(row.notices, 'Restricted request notices', 2)
  const noticeKinds = new Set<string>()
  notices.forEach((item) => {
    const notice = strictRecord(
      item,
      ['kind', 'label', 'effectiveUntil'],
      'Restricted request notice',
    )
    if (
      !['retention', 'moderation_hold'].includes(notice.kind as string) ||
      noticeKinds.has(notice.kind as string)
    ) {
      throw new RequestContractError('Restricted request notice is invalid.')
    }
    noticeKinds.add(notice.kind as string)
    safeProjectedText(notice.label, 'restricted notice label', 240, 1)
    if (notice.effectiveUntil !== null) {
      timestamp(notice.effectiveUntil, 'notice effectiveUntil')
    }
  })
  if (row.visibility === 'held' && !noticeKinds.has('moderation_hold')) {
    throw new RequestContractError('Held request requires a moderation notice.')
  }
  const actor = strictRecord(
    row.actor,
    [
      'accountId',
      'roles',
      'operatorAuthority',
      'capabilities',
      'allowedCloseReasons',
      'unreadCount',
    ],
    'Restricted request actor',
  )
  uuid(actor.accountId, 'actor accountId')
  const roles = boundedArray(actor.roles, 'actor roles', 4)
  if (
    roles.some(
      (role) => !isOneOf(role, REQUEST_ACTOR_ROLES) || role === 'system',
    ) ||
    new Set(roles).size !== roles.length
  ) {
    throw new RequestContractError('Restricted request actor roles are invalid.')
  }
  if (actor.operatorAuthority !== 'none' && actor.operatorAuthority !== 'admin') {
    throw new RequestContractError('Restricted operator authority is invalid.')
  }
  if (roles.length === 0 && actor.operatorAuthority !== 'admin') {
    throw new RequestContractError(
      'Unassigned restricted actor requires admin operator authority.',
    )
  }
  const capabilities = boundedArray(actor.capabilities, 'actor capabilities', 2)
  const allowedCloseReasons = boundedArray(
    actor.allowedCloseReasons,
    'restricted allowed close reasons',
    0,
  )
  const allowedHeldCapabilities = ['release_moderation_hold', 'remove_for_moderation']
  if (
    new Set(capabilities).size !== capabilities.length ||
    capabilities.some((capability) => !allowedHeldCapabilities.includes(capability as string)) ||
    (row.visibility === 'removed' && capabilities.length !== 0) ||
    (row.visibility === 'held' &&
      actor.operatorAuthority !== 'admin' &&
      capabilities.length !== 0)
  ) {
    throw new RequestContractError('Restricted request capabilities are invalid.')
  }
  void allowedCloseReasons
  boundedInteger(actor.unreadCount, 'actor unreadCount', 0, 100_000)
  return row as unknown as RequestRestrictedCaseDetailV1
}

export function parseRequestCaseDetailResultV1(
  value: unknown,
): RequestCaseDetailResultV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestContractError('Request detail result must be an object.')
  }
  const visibility = (value as Record<string, unknown>).visibility
  if (visibility === 'full') return parseRequestCaseDetailV1(value)
  if (visibility === 'held' || visibility === 'removed') {
    return parseRequestRestrictedCaseDetailV1(value)
  }
  throw new RequestContractError('Request detail visibility is invalid.')
}

function validateReaderHref(value: unknown) {
  const readerHref = boundedText(value, 'readerHref', 500, 1)
  let parsed: URL
  try {
    parsed = new URL(readerHref, 'https://pathforge.invalid')
  } catch {
    throw new RequestContractError('Artifact reader href is invalid.')
  }
  if (
    !readerHref.startsWith('/') ||
    readerHref.startsWith('//') ||
    /[\\\r\n]/.test(readerHref) ||
    parsed.origin !== 'https://pathforge.invalid'
  ) {
    throw new RequestContractError('Artifact reader href must be same-origin.')
  }
  return readerHref
}

export function parseRequestDeliveryArtifactReaderResultV1(
  value: unknown,
): RequestDeliveryArtifactReaderResultV1 {
  const envelope = strictRecord(value, ['status', 'artifact', 'reason'], 'Artifact reader result')
  if (envelope.status === 'unavailable') {
    if ('artifact' in envelope) {
      throw new RequestContractError('Unavailable reader result cannot expose artifact data.')
    }
    if (
      ![
        'unauthenticated',
        'not_found',
        'stale_revision',
        'held',
        'removed',
        'withdrawn',
        'closed',
      ].includes(envelope.reason as string)
    ) {
      throw new RequestContractError('Artifact reader unavailability reason is invalid.')
    }
    return envelope as RequestDeliveryArtifactReaderResultV1
  }
  if (envelope.status !== 'ready' || 'reason' in envelope) {
    throw new RequestContractError('Artifact reader result status is invalid.')
  }
  const artifact = strictRecord(
    envelope.artifact,
    [
      'deliveryArtifactId',
      'deliveryRevisionId',
      'requestId',
      'normalizedName',
      'detectedMediaType',
      'byteLength',
      'sha256',
      'integrityStatus',
      'deliveryStatus',
      'accessUntil',
      'readerHref',
    ],
    'Artifact reader',
  )
  uuid(artifact.deliveryArtifactId, 'deliveryArtifactId')
  uuid(artifact.deliveryRevisionId, 'deliveryRevisionId')
  uuid(artifact.requestId, 'requestId')
  boundedText(artifact.normalizedName, 'normalizedName', 120, 1)
  if (!isOneOf(artifact.detectedMediaType, DELIVERY_MEDIA_TYPES)) {
    throw new RequestContractError('Artifact reader media type is invalid.')
  }
  boundedInteger(artifact.byteLength, 'byteLength', 1, 4_000_000)
  sha256(artifact.sha256, 'artifact sha256')
  if (artifact.integrityStatus !== 'verified') {
    throw new RequestContractError('Artifact reader integrity status is invalid.')
  }
  if (
    !['delivery_ready', 'delivered', 'completed', 'closed_no_response'].includes(
      artifact.deliveryStatus as string,
    )
  ) {
    throw new RequestContractError('Artifact reader delivery status is invalid.')
  }
  if (artifact.accessUntil !== null) timestamp(artifact.accessUntil, 'accessUntil')
  if (artifact.deliveryStatus === 'closed_no_response' && artifact.accessUntil === null) {
    throw new RequestContractError('Closed no-response reader requires an access deadline.')
  }
  validateReaderHref(artifact.readerHref)
  return envelope as unknown as RequestDeliveryArtifactReaderResultV1
}

function parseReceipt(data: unknown): RequestCommandReceipt {
  const candidate = Array.isArray(data) ? data[0] : data
  const row = strictRecord(
    candidate,
    [
      'contract_version',
      'command_id',
      'request_id',
      'request_version',
      'event_id',
      'lifecycle_state',
      'moderation_state',
      'publication_state',
      'close_reason',
      'replayed',
      'occurred_at',
      'authority_result',
    ],
    'Request authority receipt',
  ) as ReceiptRow
  if (
    row.contract_version !== REQUEST_CONTRACT_VERSION ||
    !isOneOf(row.lifecycle_state, REQUEST_LIFECYCLE_STATES) ||
    !isOneOf(row.moderation_state, REQUEST_MODERATION_STATES) ||
    !isOneOf(row.publication_state, REQUEST_PUBLICATION_STATES) ||
    !(row.close_reason === null || isOneOf(row.close_reason, REQUEST_CLOSE_REASONS)) ||
    typeof row.replayed !== 'boolean'
  ) {
    throw new RequestContractError('Request authority returned an invalid receipt.')
  }
  const commandId = uuid(row.command_id, 'receipt command_id')
  const requestId = uuid(row.request_id, 'receipt request_id')
  const requestVersion = boundedInteger(
    row.request_version,
    'receipt request_version',
    0,
    10_000_000,
  )
  const eventId = uuid(row.event_id, 'receipt event_id')
  const occurredAt = timestamp(row.occurred_at, 'receipt occurred_at')
  if (
    (row.lifecycle_state === 'closed' && row.close_reason === null) ||
    (row.lifecycle_state !== 'closed' && row.close_reason !== null)
  ) {
    throw new RequestContractError('Request authority returned an inconsistent close reason.')
  }
  if (
    row.authority_result !== undefined &&
    (row.authority_result === null ||
      typeof row.authority_result !== 'object' ||
      Array.isArray(row.authority_result) ||
      Object.entries(row.authority_result).some(
        ([key, value]) => {
          if (!AUTHORITY_RESULT_KEYS.includes(key as (typeof AUTHORITY_RESULT_KEYS)[number])) {
            return true
          }
          if (key === 'evidenceChecklistVersion' || key === 'rightsSnapshotVersion') {
            return (
              !Number.isSafeInteger(value) ||
              (value as number) < 1 ||
              (value as number) > 10_000
            )
          }
          return (
            typeof value !== 'string' ||
            value.length < 1 ||
            value.length > 160 ||
            /[:/\\\s]/.test(value)
          )
        },
      ))
  ) {
    throw new RequestContractError('Request authority returned an invalid safe result.')
  }

  return {
    contractVersion: REQUEST_CONTRACT_VERSION,
    commandId,
    requestId,
    requestVersion,
    eventId,
    lifecycleState: row.lifecycle_state,
    moderationState: row.moderation_state,
    publicationState: row.publication_state,
    closeReason: row.close_reason,
    replayed: row.replayed,
    occurredAt,
    ...(row.authority_result === undefined
      ? {}
      : { authorityResult: row.authority_result }),
  }
}

function parseControlsReceipt(data: unknown): RequestControlsReceiptV1 {
  const candidate = Array.isArray(data) ? data[0] : data
  const row = strictRecord(
    candidate,
    [
      'controls_version',
      'accepting_requests',
      'assigning_requests',
      'active_case_capacity',
      'replayed',
      'occurred_at',
    ],
    'Request controls receipt',
  )
  if (
    typeof row.accepting_requests !== 'boolean' ||
    typeof row.assigning_requests !== 'boolean' ||
    typeof row.replayed !== 'boolean'
  ) {
    throw new RequestContractError('Request authority returned an invalid controls receipt.')
  }
  const controlsVersion = boundedInteger(
    row.controls_version,
    'controls receipt controls_version',
    0,
    10_000_000,
  )
  const activeCaseCapacity = boundedInteger(
    row.active_case_capacity,
    'controls receipt active_case_capacity',
    1,
    4,
  )
  const occurredAt = timestamp(
    row.occurred_at,
    'controls receipt occurred_at',
  )
  return {
    controlsVersion,
    acceptingRequests: row.accepting_requests,
    assigningRequests: row.assigning_requests,
    activeCaseCapacity,
    replayed: row.replayed,
    occurredAt,
  }
}

function parsePilotAdmissionReceipt(data: unknown): RequestPilotAdmissionReceiptV1 {
  const candidate = Array.isArray(data) ? data[0] : data
  const row = strictRecord(
    candidate,
    [
      'contractVersion',
      'accountId',
      'admissionVersion',
      'admitted',
      'expiresAt',
      'replayed',
      'occurredAt',
    ],
    'Pilot admission receipt',
  )
  if (row.contractVersion !== REQUEST_CONTRACT_VERSION) {
    throw new RequestContractError('Pilot admission receipt version is invalid.')
  }
  uuid(row.accountId, 'Pilot admission account id')
  boundedInteger(row.admissionVersion, 'Pilot admission version', 1, 10_000_000)
  if (typeof row.admitted !== 'boolean' || typeof row.replayed !== 'boolean') {
    throw new RequestContractError('Pilot admission receipt state is invalid.')
  }
  if (row.expiresAt !== null) timestamp(row.expiresAt, 'Pilot admission expiresAt')
  if (row.admitted === false && row.expiresAt !== null) {
    throw new RequestContractError('Revoked pilot admission cannot retain an expiry.')
  }
  timestamp(row.occurredAt, 'Pilot admission occurredAt')
  return row as unknown as RequestPilotAdmissionReceiptV1
}

function parseDeidentifyRequestAccountReceipt(
  data: unknown,
): DeidentifyRequestAccountReceiptV1 {
  const candidate = Array.isArray(data) ? data[0] : data
  const row = strictRecord(
    candidate,
    [
      'contractVersion',
      'accountId',
      'affectedCaseCount',
      'terminalizedCaseCount',
      'admissionRevoked',
      'replayed',
      'occurredAt',
    ],
    'Request account deidentification receipt',
  )
  if (row.contractVersion !== REQUEST_CONTRACT_VERSION) {
    throw new RequestContractError(
      'Request account deidentification receipt version is invalid.',
    )
  }
  uuid(row.accountId, 'Deidentified Request account id')
  const affectedCaseCount = boundedInteger(
    row.affectedCaseCount,
    'Affected Request case count',
    0,
    100_000,
  )
  const terminalizedCaseCount = boundedInteger(
    row.terminalizedCaseCount,
    'Terminalized Request case count',
    0,
    100_000,
  )
  if (
    terminalizedCaseCount > affectedCaseCount ||
    typeof row.admissionRevoked !== 'boolean' ||
    typeof row.replayed !== 'boolean'
  ) {
    throw new RequestContractError(
      'Request account deidentification receipt is inconsistent.',
    )
  }
  timestamp(row.occurredAt, 'Request account deidentification occurredAt')
  return row as unknown as DeidentifyRequestAccountReceiptV1
}

function validatePilotAdmissionInput(
  input: InviteRequestPilotParticipantInputV1 | RevokeRequestPilotParticipantInputV1,
  admitted: boolean,
) {
  strictRecord(
    input,
    admitted
      ? [
          'accountId',
          'expectedAdmissionVersion',
          'idempotencyKey',
          'reason',
          'expiresAt',
        ]
      : ['accountId', 'expectedAdmissionVersion', 'idempotencyKey', 'reason'],
    'Pilot admission mutation',
  )
  validateUuid(input.accountId, 'Pilot admission account id')
  if (
    !Number.isSafeInteger(input.expectedAdmissionVersion) ||
    input.expectedAdmissionVersion < 0 ||
    input.expectedAdmissionVersion > 10_000_000
  ) {
    throw new RequestContractError('Expected pilot admission version is invalid.')
  }
  validateIdempotencyKey(input.idempotencyKey)
  if (
    typeof input.reason !== 'string' ||
    input.reason.trim().length < 1 ||
    input.reason.trim().length > 500 ||
    /[\0\r]/.test(input.reason) ||
    REQUEST_URL_LIKE.test(input.reason) ||
    REQUEST_EMAIL_LIKE.test(input.reason) ||
    REQUEST_SECRET_LIKE.test(input.reason)
  ) {
    throw new RequestContractError('Pilot admission reason is invalid.')
  }
  if (admitted) {
    const expiresAt = (input as InviteRequestPilotParticipantInputV1).expiresAt
    if (expiresAt !== null) {
      timestamp(expiresAt, 'Pilot admission expiresAt')
      if (Date.parse(expiresAt) <= Date.now()) {
        throw new RequestContractError(
          'Pilot admission expiry must be a future timestamp.',
        )
      }
    }
  }
  return input
}

async function invoke(
  client: RequestRpcClient,
  functionName: (typeof REQUEST_RPC)[keyof typeof REQUEST_RPC],
  parameters: Record<string, unknown>,
): Promise<RequestCommandReceipt> {
  const { data, error } = await client.rpc(functionName, parameters)
  if (error) throw new RequestAuthorityError(error)
  return parseReceipt(data) as RequestCommandReceipt
}

function validateListQuery(query: RequestListQueryV1 = {}): Record<string, unknown> {
  const limit = query.limit ?? 20
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
    throw new RequestContractError('Request list limit must be an integer from 1 to 50.')
  }
  if (
    query.cursor !== undefined &&
    (typeof query.cursor !== 'string' ||
      !REQUEST_CURSOR_PATTERN.test(query.cursor))
  ) {
    throw new RequestContractError('Request list cursor is invalid.')
  }
  return { p_cursor: query.cursor ?? null, p_limit: limit }
}

function serializePathForgeReference(
  reference:
    | { kind: 'project'; projectId: string }
    | {
        kind: 'response'
        projectId: string
        modelVariantId: string
        responseStepNumber: number
      },
): Record<string, unknown> {
  return reference.kind === 'project'
    ? { kind: 'project', project_id: reference.projectId }
    : {
        kind: 'response',
        project_id: reference.projectId,
        model_variant_id: reference.modelVariantId,
        response_step_number: reference.responseStepNumber,
      }
}

function serializeDeliveryRevisionSubmission(
  payload: DeliveryRevisionSubmissionV1,
): Record<string, unknown> {
  return {
    deliveryRevisionId: payload.deliveryRevisionId,
    sealReceiptId: payload.sealReceiptId,
  }
}

function serializeDeliveryRevisionPreparation(
  payload: DeliveryRevisionPreparationV1,
): Record<string, unknown> {
  return {
    deliveryRevisionId: payload.deliveryRevisionId,
    acceptedBriefRevisionId: payload.acceptedBriefRevisionId,
    activeBuilderAssignmentId: payload.activeBuilderAssignmentId,
    revisionLabel: payload.revisionLabel.trim(),
    summary: payload.summary.trim(),
    builderEvidence: payload.builderEvidence.map((evidence) => ({
      acceptanceCheckId: evidence.acceptanceCheckId,
      result: evidence.result,
      evidenceText: evidence.evidenceText?.trim() ?? null,
      evidenceRef: evidence.evidenceRef,
    })),
    approvedPathForgeReference: payload.approvedPathForgeReference ?? null,
  }
}

function serializeStageDeliveryArtifact(
  payload: Extract<RequestCommandV1, { kind: 'stage_delivery_artifact' }>['payload'],
): Record<string, unknown> {
  return {
    deliveryRevisionId: payload.deliveryRevisionId,
    acceptedBriefRevisionId: payload.acceptedBriefRevisionId,
    activeBuilderAssignmentId: payload.activeBuilderAssignmentId,
    artifactOrdinal: payload.artifactOrdinal,
    clientFileId: payload.clientFileId,
    normalizedName: payload.normalizedName.trim(),
    byteLength: payload.byteLength,
    sha256: payload.sha256,
    detectedMediaType: payload.detectedMediaType,
    scannerVersion: payload.scannerVersion.trim(),
  }
}

function serializeManifestBoundDecision(
  command: Extract<
    RequestCommandV1,
    {
      kind:
        | 'approve_delivery'
        | 'request_repair'
        | 'requester_delivery_outcome'
    }
  >,
): Record<string, unknown> {
  if (command.kind === 'approve_delivery') {
    return {
      deliveryRevisionId: command.payload.deliveryRevisionId,
      manifestDigest: command.payload.manifestDigest,
      checklistVersion: command.payload.checklistVersion,
      checks: command.payload.checks.map((check) => ({ ...check })),
      safetyIntegrityResult: command.payload.safetyIntegrityResult,
      reviewNotes: command.payload.reviewNotes.trim(),
    }
  }
  if (command.kind === 'request_repair') {
    return {
      deliveryRevisionId: command.payload.deliveryRevisionId,
      manifestDigest: command.payload.manifestDigest,
      checklistVersion: command.payload.checklistVersion,
      checks: command.payload.checks.map((check) => ({ ...check })),
      safetyIntegrityResult: command.payload.safetyIntegrityResult,
      reason: command.payload.reason.trim(),
      repairInstructions: command.payload.repairInstructions.trim(),
    }
  }
  return command.payload.outcome === 'useful'
    ? {
        deliveryRevisionId: command.payload.deliveryRevisionId,
        manifestDigest: command.payload.manifestDigest,
        outcome: 'useful',
      }
    : {
        deliveryRevisionId: command.payload.deliveryRevisionId,
        manifestDigest: command.payload.manifestDigest,
        outcome: 'failed_acceptance_check',
        failedAcceptanceCheckId: command.payload.failedAcceptanceCheckId,
        reason: command.payload.reason.trim(),
      }
}

async function invokeRead<T>(
  client: RequestRpcClient,
  functionName: RequestRpcFunctionName,
  parameters: Record<string, unknown>,
  parser: (value: unknown) => T,
): Promise<T> {
  const { data, error } = await client.rpc(functionName, parameters)
  if (error) throw new RequestAuthorityError(error)
  return parser(data)
}

function validateUuid(value: string, label: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new RequestContractError(`${label} must be a UUID.`)
  }
}

function validateIdempotencyKey(value: unknown) {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(value)
  ) {
    throw new RequestContractError('Idempotency key is invalid.')
  }
}

export function parseRequestDeliveryRevisionActionBindingV1(
  value: unknown,
): RequestDeliveryRevisionActionBindingV1 {
  const row = strictRecord(
    value,
    ['requestId', 'deliveryRevisionId', 'requestVersion', 'manifestDigest', 'action'],
    'Delivery revision action binding',
  )
  uuid(row.requestId, 'requestId')
  uuid(row.deliveryRevisionId, 'deliveryRevisionId')
  boundedInteger(row.requestVersion, 'requestVersion', 0, 10_000_000)
  if (typeof row.manifestDigest !== 'string' || !/^[0-9a-f]{64}$/.test(row.manifestDigest)) {
    throw new RequestContractError('Delivery revision action digest is invalid.')
  }
  if (
    !['approve_delivery', 'request_repair', 'requester_delivery_outcome'].includes(
      row.action as string,
    )
  ) {
    throw new RequestContractError('Delivery revision action is invalid.')
  }
  return row as unknown as RequestDeliveryRevisionActionBindingV1
}

/**
 * Server-action-only, service-role resolver. The calling server action MUST
 * derive actorId from its authenticated cookie/session; actorId must never come
 * from browser form data, props, action arguments, or other client input. The
 * service-role RPC revalidates that actor against the exact request,
 * assignment, lifecycle state, and requested action. Authenticated browser
 * sessions have no EXECUTE grant.
 *
 * The server action must use the returned requestVersion and manifestDigest to
 * construct and immediately pass the matching command to executeCommand using
 * the original cookie-authenticated client. The binding must never enter
 * browser props, form state, action results, logs, analytics, or participant
 * read projections.
 */
export function createRequestDeliveryRevisionActionResolver(
  serviceRoleClient: RequestDeliveryRevisionActionServiceRoleRpcClient,
): RequestDeliveryRevisionActionResolver {
  return {
    async resolveDeliveryRevisionAction(input) {
      strictRecord(
        input,
        ['actorId', 'requestId', 'deliveryRevisionId', 'action'],
        'Delivery revision action request',
      )
      validateUuid(input.actorId, 'Action actor id')
      validateUuid(input.requestId, 'Request id')
      validateUuid(input.deliveryRevisionId, 'Delivery revision id')
      if (
        !['approve_delivery', 'request_repair', 'requester_delivery_outcome'].includes(
          input.action,
        )
      ) {
        throw new RequestContractError('Delivery revision action is invalid.')
      }
      const result = await invokeRead(
        serviceRoleClient,
        REQUEST_SERVER_RPC.resolveDeliveryRevisionAction,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_actor_id: input.actorId,
          p_request_id: input.requestId,
          p_delivery_revision_id: input.deliveryRevisionId,
          p_action: input.action,
        },
        parseRequestDeliveryRevisionActionBindingV1,
      )
      if (
        result.requestId !== input.requestId ||
        result.deliveryRevisionId !== input.deliveryRevisionId ||
        result.action !== input.action
      ) {
        throw new RequestContractError('Delivery revision action binding is inconsistent.')
      }
      return result
    },
  }
}

function parseStagedArtifactObject(value: unknown): RequestStagedArtifactObjectV1 {
  const row = strictRecord(
    value,
    [
      'stageReceiptId',
      'requestId',
      'expectedRequestVersion',
      'deliveryRevisionId',
      'artifactId',
      'acceptedBriefRevisionId',
      'activeBuilderAssignmentId',
      'artifactOrdinal',
      'sha256',
      'byteLength',
      'detectedMediaType',
      'scannerVersion',
      'objectIdentity',
    ],
    'Staged artifact object binding',
  )
  uuid(row.stageReceiptId, 'stageReceiptId')
  uuid(row.requestId, 'requestId')
  boundedInteger(row.expectedRequestVersion, 'expectedRequestVersion', 0, 10_000_000)
  uuid(row.deliveryRevisionId, 'deliveryRevisionId')
  uuid(row.artifactId, 'artifactId')
  uuid(row.acceptedBriefRevisionId, 'acceptedBriefRevisionId')
  uuid(row.activeBuilderAssignmentId, 'activeBuilderAssignmentId')
  boundedInteger(row.artifactOrdinal, 'artifactOrdinal', 1, 5)
  sha256(row.sha256, 'sha256')
  boundedInteger(row.byteLength, 'byteLength', 1, 4_000_000)
  if (!isOneOf(row.detectedMediaType, DELIVERY_MEDIA_TYPES)) {
    throw new RequestContractError('Staged artifact media type is invalid.')
  }
  boundedText(row.scannerVersion, 'scannerVersion', 80, 1)
  boundedText(row.objectIdentity, 'objectIdentity', 1_000, 1)
  if (/[\r\n\0]/.test(row.objectIdentity as string)) {
    throw new RequestContractError('Staged artifact object identity is invalid.')
  }
  return row as unknown as RequestStagedArtifactObjectV1
}

function parseArtifactRetentionAuthority(
  row: Record<string, unknown>,
  label: string,
) {
  if (
    !['retained', 'preserved_by_hold', 'cleanup_eligible'].includes(
      row.retentionState as string,
    )
  ) {
    throw new RequestContractError(`${label} retention state is invalid.`)
  }
  if (row.accessUntil !== null) timestamp(row.accessUntil, `${label} accessUntil`)
  if (row.retentionState === 'cleanup_eligible' && row.accessUntil === null) {
    throw new RequestContractError(
      `${label} cleanup eligibility requires an authority deadline.`,
    )
  }
}

export function parseRequestDeliveryArtifactCustodyBindingV1(
  value: unknown,
): RequestDeliveryArtifactCustodyBindingV1 {
  const row = strictRecord(
    value,
    [
      'requestVersion',
      'requestId',
      'deliveryRevisionId',
      'artifactId',
      'stageReceiptId',
      'acceptedBriefRevisionId',
      'activeBuilderAssignmentId',
      'artifactOrdinal',
      'sha256',
      'byteLength',
      'detectedMediaType',
      'scannerVersion',
      'objectIdentity',
      'attestationReceiptId',
      'attestationVersion',
      'retentionState',
      'accessUntil',
    ],
    'Delivery artifact custody binding',
  )
  boundedInteger(row.requestVersion, 'requestVersion', 0, 10_000_000)
  uuid(row.requestId, 'requestId')
  uuid(row.deliveryRevisionId, 'deliveryRevisionId')
  uuid(row.artifactId, 'artifactId')
  uuid(row.stageReceiptId, 'stageReceiptId')
  uuid(row.acceptedBriefRevisionId, 'acceptedBriefRevisionId')
  uuid(row.activeBuilderAssignmentId, 'activeBuilderAssignmentId')
  boundedInteger(row.artifactOrdinal, 'artifactOrdinal', 1, 5)
  sha256(row.sha256, 'sha256')
  boundedInteger(row.byteLength, 'byteLength', 1, 4_000_000)
  if (!isOneOf(row.detectedMediaType, DELIVERY_MEDIA_TYPES)) {
    throw new RequestContractError('Custody media type is invalid.')
  }
  boundedText(row.scannerVersion, 'scannerVersion', 80, 1)
  boundedText(row.objectIdentity, 'objectIdentity', 1_000, 1)
  if (/[\r\n\0]/.test(row.objectIdentity as string)) {
    throw new RequestContractError('Custody object identity is invalid.')
  }
  uuid(row.attestationReceiptId, 'attestationReceiptId')
  boundedInteger(row.attestationVersion, 'attestationVersion', 1, 10_000)
  parseArtifactRetentionAuthority(row, 'Delivery artifact custody')
  return row as unknown as RequestDeliveryArtifactCustodyBindingV1
}

/**
 * Construct only inside authenticated Node artifact custody routes. Object
 * identities and manifest custody data must never enter browser props, forms,
 * action results, logs, or analytics.
 */
export function createRequestStagedArtifactCustodyService(
  serviceRoleClient: RequestRpcClient,
): RequestStagedArtifactCustodyService {
  return {
    async resolveDeliveryArtifactCustody(input) {
      validateUuid(input.requestId, 'Request id')
      validateUuid(input.deliveryRevisionId, 'Delivery revision id')
      validateUuid(input.artifactId, 'Artifact id')
      const result = await invokeRead(
        serviceRoleClient,
        REQUEST_SERVER_RPC.resolveDeliveryArtifactCustody,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_request_id: input.requestId,
          p_delivery_revision_id: input.deliveryRevisionId,
          p_artifact_id: input.artifactId,
        },
        parseRequestDeliveryArtifactCustodyBindingV1,
      )
      if (
        result.requestId !== input.requestId ||
        result.deliveryRevisionId !== input.deliveryRevisionId ||
        result.artifactId !== input.artifactId
      ) {
        throw new RequestContractError('Delivery artifact custody binding is inconsistent.')
      }
      return result
    },

    async prepareStagedArtifactObject(input) {
      validateUuid(input.requestId, 'Request id')
      validateUuid(input.deliveryRevisionId, 'Delivery revision id')
      validateUuid(input.artifactId, 'Artifact id')
      validateUuid(input.stageReceiptId, 'Stage receipt id')
      const result = await invokeRead(
        serviceRoleClient,
        REQUEST_SERVER_RPC.prepareStagedArtifactObject,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_request_id: input.requestId,
          p_delivery_revision_id: input.deliveryRevisionId,
          p_artifact_id: input.artifactId,
          p_stage_receipt_id: input.stageReceiptId,
        },
        parseStagedArtifactObject,
      )
      if (
        result.requestId !== input.requestId ||
        result.deliveryRevisionId !== input.deliveryRevisionId ||
        result.artifactId !== input.artifactId ||
        result.stageReceiptId !== input.stageReceiptId
      ) {
        throw new RequestContractError('Staged artifact object binding is inconsistent.')
      }
      return result
    },

    async attestStagedArtifactObject(input) {
      const binding = parseStagedArtifactObject({
        stageReceiptId: input.stageReceiptId,
        requestId: input.requestId,
        expectedRequestVersion: input.expectedRequestVersion,
        deliveryRevisionId: input.deliveryRevisionId,
        artifactId: input.artifactId,
        acceptedBriefRevisionId: input.acceptedBriefRevisionId,
        activeBuilderAssignmentId: input.activeBuilderAssignmentId,
        artifactOrdinal: input.artifactOrdinal,
        sha256: input.sha256,
        byteLength: input.byteLength,
        detectedMediaType: input.detectedMediaType,
        scannerVersion: input.scannerVersion,
        objectIdentity: input.objectIdentity,
      })
      validateIdempotencyKey(input.idempotencyKey)
      if (input.scanVerdict !== 'clean') {
        throw new RequestContractError('Only a clean staged artifact can be attested.')
      }
      const { data, error } = await serviceRoleClient.rpc(
        REQUEST_SERVER_RPC.attestStagedArtifactObject,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_idempotency_key: input.idempotencyKey,
          p_expected_request_version: binding.expectedRequestVersion,
          p_stage_receipt_id: binding.stageReceiptId,
          p_request_id: binding.requestId,
          p_delivery_revision_id: binding.deliveryRevisionId,
          p_artifact_id: binding.artifactId,
          p_accepted_brief_revision_id: binding.acceptedBriefRevisionId,
          p_active_builder_assignment_id: binding.activeBuilderAssignmentId,
          p_artifact_ordinal: binding.artifactOrdinal,
          p_sha256: binding.sha256,
          p_byte_length: binding.byteLength,
          p_detected_media_type: binding.detectedMediaType,
          p_scanner_version: binding.scannerVersion,
          p_object_identity: binding.objectIdentity,
          p_scan_verdict: input.scanVerdict,
        },
      )
      if (error) throw new RequestAuthorityError(error)
      const row = strictRecord(
        data,
        [
          'attestationReceiptId',
          'requestId',
          'deliveryRevisionId',
          'artifactId',
          'artifactOrdinal',
          'attestationVersion',
          'replayed',
          'attestedAt',
        ],
        'Artifact attestation receipt',
      )
      uuid(row.attestationReceiptId, 'attestationReceiptId')
      if (
        uuid(row.requestId, 'requestId') !== binding.requestId ||
        uuid(row.deliveryRevisionId, 'deliveryRevisionId') !== binding.deliveryRevisionId ||
        uuid(row.artifactId, 'artifactId') !== binding.artifactId ||
        row.artifactOrdinal !== binding.artifactOrdinal
      ) {
        throw new RequestContractError('Artifact attestation receipt binding is inconsistent.')
      }
      boundedInteger(row.attestationVersion, 'attestationVersion', 1, 10_000)
      if (typeof row.replayed !== 'boolean') {
        throw new RequestContractError('Artifact attestation replay flag is invalid.')
      }
      timestamp(row.attestedAt, 'attestedAt')
      return row as unknown as RequestStagedArtifactAttestationReceiptV1
    },

    async sealDeliveryRevision(input) {
      validateUuid(input.requestId, 'Request id')
      validateUuid(input.deliveryRevisionId, 'Delivery revision id')
      validateUuid(input.preparationReceiptId, 'Preparation receipt id')
      validateIdempotencyKey(input.idempotencyKey)
      if (!Array.isArray(input.artifacts) || input.artifacts.length < 1 || input.artifacts.length > 5) {
        throw new RequestContractError('Seal requires 1-5 attested artifacts.')
      }
      input.artifacts.forEach((artifact, index) => {
        if (artifact.artifactOrdinal !== index + 1) {
          throw new RequestContractError('Sealed artifacts must be ordinal-sorted and contiguous.')
        }
        validateUuid(artifact.artifactId, 'Artifact id')
      })
      const { data, error } = await serviceRoleClient.rpc(
        REQUEST_SERVER_RPC.sealDeliveryRevision,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_request_id: input.requestId,
          p_delivery_revision_id: input.deliveryRevisionId,
          p_preparation_receipt_id: input.preparationReceiptId,
          p_idempotency_key: input.idempotencyKey,
          p_artifacts: input.artifacts.map((artifact) => ({
            artifact_ordinal: artifact.artifactOrdinal,
            artifact_id: artifact.artifactId,
          })),
        },
      )
      if (error) throw new RequestAuthorityError(error)
      const row = strictRecord(
        data,
        [
          'sealReceiptId',
          'requestId',
          'deliveryRevisionId',
          'manifestDigest',
          'manifestContractVersion',
          'policyVersion',
          'artifactCount',
          'totalBytes',
          'replayed',
          'sealedAt',
        ],
        'Delivery revision seal receipt',
      )
      uuid(row.sealReceiptId, 'sealReceiptId')
      if (
        uuid(row.requestId, 'requestId') !== input.requestId ||
        uuid(row.deliveryRevisionId, 'deliveryRevisionId') !== input.deliveryRevisionId
      ) {
        throw new RequestContractError('Delivery seal receipt binding is inconsistent.')
      }
      sha256(row.manifestDigest, 'manifestDigest')
      if (
        row.manifestContractVersion !== REQUEST_DELIVERY_MANIFEST_VERSION ||
        row.policyVersion !== REQUEST_DELIVERY_POLICY_VERSION
      ) {
        throw new RequestContractError('Delivery seal manifest contract is invalid.')
      }
      if (
        boundedInteger(row.artifactCount, 'artifactCount', 1, 5) !== input.artifacts.length
      ) {
        throw new RequestContractError('Delivery seal artifact count is inconsistent.')
      }
      boundedInteger(row.totalBytes, 'totalBytes', 1, 12_000_000)
      if (typeof row.replayed !== 'boolean') {
        throw new RequestContractError('Delivery seal replay flag is invalid.')
      }
      timestamp(row.sealedAt, 'sealedAt')
      return row as unknown as RequestDeliveryRevisionSealReceiptV1
    },
  }
}

export function parseRequestDeliveryArtifactCleanupAuthorityV1(
  value: unknown,
): RequestDeliveryArtifactCleanupAuthorityV1 {
  const row = strictRecord(
    value,
    [
      'requestId',
      'deliveryRevisionId',
      'artifactId',
      'objectIdentity',
      'sha256',
      'byteLength',
      'detectedMediaType',
      'custodyState',
      'retentionState',
      'accessUntil',
    ],
    'Delivery artifact cleanup authority',
  )
  uuid(row.requestId, 'cleanup requestId')
  uuid(row.deliveryRevisionId, 'cleanup deliveryRevisionId')
  uuid(row.artifactId, 'cleanup artifactId')
  boundedText(row.objectIdentity, 'cleanup objectIdentity', 1_000, 1)
  if (/[\r\n\0]/.test(row.objectIdentity as string)) {
    throw new RequestContractError('Cleanup object identity is invalid.')
  }
  sha256(row.sha256, 'cleanup sha256')
  boundedInteger(row.byteLength, 'cleanup byteLength', 1, 4_000_000)
  if (!isOneOf(row.detectedMediaType, DELIVERY_MEDIA_TYPES)) {
    throw new RequestContractError('Cleanup media type is invalid.')
  }
  if (!['staged', 'attested', 'abandoned'].includes(row.custodyState as string)) {
    throw new RequestContractError('Cleanup custody state is invalid.')
  }
  parseArtifactRetentionAuthority(row, 'Delivery artifact cleanup')
  return row as unknown as RequestDeliveryArtifactCleanupAuthorityV1
}

/**
 * Construct only with a trusted server-side service-role client. This resolver
 * is the complete cleanup authority for uploaded-unattested, attested, and
 * abandoned artifacts across every revision, moderation, and terminal state.
 *
 * It intentionally returns staging object identity even when participant
 * reading is forbidden. Its result can drive custody cleanup or preservation
 * only; it must never be used to infer participant readability, produce a
 * reader response, or enter browser props, actions, logs, or analytics.
 */
export function createRequestDeliveryArtifactCleanupResolver(
  serviceRoleClient: RequestRpcClient,
): RequestDeliveryArtifactCleanupResolver {
  return {
    async resolveDeliveryArtifactCleanup(input) {
      strictRecord(
        input,
        ['requestId', 'deliveryRevisionId', 'artifactId'],
        'Delivery artifact cleanup request',
      )
      validateUuid(input.requestId, 'Cleanup request id')
      validateUuid(input.deliveryRevisionId, 'Cleanup delivery revision id')
      validateUuid(input.artifactId, 'Cleanup artifact id')
      const result = await invokeRead(
        serviceRoleClient,
        REQUEST_SERVER_RPC.resolveDeliveryArtifactCleanup,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_request_id: input.requestId,
          p_delivery_revision_id: input.deliveryRevisionId,
          p_artifact_id: input.artifactId,
        },
        parseRequestDeliveryArtifactCleanupAuthorityV1,
      )
      if (
        result.requestId !== input.requestId ||
        result.deliveryRevisionId !== input.deliveryRevisionId ||
        result.artifactId !== input.artifactId
      ) {
        throw new RequestContractError(
          'Delivery artifact cleanup binding is inconsistent.',
        )
      }
      return result
    },
  }
}

function parseRetireBuildRequestDeliveryRevisionReceiptV1(
  value: unknown,
): RetireBuildRequestDeliveryRevisionReceiptV1 {
  const row = strictRecord(
    value,
    [
      'requestId',
      'deliveryRevisionId',
      'revisionState',
      'retiredAt',
      'replayed',
    ],
    'Build Request delivery revision retirement receipt',
  )
  uuid(row.requestId, 'Retired Request id')
  uuid(row.deliveryRevisionId, 'Retired delivery revision id')
  if (row.revisionState !== 'abandoned' || typeof row.replayed !== 'boolean') {
    throw new RequestContractError(
      'Delivery revision retirement receipt state is invalid.',
    )
  }
  timestamp(row.retiredAt, 'Delivery revision retiredAt')
  return row as unknown as RetireBuildRequestDeliveryRevisionReceiptV1
}

/**
 * Service-role-only terminal WIP retirement seam. It abandons an unsubmitted
 * staging/prepared/sealed revision after the case authority has terminalized.
 * Artifact object cleanup remains a separate cleanup-resolver responsibility.
 *
 * This is not a participant command or capability and exposes no object
 * identity, manifest digest, actor override, or browser-readable authority.
 */
export function createRequestDeliveryRevisionRetirementService(
  serviceRoleClient: RequestRpcClient,
): RequestDeliveryRevisionRetirementService {
  return {
    async retireBuildRequestDeliveryRevision(input) {
      strictRecord(
        input,
        [
          'requestId',
          'deliveryRevisionId',
          'expectedVersion',
          'idempotencyKey',
        ],
        'Build Request delivery revision retirement',
      )
      validateUuid(input.requestId, 'Retirement request id')
      validateUuid(input.deliveryRevisionId, 'Retirement delivery revision id')
      if (
        !Number.isSafeInteger(input.expectedVersion) ||
        input.expectedVersion < 0 ||
        input.expectedVersion > 10_000_000
      ) {
        throw new RequestContractError(
          'Retirement expected request version is invalid.',
        )
      }
      validateIdempotencyKey(input.idempotencyKey)
      const result = await invokeRead(
        serviceRoleClient,
        REQUEST_SERVER_RPC.retireDeliveryRevision,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_request_id: input.requestId,
          p_delivery_revision_id: input.deliveryRevisionId,
          p_expected_version: input.expectedVersion,
          p_idempotency_key: input.idempotencyKey,
        },
        parseRetireBuildRequestDeliveryRevisionReceiptV1,
      )
      if (
        result.requestId !== input.requestId ||
        result.deliveryRevisionId !== input.deliveryRevisionId
      ) {
        throw new RequestContractError(
          'Delivery revision retirement binding is inconsistent.',
        )
      }
      return result
    },
  }
}

function parseExpireBuildRequestAuditTombstoneReceiptV1(
  value: unknown,
): ExpireBuildRequestAuditTombstoneReceiptV1 {
  const row = strictRecord(
    value,
    [
      'contractVersion',
      'requestId',
      'cleaned',
      'replayed',
      'aggregateDigest',
      'occurredAt',
    ],
    'Request audit tombstone expiry receipt',
  )
  if (row.contractVersion !== REQUEST_CONTRACT_VERSION) {
    throw new RequestContractError(
      'Request audit tombstone expiry receipt version is invalid.',
    )
  }
  uuid(row.requestId, 'Request audit tombstone request id')
  if (typeof row.cleaned !== 'boolean' || typeof row.replayed !== 'boolean') {
    throw new RequestContractError(
      'Request audit tombstone expiry receipt state is invalid.',
    )
  }
  if (
    typeof row.aggregateDigest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(row.aggregateDigest)
  ) {
    throw new RequestContractError(
      'Request audit tombstone aggregate digest is invalid.',
    )
  }
  timestamp(row.occurredAt, 'Request audit tombstone occurredAt')
  return row as unknown as ExpireBuildRequestAuditTombstoneReceiptV1
}

/**
 * Service-role-only final tombstone cleanup adapter. This does not install a
 * scheduler and does not authorize production execution.
 *
 * The database must fail closed unless artifact/object cleanup and raw-text
 * cleanup are complete, the immutable audit deadline is at least 400 days
 * past terminalization, and no retention hold remains active.
 */
export function createRequestAuditTombstoneCleanupService(
  serviceRoleClient: RequestRpcClient,
): RequestAuditTombstoneCleanupService {
  return {
    async expireBuildRequestAuditTombstone(input) {
      strictRecord(
        input,
        ['requestId', 'idempotencyKey'],
        'Request audit tombstone expiry',
      )
      validateUuid(input.requestId, 'Request audit tombstone request id')
      validateIdempotencyKey(input.idempotencyKey)
      const result = await invokeRead(
        serviceRoleClient,
        REQUEST_SERVER_RPC.expireAuditTombstone,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_request_id: input.requestId,
          p_idempotency_key: input.idempotencyKey,
        },
        parseExpireBuildRequestAuditTombstoneReceiptV1,
      )
      if (result.requestId !== input.requestId) {
        throw new RequestContractError(
          'Request audit tombstone expiry binding is inconsistent.',
        )
      }
      return result
    },
  }
}

function parseExpireRequestAccountDeidentificationReceiptV1(
  value: unknown,
): ExpireRequestAccountDeidentificationReceiptReceiptV1 {
  const row = strictRecord(
    value,
    ['contractVersion', 'receiptId', 'expired', 'occurredAt'],
    'Request account deidentification receipt expiry',
  )
  if (row.contractVersion !== REQUEST_CONTRACT_VERSION) {
    throw new RequestContractError(
      'Request account deidentification receipt expiry version is invalid.',
    )
  }
  uuid(row.receiptId, 'Request account deidentification receipt id')
  if (typeof row.expired !== 'boolean') {
    throw new RequestContractError(
      'Request account deidentification receipt expiry state is invalid.',
    )
  }
  timestamp(row.occurredAt, 'Request account deidentification receipt expiry occurredAt')
  return row as unknown as ExpireRequestAccountDeidentificationReceiptReceiptV1
}

/**
 * Service-role-only retention seam for the account-scoped deidentification
 * receipt. It is intentionally separate from participant and case APIs so no
 * account identifier, account digest, or deletion evidence enters public
 * types. The database owns retention/hold eligibility and may return
 * expired=false when cleanup is not authorized or was already completed.
 */
export function createRequestAccountDeidentificationReceiptCleanupService(
  serviceRoleClient: RequestRpcClient,
): RequestAccountDeidentificationReceiptCleanupService {
  return {
    async expireRequestAccountDeidentificationReceipt(input) {
      strictRecord(
        input,
        ['receiptId'],
        'Request account deidentification receipt cleanup',
      )
      validateUuid(input.receiptId, 'Request account deidentification receipt id')
      const result = await invokeRead(
        serviceRoleClient,
        REQUEST_SERVER_RPC.expireAccountDeidentificationReceipt,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_receipt_id: input.receiptId,
        },
        parseExpireRequestAccountDeidentificationReceiptV1,
      )
      if (result.receiptId !== input.receiptId) {
        throw new RequestContractError(
          'Request account deidentification receipt cleanup binding is inconsistent.',
        )
      }
      return result
    },
  }
}

/**
 * Construct only with a server-side admin/service-role client. Database grants
 * remain the authority that rejects participant sessions. This resolver is a
 * cleanup/custody primitive, not a reader authorization check: its
 * retentionState drives trusted cleanup policy and never browser access.
 *
 * Any participant reader route must first require a `ready` result from the
 * authenticated participant resolver. Do not fall back to this resolver when
 * that result is unavailable, including held, removed, withdrawn, closed, or
 * expired cases.
 */
export function createRequestDeliveryArtifactObjectResolver(
  serviceRoleClient: RequestRpcClient,
): RequestDeliveryArtifactObjectResolver {
  return {
    async resolveDeliveryArtifactObject(input) {
      strictRecord(
        input,
        ['deliveryRevisionId', 'artifactId'],
        'Artifact object resolution request',
      )
      validateUuid(input.artifactId, 'Artifact id')
      validateUuid(input.deliveryRevisionId, 'Delivery revision id')

      const result = await invokeRead<RequestDeliveryArtifactObjectV1>(
        serviceRoleClient,
        REQUEST_SERVER_RPC.resolveDeliveryArtifactObject,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_artifact_id: input.artifactId,
          p_delivery_revision_id: input.deliveryRevisionId,
        },
        (value) => {
          const row = strictRecord(
            value,
            [
              'artifactId',
              'deliveryRevisionId',
              'manifestDigest',
              'objectIdentity',
              'retentionState',
              'accessUntil',
            ],
            'Artifact object resolution',
          )
          uuid(row.artifactId, 'artifactId')
          uuid(row.deliveryRevisionId, 'deliveryRevisionId')
          sha256(row.manifestDigest, 'manifestDigest')
          parseArtifactRetentionAuthority(row, 'Artifact object resolution')
          return row as unknown as RequestDeliveryArtifactObjectV1
        },
      )
      if (
        result.artifactId !== input.artifactId ||
        result.deliveryRevisionId !== input.deliveryRevisionId ||
        typeof result.objectIdentity !== 'string' ||
        result.objectIdentity.length < 1 ||
        result.objectIdentity.length > 1_000 ||
        /[\r\n\0]/.test(result.objectIdentity)
      ) {
        throw new RequestContractError('Object resolver returned an invalid bound identity.')
      }
      return result
    },
  }
}

export function createRequestApplicationService(
  client: RequestRpcClient,
): RequestApplicationService {
  return {
    getAvailability() {
      return invokeRead<RequestAvailabilityV1>(
        client,
        REQUEST_RPC.availability,
        { p_contract_version: REQUEST_CONTRACT_VERSION },
        parseRequestAvailabilityV1,
      )
    },

    listMyRequests(query) {
      return invokeRead<RequestPageV1<RequestCaseSummary>>(
        client,
        REQUEST_RPC.listMine,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          ...validateListQuery(query),
        },
        parseRequestPageV1,
      )
    },

    listAssignedQueue(query) {
      if (!query || !['admin', 'triager', 'builder', 'reviewer'].includes(query.scope)) {
        throw new RequestContractError('Assigned queue scope is invalid.')
      }
      strictRecord(query, ['scope', 'cursor', 'limit'], 'Assigned queue query')
      return invokeRead<RequestPageV1<RequestQueueSummaryV1>>(
        client,
        REQUEST_RPC.listAssignedQueue,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          ...validateListQuery(query),
          p_scope: query.scope,
        },
        (value) => parseRequestAssignedQueuePageV1(value, query.scope),
      )
    },

    listEligibleAssignees(query) {
      strictRecord(
        query,
        ['requestId', 'role', 'query', 'cursor', 'limit'],
        'Eligible assignee query',
      )
      validateUuid(query.requestId, 'Request id')
      if (
        query.role !== 'triager' &&
        query.role !== 'builder' &&
        query.role !== 'reviewer'
      ) {
        throw new RequestContractError('Eligible assignee role is invalid.')
      }
      const normalizedSearch =
        query.query === undefined ? undefined : query.query.trim()
      if (normalizedSearch !== undefined) {
        safeProjectedText(normalizedSearch, 'Eligible assignee search', 80)
      }
      const limit = query.limit ?? 20
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
        throw new RequestContractError('Eligible assignee limit must be from 1 to 50.')
      }
      if (
        query.cursor !== undefined &&
        !REQUEST_CURSOR_PATTERN.test(query.cursor)
      ) {
        throw new RequestContractError('Eligible assignee cursor is invalid.')
      }
      return invokeRead<RequestPageV1<RequestEligibleAssigneeV1>>(
        client,
        REQUEST_RPC.listEligibleAssignees,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_request_id: query.requestId,
          p_assignment_role: query.role,
          p_query: normalizedSearch || null,
          p_cursor: query.cursor ?? null,
          p_limit: limit,
        },
        parseRequestEligibleAssigneePageV1,
      )
    },

    getRequest(id) {
      validateUuid(id, 'Request id')
      return invokeRead<RequestCaseDetailResultV1>(
        client,
        REQUEST_RPC.getRequest,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_request_id: id,
        },
        parseRequestCaseDetailResultV1,
      )
    },

    listRequestEvents(query) {
      strictRecord(query, ['requestId', 'cursor', 'limit'], 'Request event query')
      validateUuid(query.requestId, 'Request id')
      const limit = query.limit ?? 50
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 50) {
        throw new RequestContractError('Request event limit must be from 1 to 50.')
      }
      if (
        query.cursor !== undefined &&
        !REQUEST_EVENT_CURSOR_PATTERN.test(query.cursor)
      ) {
        throw new RequestContractError('Request event cursor is invalid.')
      }
      return invokeRead<RequestEventPageV1>(
        client,
        REQUEST_RPC.listRequestEvents,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_request_id: query.requestId,
          p_cursor: query.cursor ?? null,
          p_limit: limit,
        },
        parseRequestEventPageV1,
      )
    },

    async acknowledgeRequestUpdates(input) {
      strictRecord(
        input,
        ['requestId', 'expectedEventSequence', 'idempotencyKey'],
        'Request updates acknowledgement',
      )
      validateUuid(input.requestId, 'Request id')
      if (
        !Number.isSafeInteger(input.expectedEventSequence) ||
        input.expectedEventSequence < 0
      ) {
        throw new RequestContractError('Expected event sequence is invalid.')
      }
      validateIdempotencyKey(input.idempotencyKey)
      const { data, error } = await client.rpc(REQUEST_RPC.acknowledgeUpdates, {
        p_contract_version: REQUEST_CONTRACT_VERSION,
        p_request_id: input.requestId,
        p_expected_event_sequence: input.expectedEventSequence,
        p_idempotency_key: input.idempotencyKey,
      })
      if (error) throw new RequestAuthorityError(error)
      return parseRequestUnreadStateV1(data)
    },

    async resolveDeliveryArtifactReader(deliveryArtifactId) {
      validateUuid(deliveryArtifactId, 'Delivery artifact id')
      const { data, error } = await client.rpc(REQUEST_RPC.resolveDeliveryArtifactReader, {
        p_contract_version: REQUEST_CONTRACT_VERSION,
        p_delivery_artifact_id: deliveryArtifactId,
      })
      if (error) {
        const match =
          typeof error.details === 'string'
            ? /^request_authority:(unauthenticated|not_found|stale_revision|held|removed|withdrawn|closed)$/.exec(
                error.details,
              )
            : null
        if (match) {
          return {
            status: 'unavailable',
            reason: match[1] as Extract<
              RequestDeliveryArtifactReaderResultV1,
              { status: 'unavailable' }
            >['reason'],
          }
        }
        throw new RequestAuthorityError(error)
      }
      return parseRequestDeliveryArtifactReaderResultV1(data)
    },

    async updateControls(input) {
      const valid = validateRequestControlsUpdateInputV1(input)
      const { data, error } = await client.rpc(REQUEST_RPC.updateControls, {
        p_contract_version: REQUEST_CONTRACT_VERSION,
        p_expected_controls_version: valid.expectedControlsVersion,
        p_idempotency_key: valid.idempotencyKey,
        p_accepting_requests: valid.acceptingRequests,
        p_assigning_requests: valid.assigningRequests,
        p_active_case_capacity: valid.activeCaseCapacity,
      })
      if (error) throw new RequestAuthorityError(error)
      return parseControlsReceipt(data)
    },

    async inviteRequestPilotParticipant(input) {
      const valid = validatePilotAdmissionInput(input, true) as InviteRequestPilotParticipantInputV1
      return invokeRead(
        client,
        REQUEST_RPC.setPilotAdmission,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_account_id: valid.accountId,
          p_expected_admission_version: valid.expectedAdmissionVersion,
          p_idempotency_key: valid.idempotencyKey,
          p_admitted: true,
          p_reason: valid.reason.trim(),
          p_expires_at: valid.expiresAt,
        },
        parsePilotAdmissionReceipt,
      )
    },

    async revokeRequestPilotParticipant(input) {
      const valid = validatePilotAdmissionInput(input, false)
      return invokeRead(
        client,
        REQUEST_RPC.setPilotAdmission,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_account_id: valid.accountId,
          p_expected_admission_version: valid.expectedAdmissionVersion,
          p_idempotency_key: valid.idempotencyKey,
          p_admitted: false,
          p_reason: valid.reason.trim(),
          p_expires_at: null,
        },
        parsePilotAdmissionReceipt,
      )
    },

    async listPilotAdmissionCandidates(query = {}) {
      strictRecord(
        query,
        ['query', 'cursor', 'limit'],
        'Pilot admission candidate query',
      )
      const search = query.query?.trim() ?? ''
      if (search.length > 80 || /[\0\r\n]/.test(search)) {
        throw new RequestContractError(
          'Pilot admission candidate query is invalid.',
        )
      }
      return invokeRead(
        client,
        REQUEST_RPC.listPilotAdmissions,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_query: search,
          ...validateListQuery(query),
        },
        parseRequestPilotAdmissionCandidatePageV1,
      )
    },

    async deidentifyRequestAccount(input) {
      strictRecord(
        input,
        ['accountId', 'idempotencyKey'],
        'Request account deidentification',
      )
      validateUuid(input.accountId, 'Request account id')
      validateIdempotencyKey(input.idempotencyKey)
      return invokeRead(
        client,
        REQUEST_RPC.deidentifyAccount,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_account_id: input.accountId,
          p_idempotency_key: input.idempotencyKey,
        },
        parseDeidentifyRequestAccountReceipt,
      )
    },

    async createRequest(input) {
      const valid = validateSubmitBuildRequestV1(input)
      return invoke(client, REQUEST_RPC.submit, {
        p_contract_version: valid.contractVersion,
        p_idempotency_key: valid.idempotencyKey,
        p_brief: {
          title: valid.brief.title.trim(),
          outcome: valid.brief.outcome.trim(),
          intended_user: valid.brief.intendedUser.trim(),
          constraints: valid.brief.constraints.trim(),
          must_work_scenario: valid.brief.mustWorkScenario.trim(),
          acceptance_checks: valid.brief.acceptanceChecks.map((check) => check.trim()),
          pathforge_reference: valid.brief.pathforgeReference
            ? serializePathForgeReference(valid.brief.pathforgeReference)
            : null,
        },
      })
    },

    async executeCommand(command) {
      const valid = validateRequestCommandV1(command)
      return invoke(client, REQUEST_RPC.command, {
        p_contract_version: valid.contractVersion,
        p_request_id: valid.requestId,
        p_expected_version: valid.expectedVersion,
        p_idempotency_key: valid.idempotencyKey,
        p_command: valid.kind,
        p_payload:
          valid.kind === 'close'
            ? valid.payload.reason === 'duplicate'
              ? { reason: 'duplicate' }
              : {
                  reason: valid.payload.reason,
                  note: (
                    'note' in valid.payload ? valid.payload.note : ''
                  ).trim(),
                  ...(valid.payload.reason === 'existing_resolution'
                    ? { resolutionReference: valid.payload.resolutionReference }
                    : {}),
                }
            : valid.kind === 'submit_delivery' || valid.kind === 'resubmit_delivery'
              ? serializeDeliveryRevisionSubmission(valid.payload)
              : valid.kind === 'request_clarification'
                ? { question: valid.payload.question.trim() }
                : valid.kind === 'submit_clarification'
                  ? {
                      clarificationId: valid.payload.clarificationId,
                      answer: valid.payload.answer.trim(),
                    }
                  : valid.kind === 'withdraw' ||
                      valid.kind === 'place_moderation_hold' ||
                      valid.kind === 'remove_for_moderation'
                    ? { reason: valid.payload.reason.trim() }
                    : valid.kind === 'release_moderation_hold'
                      ? { resolution: valid.payload.resolution.trim() }
              : valid.kind === 'reassign_triager'
                ? {
                    triagerId: valid.payload.triagerId,
                    reason: valid.payload.reason.trim(),
                  }
                : valid.kind === 'reassign_builder'
                ? {
                    builderId: valid.payload.builderId,
                    reason: valid.payload.reason.trim(),
                  }
                : valid.kind === 'reassign_reviewer'
                  ? {
                      reviewerId: valid.payload.reviewerId,
                      reason: valid.payload.reason.trim(),
                    }
              : valid.kind === 'prepare_delivery_revision'
                ? serializeDeliveryRevisionPreparation(valid.payload)
                : valid.kind === 'stage_delivery_artifact'
                  ? serializeStageDeliveryArtifact(valid.payload)
                  : valid.kind === 'approve_delivery' ||
                      valid.kind === 'request_repair' ||
                      valid.kind === 'requester_delivery_outcome'
                    ? serializeManifestBoundDecision(valid)
            : valid.payload,
      })
    },
  }
}
