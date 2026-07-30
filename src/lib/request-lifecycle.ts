/**
 * Versioned Request a Build application contract.
 *
 * These types deliberately describe commands, not database rows. Callers never
 * supply the acting user: the database command functions derive auth.uid().
 */
export const REQUEST_CONTRACT_VERSION = 1 as const
/**
 * Initial submitted delivery plus one submitted repair revision.
 * Active staging/prepared/sealed workspace does not consume this cap.
 */
export const REQUEST_MAX_DELIVERY_REVISIONS = 2 as const
export const REQUEST_MAX_ARTIFACT_STAGING_ATTEMPTS_PER_REVISION = 8 as const
export const REQUEST_MAX_ATTEMPTED_ARTIFACT_BYTES_PER_REVISION =
  24_000_000 as const
export const REQUEST_MAX_ASSIGNMENT_HISTORY = 20 as const

export const REQUEST_LIFECYCLE_STATES = [
  'submitted',
  'triage',
  'clarification_requested',
  'accepted',
  'building',
  'review_pending',
  'repair_required',
  'delivery_ready',
  'delivered',
  'completed',
  'closed',
] as const
export type RequestLifecycleState = (typeof REQUEST_LIFECYCLE_STATES)[number]

export const REQUEST_MODERATION_STATES = ['clear', 'held', 'removed'] as const
export type RequestModerationState = (typeof REQUEST_MODERATION_STATES)[number]

export const REQUEST_PUBLICATION_STATES = [
  'private',
  'consent_pending',
  'consented_pending_airlock',
  'published',
  'withdrawn',
] as const
export type RequestPublicationState = (typeof REQUEST_PUBLICATION_STATES)[number]

export const REQUEST_ACTOR_ROLES = [
  'requester',
  'triager',
  'builder',
  'reviewer',
  'system',
] as const
export type RequestActorRole = (typeof REQUEST_ACTOR_ROLES)[number]
export type RequestEventActorRoleV1 = RequestActorRole | 'operator'

export const REQUEST_CLOSE_REASONS = [
  'existing_resolution',
  'duplicate',
  'out_of_scope',
  'capacity_unavailable',
  'declined',
  'withdrawn',
  'expired',
  'failed_review',
  'safety_removed',
  'no_response',
] as const
export type RequestCloseReason = (typeof REQUEST_CLOSE_REASONS)[number]

export type RequestAcceptanceChecks =
  | readonly [string]
  | readonly [string, string]
  | readonly [string, string, string]

export type PathForgeRequestReference =
  | { kind: 'project'; projectId: string }
  | {
      kind: 'response'
      projectId: string
      modelVariantId: string
      responseStepNumber: number
    }

export type CreateRequestBriefInputV1 = {
  title: string
  outcome: string
  intendedUser: string
  mustWorkScenario: string
  acceptanceChecks: RequestAcceptanceChecks
  constraints: string
  pathforgeReference?: PathForgeRequestReference
}

export type RequestAcceptanceCheckV1 = {
  acceptanceCheckId: string
  ordinal: number
  text: string
}

export type RequestBriefV1 = Omit<
  CreateRequestBriefInputV1,
  'acceptanceChecks' | 'pathforgeReference'
> & {
  acceptanceChecks: RequestAcceptanceCheckV1[]
  pathforgeReference: PathForgeRequestReference | null
}

export type SubmitBuildRequestV1 = {
  contractVersion: typeof REQUEST_CONTRACT_VERSION
  idempotencyKey: string
  brief: CreateRequestBriefInputV1
}
export type CreateRequestInput = SubmitBuildRequestV1

type CommandBase<Kind extends string, Payload> = {
  contractVersion: typeof REQUEST_CONTRACT_VERSION
  kind: Kind
  requestId: string
  expectedVersion: number
  idempotencyKey: string
  payload: Payload
}

export type DeliveryRevisionPreparationV1 = {
  deliveryRevisionId: string
  acceptedBriefRevisionId: string
  activeBuilderAssignmentId: string
  revisionLabel: string
  summary: string
  builderEvidence: readonly RequestBuilderEvidenceV1[]
  approvedPathForgeReference?: PathForgeRequestReference
}

export type DeliveryRevisionSubmissionV1 = {
  deliveryRevisionId: string
  sealReceiptId: string
}

export type RequestBuilderEvidenceV1 = {
  acceptanceCheckId: string
  result: 'pass' | 'fail' | 'not_run'
  evidenceText: string | null
  evidenceRef: string | null
}

export const DELIVERY_MEDIA_TYPES = [
  'text/html',
  'text/markdown',
  'text/plain',
  'application/json',
  'text/csv',
  'image/png',
  'image/jpeg',
] as const
export type DeliveryMediaType = (typeof DELIVERY_MEDIA_TYPES)[number]
export type DeliveryScanVerdict = 'clean' | 'rejected' | 'held'

export type StageDeliveryArtifactPayloadV1 = {
  deliveryRevisionId: string
  acceptedBriefRevisionId: string
  activeBuilderAssignmentId: string
  artifactOrdinal: number
  clientFileId: string
  normalizedName: string
  byteLength: number
  sha256: string
  detectedMediaType: DeliveryMediaType
  scannerVersion: string
}

export type DeliveryReviewCheckV1 = {
  acceptanceCheckId: string
  result: 'pass' | 'fail'
  evidenceRef: string | null
}

export type RequestCommandV1 =
  | CommandBase<'begin_triage', Record<string, never>>
  | CommandBase<'request_clarification', { question: string }>
  | CommandBase<'submit_clarification', { clarificationId: string; answer: string }>
  | CommandBase<'accept', { builderId: string; targetDate: string }>
  | CommandBase<'assign_reviewer', { reviewerId: string }>
  | CommandBase<'reassign_triager', { triagerId: string; reason: string }>
  | CommandBase<'reassign_builder', { builderId: string; reason: string }>
  | CommandBase<'reassign_reviewer', { reviewerId: string; reason: string }>
  | CommandBase<'start_build', Record<string, never>>
  | CommandBase<'prepare_delivery_revision', DeliveryRevisionPreparationV1>
  | CommandBase<'stage_delivery_artifact', StageDeliveryArtifactPayloadV1>
  | CommandBase<'abandon_delivery_artifact', {
      deliveryRevisionId: string
      artifactId: string
    }>
  | CommandBase<'submit_delivery', DeliveryRevisionSubmissionV1>
  | CommandBase<'resubmit_delivery', DeliveryRevisionSubmissionV1>
  | CommandBase<'approve_delivery', {
      deliveryRevisionId: string
      manifestDigest: string
      checklistVersion: number
      checks: readonly DeliveryReviewCheckV1[]
      safetyIntegrityResult: 'pass'
      reviewNotes: string
    }>
  | CommandBase<'request_repair', {
      deliveryRevisionId: string
      manifestDigest: string
      checklistVersion: number
      checks: readonly DeliveryReviewCheckV1[]
      safetyIntegrityResult: 'pass' | 'fail'
      reason: string
      repairInstructions: string
    }>
  | CommandBase<'requester_delivery_outcome', {
      deliveryRevisionId: string
      manifestDigest: string
      outcome: 'useful'
    } | {
      deliveryRevisionId: string
      manifestDigest: string
      outcome: 'failed_acceptance_check'
      failedAcceptanceCheckId: string
      reason: string
    }>
  | CommandBase<'acknowledge_delivery', { deliveryRevisionId: string }>
  | CommandBase<'close', {
      reason: 'existing_resolution'
      resolutionReference: PathForgeRequestReference
      note: string
    }>
  | CommandBase<'close', {
      reason: 'duplicate'
    }>
  | CommandBase<'close', {
      reason: Exclude<
        RequestCloseReason,
        | 'existing_resolution'
        | 'duplicate'
        | 'withdrawn'
        | 'no_response'
        | 'safety_removed'
        | 'failed_review'
      >
      note: string
    }>
  /**
   * Authority guarded closure only after a delivered case remains unconfirmed
   * for 14 days. Unanswered clarification expiry uses close reason `expired`.
   */
  | CommandBase<'close_no_response', Record<string, never>>
  | CommandBase<'withdraw', { reason: string }>
  | CommandBase<'place_moderation_hold', { reason: string }>
  | CommandBase<'release_moderation_hold', { resolution: string }>
  | CommandBase<'remove_for_moderation', { reason: string }>

export type RequestCommandKind = RequestCommandV1['kind']
export type RequestCapability = 'view_case' | RequestCommandKind

/**
 * Commands suppressed when assigningRequests is off. The switch blocks every
 * new active role binding, but does not pause work by already-active
 * participants.
 */
export const REQUEST_ASSIGNMENT_GATED_COMMANDS = [
  'begin_triage',
  'accept',
  'assign_reviewer',
  'reassign_triager',
  'reassign_builder',
  'reassign_reviewer',
] as const satisfies readonly RequestCommandKind[]
export type StageDeliveryArtifactCommandV1 = Extract<
  RequestCommandV1,
  { kind: 'stage_delivery_artifact' }
>
export type AbandonDeliveryArtifactCommandV1 = Extract<
  RequestCommandV1,
  { kind: 'abandon_delivery_artifact' }
>
export type SubmitDeliveryCommandV1 = Extract<RequestCommandV1, { kind: 'submit_delivery' }>
export type ResubmitDeliveryCommandV1 = Extract<RequestCommandV1, { kind: 'resubmit_delivery' }>
export type ApproveDeliveryCommandV1 = Extract<RequestCommandV1, { kind: 'approve_delivery' }>
export type RequestRepairCommandV1 = Extract<RequestCommandV1, { kind: 'request_repair' }>

export type RequestCommandReceipt = {
  contractVersion: typeof REQUEST_CONTRACT_VERSION
  commandId: string
  requestId: string
  requestVersion: number
  eventId: string
  lifecycleState: RequestLifecycleState
  moderationState: RequestModerationState
  publicationState: RequestPublicationState
  closeReason: RequestCloseReason | null
  replayed: boolean
  occurredAt: string
  authorityResult?: RequestAuthorityResultV1
}

export type RequestAuthorityResultV1 =
  Partial<{
    clarificationId: string
    assignmentId: string
    deliveryRevisionId: string
    artifactId: string
  }> &
  Partial<{
    evidenceChecklistVersion: number
    rightsSnapshotVersion: number
  }>

export type RequestParticipantCommandV1 = RequestCommandV1

export type RequestUnreadStateV1 = {
  /** Count of participant-visible events after lastReadEventSequence. */
  unreadCount: number
  /** Ledger sequence of the newest participant-visible event; hidden gaps are expected. */
  latestEventSequence: number
  /** Visible ledger sequence boundary, not a count of events read. */
  lastReadEventSequence: number | null
}

export type RequestAcknowledgeUpdatesInputV1 = {
  requestId: string
  expectedEventSequence: number
  idempotencyKey: string
}

export type RequestNextActionV1 = {
  kind: RequestCapability
  label: string
  requiresConfirmation: boolean
}

export type RequestCaseSummary = {
  contractVersion: typeof REQUEST_CONTRACT_VERSION
  requestId: string
  requestVersion: number
  lifecycleState: RequestLifecycleState
  moderationState: RequestModerationState
  publicationState: RequestPublicationState
  closeReason: RequestCloseReason | null
  resolutionReference: PathForgeRequestReference | null
  title: string
  activeActorRoles: RequestActorRole[]
  nextActions: RequestNextActionV1[]
  unread: RequestUnreadStateV1
  submittedAt: string
  updatedAt: string
}

export type RequestQueueActorRole = 'admin' | 'triager' | 'builder' | 'reviewer'

export type RequestQueueSummaryV1 = RequestCaseSummary & {
  actorRole: RequestQueueActorRole
  targetDate: string | null
}

export type RequestParticipantV1 = {
  role: Exclude<RequestActorRole, 'system'>
  displayName: string
  deidentified: boolean
}

export type RequestAssignmentV1 = {
  /**
   * Historical attribution only. An inactive assignment never grants Request
   * scope; access derives from current requester/admin authority or an active
   * assignment.
   */
  assignmentId: string
  role: 'builder' | 'reviewer'
  assignee: {
    displayName: string
    deidentified: boolean
  }
  active: boolean
  assignedAt: string
  endedAt: string | null
}

export type RequestClarificationV1 = {
  clarificationId: string
  sequence: number
  question: string
  answer: string | null
  requestedAt: string
  answeredAt: string | null
}

export type RequestDeliveryRevisionV1 = Omit<
  DeliveryRevisionPreparationV1,
  'approvedPathForgeReference'
> & {
  approvedPathForgeReference: PathForgeRequestReference | null
  sealReceiptId: string
  artifactCount: number
  totalBytes: number
  evidenceChecklistVersion: number
  rightsSnapshotVersion: number
  revisionNumber: number
  authoredBy: RequestParticipantAttributionV1
  submittedAt: string
  isCurrent: boolean
  artifacts: RequestDeliveryArtifactV1[]
  reviews: RequestDeliveryReviewV1[]
}

export type RequestParticipantAttributionV1 = {
  displayName: string
  deidentified: boolean
}

type RequestDeliveryReviewBaseV1 = {
  deliveryRevisionId: string
  checklistVersion: number
  checks: readonly DeliveryReviewCheckV1[]
  reviewer: RequestParticipantAttributionV1
  reviewedAt: string
  isCurrent: boolean
}

export type RequestDeliveryReviewV1 =
  | (RequestDeliveryReviewBaseV1 & {
      safetyIntegrityResult: 'pass'
      verdict: 'approve'
      reason: null
      reviewNotes: string
      repairInstructions: null
    })
  | (RequestDeliveryReviewBaseV1 & {
      safetyIntegrityResult: 'pass' | 'fail'
      verdict: 'repair'
      reason: string
      reviewNotes: null
      repairInstructions: string
    })

export type RequestDeliveryArtifactV1 = {
  artifactId: string
  artifactOrdinal: number
  normalizedName: string
  detectedMediaType: DeliveryMediaType
  byteLength: number
  sha256: string
  integrityStatus: 'pending' | 'verified' | 'failed'
  scanState: 'pending' | 'complete'
  scanVerdict: DeliveryScanVerdict | null
  findingCodes: string[]
  readerHref?: string
}

export type RequestRequesterOutcomeV1 =
  | {
      outcomeId: string
      deliveryRevisionId: string
      acceptedBriefRevisionId: string
      outcome: 'useful'
      acceptanceCheckId: null
      reason: null
      occurredAt: string
      isCurrent: boolean
    }
  | {
      outcomeId: string
      deliveryRevisionId: string
      acceptedBriefRevisionId: string
      outcome: 'failed_acceptance_check'
      acceptanceCheckId: string
      /**
       * Required when recorded; may become null only after raw-text purge.
       * The structured acceptanceCheckId remains immutable.
       */
      reason: string | null
      occurredAt: string
      isCurrent: boolean
    }

/**
 * Builder-only active persisted work-in-progress. V1 does not supersede active
 * workspaces during assignment recovery: builder reassignment is unavailable
 * until this projection is null. A draft that has not yet created a staging
 * revision remains client-local and is not canonical authority.
 *
 * Object-store and staging identities, manifest digests, and action bindings
 * are deliberately excluded. Those values are available only from narrow
 * server-side resolvers at the moment an authorized action is performed.
 */
export type RequestBuilderWorkspaceV1 = {
  deliveryRevisionId: string
  acceptedBriefRevisionId: string
  activeBuilderAssignmentId: string
  revisionState: 'staging' | 'prepared' | 'sealed'
  revisionLabel: string | null
  summary: string | null
  builderEvidence: readonly RequestBuilderEvidenceV1[]
  approvedPathForgeReference: PathForgeRequestReference | null
  artifacts: RequestDeliveryArtifactV1[]
  sealReceiptId: string | null
}

export type RequestDeliveryArtifactReaderV1 = {
  deliveryArtifactId: string
  deliveryRevisionId: string
  requestId: string
  normalizedName: string
  detectedMediaType: DeliveryMediaType
  byteLength: number
  sha256: string
  integrityStatus: 'verified'
  deliveryStatus:
    | 'review_pending'
    | 'delivery_ready'
    | 'delivered'
    | 'completed'
    | 'closed_no_response'
  accessUntil: string | null
  readerHref: string
}

export type RequestDeliveryArtifactReaderUnavailableReason =
  | 'unauthenticated'
  | 'not_found'
  | 'stale_revision'
  | 'held'
  | 'removed'
  | 'withdrawn'
  | 'closed'

export type RequestDeliveryArtifactReaderResultV1 =
  | { status: 'ready'; artifact: RequestDeliveryArtifactReaderV1 }
  | { status: 'unavailable'; reason: RequestDeliveryArtifactReaderUnavailableReason }

export type RequestActorContextV1 = {
  accountId: string
  roles: RequestActorRole[]
  operatorAuthority: 'none' | 'admin'
  capabilities: RequestCapability[]
  allowedCloseReasons: RequestCloseReason[]
  unreadCount: number
}

export type RequestEventAxesV1 = {
  lifecycleState: RequestLifecycleState
  moderationState: RequestModerationState
  publicationState: RequestPublicationState
  closeReason: RequestCloseReason | null
}

export type RequestEventKindV1 =
  | 'request_submitted'
  | 'triage_started'
  | 'clarification_requested'
  | 'clarification_submitted'
  | 'request_accepted'
  | 'reviewer_assigned'
  | 'triager_reassigned'
  | 'builder_reassigned'
  | 'reviewer_reassigned'
  | 'build_started'
  | 'delivery_revision_prepared'
  | 'delivery_artifact_staged'
  | 'delivery_artifact_abandoned'
  | 'delivery_submitted'
  | 'delivery_resubmitted'
  | 'delivery_approved'
  | 'delivery_repair_requested'
  | 'delivery_acknowledged'
  | 'requester_outcome_recorded'
  | 'request_closed'
  | 'request_withdrawn'
  | 'moderation_hold_placed'
  | 'moderation_hold_released'
  | 'moderation_removed'
  | 'account_deidentified'
  | 'delivery_revision_retired'

export type RequestEventV1 = {
  eventId: string
  /** Canonical ledger sequence. Participant-hidden custody events may create gaps. */
  sequence: number
  kind: RequestEventKindV1
  label: string
  actorRole: RequestEventActorRoleV1
  actor: RequestParticipantAttributionV1 | null
  occurredAt: string
  oldAxes: RequestEventAxesV1 | null
  newAxes: RequestEventAxesV1
  reason: string | null
  reference: PathForgeRequestReference | null
}

export type RequestEventPageV1 = {
  items: RequestEventV1[]
  nextCursor: RequestEventCursor | null
}

export type RequestEventCursor = string & { readonly __requestEventCursor: unique symbol }

export type RequestEventListQueryV1 = {
  requestId: string
  cursor?: RequestEventCursor
  limit?: number
}

export type RequestCaseNoticeV1 = {
  kind:
    | 'raw_content_retention'
    | 'audit_retention'
    | 'moderation_hold'
    | 'preservation_hold'
  label: string
  effectiveUntil: string | null
}

export type RequestCaseDetailV1 = RequestCaseSummary & {
  visibility: 'full'
  /** Authority-owned managed-service target date set when the case is accepted. */
  targetDate: string | null
  /**
   * Authority-projected safe closure text. After raw-text retention expires,
   * this may be server-generated generic text rather than the original human
   * note. Account-deletion withdrawal likewise uses generic safe text.
   * Structured resolutionReference remains independent and preserved for an
   * existing-resolution closure.
   */
  closureNote: string | null
  briefRevisionId: string
  brief: RequestBriefV1
  participants: RequestParticipantV1[]
  /**
   * Assignment history projected only after current Request scope is proven.
   * Historical assignees cannot use this history to retain or regain access.
   */
  assignments: RequestAssignmentV1[]
  clarifications: RequestClarificationV1[]
  deliveryRevisions: RequestDeliveryRevisionV1[]
  requesterOutcomes: RequestRequesterOutcomeV1[]
  builderWorkspace: RequestBuilderWorkspaceV1 | null
  events: RequestEventPageV1
  notices: RequestCaseNoticeV1[]
  actor: RequestActorContextV1
}

export type RequestRestrictedCaseDetailV1 = {
  visibility: 'held' | 'removed'
  contractVersion: typeof REQUEST_CONTRACT_VERSION
  requestId: string
  requestVersion: number
  lifecycleState: RequestLifecycleState
  moderationState: 'held' | 'removed'
  publicationState: RequestPublicationState
  closeReason: RequestCloseReason | null
  safeLabel: string
  unread: RequestUnreadStateV1
  submittedAt: string
  updatedAt: string
  events: RequestEventPageV1
  notices: RequestCaseNoticeV1[]
  actor: RequestActorContextV1
}

export type RequestCaseDetailResultV1 =
  | RequestCaseDetailV1
  | RequestRestrictedCaseDetailV1

export type RequestAvailabilityV1 = {
  intakeEligibility:
    | 'sign_in_required'
    | 'not_admitted'
    | 'already_active'
    | 'controls_off'
    | 'available'
  controlsVersion: number
  acceptingRequests: boolean
  /**
   * Global kill switch for all active triager/builder/reviewer role creation.
   * It does not stop work on cases with existing active assignments.
   */
  assigningRequests: boolean
  activeCaseCount: number
  activeCaseCapacity: number
  remainingCapacity: number
  unavailableReason:
    | 'controls_off'
    | 'capacity_full'
    | 'unavailable'
    | null
}

type RequestPilotAdmissionMutationBaseV1 = {
  accountId: string
  expectedAdmissionVersion: number
  idempotencyKey: string
  reason: string
}

export type InviteRequestPilotParticipantInputV1 =
  RequestPilotAdmissionMutationBaseV1 & {
    expiresAt: string | null
  }

export type RevokeRequestPilotParticipantInputV1 =
  RequestPilotAdmissionMutationBaseV1

export type RequestPilotAdmissionReceiptV1 = {
  contractVersion: typeof REQUEST_CONTRACT_VERSION
  accountId: string
  admissionVersion: number
  admitted: boolean
  expiresAt: string | null
  replayed: boolean
  occurredAt: string
}

export type RequestPilotAdmissionCandidateV1 = {
  accountId: string
  displayName: string
  /** Zero means the confirmed account has no pilot-admission record. */
  admissionVersion: number
  admitted: boolean
  expiresAt: string | null
}

export type RequestPilotAdmissionListQueryV1 = {
  query?: string
  cursor?: RequestCursor
  limit?: number
}

export type DeidentifyRequestAccountInputV1 = {
  accountId: string
  idempotencyKey: string
}

export type DeidentifyRequestAccountReceiptV1 = {
  contractVersion: typeof REQUEST_CONTRACT_VERSION
  accountId: string
  affectedCaseCount: number
  terminalizedCaseCount: number
  admissionRevoked: boolean
  replayed: boolean
  occurredAt: string
}

export type RequestControlsUpdateInputV1 = {
  expectedControlsVersion: number
  idempotencyKey: string
  acceptingRequests: boolean
  assigningRequests: boolean
  activeCaseCapacity: number
}

export type RequestControlsReceiptV1 = {
  controlsVersion: number
  acceptingRequests: boolean
  assigningRequests: boolean
  activeCaseCapacity: number
  replayed: boolean
  occurredAt: string
}

export type RequestCursor = string & { readonly __requestCursor: unique symbol }

export type RequestListQueryV1 = {
  cursor?: RequestCursor
  limit?: number
}

export type RequestQueueScope = 'admin' | 'triager' | 'builder' | 'reviewer'

/**
 * A requested projection only. The RPC derives authority from auth.uid(),
 * admin/triage authority, and active assignments; this value cannot grant a
 * role and must never be inferred from the global profile role.
 */
export type RequestAssignedQueueQueryV1 = RequestListQueryV1 & {
  scope: RequestQueueScope
}

export type RequestEligibleAssigneeV1 = {
  accountId: string
  displayName: string
}

export type RequestEligibleAssigneeQueryV1 = {
  requestId: string
  role: 'triager' | 'builder' | 'reviewer'
  query?: string
  cursor?: RequestCursor
  limit?: number
}

export type RequestPageV1<T> = {
  items: T[]
  nextCursor: RequestCursor | null
}

export class RequestContractError extends Error {
  readonly code = 'INVALID_REQUEST_CONTRACT'

  constructor(message: string) {
    super(message)
    this.name = 'RequestContractError'
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/
const OPAQUE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/
const SHA256 = /^[0-9a-f]{64}$/i
const URL_LIKE = /\b(?:https?:\/\/|www\.|[a-z0-9-]+\.(?:com|net|org|io|dev|app)(?:\/|\b))/i
const EMAIL_LIKE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const SECRET_LIKE =
  /\b(?:sk-(?:proj-)?[A-Za-z0-9_-]{12,}|(?:api|access|secret|private)[_-]?key\s*[:=]|bearer\s+[A-Za-z0-9._~+/-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i

const TEXT_LIMITS = {
  title: { min: 4, max: 120 },
  outcome: { min: 20, max: 4_000 },
  intendedUser: { min: 2, max: 1_000 },
  constraints: { min: 0, max: 2_000 },
  mustWorkScenario: { min: 10, max: 1_000 },
  acceptanceCheck: { min: 4, max: 500 },
  question: { min: 1, max: 2_000 },
  answer: { min: 1, max: 4_000 },
  reason: { min: 1, max: 2_000 },
  assignmentReason: { min: 1, max: 500 },
  resolution: { min: 1, max: 2_000 },
  summary: { min: 1, max: 2_000 },
  reviewNotes: { min: 0, max: 2_000 },
  repairInstructions: { min: 1, max: 2_000 },
  evidenceText: { min: 1, max: 2_000 },
  revisionLabel: { min: 1, max: 80 },
  note: { min: 1, max: 2_000 },
  normalizedName: { min: 1, max: 120 },
  scannerVersion: { min: 1, max: 80 },
  displayName: { min: 1, max: 120 },
} as const

function validateText(
  value: unknown,
  field: keyof typeof TEXT_LIMITS,
  options: { rejectSensitive?: boolean } = {},
): asserts value is string {
  const limits = TEXT_LIMITS[field]
  if (typeof value !== 'string') throw new RequestContractError(`${field} must be text.`)
  if (/[\0\r]/.test(value)) {
    throw new RequestContractError(`${field} cannot contain NUL or carriage return.`)
  }
  const length = value.trim().length
  if (length < limits.min || length > limits.max) {
    throw new RequestContractError(`${field} must be ${limits.min}-${limits.max} characters.`)
  }
  if (
    options.rejectSensitive &&
    (URL_LIKE.test(value) || EMAIL_LIKE.test(value) || SECRET_LIKE.test(value))
  ) {
    throw new RequestContractError(
      `${field} cannot contain URLs, email addresses, credentials, or secret material.`,
    )
  }
}

function validateUuid(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !UUID.test(value)) {
    throw new RequestContractError(`${field} must be a UUID.`)
  }
}

export function validateRfc3339Timestamp(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 40) {
    throw new RequestContractError(`${field} must be an RFC3339 timestamp.`)
  }
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/.exec(
      value,
    )
  if (!match || !Number.isFinite(Date.parse(value))) {
    throw new RequestContractError(`${field} must be an RFC3339 timestamp.`)
  }
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, zone] =
    match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
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
  const zoneHour = zone === 'Z' ? 0 : Number(zone.slice(1, 3))
  const zoneMinute = zone === 'Z' ? 0 : Number(zone.slice(4, 6))
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth[month - 1] ||
    Number(hourText) > 23 ||
    Number(minuteText) > 59 ||
    Number(secondText) > 59 ||
    zoneHour > 23 ||
    zoneMinute > 59
  ) {
    throw new RequestContractError(`${field} must be an RFC3339 timestamp.`)
  }
}

function requireExactKeys(value: unknown, keys: readonly string[], label: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestContractError(`${label} must be an object.`)
  }
  if (Object.keys(value).some((key) => !keys.includes(key))) {
    throw new RequestContractError(`${label} contains an unsupported field.`)
  }
}

function validateOpaqueId(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !OPAQUE_ID.test(value)) {
    throw new RequestContractError(`${field} must be a bounded opaque identifier.`)
  }
}

function validateCommandEnvelope(command: RequestCommandV1) {
  requireExactKeys(
    command,
    ['contractVersion', 'kind', 'requestId', 'expectedVersion', 'idempotencyKey', 'payload'],
    'Request command',
  )
  if (command.contractVersion !== REQUEST_CONTRACT_VERSION) {
    throw new RequestContractError('Unsupported Request a Build contract version.')
  }
  validateUuid(command.requestId, 'requestId')
  if (!Number.isSafeInteger(command.expectedVersion) || command.expectedVersion < 0) {
    throw new RequestContractError('expectedVersion must be a non-negative integer.')
  }
  if (!IDEMPOTENCY_KEY.test(command.idempotencyKey)) {
    throw new RequestContractError('idempotencyKey must be 8-128 safe characters.')
  }
}

function validateExactCommandPayload(command: RequestCommandV1) {
  const keysByKind: Partial<Record<RequestCommandKind, readonly string[]>> = {
    begin_triage: [],
    request_clarification: ['question'],
    submit_clarification: ['clarificationId', 'answer'],
    accept: ['builderId', 'targetDate'],
    assign_reviewer: ['reviewerId'],
    reassign_triager: ['triagerId', 'reason'],
    reassign_builder: ['builderId', 'reason'],
    reassign_reviewer: ['reviewerId', 'reason'],
    start_build: [],
    prepare_delivery_revision: [
      'deliveryRevisionId',
      'acceptedBriefRevisionId',
      'activeBuilderAssignmentId',
      'revisionLabel',
      'summary',
      'builderEvidence',
      'approvedPathForgeReference',
    ],
    stage_delivery_artifact: [
      'deliveryRevisionId',
      'acceptedBriefRevisionId',
      'activeBuilderAssignmentId',
      'artifactOrdinal',
      'clientFileId',
      'normalizedName',
      'byteLength',
      'sha256',
      'detectedMediaType',
      'scannerVersion',
    ],
    abandon_delivery_artifact: ['deliveryRevisionId', 'artifactId'],
    submit_delivery: ['deliveryRevisionId', 'sealReceiptId'],
    resubmit_delivery: ['deliveryRevisionId', 'sealReceiptId'],
    approve_delivery: [
      'deliveryRevisionId',
      'manifestDigest',
      'checklistVersion',
      'checks',
      'safetyIntegrityResult',
      'reviewNotes',
    ],
    request_repair: [
      'deliveryRevisionId',
      'manifestDigest',
      'checklistVersion',
      'checks',
      'safetyIntegrityResult',
      'reason',
      'repairInstructions',
    ],
    acknowledge_delivery: ['deliveryRevisionId'],
    close_no_response: [],
    withdraw: ['reason'],
    place_moderation_hold: ['reason'],
    release_moderation_hold: ['resolution'],
    remove_for_moderation: ['reason'],
  }
  if (command.kind === 'close') {
    requireExactKeys(
      command.payload,
      command.payload.reason === 'existing_resolution'
        ? ['reason', 'resolutionReference', 'note']
        : command.payload.reason === 'duplicate'
          ? ['reason']
        : ['reason', 'note'],
      'close payload',
    )
    return
  }
  if (command.kind === 'requester_delivery_outcome') {
    requireExactKeys(
      command.payload,
      command.payload.outcome === 'useful'
        ? ['deliveryRevisionId', 'manifestDigest', 'outcome']
        : [
            'deliveryRevisionId',
            'manifestDigest',
            'outcome',
            'failedAcceptanceCheckId',
            'reason',
          ],
      'requester delivery outcome payload',
    )
    return
  }
  requireExactKeys(
    command.payload,
    keysByKind[command.kind] ?? [],
    `${command.kind} payload`,
  )
}

function validatePositiveInteger(value: unknown, field: string, maximum: number) {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > maximum) {
    throw new RequestContractError(`${field} must be an integer from 1 to ${maximum}.`)
  }
}

function validateIsoCalendarDate(value: unknown, field: string) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RequestContractError(`${field} must be an ISO calendar date.`)
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
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth[month - 1]) {
    throw new RequestContractError(`${field} must be a valid ISO calendar date.`)
  }
}

function validateDeliveryPreparation(payload: DeliveryRevisionPreparationV1) {
  validateUuid(payload.deliveryRevisionId, 'deliveryRevisionId')
  validateUuid(payload.acceptedBriefRevisionId, 'acceptedBriefRevisionId')
  validateUuid(payload.activeBuilderAssignmentId, 'activeBuilderAssignmentId')
  validateText(payload.revisionLabel, 'revisionLabel', { rejectSensitive: true })
  validateText(payload.summary, 'summary', { rejectSensitive: true })
  validateBuilderEvidence(payload.builderEvidence)
  if (payload.approvedPathForgeReference) {
    validatePathForgeReference(payload.approvedPathForgeReference)
  }
}

function validateDeliverySubmission(payload: DeliveryRevisionSubmissionV1) {
  validateUuid(payload.deliveryRevisionId, 'deliveryRevisionId')
  validateUuid(payload.sealReceiptId, 'sealReceiptId')
}

function validateBuilderEvidence(evidence: readonly RequestBuilderEvidenceV1[]) {
  if (!Array.isArray(evidence) || evidence.length < 1 || evidence.length > 3) {
    throw new RequestContractError('builderEvidence must contain 1-3 results.')
  }
  const acceptanceCheckIds = new Set<string>()
  evidence.forEach((item) => {
    requireExactKeys(
      item,
      ['acceptanceCheckId', 'result', 'evidenceText', 'evidenceRef'],
      'Builder evidence',
    )
    validateUuid(item.acceptanceCheckId, 'builderEvidence.acceptanceCheckId')
    if (acceptanceCheckIds.has(item.acceptanceCheckId)) {
      throw new RequestContractError('builderEvidence acceptance checks must be distinct.')
    }
    acceptanceCheckIds.add(item.acceptanceCheckId)
    if (!['pass', 'fail', 'not_run'].includes(item.result)) {
      throw new RequestContractError('builderEvidence result is invalid.')
    }
    if (item.evidenceText !== null) {
      validateText(item.evidenceText, 'evidenceText', { rejectSensitive: true })
    }
    if (item.evidenceRef !== null) {
      validateOpaqueId(item.evidenceRef, 'builderEvidence.evidenceRef')
    }
  })
}

function validatePathForgeReference(reference: PathForgeRequestReference) {
  if (reference.kind === 'project') {
    requireExactKeys(reference, ['kind', 'projectId'], 'Project reference')
    validateUuid(reference.projectId, 'pathforgeReference.projectId')
  } else if (reference.kind === 'response') {
    requireExactKeys(
      reference,
      ['kind', 'projectId', 'modelVariantId', 'responseStepNumber'],
      'Response reference',
    )
    validateUuid(reference.projectId, 'pathforgeReference.projectId')
    validateUuid(reference.modelVariantId, 'pathforgeReference.modelVariantId')
    validatePositiveInteger(
      reference.responseStepNumber,
      'pathforgeReference.responseStepNumber',
      100,
    )
  } else {
    throw new RequestContractError('pathforgeReference kind is not supported.')
  }
}

function validateMediaType(value: unknown): asserts value is DeliveryMediaType {
  if (!DELIVERY_MEDIA_TYPES.includes(value as DeliveryMediaType)) {
    throw new RequestContractError('detectedMediaType is not allowed.')
  }
}

function validateReviewChecks(checks: readonly DeliveryReviewCheckV1[]) {
  if (!Array.isArray(checks) || checks.length < 1 || checks.length > 3) {
    throw new RequestContractError('checks must contain 1-3 review results.')
  }
  const ids = new Set<string>()
  checks.forEach((check) => {
    requireExactKeys(
      check,
      ['acceptanceCheckId', 'result', 'evidenceRef'],
      'Delivery review check',
    )
    validateUuid(check.acceptanceCheckId, 'acceptanceCheckId')
    if (ids.has(check.acceptanceCheckId)) {
      throw new RequestContractError('review acceptance check ids must be distinct.')
    }
    ids.add(check.acceptanceCheckId)
    if (check.result !== 'pass' && check.result !== 'fail') {
      throw new RequestContractError('review check result must be pass or fail.')
    }
    if (check.evidenceRef !== null) validateOpaqueId(check.evidenceRef, 'evidenceRef')
  })
}

export function validateRequestDeliveryReviewV1(
  review: RequestDeliveryReviewV1,
): RequestDeliveryReviewV1 {
  requireExactKeys(
    review,
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
  validateUuid(review.deliveryRevisionId, 'deliveryRevisionId')
  validatePositiveInteger(review.checklistVersion, 'checklistVersion', 10_000)
  validateReviewChecks(review.checks)
  if (review.safetyIntegrityResult !== 'pass' && review.safetyIntegrityResult !== 'fail') {
    throw new RequestContractError('safetyIntegrityResult must be pass or fail.')
  }
  if (review.verdict !== 'approve' && review.verdict !== 'repair') {
    throw new RequestContractError('delivery review verdict is invalid.')
  }
  if (review.verdict === 'approve') {
    if (
      review.safetyIntegrityResult !== 'pass' ||
      review.checks.some((check) => check.result !== 'pass') ||
      review.reason !== null ||
      review.repairInstructions !== null ||
      typeof review.reviewNotes !== 'string'
    ) {
      throw new RequestContractError('An approval must pass all checks and omit repair fields.')
    }
  } else {
    if (
      review.reviewNotes !== null ||
      (review.safetyIntegrityResult === 'pass' &&
        review.checks.every((check) => check.result === 'pass'))
    ) {
      throw new RequestContractError(
        'A repair review must identify a failed check or safety result and omit reviewNotes.',
      )
    }
    validateText(review.reason, 'reason')
    validateText(review.repairInstructions, 'repairInstructions')
  }
  if (review.reviewNotes !== null) validateText(review.reviewNotes, 'reviewNotes')
  if (!review.reviewer || typeof review.reviewer !== 'object') {
    throw new RequestContractError('reviewer attribution is required.')
  }
  requireExactKeys(review.reviewer, ['displayName', 'deidentified'], 'Reviewer attribution')
  validateText(review.reviewer.displayName, 'displayName')
  if (typeof review.reviewer.deidentified !== 'boolean') {
    throw new RequestContractError('reviewer deidentified flag is required.')
  }
  validateRfc3339Timestamp(review.reviewedAt, 'reviewedAt')
  if (typeof review.isCurrent !== 'boolean') {
    throw new RequestContractError('delivery review current marker is required.')
  }
  return review
}

export function validateSubmitBuildRequestV1(
  input: SubmitBuildRequestV1,
): SubmitBuildRequestV1 {
  requireExactKeys(input, ['contractVersion', 'idempotencyKey', 'brief'], 'Build request')
  requireExactKeys(
    input.brief,
    [
      'title',
      'outcome',
      'intendedUser',
      'mustWorkScenario',
      'acceptanceChecks',
      'constraints',
      'pathforgeReference',
    ],
    'Build request brief',
  )
  if (input.contractVersion !== REQUEST_CONTRACT_VERSION) {
    throw new RequestContractError('Unsupported Request a Build contract version.')
  }
  if (!IDEMPOTENCY_KEY.test(input.idempotencyKey)) {
    throw new RequestContractError('idempotencyKey must be 8-128 safe characters.')
  }
  validateText(input.brief.title, 'title', { rejectSensitive: true })
  validateText(input.brief.outcome, 'outcome', { rejectSensitive: true })
  validateText(input.brief.intendedUser, 'intendedUser', { rejectSensitive: true })
  validateText(input.brief.constraints, 'constraints', { rejectSensitive: true })
  validateText(input.brief.mustWorkScenario, 'mustWorkScenario', { rejectSensitive: true })
  if (
    !Array.isArray(input.brief.acceptanceChecks) ||
    input.brief.acceptanceChecks.length < 1 ||
    input.brief.acceptanceChecks.length > 3
  ) {
    throw new RequestContractError('acceptanceChecks must contain 1-3 checks.')
  }
  input.brief.acceptanceChecks.forEach((check) => {
    validateText(check, 'acceptanceCheck', { rejectSensitive: true })
  })
  if (
    new Set(input.brief.acceptanceChecks.map((check) => check.trim().toLocaleLowerCase())).size !==
    input.brief.acceptanceChecks.length
  ) {
    throw new RequestContractError('acceptanceChecks must be distinct.')
  }
  if (
    input.brief.acceptanceChecks.some(
      (check) =>
        check.trim().toLocaleLowerCase() ===
        input.brief.mustWorkScenario.trim().toLocaleLowerCase(),
    )
  ) {
    throw new RequestContractError('mustWorkScenario must be distinct from acceptanceChecks.')
  }
  if (input.brief.pathforgeReference) {
    validatePathForgeReference(input.brief.pathforgeReference)
  }
  return input
}

export function validateRequestControlsUpdateInputV1(
  input: RequestControlsUpdateInputV1,
): RequestControlsUpdateInputV1 {
  requireExactKeys(
    input,
    [
      'expectedControlsVersion',
      'idempotencyKey',
      'acceptingRequests',
      'assigningRequests',
      'activeCaseCapacity',
    ],
    'Request controls update',
  )
  if (
    !Number.isSafeInteger(input.expectedControlsVersion) ||
    input.expectedControlsVersion < 0
  ) {
    throw new RequestContractError(
      'expectedControlsVersion must be a non-negative integer.',
    )
  }
  if (!IDEMPOTENCY_KEY.test(input.idempotencyKey)) {
    throw new RequestContractError('idempotencyKey must be 8-128 safe characters.')
  }
  if (
    typeof input.acceptingRequests !== 'boolean' ||
    typeof input.assigningRequests !== 'boolean'
  ) {
    throw new RequestContractError('Request control flags must be boolean.')
  }
  validatePositiveInteger(input.activeCaseCapacity, 'activeCaseCapacity', 4)
  return input
}

export function validateRequestCommandV1(command: RequestCommandV1): RequestCommandV1 {
  validateCommandEnvelope(command)
  validateExactCommandPayload(command)

  switch (command.kind) {
    case 'request_clarification':
      validateText(command.payload.question, 'question', { rejectSensitive: true })
      break
    case 'submit_clarification':
      validateUuid(command.payload.clarificationId, 'clarificationId')
      validateText(command.payload.answer, 'answer', { rejectSensitive: true })
      break
    case 'accept':
      validateUuid(command.payload.builderId, 'builderId')
      validateIsoCalendarDate(command.payload.targetDate, 'targetDate')
      break
    case 'assign_reviewer':
      validateUuid(command.payload.reviewerId, 'reviewerId')
      break
    case 'reassign_triager':
      validateUuid(command.payload.triagerId, 'triagerId')
      validateText(command.payload.reason, 'assignmentReason', {
        rejectSensitive: true,
      })
      break
    case 'reassign_builder':
      validateUuid(command.payload.builderId, 'builderId')
      validateText(command.payload.reason, 'assignmentReason', {
        rejectSensitive: true,
      })
      break
    case 'reassign_reviewer':
      validateUuid(command.payload.reviewerId, 'reviewerId')
      validateText(command.payload.reason, 'assignmentReason', {
        rejectSensitive: true,
      })
      break
    case 'prepare_delivery_revision':
      validateDeliveryPreparation(command.payload)
      break
    case 'stage_delivery_artifact':
      validateUuid(command.payload.deliveryRevisionId, 'deliveryRevisionId')
      validateUuid(command.payload.acceptedBriefRevisionId, 'acceptedBriefRevisionId')
      validateUuid(command.payload.activeBuilderAssignmentId, 'activeBuilderAssignmentId')
      validatePositiveInteger(command.payload.artifactOrdinal, 'artifactOrdinal', 5)
      validateOpaqueId(command.payload.clientFileId, 'clientFileId')
      validateText(command.payload.normalizedName, 'normalizedName')
      if (/[\/\\]/.test(command.payload.normalizedName) || command.payload.normalizedName === '..') {
        throw new RequestContractError('normalizedName must be a file name without a path.')
      }
      validatePositiveInteger(command.payload.byteLength, 'byteLength', 4_000_000)
      if (!SHA256.test(command.payload.sha256)) {
        throw new RequestContractError('sha256 must be a SHA-256 digest.')
      }
      validateMediaType(command.payload.detectedMediaType)
      validateText(command.payload.scannerVersion, 'scannerVersion')
      break
    case 'abandon_delivery_artifact':
      validateUuid(command.payload.deliveryRevisionId, 'deliveryRevisionId')
      validateUuid(command.payload.artifactId, 'artifactId')
      break
    case 'submit_delivery':
    case 'resubmit_delivery':
      validateDeliverySubmission(command.payload)
      break
    case 'approve_delivery':
      validateUuid(command.payload.deliveryRevisionId, 'deliveryRevisionId')
      if (!/^[0-9a-f]{64}$/.test(command.payload.manifestDigest)) {
        throw new RequestContractError('manifestDigest must be lowercase SHA-256.')
      }
      validatePositiveInteger(command.payload.checklistVersion, 'checklistVersion', 10_000)
      validateReviewChecks(command.payload.checks)
      if (
        command.payload.safetyIntegrityResult !== 'pass' ||
        command.payload.checks.some((check) => check.result !== 'pass')
      ) {
        throw new RequestContractError('An approval requires passing review and safety checks.')
      }
      validateText(command.payload.reviewNotes, 'reviewNotes', {
        rejectSensitive: true,
      })
      break
    case 'request_repair':
      validateUuid(command.payload.deliveryRevisionId, 'deliveryRevisionId')
      if (!/^[0-9a-f]{64}$/.test(command.payload.manifestDigest)) {
        throw new RequestContractError('manifestDigest must be lowercase SHA-256.')
      }
      validatePositiveInteger(command.payload.checklistVersion, 'checklistVersion', 10_000)
      validateReviewChecks(command.payload.checks)
      if (
        command.payload.safetyIntegrityResult === 'pass' &&
        command.payload.checks.every((check) => check.result === 'pass')
      ) {
        throw new RequestContractError(
          'A repair request requires a failed review or safety check.',
        )
      }
      validateText(command.payload.reason, 'reason', { rejectSensitive: true })
      validateText(command.payload.repairInstructions, 'repairInstructions', {
        rejectSensitive: true,
      })
      break
    case 'acknowledge_delivery':
      validateUuid(command.payload.deliveryRevisionId, 'deliveryRevisionId')
      break
    case 'requester_delivery_outcome':
      validateUuid(command.payload.deliveryRevisionId, 'deliveryRevisionId')
      if (!/^[0-9a-f]{64}$/.test(command.payload.manifestDigest)) {
        throw new RequestContractError('manifestDigest must be lowercase SHA-256.')
      }
      if (!['useful', 'failed_acceptance_check'].includes(command.payload.outcome)) {
        throw new RequestContractError('requester delivery outcome is invalid.')
      }
      if (command.payload.outcome === 'failed_acceptance_check') {
        validateUuid(
          command.payload.failedAcceptanceCheckId,
          'failedAcceptanceCheckId',
        )
        validateText(command.payload.reason, 'reason', { rejectSensitive: true })
      }
      break
    case 'close_no_response':
      break
    case 'close':
      if (!isAllowedAdministrativeCloseReason(command.payload.reason)) {
        throw new RequestContractError('close reason is not valid for an administrative close.')
      }
      if (command.payload.reason === 'existing_resolution') {
        validatePathForgeReference(command.payload.resolutionReference)
      } else if ('resolutionReference' in command.payload) {
        throw new RequestContractError(
          'Only an existing-resolution close can include a resolution reference.',
        )
      }
      if (command.payload.reason !== 'duplicate') {
        validateText(command.payload.note, 'note', { rejectSensitive: true })
      }
      break
    case 'withdraw':
    case 'place_moderation_hold':
    case 'remove_for_moderation':
      validateText(command.payload.reason, 'reason', { rejectSensitive: true })
      break
    case 'release_moderation_hold':
      validateText(command.payload.resolution, 'resolution', {
        rejectSensitive: true,
      })
      break
    case 'begin_triage':
    case 'start_build':
      break
    default:
      command satisfies never
  }

  return command
}

function isAllowedAdministrativeCloseReason(
  value: unknown,
): value is Exclude<RequestCloseReason, 'withdrawn' | 'no_response'> {
  return (
    typeof value === 'string' &&
    REQUEST_CLOSE_REASONS.includes(value as RequestCloseReason) &&
    value !== 'withdrawn' &&
    value !== 'no_response' &&
    value !== 'safety_removed' &&
    value !== 'failed_review'
  )
}
