import type {
  DeliveryMediaType,
  RequestActorContextV1,
  RequestBuilderEvidenceV1,
  RequestBuilderWorkspaceV1,
  RequestCapability,
  RequestCaseDetailResultV1,
  RequestActorRole,
  RequestCloseReason,
  RequestDeliveryArtifactV1,
  RequestDeliveryReviewV1,
  RequestDeliveryRevisionV1,
  RequestLifecycleState,
  RequestModerationState,
  RequestPublicationState,
  RequestRequesterOutcomeV1,
} from '@/lib/request-lifecycle'

export const REQUEST_DELIVERY_SLOT_STATES = [
  'none',
  'pending',
  'staging',
  'sealed_waiting',
  'quarantined',
  'available',
  'missing',
  'hash_mismatch',
  'repair_required',
  'review_pending',
  'reviewed',
] as const

export type RequestDeliverySlotState = (typeof REQUEST_DELIVERY_SLOT_STATES)[number]

export interface RequestDeliveryAcceptanceCheck {
  id: string
  label: string
}

export interface RequestDeliveryEvidenceItem {
  acceptanceCheckId: string
  label: string
  result: 'pass' | 'fail' | 'not_run'
  evidenceText: string | null
  evidenceRef: string | null
}

export interface RequestDeliveryReviewCheck {
  acceptanceCheckId: string
  label: string
  result: 'pass' | 'fail'
  evidenceRef: string | null
}

export interface RequestDeliveryReviewSummary {
  status: 'not_started' | 'pending' | 'approved' | 'repair'
  checklistVersion: number | null
  safetyIntegrityResult: 'pass' | 'fail' | null
  verdict: 'approve' | 'repair' | null
  reviewerDisplayName: string | null
  reviewerDeidentified: boolean
  reason: string | null
  reviewNotes: string | null
  repairInstructions: string | null
  reviewedAt: string | null
  checks: readonly RequestDeliveryReviewCheck[]
}

export interface RequestDeliveryRepairHistoryItem {
  revisionNumber: number
  reason: string
  repairInstructions: string
  safetyIntegrityResult: 'pass' | 'fail'
  reviewedAt: string
  reviewerDisplayName: string
  reviewerDeidentified: boolean
  isCurrent: boolean
}

export interface RequestDeliveryRequesterOutcomeSummary {
  outcome: 'useful' | 'failed_acceptance_check'
  acceptanceCheckId: string | null
  acceptanceCheckLabel: string | null
  reason: string | null
  occurredAt: string
  isCurrent: boolean
}

export interface RequestDeliveryReaderActions {
  canOpen: boolean
  canDownload: boolean
  openPath: string | null
  downloadPath: string | null
}

export interface RequestDeliveryArtifactSummary {
  artifactId: string
  artifactOrdinal: number
  label: string
  mediaType: DeliveryMediaType
  mediaTypeLabel: string
  byteLength: number
  integrityStatus: 'pending' | 'verified' | 'failed'
  scanState: 'pending' | 'complete'
  scanVerdict: 'clean' | 'rejected' | 'held' | null
  findingCount: number
  reader: RequestDeliveryReaderActions
}

export interface RequestDeliveryBuilderWorkspaceSummary {
  deliveryRevisionId: string
  revisionState: 'staging' | 'prepared' | 'sealed'
  revisionLabel: string | null
  summary: string | null
  evidence: readonly RequestDeliveryEvidenceItem[]
  artifacts: readonly RequestDeliveryArtifactSummary[]
  hasSealReceipt: boolean
}

export interface RequestDeliveryCommandAvailability {
  canStageArtifact: boolean
  canAbandonArtifact: boolean
  canPrepareRevision: boolean
  canResumeRevision: boolean
  submitKind: 'submit_delivery' | 'resubmit_delivery' | null
  canReview: boolean
  canRequestRepair: boolean
  canAcknowledge: boolean
  canRecordRequesterOutcome: boolean
}

export interface RequestDeliverySlotModel {
  visibility: 'full' | 'held' | 'removed'
  restrictedLabel: string | null
  requestId: string
  currentDeliveryRevisionId: string | null
  state: RequestDeliverySlotState
  lifecycle: RequestLifecycleState
  moderation: RequestModerationState
  publication: RequestPublicationState
  actorRoles: readonly RequestActorRole[]
  version: number
  revisionNumber: number | null
  revisionLabel: string | null
  summary: string | null
  submittedAt: string | null
  authoredByDisplayName: string | null
  authoredByDeidentified: boolean
  artifactCount: number | null
  totalBytes: number | null
  formatLabels: readonly string[]
  artifacts: readonly RequestDeliveryArtifactSummary[]
  acceptanceChecks: readonly RequestDeliveryAcceptanceCheck[]
  evidence: readonly RequestDeliveryEvidenceItem[]
  evidenceChecklistVersion: number | null
  rightsSnapshotVersion: number | null
  rightsSummary: string | null
  review: RequestDeliveryReviewSummary
  repairHistory: readonly RequestDeliveryRepairHistoryItem[]
  requesterOutcomes: readonly RequestDeliveryRequesterOutcomeSummary[]
  integrityMessage: string | null
  builderWorkspace: RequestDeliveryBuilderWorkspaceSummary | null
  commands: RequestDeliveryCommandAvailability
}

const EMPTY_REVIEW: RequestDeliveryReviewSummary = {
  status: 'not_started',
  checklistVersion: null,
  safetyIntegrityResult: null,
  verdict: null,
  reviewerDisplayName: null,
  reviewerDeidentified: false,
  reason: null,
  reviewNotes: null,
  repairInstructions: null,
  reviewedAt: null,
  checks: [],
}

const EMPTY_COMMANDS: RequestDeliveryCommandAvailability = {
  canStageArtifact: false,
  canAbandonArtifact: false,
  canPrepareRevision: false,
  canResumeRevision: false,
  submitKind: null,
  canReview: false,
  canRequestRepair: false,
  canAcknowledge: false,
  canRecordRequesterOutcome: false,
}

const MEDIA_TYPE_LABELS: Record<DeliveryMediaType, string> = {
  'text/html': 'Static HTML',
  'text/markdown': 'Markdown',
  'text/plain': 'Plain text',
  'application/json': 'JSON',
  'text/csv': 'CSV',
  'image/png': 'PNG image',
  'image/jpeg': 'JPEG image',
}

function sameValues(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function assertActorContext(
  canonical: RequestActorContextV1,
  asserted: RequestActorContextV1,
) {
  if (
    !asserted
    ||
    canonical.accountId !== asserted.accountId
    || canonical.operatorAuthority !== asserted.operatorAuthority
    || canonical.unreadCount !== asserted.unreadCount
    || !sameValues(canonical.roles, asserted.roles)
    || !sameValues(canonical.capabilities, asserted.capabilities)
    || !sameValues(canonical.allowedCloseReasons, asserted.allowedCloseReasons)
  ) {
    throw new Error('Request delivery actor context does not match canonical detail authority.')
  }
}

function acceptanceLabel(
  labels: ReadonlyMap<string, string>,
  acceptanceCheckId: string,
) {
  return labels.get(acceptanceCheckId) ?? 'Acceptance check unavailable'
}

function mapEvidence(
  evidence: readonly RequestBuilderEvidenceV1[],
  labels: ReadonlyMap<string, string>,
): RequestDeliveryEvidenceItem[] {
  return evidence.map(item => ({
    acceptanceCheckId: item.acceptanceCheckId,
    label: acceptanceLabel(labels, item.acceptanceCheckId),
    result: item.result,
    evidenceText: item.evidenceText,
    evidenceRef: item.evidenceRef,
  }))
}

function mapArtifact(
  artifact: RequestDeliveryArtifactV1,
  allowReader = true,
): RequestDeliveryArtifactSummary {
  const readerPath = allowReader ? artifact.readerHref ?? null : null
  return {
    artifactId: artifact.artifactId,
    artifactOrdinal: artifact.artifactOrdinal,
    label: artifact.normalizedName,
    mediaType: artifact.detectedMediaType,
    mediaTypeLabel: MEDIA_TYPE_LABELS[artifact.detectedMediaType],
    byteLength: artifact.byteLength,
    integrityStatus: artifact.integrityStatus,
    scanState: artifact.scanState,
    scanVerdict: artifact.scanVerdict,
    findingCount: artifact.findingCodes.length,
    reader: {
      canOpen: readerPath !== null,
      canDownload: readerPath !== null,
      openPath: readerPath,
      downloadPath: readerPath ? `${readerPath}?download=1` : null,
    },
  }
}

function mapReview(
  review: RequestDeliveryReviewV1 | undefined,
  labels: ReadonlyMap<string, string>,
  lifecycle: RequestLifecycleState,
): RequestDeliveryReviewSummary {
  if (!review) {
    return lifecycle === 'review_pending'
      ? { ...EMPTY_REVIEW, status: 'pending' }
      : EMPTY_REVIEW
  }

  return {
    status: review.verdict === 'approve' ? 'approved' : 'repair',
    checklistVersion: review.checklistVersion,
    safetyIntegrityResult: review.safetyIntegrityResult,
    verdict: review.verdict,
    reviewerDisplayName: review.reviewer.displayName,
    reviewerDeidentified: review.reviewer.deidentified,
    reason: review.reason,
    reviewNotes: review.reviewNotes,
    repairInstructions: review.repairInstructions,
    reviewedAt: review.reviewedAt,
    checks: review.checks.map(check => ({
      acceptanceCheckId: check.acceptanceCheckId,
      label: acceptanceLabel(labels, check.acceptanceCheckId),
      result: check.result,
      evidenceRef: check.evidenceRef,
    })),
  }
}

function mapRepairHistory(
  revisions: readonly RequestDeliveryRevisionV1[],
): RequestDeliveryRepairHistoryItem[] {
  return revisions.flatMap(revision => revision.reviews.flatMap(review => (
    review.verdict === 'repair'
      ? [{
          revisionNumber: revision.revisionNumber,
          reason: review.reason,
          repairInstructions: review.repairInstructions,
          safetyIntegrityResult: review.safetyIntegrityResult,
          reviewedAt: review.reviewedAt,
          reviewerDisplayName: review.reviewer.displayName,
          reviewerDeidentified: review.reviewer.deidentified,
          isCurrent: review.isCurrent,
        }]
      : []
  )))
}

function mapRequesterOutcomes(
  outcomes: readonly RequestRequesterOutcomeV1[],
  labels: ReadonlyMap<string, string>,
): RequestDeliveryRequesterOutcomeSummary[] {
  return outcomes.map(outcome => ({
    outcome: outcome.outcome,
    acceptanceCheckId: outcome.acceptanceCheckId,
    acceptanceCheckLabel: outcome.acceptanceCheckId
      ? acceptanceLabel(labels, outcome.acceptanceCheckId)
      : null,
    reason: outcome.reason,
    occurredAt: outcome.occurredAt,
    isCurrent: outcome.isCurrent,
  }))
}

function mapWorkspace(
  workspace: RequestBuilderWorkspaceV1 | null,
  labels: ReadonlyMap<string, string>,
): RequestDeliveryBuilderWorkspaceSummary | null {
  if (!workspace) return null
  return {
    deliveryRevisionId: workspace.deliveryRevisionId,
    revisionState: workspace.revisionState,
    revisionLabel: workspace.revisionLabel,
    summary: workspace.summary,
    evidence: mapEvidence(workspace.builderEvidence, labels),
    artifacts: workspace.artifacts.map(artifact => mapArtifact(artifact)),
    hasSealReceipt: workspace.sealReceiptId !== null,
  }
}

function hasCapability(
  capabilities: readonly RequestCapability[],
  capability: RequestCapability,
) {
  return capabilities.includes(capability)
}

function mapCommands(
  capabilities: readonly RequestCapability[],
  detail: {
    lifecycleState: RequestLifecycleState
    moderationState: RequestModerationState
    actor: RequestActorContextV1
    builderWorkspace: RequestBuilderWorkspaceV1 | null
  },
): RequestDeliveryCommandAvailability {
  const canSubmit = hasCapability(capabilities, 'submit_delivery')
  const canResubmit = hasCapability(capabilities, 'resubmit_delivery')
  return {
    canStageArtifact: hasCapability(capabilities, 'stage_delivery_artifact'),
    canAbandonArtifact: hasCapability(capabilities, 'abandon_delivery_artifact'),
    canPrepareRevision: hasCapability(capabilities, 'prepare_delivery_revision'),
    canResumeRevision: (
      detail.moderationState === 'clear'
      && ['building', 'repair_required'].includes(detail.lifecycleState)
      && detail.actor.roles.includes('builder')
      && detail.builderWorkspace !== null
      && (
        detail.builderWorkspace.revisionState === 'prepared'
        || (
          detail.builderWorkspace.revisionState === 'sealed'
          && (canSubmit || canResubmit)
        )
      )
    ),
    submitKind: canSubmit ? 'submit_delivery' : canResubmit ? 'resubmit_delivery' : null,
    canReview: hasCapability(capabilities, 'approve_delivery'),
    canRequestRepair: hasCapability(capabilities, 'request_repair'),
    canAcknowledge: hasCapability(capabilities, 'acknowledge_delivery'),
    canRecordRequesterOutcome: hasCapability(capabilities, 'requester_delivery_outcome'),
  }
}

function deriveIntegrityMessage(
  artifacts: readonly RequestDeliveryArtifactV1[],
): string | null {
  if (artifacts.some(artifact => artifact.integrityStatus === 'failed')) {
    return 'At least one artifact failed its recorded byte-integrity check. Access is unavailable.'
  }
  if (artifacts.some(artifact => artifact.scanVerdict === 'rejected')) {
    return 'At least one artifact failed the static safety gate. Access is unavailable.'
  }
  if (artifacts.some(artifact => artifact.scanVerdict === 'held')) {
    return 'At least one artifact is held for safety review. Access is unavailable.'
  }
  if (artifacts.some(artifact => (
    artifact.integrityStatus === 'pending'
    || artifact.scanState === 'pending'
  ))) {
    return 'Artifact integrity and safety checks are still pending.'
  }
  return null
}

function deriveState(
  lifecycle: RequestLifecycleState,
  closeReason: RequestCloseReason | null,
  current: RequestDeliveryRevisionV1 | undefined,
  workspace: RequestBuilderWorkspaceV1 | null,
): RequestDeliverySlotState {
  const artifacts = current?.artifacts ?? workspace?.artifacts ?? []
  if (artifacts.some(artifact => artifact.integrityStatus === 'failed')) return 'hash_mismatch'
  if (artifacts.some(artifact => (
    artifact.scanVerdict === 'rejected' || artifact.scanVerdict === 'held'
  ))) return 'quarantined'
  if (lifecycle === 'closed' && closeReason !== 'no_response') {
    return current || workspace ? 'missing' : 'none'
  }
  if (workspace?.revisionState === 'sealed') return 'sealed_waiting'
  if (workspace || artifacts.some(artifact => (
    artifact.integrityStatus === 'pending' || artifact.scanState === 'pending'
  ))) return 'staging'
  if (lifecycle === 'repair_required') return 'repair_required'
  if (lifecycle === 'review_pending') return 'review_pending'
  if (
    (lifecycle === 'delivered' || lifecycle === 'completed' || lifecycle === 'closed')
    && artifacts.some(artifact => artifact.readerHref)
  ) return 'available'
  if (lifecycle === 'closed' && current) return 'missing'
  if (lifecycle === 'delivery_ready') return 'reviewed'
  return current ? 'pending' : 'none'
}

function restrictedModel(
  detail: Extract<RequestCaseDetailResultV1, { visibility: 'held' | 'removed' }>,
): RequestDeliverySlotModel {
  return {
    visibility: detail.visibility,
    restrictedLabel: detail.safeLabel,
    requestId: detail.requestId,
    currentDeliveryRevisionId: null,
    state: detail.visibility === 'held' ? 'quarantined' : 'missing',
    lifecycle: detail.lifecycleState,
    moderation: detail.moderationState,
    publication: detail.publicationState,
    actorRoles: detail.actor.roles,
    version: detail.requestVersion,
    revisionNumber: null,
    revisionLabel: null,
    summary: null,
    submittedAt: null,
    authoredByDisplayName: null,
    authoredByDeidentified: false,
    artifactCount: null,
    totalBytes: null,
    formatLabels: [],
    artifacts: [],
    acceptanceChecks: [],
    evidence: [],
    evidenceChecklistVersion: null,
    rightsSnapshotVersion: null,
    rightsSummary: null,
    review: EMPTY_REVIEW,
    repairHistory: [],
    requesterOutcomes: [],
    integrityMessage: detail.safeLabel,
    builderWorkspace: null,
    commands: EMPTY_COMMANDS,
  }
}

export function toRequestDeliverySlotModel(
  detail: RequestCaseDetailResultV1,
  actorContext: RequestActorContextV1,
): RequestDeliverySlotModel {
  assertActorContext(detail.actor, actorContext)
  if (detail.visibility !== 'full') return restrictedModel(detail)

  const current = detail.deliveryRevisions.find(revision => revision.isCurrent)
  const acceptanceChecks = detail.brief.acceptanceChecks.map(check => ({
    id: check.acceptanceCheckId,
    label: check.text,
  }))
  const labels = new Map(
    acceptanceChecks.map(check => [check.id, check.label] as const),
  )
  const currentReview = current?.reviews.find(review => review.isCurrent)
  const builderWorkspace = mapWorkspace(detail.builderWorkspace, labels)
  const allowClosedReader = (
    detail.lifecycleState !== 'closed'
    || detail.closeReason === 'no_response'
  )
  const artifacts = current?.artifacts.map(
    artifact => mapArtifact(artifact, allowClosedReader),
  ) ?? []
  const formatLabels = Array.from(new Set(
    artifacts.map(artifact => artifact.mediaTypeLabel),
  ))

  return {
    visibility: 'full',
    restrictedLabel: null,
    requestId: detail.requestId,
    currentDeliveryRevisionId: current?.deliveryRevisionId ?? null,
    state: deriveState(
      detail.lifecycleState,
      detail.closeReason,
      current,
      detail.builderWorkspace,
    ),
    lifecycle: detail.lifecycleState,
    moderation: detail.moderationState,
    publication: detail.publicationState,
    actorRoles: detail.actor.roles,
    version: detail.requestVersion,
    revisionNumber: current?.revisionNumber ?? null,
    revisionLabel: current?.revisionLabel ?? null,
    summary: current?.summary ?? null,
    submittedAt: current?.submittedAt ?? null,
    authoredByDisplayName: current?.authoredBy.displayName ?? null,
    authoredByDeidentified: current?.authoredBy.deidentified ?? false,
    artifactCount: current?.artifactCount ?? null,
    totalBytes: current?.totalBytes ?? null,
    formatLabels,
    artifacts,
    acceptanceChecks,
    evidence: current ? mapEvidence(current.builderEvidence, labels) : [],
    evidenceChecklistVersion: current?.evidenceChecklistVersion ?? null,
    rightsSnapshotVersion: current?.rightsSnapshotVersion ?? null,
    rightsSummary: current
      ? 'The builder remains the credited author. The requester receives non-exclusive private use and download rights.'
      : null,
    review: mapReview(currentReview, labels, detail.lifecycleState),
    repairHistory: mapRepairHistory(detail.deliveryRevisions),
    requesterOutcomes: mapRequesterOutcomes(detail.requesterOutcomes, labels),
    integrityMessage: deriveIntegrityMessage(current?.artifacts ?? detail.builderWorkspace?.artifacts ?? []),
    builderWorkspace,
    commands: mapCommands(detail.actor.capabilities, detail),
  }
}
