import {
  REQUEST_CONTRACT_VERSION,
  RequestContractError,
  type RequestCommandReceipt,
} from './request-lifecycle'
import {
  RequestAuthorityError,
  parseRequestCommandReceiptV1,
  type RequestRpcClient,
} from './request-service'
import {
  REQUEST_READINESS_GATES,
  REQUEST_REPORT_CATEGORIES,
  parseRequestPublicAvailabilityV1,
  parseRequestPublicControlsReceiptV1,
  parseRequestPublicOperationsV1,
  requestPublicPatterns,
  requestPublicValidation,
  validateRequestPublicControlsInputV1,
  validateSubmitPublicBuildRequestV1,
  type CreateRequestReportInputV1,
  type PublishRequestOutcomeInputV1,
  type RequestIntakeRiskGrantInputV1,
  type RequestIntakeRiskGrantV1,
  type RequestNotificationClaimV1,
  type RequestNotificationFinishV1,
  type RequestNotificationPreferenceReceiptV1,
  type RequestNotificationPreferenceV1,
  type RequestNotificationProjectionV1,
  type RequestNotificationSendResolutionV1,
  type RequestOperatorCandidateV1,
  type RequestOperatorMembershipInputV1,
  type RequestOperatorMembershipReceiptV1,
  type RequestOutcomePublicationReceiptV1,
  type RequestPublicArchitectureMaintenanceV1,
  type RequestPublicAvailabilityV1,
  type RequestPublicControlsInputV1,
  type RequestPublicControlsReceiptV1,
  type RequestPublicOperationsV1,
  type RequestPublicOutcomePageV1,
  type RequestPublicOutcomeV1,
  type RequestPublicationCommandV1,
  type RequestPublicationQueueV1,
  type RequestPublicationReviewInputV1,
  type RequestPublicationReviewReceiptV1,
  type RequestPublicationViewV1,
  type RequestReadinessEvidenceInputV1,
  type RequestReadinessEvidenceReceiptV1,
  type RequestReportPageV1,
  type RequestReportReceiptV1,
  type SetRequestNotificationPreferenceInputV1,
  type SetRequestReportStatusInputV1,
  type SubmitPublicBuildRequestV1,
} from './request-public-architecture'

const RPC = {
  availability: 'get_build_request_public_availability_v1',
  operations: 'get_build_request_public_operations_v1',
  setControls: 'set_build_request_public_controls_v1',
  setOperator: 'set_build_request_operator_membership_v1',
  operators: 'list_build_request_operator_directory_v1',
  readiness: 'record_build_request_readiness_v1',
  riskGrant: 'issue_build_request_intake_risk_grant_v1',
  submit: 'submit_build_request_public_v1',
  report: 'report_build_request_v1',
  reports: 'list_build_request_reports_v1',
  setReportStatus: 'set_build_request_report_status_v1',
  notificationPreference: 'get_build_request_notification_preference_v1',
  setNotificationPreference: 'set_build_request_notification_preference_v1',
  projectNotifications: 'project_build_request_notifications_v1',
  claimNotifications: 'claim_build_request_notifications_v1',
  resolveNotificationSend: 'resolve_build_request_notification_send_v1',
  finishNotification: 'finish_build_request_notification_v1',
  publication: 'get_build_request_publication_v1',
  publicationCommand: 'build_request_publication_command_v1',
  publicationReview: 'review_build_request_publication_v1',
  publicationQueue: 'list_build_request_publication_queue_v1',
  publishOutcome: 'publish_build_request_outcome_v1',
  publicOutcomes: 'list_public_build_request_outcomes_v1',
  publicOutcome: 'get_public_build_request_outcome_v1',
  maintenance: 'maintain_build_request_public_architecture_v1',
} as const

const PUBLICATION_STATUSES = [
  'draft',
  'consent_pending',
  'fully_consented',
  'in_airlock',
  'published',
  'declined',
  'withdrawn',
  'removed',
] as const

const PUBLICATION_CAPABILITIES = [
  'propose',
  'replace_proposal',
  'requester_consent',
  'builder_consent',
  'decline',
  'withdraw',
  'submit_airlock',
  'review_airlock',
  'publish_outcome',
] as const

const NOTIFICATION_TEMPLATES = [
  'request_submitted',
  'request_action_needed',
  'request_delivery_ready',
  'request_status_changed',
  'request_report_received',
] as const

type RpcName = (typeof RPC)[keyof typeof RPC]

async function read<T>(
  client: RequestRpcClient,
  name: RpcName,
  parameters: Record<string, unknown>,
  parser: (value: unknown) => T,
): Promise<T> {
  const { data, error } = await client.rpc(name, parameters)
  if (error) throw new RequestAuthorityError(error)
  return parser(data)
}

function row(value: unknown, label: string) {
  const candidate = Array.isArray(value) ? value[0] : value
  return requestPublicValidation.record(candidate, label)
}

function exactRecord(
  value: unknown,
  label: string,
  keys: readonly string[],
) {
  const item = requestPublicValidation.record(value, label)
  requestPublicValidation.exact(item, keys, label)
  return item
}

function exactRow(
  value: unknown,
  label: string,
  keys: readonly string[],
) {
  const item = row(value, label)
  requestPublicValidation.exact(item, keys, label)
  return item
}

function parseOperatorMembership(value: unknown) {
  const item = exactRecord(value, 'Operator membership', [
    'membershipId',
    'role',
    'version',
    'state',
    'maxActiveCases',
    'availableFrom',
    'availableUntil',
    'currentlyAvailable',
  ])
  return {
    membershipId: requestPublicValidation.uuid(
      item.membershipId,
      'Operator membership id',
    ),
    role: requestPublicValidation.oneOf(
      item.role,
      ['triager', 'builder', 'reviewer'] as const,
      'Operator role',
    ),
    version: requestPublicValidation.integer(
      item.version,
      'Operator membership version',
      1,
      10_000_000,
    ),
    state: requestPublicValidation.oneOf(
      item.state,
      ['active', 'paused', 'revoked'] as const,
      'Operator membership state',
    ),
    maxActiveCases: requestPublicValidation.integer(
      item.maxActiveCases,
      'Operator workload limit',
      1,
      50,
    ),
    availableFrom: requestPublicValidation.nullableTimestamp(
      item.availableFrom,
      'Operator available from',
    ),
    availableUntil: requestPublicValidation.nullableTimestamp(
      item.availableUntil,
      'Operator available until',
    ),
    currentlyAvailable: requestPublicValidation.bool(
      item.currentlyAvailable,
      'Operator availability',
    ),
  }
}

function parseOperatorDirectory(value: unknown): {
  items: RequestOperatorCandidateV1[]
  nextCursor: null
} {
  const page = exactRow(value, 'Operator directory', [
    'items',
    'nextCursor',
  ])
  if (!Array.isArray(page.items) || page.nextCursor !== null) {
    throw new RequestContractError('Operator directory is invalid.')
  }
  return {
    items: page.items.map((candidate) => {
      const item = exactRecord(
        candidate,
        'Operator candidate',
        ['accountId', 'displayName', 'isAdmin', 'memberships'],
      )
      if (!Array.isArray(item.memberships)) {
        throw new RequestContractError('Operator memberships are invalid.')
      }
      return {
        accountId: requestPublicValidation.uuid(
          item.accountId,
          'Operator account id',
        ),
        displayName: requestPublicValidation.string(
          item.displayName,
          'Operator display name',
          1,
          120,
        ),
        isAdmin: requestPublicValidation.bool(
          item.isAdmin,
          'Operator admin state',
        ),
        memberships: item.memberships.map(parseOperatorMembership),
      }
    }),
    nextCursor: null,
  }
}

function parseOperatorReceipt(
  value: unknown,
): RequestOperatorMembershipReceiptV1 {
  const item = exactRow(value, 'Operator membership receipt', [
    'membershipId',
    'accountId',
    'accountDeidentified',
    'operatorRole',
    'membershipVersion',
    'membershipState',
    'maxActiveCases',
    'availableFrom',
    'availableUntil',
    'replayed',
    'occurredAt',
  ])
  const accountDeidentified = requestPublicValidation.bool(
    item.accountDeidentified,
    'Operator account deidentification',
  )
  const accountId = item.accountId === null
    ? null
    : requestPublicValidation.uuid(item.accountId, 'Operator account id')
  if ((accountId === null) !== accountDeidentified) {
    throw new RequestContractError(
      'Operator account identity pairing is invalid.',
    )
  }
  return {
    membershipId: requestPublicValidation.uuid(
      item.membershipId,
      'Operator membership id',
    ),
    accountId,
    accountDeidentified,
    operatorRole: requestPublicValidation.oneOf(
      item.operatorRole,
      ['triager', 'builder', 'reviewer'] as const,
      'Operator role',
    ),
    membershipVersion: requestPublicValidation.integer(
      item.membershipVersion,
      'Operator membership version',
      1,
      10_000_000,
    ),
    membershipState: requestPublicValidation.oneOf(
      item.membershipState,
      ['active', 'paused', 'revoked'] as const,
      'Operator membership state',
    ),
    maxActiveCases: requestPublicValidation.integer(
      item.maxActiveCases,
      'Operator workload limit',
      1,
      50,
    ),
    availableFrom: requestPublicValidation.nullableTimestamp(
      item.availableFrom,
      'Operator available from',
    ),
    availableUntil: requestPublicValidation.nullableTimestamp(
      item.availableUntil,
      'Operator available until',
    ),
    replayed: requestPublicValidation.bool(item.replayed, 'Replay state'),
    occurredAt: requestPublicValidation.timestamp(
      item.occurredAt,
      'Operator membership occurrence',
    ),
  }
}

function parseReadinessReceipt(
  value: unknown,
): RequestReadinessEvidenceReceiptV1 {
  const item = exactRow(value, 'Readiness receipt', [
    'gate',
    'evidenceVersion',
    'state',
    'validUntil',
    'replayed',
    'occurredAt',
  ])
  return {
    gate: requestPublicValidation.oneOf(
      item.gate,
      REQUEST_READINESS_GATES,
      'Readiness gate',
    ),
    evidenceVersion: requestPublicValidation.integer(
      item.evidenceVersion,
      'Readiness evidence version',
      1,
      10_000_000,
    ),
    state: requestPublicValidation.oneOf(
      item.state,
      ['confirmed', 'revoked'] as const,
      'Readiness evidence state',
    ),
    validUntil: requestPublicValidation.nullableTimestamp(
      item.validUntil,
      'Readiness validity',
    ),
    replayed: requestPublicValidation.bool(item.replayed, 'Replay state'),
    occurredAt: requestPublicValidation.timestamp(
      item.occurredAt,
      'Readiness occurrence',
    ),
  }
}

function parseRiskGrant(value: unknown): RequestIntakeRiskGrantV1 {
  const item = exactRow(value, 'Request intake risk result', [
    'status',
    'grantId',
    'expiresAt',
    'reason',
    'replayed',
  ])
  const status = requestPublicValidation.oneOf(
    item.status,
    ['clear', 'denied'] as const,
    'Risk result',
  )
  const replayed = requestPublicValidation.bool(item.replayed, 'Replay state')
  if (status === 'clear') {
    if (item.reason !== null) {
      throw new RequestContractError('Clear risk result has a denial reason.')
    }
    return {
      status,
      grantId: requestPublicValidation.uuid(item.grantId, 'Risk grant id'),
      expiresAt: requestPublicValidation.timestamp(
        item.expiresAt,
        'Risk grant expiry',
      ),
      reason: null,
      replayed,
    }
  }
  if (item.grantId !== null || item.expiresAt !== null) {
    throw new RequestContractError('Denied risk result exposes a grant.')
  }
  return {
    status,
    grantId: null,
    expiresAt: null,
    reason: requestPublicValidation.oneOf(
      item.reason,
      ['actor_limit', 'network_limit', 'global_limit'] as const,
      'Risk denial',
    ),
    replayed,
  }
}

function parseReportReceipt(value: unknown): RequestReportReceiptV1 {
  const item = exactRow(value, 'Request report receipt', [
    'reportId',
    'requestId',
    'status',
    'replayed',
    'occurredAt',
  ])
  return {
    reportId: requestPublicValidation.uuid(item.reportId, 'Report id'),
    requestId: requestPublicValidation.uuid(item.requestId, 'Request id'),
    status: requestPublicValidation.oneOf(
      item.status,
      ['open', 'reviewing', 'resolved', 'dismissed'] as const,
      'Report status',
    ),
    replayed: requestPublicValidation.bool(item.replayed, 'Replay state'),
    occurredAt: requestPublicValidation.timestamp(
      item.occurredAt,
      'Report occurrence',
    ),
  }
}

function parseReportPage(value: unknown): RequestReportPageV1 {
  const page = exactRow(value, 'Request report page', [
    'items',
    'nextCursor',
  ])
  if (!Array.isArray(page.items)) {
    throw new RequestContractError('Request report page is invalid.')
  }
  const items = page.items.map((report) => {
    const item = exactRecord(report, 'Request report', [
      'reportId',
      'requestId',
      'category',
      'priority',
      'details',
      'status',
      'resolutionNote',
      'alertStatus',
      'createdAt',
      'updatedAt',
    ])
    return {
      reportId: requestPublicValidation.uuid(item.reportId, 'Report id'),
      requestId: requestPublicValidation.uuid(item.requestId, 'Request id'),
      category: requestPublicValidation.oneOf(
        item.category,
        REQUEST_REPORT_CATEGORIES,
        'Report category',
      ),
      priority: requestPublicValidation.integer(
        item.priority,
        'Report priority',
        0,
        1,
      ) as 0 | 1,
      details: requestPublicValidation.string(
        item.details,
        'Report details',
        1,
        2_000,
      ),
      status: requestPublicValidation.oneOf(
        item.status,
        ['open', 'reviewing', 'resolved', 'dismissed'] as const,
        'Report status',
      ),
      resolutionNote: requestPublicValidation.nullableString(
        item.resolutionNote,
        'Report resolution note',
        10,
        1_000,
      ),
      alertStatus:
        item.alertStatus === null
          ? null
          : requestPublicValidation.oneOf(
              item.alertStatus,
              ['pending', 'delivered', 'failed', 'suppressed'] as const,
              'Report alert status',
            ),
      createdAt: requestPublicValidation.timestamp(
        item.createdAt,
        'Report creation',
      ),
      updatedAt: requestPublicValidation.timestamp(
        item.updatedAt,
        'Report update',
      ),
    }
  })
  let nextCursor = null
  if (page.nextCursor !== null) {
    const cursor = exactRecord(
      page.nextCursor,
      'Request report cursor',
      ['priority', 'createdAt', 'reportId'],
    )
    nextCursor = {
      priority: requestPublicValidation.integer(
        cursor.priority,
        'Report cursor priority',
        0,
        1,
      ) as 0 | 1,
      createdAt: requestPublicValidation.timestamp(
        cursor.createdAt,
        'Report cursor timestamp',
      ),
      reportId: requestPublicValidation.uuid(
        cursor.reportId,
        'Report cursor id',
      ),
    }
  }
  return { items, nextCursor }
}

function parseNotificationPreference(
  value: unknown,
): RequestNotificationPreferenceV1 {
  const item = exactRow(value, 'Request notification preference', [
    'preferenceVersion',
    'transactionalEmailEnabled',
    'changedAt',
  ])
  return {
    preferenceVersion: requestPublicValidation.integer(
      item.preferenceVersion,
      'Notification preference version',
      0,
      10_000_000,
    ),
    transactionalEmailEnabled: requestPublicValidation.bool(
      item.transactionalEmailEnabled,
      'Transactional email preference',
    ),
    changedAt: requestPublicValidation.nullableTimestamp(
      item.changedAt,
      'Notification preference change',
    ),
  }
}

function parseNotificationPreferenceReceipt(
  value: unknown,
): RequestNotificationPreferenceReceiptV1 {
  const item = exactRow(value, 'Request notification preference receipt', [
    'preferenceVersion',
    'transactionalEmailEnabled',
    'replayed',
    'occurredAt',
  ])
  return {
    preferenceVersion: requestPublicValidation.integer(
      item.preferenceVersion,
      'Notification preference version',
      1,
      10_000_000,
    ),
    transactionalEmailEnabled: requestPublicValidation.bool(
      item.transactionalEmailEnabled,
      'Transactional email preference',
    ),
    replayed: requestPublicValidation.bool(item.replayed, 'Replay state'),
    occurredAt: requestPublicValidation.timestamp(
      item.occurredAt,
      'Notification preference occurrence',
    ),
  }
}

function parsePublication(value: unknown): RequestPublicationViewV1 {
  const item = row(value, 'Request publication')
  const visibility = requestPublicValidation.oneOf(
    item.visibility,
    ['restricted', 'full'] as const,
    'Publication visibility',
  )
  if (!Array.isArray(item.capabilities)) {
    throw new RequestContractError('Publication capabilities are invalid.')
  }
  if (visibility === 'restricted') {
    requestPublicValidation.exact(
      item,
      ['visibility', 'publicationState', 'status', 'capabilities'],
      'Request publication',
    )
    if (item.capabilities.length !== 0) {
      throw new RequestContractError('Restricted publication has capabilities.')
    }
    return {
      visibility,
      publicationState: requestPublicValidation.string(
        item.publicationState,
        'Publication state',
        1,
        40,
      ),
      status: requestPublicValidation.oneOf(
        item.status,
        ['held', 'removed'] as const,
        'Publication restriction',
      ),
      capabilities: [],
    }
  }
  requestPublicValidation.exact(
    item,
    [
      'visibility',
      'publicationState',
      'consentEnabled',
      'proposal',
      'capabilities',
    ],
    'Request publication',
  )
  const capabilities = item.capabilities.map((capability) =>
    requestPublicValidation.oneOf(
      capability,
      PUBLICATION_CAPABILITIES,
      'Publication capability',
    ),
  )
  let proposal = null
  if (item.proposal !== null) {
    const candidate = exactRecord(
      item.proposal,
      'Publication proposal',
      [
        'proposalId',
        'proposalVersion',
        'status',
        'safeTitle',
        'safeSummary',
        'requesterAttribution',
        'reusePermission',
        'requesterConsented',
        'builderConsented',
        'airlockReviewVerdict',
        'airlockReviewedAt',
        'airlockReviewNote',
        'publishedAt',
        'updatedAt',
      ],
    )
    proposal = {
      proposalId: requestPublicValidation.uuid(
        candidate.proposalId,
        'Proposal id',
      ),
      proposalVersion: requestPublicValidation.integer(
        candidate.proposalVersion,
        'Proposal version',
        1,
        10_000_000,
      ),
      status: requestPublicValidation.oneOf(
        candidate.status,
        PUBLICATION_STATUSES,
        'Proposal status',
      ),
      safeTitle: requestPublicValidation.string(
        candidate.safeTitle,
        'Publication title',
        4,
        120,
      ),
      safeSummary: requestPublicValidation.string(
        candidate.safeSummary,
        'Publication summary',
        40,
        1_000,
      ),
      requesterAttribution: requestPublicValidation.oneOf(
        candidate.requesterAttribution,
        ['anonymous', 'credited'] as const,
        'Requester attribution',
      ),
      reusePermission: requestPublicValidation.oneOf(
        candidate.reusePermission,
        ['view_only', 'adapt_with_credit'] as const,
        'Reuse permission',
      ),
      requesterConsented: requestPublicValidation.bool(
        candidate.requesterConsented,
        'Requester consent',
      ),
      builderConsented: requestPublicValidation.bool(
        candidate.builderConsented,
        'Builder consent',
      ),
      airlockReviewVerdict: candidate.airlockReviewVerdict === null
        ? null
        : requestPublicValidation.oneOf(
            candidate.airlockReviewVerdict,
            ['approved', 'changes_required'] as const,
            'Airlock review verdict',
          ),
      airlockReviewedAt: requestPublicValidation.nullableTimestamp(
        candidate.airlockReviewedAt,
        'Airlock review occurrence',
      ),
      airlockReviewNote: requestPublicValidation.nullableString(
        candidate.airlockReviewNote,
        'Airlock review note',
        20,
        1_000,
      ),
      publishedAt: requestPublicValidation.nullableTimestamp(
        candidate.publishedAt,
        'Publication time',
      ),
      updatedAt: requestPublicValidation.timestamp(
        candidate.updatedAt,
        'Proposal update',
      ),
    }
  }
  return {
    visibility,
    publicationState: requestPublicValidation.string(
      item.publicationState,
      'Publication state',
      1,
      40,
    ),
    consentEnabled: requestPublicValidation.bool(
      item.consentEnabled,
      'Publication consent control',
    ),
    proposal,
    capabilities,
  }
}

function parseOutcome(value: unknown): RequestPublicOutcomeV1 {
  const item = exactRecord(value, 'Public Request outcome', [
    'slug',
    'title',
    'summary',
    'builder',
    'requester',
    'reusePermission',
    'projectId',
    'projectHref',
    'publishedAt',
  ])
  const builder = exactRecord(
    item.builder,
    'Outcome builder',
    ['displayName', 'deidentified'],
  )
  const requester =
    item.requester === null
      ? null
      : exactRecord(
          item.requester,
          'Outcome requester',
          ['displayName', 'deidentified'],
        )
  const projectId = requestPublicValidation.uuid(
    item.projectId,
    'Published project id',
  )
  const projectHref = requestPublicValidation.string(
    item.projectHref,
    'Published project href',
    1,
    80,
  )
  if (projectHref !== `/prompt/${projectId}`) {
    throw new RequestContractError('Published project route is invalid.')
  }
  const slug = requestPublicValidation.string(
    item.slug,
    'Outcome slug',
    14,
    100,
  )
  if (!requestPublicPatterns.slug.test(slug)) {
    throw new RequestContractError('Public outcome slug is invalid.')
  }
  return {
    slug,
    title: requestPublicValidation.string(item.title, 'Outcome title', 4, 120),
    summary: requestPublicValidation.string(
      item.summary,
      'Outcome summary',
      40,
      1_000,
    ),
    builder: {
      displayName: requestPublicValidation.string(
        builder.displayName,
        'Builder display name',
        1,
        120,
      ),
      deidentified: requestPublicValidation.bool(
        builder.deidentified,
        'Builder identity state',
      ),
    },
    requester: requester
      ? {
          displayName: requestPublicValidation.string(
            requester.displayName,
            'Requester display name',
            1,
            120,
          ),
          deidentified: requestPublicValidation.bool(
            requester.deidentified,
            'Requester identity state',
          ),
        }
      : null,
    reusePermission: requestPublicValidation.oneOf(
      item.reusePermission,
      ['view_only', 'adapt_with_credit'] as const,
      'Reuse permission',
    ),
    projectId,
    projectHref,
    publishedAt: requestPublicValidation.timestamp(
      item.publishedAt,
      'Outcome publication',
    ),
  }
}

function parseOutcomePage(value: unknown): RequestPublicOutcomePageV1 {
  const page = exactRow(value, 'Public Request outcome page', [
    'available',
    'items',
    'nextCursor',
  ])
  if (!Array.isArray(page.items)) {
    throw new RequestContractError('Public Request outcome page is invalid.')
  }
  let nextCursor = null
  if (page.nextCursor !== null) {
    const cursor = exactRecord(
      page.nextCursor,
      'Public outcome cursor',
      ['publishedAt', 'slug'],
    )
    const slug = requestPublicValidation.string(
      cursor.slug,
      'Public outcome cursor slug',
      14,
      100,
    )
    if (!requestPublicPatterns.slug.test(slug)) {
      throw new RequestContractError('Public outcome cursor is invalid.')
    }
    nextCursor = {
      publishedAt: requestPublicValidation.timestamp(
        cursor.publishedAt,
        'Public outcome cursor timestamp',
      ),
      slug,
    }
  }
  return {
    available: requestPublicValidation.bool(
      page.available,
      'Public outcome availability',
    ),
    items: page.items.map(parseOutcome),
    nextCursor,
  }
}

function parsePublicationQueue(value: unknown): RequestPublicationQueueV1 {
  const page = exactRow(value, 'Request publication queue', [
    'items',
    'nextCursor',
  ])
  if (!Array.isArray(page.items) || page.nextCursor !== null) {
    throw new RequestContractError('Request publication queue is invalid.')
  }
  return {
    items: page.items.map((proposal) => {
      const item = exactRecord(
        proposal,
        'Publication queue item',
        [
          'proposalId',
          'requestId',
          'proposalVersion',
          'status',
          'safeTitle',
          'safeSummary',
          'requesterConsented',
          'builderConsented',
          'requesterAttribution',
          'reusePermission',
          'airlockReviewVerdict',
          'airlockReviewedAt',
          'airlockReviewNote',
          'updatedAt',
          'publishedAt',
        ],
      )
      return {
        proposalId: requestPublicValidation.uuid(
          item.proposalId,
          'Proposal id',
        ),
        requestId: requestPublicValidation.uuid(item.requestId, 'Request id'),
        proposalVersion: requestPublicValidation.integer(
          item.proposalVersion,
          'Proposal version',
          1,
          10_000_000,
        ),
        status: requestPublicValidation.oneOf(
          item.status,
          PUBLICATION_STATUSES,
          'Proposal status',
        ),
        safeTitle: requestPublicValidation.string(
          item.safeTitle,
          'Publication title',
          4,
          120,
        ),
        safeSummary: requestPublicValidation.string(
          item.safeSummary,
          'Publication summary',
          40,
          1_000,
        ),
        requesterConsented: requestPublicValidation.bool(
          item.requesterConsented,
          'Requester consent',
        ),
        builderConsented: requestPublicValidation.bool(
          item.builderConsented,
          'Builder consent',
        ),
        requesterAttribution: requestPublicValidation.oneOf(
          item.requesterAttribution,
          ['anonymous', 'credited'] as const,
          'Requester attribution',
        ),
        reusePermission: requestPublicValidation.oneOf(
          item.reusePermission,
          ['view_only', 'adapt_with_credit'] as const,
          'Reuse permission',
        ),
        airlockReviewVerdict: item.airlockReviewVerdict === null
          ? null
          : requestPublicValidation.oneOf(
              item.airlockReviewVerdict,
              ['approved', 'changes_required'] as const,
              'Airlock review verdict',
            ),
        airlockReviewedAt: requestPublicValidation.nullableTimestamp(
          item.airlockReviewedAt,
          'Airlock review occurrence',
        ),
        airlockReviewNote: requestPublicValidation.nullableString(
          item.airlockReviewNote,
          'Airlock review note',
          20,
          1_000,
        ),
        updatedAt: requestPublicValidation.timestamp(
          item.updatedAt,
          'Proposal update',
        ),
        publishedAt: requestPublicValidation.nullableTimestamp(
          item.publishedAt,
          'Proposal publication',
        ),
      }
    }),
    nextCursor: null,
  }
}

function serializeReference(
  reference: SubmitPublicBuildRequestV1['request']['brief']['pathforgeReference'],
) {
  if (!reference) return null
  return reference.kind === 'project'
    ? { kind: 'project', project_id: reference.projectId }
    : {
        kind: 'response',
        project_id: reference.projectId,
        model_variant_id: reference.modelVariantId,
        response_step_number: reference.responseStepNumber,
  }
}

function parsePublicationReviewReceipt(
  value: unknown,
): RequestPublicationReviewReceiptV1 {
  const item = exactRow(value, 'Request publication review receipt', [
    'proposalId',
    'proposalVersion',
    'verdict',
    'replayed',
    'occurredAt',
  ])
  return {
    proposalId: requestPublicValidation.uuid(
      item.proposalId,
      'Publication proposal id',
    ),
    proposalVersion: requestPublicValidation.integer(
      item.proposalVersion,
      'Publication proposal version',
      1,
      10_000_000,
    ),
    verdict: requestPublicValidation.oneOf(
      item.verdict,
      ['approved', 'changes_required'] as const,
      'Publication review verdict',
    ),
    replayed: requestPublicValidation.bool(item.replayed, 'Replay state'),
    occurredAt: requestPublicValidation.timestamp(
      item.occurredAt,
      'Publication review occurrence',
    ),
  }
}

function validateOperatorInput(input: RequestOperatorMembershipInputV1) {
  requestPublicValidation.uuid(input.accountId, 'Operator account id')
  requestPublicValidation.oneOf(
    input.role,
    ['triager', 'builder', 'reviewer'] as const,
    'Operator role',
  )
  requestPublicValidation.integer(
    input.expectedMembershipVersion,
    'Expected operator membership version',
    0,
    10_000_000,
  )
  requestPublicValidation.oneOf(
    input.state,
    ['active', 'paused', 'revoked'] as const,
    'Operator membership state',
  )
  requestPublicValidation.integer(
    input.maxActiveCases,
    'Operator workload limit',
    1,
    50,
  )
  requestPublicValidation.nullableTimestamp(
    input.availableFrom,
    'Operator available from',
  )
  requestPublicValidation.nullableTimestamp(
    input.availableUntil,
    'Operator available until',
  )
  if (
    input.availableUntil !== null &&
    (
      input.availableFrom === null ||
      Date.parse(input.availableUntil) <= Date.parse(input.availableFrom)
    )
  ) {
    throw new RequestContractError('Operator availability window is invalid.')
  }
  requestPublicValidation.string(input.reason, 'Operator reason', 1, 500)
  requestPublicValidation.key(input.idempotencyKey)
  return input
}

function validatePublicationCommand(input: RequestPublicationCommandV1) {
  const item = requestPublicValidation.record(
    input,
    'Request publication command',
  )
  requestPublicValidation.exact(
    item,
    [
      'requestId',
      'expectedRequestVersion',
      'expectedProposalVersion',
      'idempotencyKey',
      'kind',
      'payload',
    ],
    'Request publication command',
  )
  const kind = requestPublicValidation.oneOf(
    item.kind,
    [
      'propose',
      'replace_proposal',
      'requester_consent',
      'builder_consent',
      'decline',
      'withdraw',
      'submit_airlock',
    ] as const,
    'Publication command',
  )
  requestPublicValidation.uuid(item.requestId, 'Request id')
  requestPublicValidation.integer(
    item.expectedRequestVersion,
    'Expected Request version',
    0,
    10_000_000,
  )
  if (kind === 'propose') {
    if (item.expectedProposalVersion !== null) {
      throw new RequestContractError('A new proposal cannot name a prior version.')
    }
  } else {
    requestPublicValidation.integer(
      item.expectedProposalVersion,
      'Expected proposal version',
      1,
      10_000_000,
    )
  }
  requestPublicValidation.key(
    requestPublicValidation.string(
      item.idempotencyKey,
      'Publication idempotency key',
      8,
      128,
    ),
  )
  const payload = requestPublicValidation.record(
    item.payload,
    'Publication command payload',
  )
  if (kind === 'propose' || kind === 'replace_proposal') {
    requestPublicValidation.exact(
      payload,
      ['safeTitle', 'safeSummary'],
      'Publication command payload',
    )
    requestPublicValidation.string(
      payload.safeTitle,
      'Publication title',
      4,
      120,
    )
    requestPublicValidation.string(
      payload.safeSummary,
      'Publication summary',
      40,
      1_000,
    )
  } else if (kind === 'requester_consent') {
    requestPublicValidation.exact(
      payload,
      ['requesterAttribution', 'publicationTermsVersion'],
      'Requester publication consent',
    )
    requestPublicValidation.oneOf(
      payload.requesterAttribution,
      ['anonymous', 'credited'] as const,
      'Requester attribution',
    )
    const version = requestPublicValidation.string(
      payload.publicationTermsVersion,
      'Publication terms version',
      1,
      64,
    )
    if (!requestPublicPatterns.version.test(version)) {
      throw new RequestContractError('Publication terms version is invalid.')
    }
  } else if (kind === 'builder_consent') {
    requestPublicValidation.exact(
      payload,
      ['reusePermission', 'publicationTermsVersion'],
      'Builder publication consent',
    )
    requestPublicValidation.oneOf(
      payload.reusePermission,
      ['view_only', 'adapt_with_credit'] as const,
      'Builder reuse permission',
    )
    const version = requestPublicValidation.string(
      payload.publicationTermsVersion,
      'Publication terms version',
      1,
      64,
    )
    if (!requestPublicPatterns.version.test(version)) {
      throw new RequestContractError('Publication terms version is invalid.')
    }
  } else {
    requestPublicValidation.exact(
      payload,
      [],
      'Publication command payload',
    )
  }
  return input
}

export interface RequestPublicApplicationService {
  getAvailability(): Promise<RequestPublicAvailabilityV1>
  getOperations(): Promise<RequestPublicOperationsV1>
  setControls(
    input: RequestPublicControlsInputV1,
  ): Promise<RequestPublicControlsReceiptV1>
  listOperators(query?: {
    query?: string
    limit?: number
  }): Promise<{ items: RequestOperatorCandidateV1[]; nextCursor: null }>
  setOperatorMembership(
    input: RequestOperatorMembershipInputV1,
  ): Promise<RequestOperatorMembershipReceiptV1>
  recordReadiness(
    input: RequestReadinessEvidenceInputV1,
  ): Promise<RequestReadinessEvidenceReceiptV1>
  submitRequest(input: SubmitPublicBuildRequestV1): Promise<RequestCommandReceipt>
  reportRequest(input: CreateRequestReportInputV1): Promise<RequestReportReceiptV1>
  listReports(query: {
    scope: 'mine' | 'admin'
    requestId?: string
    cursor?: {
      priority: 0 | 1
      createdAt: string
      reportId: string
    }
    limit?: number
  }): Promise<RequestReportPageV1>
  setReportStatus(
    input: SetRequestReportStatusInputV1,
  ): Promise<RequestReportReceiptV1>
  getNotificationPreference(): Promise<RequestNotificationPreferenceV1>
  setNotificationPreference(
    input: SetRequestNotificationPreferenceInputV1,
  ): Promise<RequestNotificationPreferenceReceiptV1>
  getPublication(requestId: string): Promise<RequestPublicationViewV1>
  executePublication(
    input: RequestPublicationCommandV1,
  ): Promise<RequestCommandReceipt>
  reviewPublication(
    input: RequestPublicationReviewInputV1,
  ): Promise<RequestPublicationReviewReceiptV1>
  listPublicationQueue(query?: {
    status?:
      | 'active'
      | 'consent_pending'
      | 'fully_consented'
      | 'in_airlock'
      | 'published'
    limit?: number
  }): Promise<RequestPublicationQueueV1>
  listPublicOutcomes(query?: {
    cursor?: { publishedAt: string; slug: string }
    limit?: number
  }): Promise<RequestPublicOutcomePageV1>
  getPublicOutcome(slug: string): Promise<RequestPublicOutcomeV1>
}

export function createRequestPublicApplicationService(
  client: RequestRpcClient,
): RequestPublicApplicationService {
  return {
    getAvailability: () =>
      read(
        client,
        RPC.availability,
        { p_contract_version: REQUEST_CONTRACT_VERSION },
        parseRequestPublicAvailabilityV1,
      ),
    getOperations: () =>
      read(
        client,
        RPC.operations,
        { p_contract_version: REQUEST_CONTRACT_VERSION },
        parseRequestPublicOperationsV1,
      ),
    setControls(input) {
      const valid = validateRequestPublicControlsInputV1(input)
      return read(
        client,
        RPC.setControls,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_expected_controls_version: valid.expectedControlsVersion,
          p_idempotency_key: valid.idempotencyKey,
          p_controls: {
            accepting_requests: valid.acceptingRequests,
            assigning_requests: valid.assigningRequests,
            intake_audience: valid.intakeAudience,
            active_case_capacity: valid.activeCaseCapacity,
            fulfillment_case_capacity: valid.fulfillmentCaseCapacity,
            operator_roster_required: valid.operatorRosterRequired,
            public_intake_risk_screening: valid.publicIntakeRiskScreening,
            transactional_notifications_enabled:
              valid.transactionalNotificationsEnabled,
            publication_consent_enabled: valid.publicationConsentEnabled,
            publication_airlock_enabled: valid.publicationAirlockEnabled,
            public_outcomes_enabled: valid.publicOutcomesEnabled,
            actor_hourly_intake_limit: valid.actorHourlyIntakeLimit,
            network_hourly_intake_limit: valid.networkHourlyIntakeLimit,
            global_daily_intake_limit: valid.globalDailyIntakeLimit,
            terms_version: valid.policyVersions.terms,
            privacy_version: valid.policyVersions.privacy,
            acceptable_use_version: valid.policyVersions.acceptableUse,
            requester_rights_version: valid.policyVersions.requesterRights,
            publication_terms_version:
              valid.policyVersions.publicationTerms,
          },
        },
        parseRequestPublicControlsReceiptV1,
      )
    },
    listOperators(query = {}) {
      const search = query.query?.trim() ?? ''
      const limit = query.limit ?? 50
      requestPublicValidation.string(search, 'Operator search', 0, 80)
      requestPublicValidation.integer(limit, 'Operator limit', 1, 100)
      return read(
        client,
        RPC.operators,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_query: search || null,
          p_limit: limit,
        },
        parseOperatorDirectory,
      )
    },
    setOperatorMembership(input) {
      const valid = validateOperatorInput(input)
      return read(
        client,
        RPC.setOperator,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_account_id: valid.accountId,
          p_operator_role: valid.role,
          p_expected_membership_version: valid.expectedMembershipVersion,
          p_membership_state: valid.state,
          p_max_active_cases: valid.maxActiveCases,
          p_available_from: valid.availableFrom,
          p_available_until: valid.availableUntil,
          p_reason: valid.reason.trim(),
          p_idempotency_key: valid.idempotencyKey,
        },
        parseOperatorReceipt,
      )
    },
    recordReadiness(input) {
      requestPublicValidation.oneOf(
        input.gate,
        REQUEST_READINESS_GATES,
        'Readiness gate',
      )
      requestPublicValidation.integer(
        input.expectedEvidenceVersion,
        'Expected readiness evidence version',
        0,
        10_000_000,
      )
      requestPublicValidation.oneOf(
        input.state,
        ['confirmed', 'revoked'] as const,
        'Readiness state',
      )
      requestPublicValidation.string(
        input.evidenceReference,
        'Readiness reference',
        8,
        200,
      )
      requestPublicValidation.nullableTimestamp(
        input.validUntil,
        'Readiness validity',
      )
      requestPublicValidation.string(input.note, 'Readiness note', 1, 500)
      requestPublicValidation.key(input.idempotencyKey)
      return read(
        client,
        RPC.readiness,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_gate_kind: input.gate,
          p_expected_evidence_version: input.expectedEvidenceVersion,
          p_evidence_state: input.state,
          p_evidence_reference: input.evidenceReference.trim(),
          p_valid_until: input.validUntil,
          p_note: input.note.trim(),
          p_idempotency_key: input.idempotencyKey,
        },
        parseReadinessReceipt,
      )
    },
    submitRequest(input) {
      const valid = validateSubmitPublicBuildRequestV1(input)
      return read(
        client,
        RPC.submit,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_idempotency_key: valid.request.idempotencyKey,
          p_risk_grant_id: valid.riskGrantId,
          p_brief: {
            title: valid.request.brief.title.trim(),
            outcome: valid.request.brief.outcome.trim(),
            intended_user: valid.request.brief.intendedUser.trim(),
            must_work_scenario:
              valid.request.brief.mustWorkScenario.trim(),
            acceptance_checks: valid.request.brief.acceptanceChecks.map(
              (check) => check.trim(),
            ),
            constraints: valid.request.brief.constraints.trim(),
            pathforge_reference: serializeReference(
              valid.request.brief.pathforgeReference,
            ),
          },
          p_attestation: {
            terms_version: valid.attestation.termsVersion,
            privacy_version: valid.attestation.privacyVersion,
            acceptable_use_version:
              valid.attestation.acceptableUseVersion,
            requester_rights_version:
              valid.attestation.requesterRightsVersion,
            terms_accepted: true,
            privacy_acknowledged: true,
            acceptable_use_accepted: true,
            requester_rights_accepted: true,
          },
        },
        parseRequestCommandReceiptV1,
      )
    },
    reportRequest(input) {
      requestPublicValidation.uuid(input.requestId, 'Request id')
      requestPublicValidation.oneOf(
        input.category,
        REQUEST_REPORT_CATEGORIES,
        'Report category',
      )
      requestPublicValidation.string(input.details, 'Report details', 20, 2_000)
      requestPublicValidation.key(input.idempotencyKey)
      return read(
        client,
        RPC.report,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_request_id: input.requestId,
          p_category: input.category,
          p_details: input.details.trim(),
          p_idempotency_key: input.idempotencyKey,
        },
        parseReportReceipt,
      )
    },
    listReports(query) {
      requestPublicValidation.oneOf(
        query.scope,
        ['mine', 'admin'] as const,
        'Report scope',
      )
      const limit = query.limit ?? 25
      requestPublicValidation.integer(limit, 'Report limit', 1, 50)
      if (query.requestId !== undefined) {
        requestPublicValidation.uuid(query.requestId, 'Report request id')
      }
      if (query.cursor) {
        requestPublicValidation.integer(
          query.cursor.priority,
          'Report cursor priority',
          0,
          1,
        )
        requestPublicValidation.timestamp(
          query.cursor.createdAt,
          'Report cursor timestamp',
        )
        requestPublicValidation.uuid(
          query.cursor.reportId,
          'Report cursor id',
        )
      }
      return read(
        client,
        RPC.reports,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_scope: query.scope,
          p_cursor_priority: query.cursor?.priority ?? null,
          p_cursor_created_at: query.cursor?.createdAt ?? null,
          p_cursor_id: query.cursor?.reportId ?? null,
          p_limit: limit,
          p_request_id: query.requestId ?? null,
        },
        parseReportPage,
      )
    },
    setReportStatus(input) {
      requestPublicValidation.uuid(input.reportId, 'Report id')
      requestPublicValidation.oneOf(
        input.expectedStatus,
        ['open', 'reviewing'] as const,
        'Expected report status',
      )
      requestPublicValidation.oneOf(
        input.nextStatus,
        ['reviewing', 'resolved', 'dismissed'] as const,
        'Next report status',
      )
      if (
        !(
          input.expectedStatus === 'open' &&
          input.nextStatus === 'reviewing'
        ) &&
        !(
          input.expectedStatus === 'reviewing' &&
          (input.nextStatus === 'resolved' ||
            input.nextStatus === 'dismissed')
        )
      ) {
        throw new RequestContractError('Report transition is invalid.')
      }
      if (input.nextStatus === 'reviewing') {
        if (input.resolutionNote !== null) {
          throw new RequestContractError(
            'A report under review cannot include a resolution note.',
          )
        }
      } else {
        requestPublicValidation.string(
          input.resolutionNote,
          'Report resolution note',
          10,
          1_000,
        )
      }
      requestPublicValidation.key(input.idempotencyKey)
      return read(
        client,
        RPC.setReportStatus,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_report_id: input.reportId,
          p_expected_status: input.expectedStatus,
          p_next_status: input.nextStatus,
          p_resolution_note: input.resolutionNote?.trim() ?? null,
          p_idempotency_key: input.idempotencyKey,
        },
        parseReportReceipt,
      )
    },
    getNotificationPreference: () =>
      read(
        client,
        RPC.notificationPreference,
        { p_contract_version: REQUEST_CONTRACT_VERSION },
        parseNotificationPreference,
      ),
    setNotificationPreference(input) {
      requestPublicValidation.integer(
        input.expectedPreferenceVersion,
        'Expected notification preference version',
        0,
        10_000_000,
      )
      requestPublicValidation.bool(
        input.transactionalEmailEnabled,
        'Transactional email preference',
      )
      requestPublicValidation.key(input.idempotencyKey)
      return read(
        client,
        RPC.setNotificationPreference,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_expected_preference_version: input.expectedPreferenceVersion,
          p_transactional_email_enabled:
            input.transactionalEmailEnabled,
          p_idempotency_key: input.idempotencyKey,
        },
        parseNotificationPreferenceReceipt,
      )
    },
    getPublication(requestId) {
      requestPublicValidation.uuid(requestId, 'Request id')
      return read(
        client,
        RPC.publication,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_request_id: requestId,
        },
        parsePublication,
      )
    },
    executePublication(input) {
      const valid = validatePublicationCommand(input)
      const payload =
        valid.kind === 'propose' || valid.kind === 'replace_proposal'
          ? {
              safe_title: valid.payload.safeTitle.trim(),
              safe_summary: valid.payload.safeSummary.trim(),
            }
          : valid.kind === 'requester_consent'
            ? {
                requester_attribution: valid.payload.requesterAttribution,
                publication_terms_version:
                  valid.payload.publicationTermsVersion,
              }
            : valid.kind === 'builder_consent'
              ? {
                  reuse_permission: valid.payload.reusePermission,
                  publication_terms_version:
                    valid.payload.publicationTermsVersion,
                }
              : {}
      return read(
        client,
        RPC.publicationCommand,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_request_id: valid.requestId,
          p_expected_request_version: valid.expectedRequestVersion,
          p_expected_proposal_version: valid.expectedProposalVersion,
          p_idempotency_key: valid.idempotencyKey,
          p_command: valid.kind,
          p_payload: payload,
        },
        parseRequestCommandReceiptV1,
      )
    },
    reviewPublication(input) {
      const item = requestPublicValidation.record(
        input,
        'Request publication review',
      )
      requestPublicValidation.exact(
        item,
        [
          'proposalId',
          'expectedProposalVersion',
          'verdict',
          'checks',
          'reviewNotes',
          'idempotencyKey',
        ],
        'Request publication review',
      )
      const proposalId = requestPublicValidation.uuid(
        item.proposalId,
        'Publication proposal id',
      )
      const expectedProposalVersion = requestPublicValidation.integer(
        item.expectedProposalVersion,
        'Expected publication proposal version',
        1,
        10_000_000,
      )
      const verdict = requestPublicValidation.oneOf(
        item.verdict,
        ['approve', 'changes_required'] as const,
        'Publication review verdict',
      )
      const checks = exactRecord(
        item.checks,
        'Publication review checks',
        [
          'privateContentExcluded',
          'claimsSupportedByDelivery',
          'attributionMatchesConsent',
          'reusePermissionMatchesConsent',
          'publicTruthReady',
        ],
      )
      const normalizedChecks = {
        private_content_excluded: requestPublicValidation.bool(
          checks.privateContentExcluded,
          'Private-content review check',
        ),
        claims_supported_by_delivery: requestPublicValidation.bool(
          checks.claimsSupportedByDelivery,
          'Delivery-support review check',
        ),
        attribution_matches_consent: requestPublicValidation.bool(
          checks.attributionMatchesConsent,
          'Attribution review check',
        ),
        reuse_permission_matches_consent: requestPublicValidation.bool(
          checks.reusePermissionMatchesConsent,
          'Reuse-permission review check',
        ),
        public_truth_ready: requestPublicValidation.bool(
          checks.publicTruthReady,
          'Public-truth review check',
        ),
      }
      if (
        verdict === 'approve' &&
        Object.values(normalizedChecks).some((value) => !value)
      ) {
        throw new RequestContractError(
          'An approved publication review requires every check.',
        )
      }
      if (
        verdict === 'changes_required' &&
        Object.values(normalizedChecks).every(Boolean)
      ) {
        throw new RequestContractError(
          'A changes-required review must identify a failed check.',
        )
      }
      const reviewNotes = requestPublicValidation.string(
        item.reviewNotes,
        'Publication review notes',
        20,
        4_000,
      )
      const idempotencyKey = requestPublicValidation.string(
        item.idempotencyKey,
        'Publication review idempotency key',
        8,
        128,
      )
      requestPublicValidation.key(idempotencyKey)
      return read(
        client,
        RPC.publicationReview,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_proposal_id: proposalId,
          p_expected_proposal_version: expectedProposalVersion,
          p_verdict: verdict,
          p_checks: normalizedChecks,
          p_review_notes: reviewNotes.trim(),
          p_idempotency_key: idempotencyKey,
        },
        parsePublicationReviewReceipt,
      )
    },
    listPublicationQueue(query = {}) {
      const status = query.status ?? 'active'
      const limit = query.limit ?? 50
      requestPublicValidation.oneOf(
        status,
        [
          'active',
          'consent_pending',
          'fully_consented',
          'in_airlock',
          'published',
        ] as const,
        'Publication queue status',
      )
      requestPublicValidation.integer(limit, 'Publication queue limit', 1, 100)
      return read(
        client,
        RPC.publicationQueue,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_status: status,
          p_limit: limit,
        },
        parsePublicationQueue,
      )
    },
    listPublicOutcomes(query = {}) {
      const limit = query.limit ?? 24
      requestPublicValidation.integer(limit, 'Public outcome limit', 1, 50)
      if (query.cursor) {
        requestPublicValidation.timestamp(
          query.cursor.publishedAt,
          'Public outcome cursor timestamp',
        )
        if (!requestPublicPatterns.slug.test(query.cursor.slug)) {
          throw new RequestContractError('Public outcome cursor is invalid.')
        }
      }
      return read(
        client,
        RPC.publicOutcomes,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_limit: limit,
          p_cursor_published_at: query.cursor?.publishedAt ?? null,
          p_cursor_slug: query.cursor?.slug ?? null,
        },
        parseOutcomePage,
      )
    },
    getPublicOutcome(slug) {
      if (!requestPublicPatterns.slug.test(slug)) {
        throw new RequestContractError('Public outcome slug is invalid.')
      }
      return read(
        client,
        RPC.publicOutcome,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_public_slug: slug,
        },
        parseOutcome,
      )
    },
  }
}

export interface RequestPublicServerService {
  issueRiskGrant(
    input: RequestIntakeRiskGrantInputV1,
  ): Promise<RequestIntakeRiskGrantV1>
  projectNotifications(limit?: number): Promise<RequestNotificationProjectionV1>
  claimNotifications(limit?: number): Promise<RequestNotificationClaimV1>
  resolveNotificationSend(input: {
    deliveryId: string
    claimToken: string
  }): Promise<RequestNotificationSendResolutionV1>
  finishNotification(input: {
    deliveryId: string
    claimToken: string
    succeeded: boolean
    errorCode: string | null
  }): Promise<RequestNotificationFinishV1>
  publishOutcome(
    input: PublishRequestOutcomeInputV1,
  ): Promise<RequestOutcomePublicationReceiptV1>
  maintain(limit?: number): Promise<RequestPublicArchitectureMaintenanceV1>
}

export function createRequestPublicServerService(
  serviceRoleClient: RequestRpcClient,
): RequestPublicServerService {
  return {
    issueRiskGrant(input) {
      requestPublicValidation.uuid(input.actorId, 'Risk actor id')
      requestPublicValidation.key(
        input.intakeIdempotencyKey,
        'Intake idempotency key',
      )
      if (!/^[0-9a-f]{64}$/.test(input.networkDigest)) {
        throw new RequestContractError('Network digest is invalid.')
      }
      if (!requestPublicPatterns.version.test(input.riskEngineVersion)) {
        throw new RequestContractError('Risk engine version is invalid.')
      }
      return read(
        serviceRoleClient,
        RPC.riskGrant,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_actor_id: input.actorId,
          p_intake_idempotency_key: input.intakeIdempotencyKey,
          p_network_digest: input.networkDigest,
          p_risk_engine_version: input.riskEngineVersion,
        },
        parseRiskGrant,
      )
    },
    projectNotifications(limit = 100) {
      requestPublicValidation.integer(limit, 'Notification projection limit', 1, 500)
      return read(
        serviceRoleClient,
        RPC.projectNotifications,
        { p_contract_version: REQUEST_CONTRACT_VERSION, p_limit: limit },
        (value) => {
          const item = exactRow(value, 'Notification projection', [
            'eventsProjected',
            'reportsProjected',
            'controlEnabled',
          ])
          return {
            eventsProjected: requestPublicValidation.integer(
              item.eventsProjected,
              'Projected event count',
              0,
              500,
            ),
            reportsProjected: requestPublicValidation.integer(
              item.reportsProjected,
              'Projected report count',
              0,
              500,
            ),
            controlEnabled: requestPublicValidation.bool(
              item.controlEnabled,
              'Notification control',
            ),
          }
        },
      )
    },
    claimNotifications(limit = 25) {
      requestPublicValidation.integer(limit, 'Notification claim limit', 1, 100)
      return read(
        serviceRoleClient,
        RPC.claimNotifications,
        { p_contract_version: REQUEST_CONTRACT_VERSION, p_limit: limit },
        (value) => {
          const page = exactRow(value, 'Notification claims', ['items'])
          if (!Array.isArray(page.items)) {
            throw new RequestContractError('Notification claims are invalid.')
          }
          return {
            items: page.items.map((claim) => {
              const item = exactRecord(
                claim,
                'Notification claim',
                [
                  'deliveryId',
                  'claimToken',
                  'templateKey',
                  'requestPath',
                  'attempt',
                ],
              )
              const requestPath = requestPublicValidation.string(
                item.requestPath,
                'Notification Request path',
                46,
                46,
              )
              if (!/^\/requests\/[0-9a-f-]{36}$/i.test(requestPath)) {
                throw new RequestContractError(
                  'Notification Request path is invalid.',
                )
              }
              return {
                deliveryId: requestPublicValidation.uuid(
                  item.deliveryId,
                  'Notification delivery id',
                ),
                claimToken: requestPublicValidation.uuid(
                  item.claimToken,
                  'Notification claim token',
                ),
                templateKey: requestPublicValidation.oneOf(
                  item.templateKey,
                  NOTIFICATION_TEMPLATES,
                  'Notification template',
                ),
                requestPath,
                attempt: requestPublicValidation.integer(
                  item.attempt,
                  'Notification attempt',
                  1,
                  5,
                ),
              }
            }),
          }
        },
      )
    },
    resolveNotificationSend(input) {
      requestPublicValidation.uuid(
        input.deliveryId,
        'Notification delivery id',
      )
      requestPublicValidation.uuid(
        input.claimToken,
        'Notification claim token',
      )
      return read(
        serviceRoleClient,
        RPC.resolveNotificationSend,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_delivery_id: input.deliveryId,
          p_claim_token: input.claimToken,
        },
        (value): RequestNotificationSendResolutionV1 => {
          const base = requestPublicValidation.record(
            value,
            'Notification send resolution',
          )
          const status = requestPublicValidation.oneOf(
            base.status,
            ['authorized', 'suppressed'] as const,
            'Notification send status',
          )
          if (status === 'suppressed') {
            const item = exactRecord(
              value,
              'Suppressed notification send',
              ['status', 'reason'],
            )
            return {
              status,
              reason: requestPublicValidation.oneOf(
                item.reason,
                [
                  'control_off',
                  'preference_off',
                  'identity_unavailable',
                  'authorization_ended',
                ] as const,
                'Notification suppression reason',
              ),
            }
          }
          const item = exactRecord(
            value,
            'Authorized notification send',
            [
              'status',
              'deliveryId',
              'claimToken',
              'recipient',
              'templateKey',
              'requestPath',
            ],
          )
          const recipient = requestPublicValidation.string(
            item.recipient,
            'Notification recipient',
            3,
            320,
          )
          if (
            !/^[^\s@<>,]+@[^\s@<>,]+\.[^\s@<>,]+$/.test(recipient)
          ) {
            throw new RequestContractError(
              'Notification recipient is invalid.',
            )
          }
          const requestPath = requestPublicValidation.string(
            item.requestPath,
            'Notification Request path',
            46,
            46,
          )
          if (!/^\/requests\/[0-9a-f-]{36}$/i.test(requestPath)) {
            throw new RequestContractError(
              'Notification Request path is invalid.',
            )
          }
          const deliveryId = requestPublicValidation.uuid(
            item.deliveryId,
            'Notification delivery id',
          )
          const claimToken = requestPublicValidation.uuid(
            item.claimToken,
            'Notification claim token',
          )
          if (
            deliveryId !== input.deliveryId ||
            claimToken !== input.claimToken
          ) {
            throw new RequestContractError(
              'Notification send binding changed.',
            )
          }
          return {
            status,
            deliveryId,
            claimToken,
            recipient,
            templateKey: requestPublicValidation.oneOf(
              item.templateKey,
              NOTIFICATION_TEMPLATES,
              'Notification template',
            ),
            requestPath,
          }
        },
      )
    },
    finishNotification(input) {
      requestPublicValidation.uuid(input.deliveryId, 'Notification delivery id')
      requestPublicValidation.uuid(input.claimToken, 'Notification claim token')
      requestPublicValidation.bool(input.succeeded, 'Notification result')
      if (
        input.errorCode !== null &&
        !/^[a-z][a-z0-9_]{0,63}$/.test(input.errorCode)
      ) {
        throw new RequestContractError('Notification error code is invalid.')
      }
      if (input.succeeded && input.errorCode !== null) {
        throw new RequestContractError(
          'Successful notification cannot include an error.',
        )
      }
      return read(
        serviceRoleClient,
        RPC.finishNotification,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_delivery_id: input.deliveryId,
          p_claim_token: input.claimToken,
          p_succeeded: input.succeeded,
          p_error_code: input.errorCode,
        },
        (value) => {
          const item = exactRow(value, 'Notification result', [
            'deliveryState',
            'attempts',
          ])
          return {
            deliveryState: requestPublicValidation.oneOf(
              item.deliveryState,
              ['delivered', 'retry', 'dead'] as const,
              'Notification delivery state',
            ),
            attempts: requestPublicValidation.integer(
              item.attempts,
              'Notification attempts',
              1,
              5,
            ),
          }
        },
      )
    },
    publishOutcome(input) {
      requestPublicValidation.uuid(input.proposalId, 'Proposal id')
      requestPublicValidation.uuid(
        input.publishedProjectId,
        'Published project id',
      )
      requestPublicValidation.key(input.idempotencyKey)
      return read(
        serviceRoleClient,
        RPC.publishOutcome,
        {
          p_contract_version: REQUEST_CONTRACT_VERSION,
          p_proposal_id: input.proposalId,
          p_published_project_id: input.publishedProjectId,
          p_idempotency_key: input.idempotencyKey,
        },
        (value) => {
          const item = exactRow(value, 'Outcome publication receipt', [
            'publicSlug',
            'publishedProjectId',
            'publishedAt',
            'replayed',
          ])
          const publicSlug = requestPublicValidation.string(
            item.publicSlug,
            'Public outcome slug',
            14,
            100,
          )
          if (!requestPublicPatterns.slug.test(publicSlug)) {
            throw new RequestContractError('Public outcome slug is invalid.')
          }
          return {
            publicSlug,
            publishedProjectId: requestPublicValidation.uuid(
              item.publishedProjectId,
              'Published project id',
            ),
            publishedAt: requestPublicValidation.timestamp(
              item.publishedAt,
              'Outcome publication',
            ),
            replayed: requestPublicValidation.bool(item.replayed, 'Replay state'),
          }
        },
      )
    },
    maintain(limit = 100) {
      requestPublicValidation.integer(limit, 'Maintenance limit', 1, 500)
      return read(
        serviceRoleClient,
        RPC.maintenance,
        { p_contract_version: REQUEST_CONTRACT_VERSION, p_limit: limit },
        (value) => {
          const item = exactRow(value, 'Public architecture maintenance', [
            'reportsPurged',
            'proposalsPurged',
            'riskGrantsDeleted',
            'notificationDeliveriesDeleted',
            'readinessEvidenceDeleted',
          ])
          return {
            reportsPurged: requestPublicValidation.integer(
              item.reportsPurged,
              'Purged report count',
              0,
              500,
            ),
            proposalsPurged: requestPublicValidation.integer(
              item.proposalsPurged,
              'Purged proposal count',
              0,
              500,
            ),
            riskGrantsDeleted: requestPublicValidation.integer(
              item.riskGrantsDeleted,
              'Deleted risk grant count',
              0,
              500,
            ),
            notificationDeliveriesDeleted: requestPublicValidation.integer(
              item.notificationDeliveriesDeleted,
              'Deleted notification count',
              0,
              500,
            ),
            readinessEvidenceDeleted: requestPublicValidation.integer(
              item.readinessEvidenceDeleted,
              'Deleted readiness evidence count',
              0,
              500,
            ),
          }
        },
      )
    },
  }
}
