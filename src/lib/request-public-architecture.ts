import {
  REQUEST_CONTRACT_VERSION,
  RequestContractError,
  type RequestCommandReceipt,
  type SubmitBuildRequestV1,
  validateSubmitBuildRequestV1,
} from './request-lifecycle'

export const REQUEST_PUBLIC_ARCHITECTURE_CONTRACT_VERSION =
  REQUEST_CONTRACT_VERSION

export const REQUEST_INTAKE_AUDIENCES = [
  'invited',
  'authenticated',
] as const
export type RequestIntakeAudience =
  (typeof REQUEST_INTAKE_AUDIENCES)[number]

export const REQUEST_READINESS_GATES = [
  'legal',
  'incident_owner',
  'waf',
  'responsive_qa',
  'attended_lifecycle',
  'notification_transport',
] as const
export type RequestReadinessGate =
  (typeof REQUEST_READINESS_GATES)[number]

export type RequestPublicPolicyVersionsV1 = {
  terms: string
  privacy: string
  acceptableUse: string
  requesterRights: string
  publicationTerms: string
}

export type RequestPublicReadinessV1 = {
  legal: boolean
  incidentOwner: boolean
  waf: boolean
  responsiveQa: boolean
  attendedLifecycle: boolean
  notificationTransport: boolean
  communityAirlock: boolean
}

export type RequestPublicControlsSnapshotV1 = {
  contractVersion: typeof REQUEST_CONTRACT_VERSION
  controlsVersion: number
  acceptingRequests: boolean
  assigningRequests: boolean
  intakeAudience: RequestIntakeAudience
  activeCaseCount: number
  activeCaseCapacity: number
  remainingQueueCapacity: number
  fulfillmentCaseCount: number
  fulfillmentCaseCapacity: number
  remainingFulfillmentCapacity: number
  operatorRosterRequired: boolean
  operatorRosterReady: boolean
  publicIntakeRiskScreening: boolean
  transactionalNotificationsEnabled: boolean
  publicationConsentEnabled: boolean
  publicationAirlockEnabled: boolean
  publicOutcomesEnabled: boolean
  actorHourlyIntakeLimit: number
  networkHourlyIntakeLimit: number
  globalDailyIntakeLimit: number
  policyVersions: RequestPublicPolicyVersionsV1
  readiness: RequestPublicReadinessV1
}

export type RequestPublicAvailabilityV1 =
  RequestPublicControlsSnapshotV1 & {
  intakeEligibility:
    | 'sign_in_required'
    | 'not_admitted'
    | 'already_active'
    | 'controls_off'
    | 'capacity_full'
    | 'readiness_incomplete'
    | 'available'
  riskScreeningRequired: boolean
  unavailableReason:
    | 'controls_off'
    | 'capacity_full'
    | 'readiness_incomplete'
    | null
}

export type RequestPublicOperationsV1 = RequestPublicControlsSnapshotV1 & {
  readinessVersions: Record<RequestReadinessGate, number>
  operatorCounts: {
    triager: number
    builder: number
    reviewer: number
  }
  reportCounts: {
    open: number
    reviewing: number
    pendingAlerts: number
  }
  publicationCounts: {
    consentPending: number
    airlockReady: number
    published: number
  }
}

export type RequestPublicControlsInputV1 = {
  expectedControlsVersion: number
  idempotencyKey: string
  acceptingRequests: boolean
  assigningRequests: boolean
  intakeAudience: RequestIntakeAudience
  activeCaseCapacity: number
  fulfillmentCaseCapacity: number
  operatorRosterRequired: boolean
  publicIntakeRiskScreening: boolean
  transactionalNotificationsEnabled: boolean
  publicationConsentEnabled: boolean
  publicationAirlockEnabled: boolean
  publicOutcomesEnabled: boolean
  actorHourlyIntakeLimit: number
  networkHourlyIntakeLimit: number
  globalDailyIntakeLimit: number
  policyVersions: RequestPublicPolicyVersionsV1
}

export type RequestPublicControlsReceiptV1 =
  RequestPublicControlsSnapshotV1 & {
    replayed: boolean
    occurredAt: string
  }

export type RequestOperatorRoleV1 = 'triager' | 'builder' | 'reviewer'
export type RequestOperatorMembershipStateV1 =
  | 'active'
  | 'paused'
  | 'revoked'

export type RequestOperatorMembershipV1 = {
  membershipId: string
  role: RequestOperatorRoleV1
  version: number
  state: RequestOperatorMembershipStateV1
  maxActiveCases: number
  availableFrom: string | null
  availableUntil: string | null
  currentlyAvailable: boolean
}

export type RequestOperatorCandidateV1 = {
  accountId: string
  displayName: string
  isAdmin: boolean
  memberships: RequestOperatorMembershipV1[]
}

export type RequestOperatorMembershipInputV1 = {
  accountId: string
  role: RequestOperatorRoleV1
  expectedMembershipVersion: number
  state: RequestOperatorMembershipStateV1
  maxActiveCases: number
  availableFrom: string | null
  availableUntil: string | null
  reason: string
  idempotencyKey: string
}

export type RequestOperatorMembershipReceiptV1 = {
  membershipId: string
  accountId: string | null
  accountDeidentified: boolean
  operatorRole: RequestOperatorRoleV1
  membershipVersion: number
  membershipState: RequestOperatorMembershipStateV1
  maxActiveCases: number
  availableFrom: string | null
  availableUntil: string | null
  replayed: boolean
  occurredAt: string
}

export type RequestReadinessEvidenceInputV1 = {
  gate: RequestReadinessGate
  expectedEvidenceVersion: number
  state: 'confirmed' | 'revoked'
  evidenceReference: string
  validUntil: string | null
  note: string
  idempotencyKey: string
}

export type RequestReadinessEvidenceReceiptV1 = {
  gate: RequestReadinessGate
  evidenceVersion: number
  state: 'confirmed' | 'revoked'
  validUntil: string | null
  replayed: boolean
  occurredAt: string
}

export type RequestIntakeRiskGrantV1 =
  | {
      status: 'clear'
      grantId: string
      expiresAt: string
      reason: null
      replayed: boolean
    }
  | {
      status: 'denied'
      grantId: null
      expiresAt: null
      reason: 'actor_limit' | 'network_limit' | 'global_limit'
      replayed: boolean
    }

export type RequestIntakeAttestationV1 = {
  termsVersion: string
  privacyVersion: string
  acceptableUseVersion: string
  requesterRightsVersion: string
  termsAccepted: true
  privacyAcknowledged: true
  acceptableUseAccepted: true
  requesterRightsAccepted: true
}

export type SubmitPublicBuildRequestV1 = {
  request: SubmitBuildRequestV1
  riskGrantId: string | null
  attestation: RequestIntakeAttestationV1
}

export const REQUEST_REPORT_CATEGORIES = [
  'safety',
  'privacy',
  'integrity',
  'rights',
  'service',
] as const
export type RequestReportCategoryV1 =
  (typeof REQUEST_REPORT_CATEGORIES)[number]
export type RequestReportStatusV1 =
  | 'open'
  | 'reviewing'
  | 'resolved'
  | 'dismissed'

export type RequestReportReceiptV1 = {
  reportId: string
  requestId: string
  status: RequestReportStatusV1
  replayed: boolean
  occurredAt: string
}

export type CreateRequestReportInputV1 = {
  requestId: string
  category: RequestReportCategoryV1
  details: string
  idempotencyKey: string
}

export type SetRequestReportStatusInputV1 = {
  reportId: string
  expectedStatus: 'open' | 'reviewing'
  nextStatus: 'reviewing' | 'resolved' | 'dismissed'
  resolutionNote: string | null
  idempotencyKey: string
}

export type RequestReportV1 = {
  reportId: string
  requestId: string
  category: RequestReportCategoryV1
  priority: 0 | 1
  details: string
  status: RequestReportStatusV1
  resolutionNote: string | null
  alertStatus: 'pending' | 'delivered' | 'failed' | 'suppressed' | null
  createdAt: string
  updatedAt: string
}

export type RequestReportCursorV1 = {
  priority: 0 | 1
  createdAt: string
  reportId: string
}

export type RequestReportPageV1 = {
  items: RequestReportV1[]
  nextCursor: RequestReportCursorV1 | null
}

export type RequestNotificationPreferenceV1 = {
  preferenceVersion: number
  transactionalEmailEnabled: boolean
  changedAt: string | null
}

export type RequestNotificationPreferenceReceiptV1 = {
  preferenceVersion: number
  transactionalEmailEnabled: boolean
  replayed: boolean
  occurredAt: string
}

export type SetRequestNotificationPreferenceInputV1 = {
  expectedPreferenceVersion: number
  transactionalEmailEnabled: boolean
  idempotencyKey: string
}

export type RequestPublicationProposalStatusV1 =
  | 'draft'
  | 'consent_pending'
  | 'fully_consented'
  | 'in_airlock'
  | 'published'
  | 'declined'
  | 'withdrawn'
  | 'removed'

export type RequestPublicationCapabilityV1 =
  | 'propose'
  | 'replace_proposal'
  | 'requester_consent'
  | 'builder_consent'
  | 'decline'
  | 'withdraw'
  | 'submit_airlock'
  | 'review_airlock'
  | 'publish_outcome'

export type RequestPublicationProposalViewV1 = {
  proposalId: string
  proposalVersion: number
  status: RequestPublicationProposalStatusV1
  safeTitle: string
  safeSummary: string
  requesterAttribution: 'anonymous' | 'credited'
  reusePermission: 'view_only' | 'adapt_with_credit'
  requesterConsented: boolean
  builderConsented: boolean
  airlockReviewVerdict: 'approved' | 'changes_required' | null
  airlockReviewedAt: string | null
  airlockReviewNote: string | null
  publishedAt: string | null
  updatedAt: string
}

export type RequestPublicationWithdrawalProposalV1 = Pick<
  RequestPublicationProposalViewV1,
  'proposalId' | 'proposalVersion' | 'status' | 'safeTitle' | 'safeSummary'
>

export type RequestPublicationViewV1 =
  | {
      visibility: 'restricted'
      publicationState: string
      status: 'held' | 'removed'
      capabilities: []
    }
  | {
      visibility: 'withdrawal_only'
      requestVersion: number
      publicationState: string
      status: 'held' | 'private_scope_expired'
      proposal: RequestPublicationWithdrawalProposalV1
      capabilities: ['withdraw']
    }
  | {
      visibility: 'full'
      requestVersion: number
      publicationState: string
      consentEnabled: boolean
      proposal: RequestPublicationProposalViewV1 | null
      capabilities: RequestPublicationCapabilityV1[]
    }

type PublicationCommandBase = {
  requestId: string
  expectedRequestVersion: number
  expectedProposalVersion: number | null
  idempotencyKey: string
}

export type RequestPublicationCommandV1 =
  | (PublicationCommandBase & {
      kind: 'propose' | 'replace_proposal'
      payload: { safeTitle: string; safeSummary: string }
    })
  | (PublicationCommandBase & {
      kind: 'requester_consent'
      payload: {
        requesterAttribution: 'anonymous' | 'credited'
        publicationTermsVersion: string
      }
    })
  | (PublicationCommandBase & {
      kind: 'builder_consent'
      payload: {
        reusePermission: 'view_only' | 'adapt_with_credit'
        publicationTermsVersion: string
      }
    })
  | (PublicationCommandBase & {
      kind: 'decline' | 'withdraw' | 'submit_airlock'
      payload: Record<string, never>
    })

export type RequestPublicOutcomeV1 = {
  slug: string
  title: string
  summary: string
  builder: { displayName: string; deidentified: boolean }
  requester: { displayName: string; deidentified: boolean } | null
  reusePermission: 'view_only' | 'adapt_with_credit'
  projectId: string
  projectHref: string
  publishedAt: string
}

export type RequestPublicOutcomePageV1 = {
  available: boolean
  items: RequestPublicOutcomeV1[]
  nextCursor: {
    publishedAt: string
    slug: string
  } | null
}

export type RequestPublicationQueueItemV1 = {
  proposalId: string
  requestId: string
  proposalVersion: number
  status: RequestPublicationProposalStatusV1
  safeTitle: string
  safeSummary: string
  requesterConsented: boolean
  builderConsented: boolean
  requesterAttribution: 'anonymous' | 'credited'
  reusePermission: 'view_only' | 'adapt_with_credit'
  airlockReviewVerdict: 'approved' | 'changes_required' | null
  airlockReviewedAt: string | null
  airlockReviewNote: string | null
  updatedAt: string
  publishedAt: string | null
}

export type RequestPublicationQueueV1 = {
  items: RequestPublicationQueueItemV1[]
  nextCursor: null
}

export type RequestIntakeRiskGrantInputV1 = {
  actorId: string
  intakeIdempotencyKey: string
  networkDigest: string
  riskEngineVersion: string
}

export type PublishRequestOutcomeInputV1 = {
  proposalId: string
  publishedProjectId: string
  idempotencyKey: string
}

export type RequestPublicationReviewInputV1 = {
  proposalId: string
  expectedProposalVersion: number
  verdict: 'approve' | 'changes_required'
  checks: {
    privateContentExcluded: boolean
    claimsSupportedByDelivery: boolean
    attributionMatchesConsent: boolean
    reusePermissionMatchesConsent: boolean
    publicTruthReady: boolean
  }
  reviewNotes: string
  idempotencyKey: string
}

export type RequestPublicationReviewReceiptV1 = {
  proposalId: string
  proposalVersion: number
  verdict: 'approved' | 'changes_required'
  replayed: boolean
  occurredAt: string
}

export type RequestPublicationWithdrawalReceiptV1 = {
  requestId: string
  commandId: string
  occurredAt: string
}

export type RequestNotificationProjectionV1 = {
  eventsProjected: number
  reportsProjected: number
  controlEnabled: boolean
}

export type RequestNotificationDeliveryV1 = {
  deliveryId: string
  claimToken: string
  templateKey:
    | 'request_submitted'
    | 'request_action_needed'
    | 'request_delivery_ready'
    | 'request_status_changed'
    | 'request_report_received'
  requestPath: string
  attempt: number
}

export type RequestNotificationClaimV1 = {
  items: RequestNotificationDeliveryV1[]
}

export type RequestNotificationSendResolutionV1 =
  | {
      status: 'authorized'
      deliveryId: string
      claimToken: string
      recipient: string
      templateKey: RequestNotificationDeliveryV1['templateKey']
      requestPath: string
    }
  | {
      status: 'suppressed'
      reason:
        | 'control_off'
        | 'preference_off'
        | 'identity_unavailable'
        | 'authorization_ended'
    }

export type RequestNotificationFinishV1 = {
  deliveryState: 'delivered' | 'retry' | 'dead'
  attempts: number
}

export type RequestOutcomePublicationReceiptV1 = {
  publicSlug: string
  publishedProjectId: string
  publishedAt: string
  replayed: boolean
}

export type RequestPublicArchitectureMaintenanceV1 = {
  reportsPurged: number
  proposalsPurged: number
  riskGrantsDeleted: number
  notificationDeliveriesDeleted: number
  readinessEvidenceDeleted: number
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/
const VERSION = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*-[0-9a-f]{12}$/

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestContractError(`${label} must be an object.`)
  }
  return value as Record<string, unknown>
}

function exact(
  value: Record<string, unknown>,
  keys: readonly string[],
  label: string,
) {
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new RequestContractError(`${label} fields are invalid.`)
  }
}

function string(
  value: unknown,
  label: string,
  min = 1,
  max = 4_000,
) {
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.trim().length > max ||
    /[\0\r]/.test(value)
  ) throw new RequestContractError(`${label} is invalid.`)
  return value
}

function nullableString(
  value: unknown,
  label: string,
  min = 1,
  max = 4_000,
) {
  return value === null ? null : string(value, label, min, max)
}

function bool(value: unknown, label: string) {
  if (typeof value !== 'boolean') {
    throw new RequestContractError(`${label} must be boolean.`)
  }
  return value
}

function integer(value: unknown, label: string, min = 0, max = 10_000) {
  if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > max) {
    throw new RequestContractError(`${label} is invalid.`)
  }
  return Number(value)
}

function uuid(value: unknown, label: string) {
  const parsed = string(value, label)
  if (!UUID.test(parsed)) throw new RequestContractError(`${label} is invalid.`)
  return parsed
}

function timestamp(value: unknown, label: string) {
  const parsed = string(value, label)
  if (!Number.isFinite(Date.parse(parsed))) {
    throw new RequestContractError(`${label} is invalid.`)
  }
  return parsed
}

function nullableTimestamp(value: unknown, label: string) {
  return value === null ? null : timestamp(value, label)
}

function oneOf<T extends string>(
  value: unknown,
  options: readonly T[],
  label: string,
): T {
  if (typeof value !== 'string' || !options.includes(value as T)) {
    throw new RequestContractError(`${label} is invalid.`)
  }
  return value as T
}

function policyVersions(value: unknown): RequestPublicPolicyVersionsV1 {
  const item = record(value, 'Request policy versions')
  exact(
    item,
    ['terms', 'privacy', 'acceptableUse', 'requesterRights', 'publicationTerms'],
    'Request policy versions',
  )
  const result = {
    terms: string(item.terms, 'Terms version'),
    privacy: string(item.privacy, 'Privacy version'),
    acceptableUse: string(item.acceptableUse, 'Acceptable-use version'),
    requesterRights: string(item.requesterRights, 'Requester-rights version'),
    publicationTerms: string(item.publicationTerms, 'Publication-terms version'),
  }
  if (Object.values(result).some((item) => !VERSION.test(item))) {
    throw new RequestContractError('Request policy version is invalid.')
  }
  return result
}

function readiness(value: unknown): RequestPublicReadinessV1 {
  const item = record(value, 'Request readiness')
  exact(
    item,
    [
      'legal',
      'incidentOwner',
      'waf',
      'responsiveQa',
      'attendedLifecycle',
      'notificationTransport',
      'communityAirlock',
    ],
    'Request readiness',
  )
  return {
    legal: bool(item.legal, 'Legal readiness'),
    incidentOwner: bool(item.incidentOwner, 'Incident-owner readiness'),
    waf: bool(item.waf, 'WAF readiness'),
    responsiveQa: bool(item.responsiveQa, 'Responsive QA readiness'),
    attendedLifecycle: bool(item.attendedLifecycle, 'Lifecycle readiness'),
    notificationTransport: bool(
      item.notificationTransport,
      'Notification readiness',
    ),
    communityAirlock: bool(item.communityAirlock, 'Community airlock readiness'),
  }
}

const REQUEST_PUBLIC_CONTROL_SNAPSHOT_KEYS = [
  'contractVersion',
  'controlsVersion',
  'acceptingRequests',
  'assigningRequests',
  'intakeAudience',
  'activeCaseCount',
  'activeCaseCapacity',
  'remainingQueueCapacity',
  'fulfillmentCaseCount',
  'fulfillmentCaseCapacity',
  'remainingFulfillmentCapacity',
  'operatorRosterRequired',
  'operatorRosterReady',
  'publicIntakeRiskScreening',
  'transactionalNotificationsEnabled',
  'publicationConsentEnabled',
  'publicationAirlockEnabled',
  'publicOutcomesEnabled',
  'actorHourlyIntakeLimit',
  'networkHourlyIntakeLimit',
  'globalDailyIntakeLimit',
  'policyVersions',
  'readiness',
] as const

function parseRequestPublicControlsSnapshotV1(
  value: unknown,
  additionalKeys: readonly string[] = [],
): RequestPublicControlsSnapshotV1 {
  const item = record(value, 'Request public controls snapshot')
  exact(
    item,
    [...REQUEST_PUBLIC_CONTROL_SNAPSHOT_KEYS, ...additionalKeys],
    'Request public controls snapshot',
  )
  const result: RequestPublicControlsSnapshotV1 = {
    contractVersion: integer(item.contractVersion, 'Contract version', 1, 1) as 1,
    controlsVersion: integer(item.controlsVersion, 'Controls version', 1),
    acceptingRequests: bool(item.acceptingRequests, 'Accepting requests'),
    assigningRequests: bool(item.assigningRequests, 'Assigning requests'),
    intakeAudience: oneOf(
      item.intakeAudience,
      REQUEST_INTAKE_AUDIENCES,
      'Intake audience',
    ),
    activeCaseCount: integer(item.activeCaseCount, 'Active case count', 0, 5_000),
    activeCaseCapacity: integer(
      item.activeCaseCapacity,
      'Active case capacity',
      1,
      5_000,
    ),
    remainingQueueCapacity: integer(
      item.remainingQueueCapacity,
      'Remaining queue capacity',
      0,
      5_000,
    ),
    fulfillmentCaseCount: integer(
      item.fulfillmentCaseCount,
      'Fulfillment case count',
      0,
      5_000,
    ),
    fulfillmentCaseCapacity: integer(
      item.fulfillmentCaseCapacity,
      'Fulfillment case capacity',
      1,
      50,
    ),
    remainingFulfillmentCapacity: integer(
      item.remainingFulfillmentCapacity,
      'Remaining fulfillment capacity',
      0,
      50,
    ),
    operatorRosterRequired: bool(
      item.operatorRosterRequired,
      'Operator roster requirement',
    ),
    operatorRosterReady: bool(item.operatorRosterReady, 'Operator roster readiness'),
    publicIntakeRiskScreening: bool(
      item.publicIntakeRiskScreening,
      'Public intake risk screening',
    ),
    transactionalNotificationsEnabled: bool(
      item.transactionalNotificationsEnabled,
      'Transactional notifications control',
    ),
    publicationConsentEnabled: bool(
      item.publicationConsentEnabled,
      'Publication consent control',
    ),
    publicationAirlockEnabled: bool(
      item.publicationAirlockEnabled,
      'Publication airlock control',
    ),
    publicOutcomesEnabled: bool(
      item.publicOutcomesEnabled,
      'Public outcomes control',
    ),
    actorHourlyIntakeLimit: integer(
      item.actorHourlyIntakeLimit,
      'Actor intake limit',
      1,
      25,
    ),
    networkHourlyIntakeLimit: integer(
      item.networkHourlyIntakeLimit,
      'Network intake limit',
      1,
      100,
    ),
    globalDailyIntakeLimit: integer(
      item.globalDailyIntakeLimit,
      'Global intake limit',
      1,
      10_000,
    ),
    policyVersions: policyVersions(item.policyVersions),
    readiness: readiness(item.readiness),
  }
  if (
    result.remainingQueueCapacity !==
      Math.max(result.activeCaseCapacity - result.activeCaseCount, 0) ||
    result.remainingFulfillmentCapacity !==
      Math.max(
        result.fulfillmentCaseCapacity - result.fulfillmentCaseCount,
        0,
      )
  ) throw new RequestContractError('Request capacity projection is inconsistent.')
  return result
}

export function parseRequestPublicAvailabilityV1(
  value: unknown,
): RequestPublicAvailabilityV1 {
  const item = record(value, 'Request public availability')
  return {
    ...parseRequestPublicControlsSnapshotV1(value, [
      'intakeEligibility',
      'riskScreeningRequired',
      'unavailableReason',
    ]),
    intakeEligibility: oneOf(
      item.intakeEligibility,
      [
        'sign_in_required',
        'not_admitted',
        'already_active',
        'controls_off',
        'capacity_full',
        'readiness_incomplete',
        'available',
      ] as const,
      'Intake eligibility',
    ),
    riskScreeningRequired: bool(
      item.riskScreeningRequired,
      'Risk screening requirement',
    ),
    unavailableReason:
      item.unavailableReason === null
        ? null
        : oneOf(
            item.unavailableReason,
            [
              'controls_off',
              'capacity_full',
              'readiness_incomplete',
            ] as const,
            'Unavailable reason',
          ),
  }
}

export function parseRequestPublicOperationsV1(
  value: unknown,
): RequestPublicOperationsV1 {
  const item = record(value, 'Request public operations')
  const base = parseRequestPublicControlsSnapshotV1(value, [
    'readinessVersions',
    'operatorCounts',
    'reportCounts',
    'publicationCounts',
  ])
  const operatorCounts = record(item.operatorCounts, 'Operator counts')
  const reportCounts = record(item.reportCounts, 'Report counts')
  const publicationCounts = record(item.publicationCounts, 'Publication counts')
  const readinessVersionValues = record(
    item.readinessVersions,
    'Readiness versions',
  )
  exact(
    readinessVersionValues,
    REQUEST_READINESS_GATES,
    'Readiness versions',
  )
  exact(
    operatorCounts,
    ['triager', 'builder', 'reviewer'],
    'Operator counts',
  )
  exact(
    reportCounts,
    ['open', 'reviewing', 'pendingAlerts'],
    'Report counts',
  )
  exact(
    publicationCounts,
    ['consentPending', 'airlockReady', 'published'],
    'Publication counts',
  )
  return {
    ...base,
    readinessVersions: Object.fromEntries(
      REQUEST_READINESS_GATES.map((gate) => [
        gate,
        integer(
          readinessVersionValues[gate],
          `${gate} readiness version`,
          0,
          10_000_000,
        ),
      ]),
    ) as Record<RequestReadinessGate, number>,
    operatorCounts: {
      triager: integer(operatorCounts.triager, 'Triager count'),
      builder: integer(operatorCounts.builder, 'Builder count'),
      reviewer: integer(operatorCounts.reviewer, 'Reviewer count'),
    },
    reportCounts: {
      open: integer(reportCounts.open, 'Open report count'),
      reviewing: integer(reportCounts.reviewing, 'Reviewing report count'),
      pendingAlerts: integer(
        reportCounts.pendingAlerts,
        'Pending report alert count',
      ),
    },
    publicationCounts: {
      consentPending: integer(
        publicationCounts.consentPending,
        'Consent-pending count',
      ),
      airlockReady: integer(
        publicationCounts.airlockReady,
        'Airlock-ready count',
      ),
      published: integer(publicationCounts.published, 'Published outcome count'),
    },
  }
}

export function parseRequestPublicControlsReceiptV1(
  value: unknown,
): RequestPublicControlsReceiptV1 {
  const item = record(value, 'Request public controls receipt')
  return {
    ...parseRequestPublicControlsSnapshotV1(value, [
      'replayed',
      'occurredAt',
    ]),
    replayed: bool(item.replayed, 'Controls replay state'),
    occurredAt: timestamp(item.occurredAt, 'Controls occurrence'),
  }
}

export function validateRequestPublicControlsInputV1(
  value: RequestPublicControlsInputV1,
) {
  const item = record(value, 'Request public controls')
  exact(
    item,
    [
      'expectedControlsVersion',
      'idempotencyKey',
      'acceptingRequests',
      'assigningRequests',
      'intakeAudience',
      'activeCaseCapacity',
      'fulfillmentCaseCapacity',
      'operatorRosterRequired',
      'publicIntakeRiskScreening',
      'transactionalNotificationsEnabled',
      'publicationConsentEnabled',
      'publicationAirlockEnabled',
      'publicOutcomesEnabled',
      'actorHourlyIntakeLimit',
      'networkHourlyIntakeLimit',
      'globalDailyIntakeLimit',
      'policyVersions',
    ],
    'Request public controls',
  )
  if (!KEY.test(value.idempotencyKey)) {
    throw new RequestContractError('Controls idempotency key is invalid.')
  }
  integer(value.expectedControlsVersion, 'Expected controls version', 1)
  integer(value.activeCaseCapacity, 'Active case capacity', 1, 5_000)
  integer(value.fulfillmentCaseCapacity, 'Fulfillment capacity', 1, 50)
  if (value.fulfillmentCaseCapacity > value.activeCaseCapacity) {
    throw new RequestContractError('Fulfillment capacity exceeds queue capacity.')
  }
  integer(value.actorHourlyIntakeLimit, 'Actor intake limit', 1, 25)
  integer(value.networkHourlyIntakeLimit, 'Network intake limit', 1, 100)
  integer(value.globalDailyIntakeLimit, 'Global intake limit', 1, 10_000)
  oneOf(value.intakeAudience, REQUEST_INTAKE_AUDIENCES, 'Intake audience')
  bool(value.acceptingRequests, 'Accepting Requests control')
  bool(value.assigningRequests, 'Assigning Requests control')
  bool(value.operatorRosterRequired, 'Operator roster control')
  bool(value.publicIntakeRiskScreening, 'Public intake screening control')
  bool(
    value.transactionalNotificationsEnabled,
    'Transactional notifications control',
  )
  bool(value.publicationConsentEnabled, 'Publication consent control')
  bool(value.publicationAirlockEnabled, 'Publication airlock control')
  bool(value.publicOutcomesEnabled, 'Public outcomes control')
  policyVersions(value.policyVersions)
  return value
}

export function validateSubmitPublicBuildRequestV1(
  value: SubmitPublicBuildRequestV1,
) {
  const item = record(value, 'Public Request submission')
  exact(item, ['request', 'riskGrantId', 'attestation'], 'Public Request submission')
  const request = validateSubmitBuildRequestV1(value.request)
  if (value.riskGrantId !== null) uuid(value.riskGrantId, 'Risk grant id')
  const attestation = record(value.attestation, 'Request attestation')
  exact(
    attestation,
    [
      'termsVersion',
      'privacyVersion',
      'acceptableUseVersion',
      'requesterRightsVersion',
      'termsAccepted',
      'privacyAcknowledged',
      'acceptableUseAccepted',
      'requesterRightsAccepted',
    ],
    'Request attestation',
  )
  for (const version of [
    value.attestation.termsVersion,
    value.attestation.privacyVersion,
    value.attestation.acceptableUseVersion,
    value.attestation.requesterRightsVersion,
  ]) {
    if (!VERSION.test(version)) {
      throw new RequestContractError('Request attestation version is invalid.')
    }
  }
  if (
    value.attestation.termsAccepted !== true ||
    value.attestation.privacyAcknowledged !== true ||
    value.attestation.acceptableUseAccepted !== true ||
    value.attestation.requesterRightsAccepted !== true
  ) throw new RequestContractError('Every Request attestation is required.')
  return { ...value, request }
}

export type RequestPublicCommandReceipt = RequestCommandReceipt

export const requestPublicValidation = {
  key(value: string, label = 'Idempotency key') {
    if (!KEY.test(value)) throw new RequestContractError(`${label} is invalid.`)
    return value
  },
  uuid,
  timestamp,
  nullableTimestamp,
  string,
  nullableString,
  integer,
  bool,
  oneOf,
  record,
  exact,
  policyVersions,
} as const

export const requestPublicPatterns = {
  uuid: UUID,
  key: KEY,
  version: VERSION,
  slug: SLUG,
} as const
