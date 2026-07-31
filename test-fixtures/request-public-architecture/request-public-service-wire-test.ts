import {
  createRequestPublicApplicationService,
  createRequestPublicServerService,
} from '../../src/lib/request-public-service'
import type { RequestRpcClient } from '../../src/lib/request-service'

const requestId = '9b100000-0000-4000-8000-000000000001'
const actorId = '9b100000-0000-4000-8000-000000000002'
const membershipId = '9b100000-0000-4000-8000-000000000003'
const reportId = '9b100000-0000-4000-8000-000000000004'
const proposalId = '9b100000-0000-4000-8000-000000000005'
const projectId = '81200000-0000-4000-8000-000000000001'
const commandId = '9b100000-0000-4000-8000-000000000006'
const eventId = '9b100000-0000-4000-8000-000000000007'
const deliveryId = '9b100000-0000-4000-8000-000000000008'
const claimToken = '9b100000-0000-4000-8000-000000000009'
const riskGrantId = '9b100000-0000-4000-8000-000000000010'
const occurredAt = '2026-07-30T18:00:00.000Z'
const publicSlug = 'reviewed-pathforge-outcome-123456789abc'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function sameJson(actual: unknown, expected: unknown, label: string) {
  const left = JSON.stringify(actual)
  const right = JSON.stringify(expected)
  assert(left === right, `${label} mismatch.\nactual=${left}\nexpected=${right}`)
}

const controls = {
  contractVersion: 1,
  controlsVersion: 3,
  acceptingRequests: true,
  assigningRequests: true,
  intakeAudience: 'authenticated',
  activeCaseCount: 1,
  activeCaseCapacity: 20,
  remainingQueueCapacity: 19,
  fulfillmentCaseCount: 1,
  fulfillmentCaseCapacity: 4,
  remainingFulfillmentCapacity: 3,
  operatorRosterRequired: true,
  operatorRosterReady: true,
  publicIntakeRiskScreening: true,
  transactionalNotificationsEnabled: true,
  publicationConsentEnabled: true,
  publicationAirlockEnabled: true,
  publicOutcomesEnabled: true,
  actorHourlyIntakeLimit: 5,
  networkHourlyIntakeLimit: 12,
  globalDailyIntakeLimit: 250,
  policyVersions: {
    terms: 'request-terms-v1',
    privacy: 'request-privacy-v1',
    acceptableUse: 'request-aup-v1',
    requesterRights: 'request-rights-v1',
    publicationTerms: 'request-publication-v1',
  },
  readiness: {
    legal: true,
    incidentOwner: true,
    waf: true,
    responsiveQa: true,
    attendedLifecycle: true,
    notificationTransport: true,
    communityAirlock: true,
  },
}

const outcome = {
  slug: publicSlug,
  title: 'Reviewed PathForge outcome',
  summary:
    'A safe public summary that points only to an already-approved PathForge project.',
  builder: {
    displayName: 'Fixture Builder',
    deidentified: false,
  },
  requester: null,
  reusePermission: 'adapt_with_credit',
  projectId,
  projectHref: `/prompt/${projectId}`,
  publishedAt: occurredAt,
}

const rpcCalls: Array<{
  name: string
  parameters: Record<string, unknown>
}> = []
let publicationFixtureMode: 'full' | 'withdrawal_only' = 'full'

function commandReceipt(authorityResult: Record<string, unknown> = {}) {
  return [{
    contract_version: 1,
    command_id: commandId,
    request_id: requestId,
    request_version: 4,
    event_id: eventId,
    lifecycle_state: 'completed',
    moderation_state: 'clear',
    publication_state: 'consent_pending',
    close_reason: null,
    replayed: false,
    occurred_at: occurredAt,
    authority_result: authorityResult,
  }]
}

const client: RequestRpcClient = {
  async rpc(name, parameters) {
    rpcCalls.push({ name, parameters })
    switch (name) {
      case 'get_build_request_public_availability_v1':
        return {
          data: {
            ...controls,
            intakeEligibility: 'available',
            riskScreeningRequired: true,
            unavailableReason: null,
          },
          error: null,
        }
      case 'get_build_request_public_operations_v1':
        return {
          data: {
            ...controls,
            readinessVersions: {
              legal: 1,
              incident_owner: 1,
              waf: 1,
              responsive_qa: 1,
              attended_lifecycle: 1,
              notification_transport: 1,
            },
            operatorCounts: {
              triager: 1,
              builder: 2,
              reviewer: 2,
            },
            reportCounts: {
              open: 1,
              reviewing: 0,
              pendingAlerts: 0,
            },
            publicationCounts: {
              consentPending: 1,
              airlockReady: 0,
              published: 1,
            },
          },
          error: null,
        }
      case 'set_build_request_public_controls_v1':
        return {
          data: {
            ...controls,
            controlsVersion: 4,
            replayed: false,
            occurredAt,
          },
          error: null,
        }
      case 'list_build_request_operator_directory_v1':
        return {
          data: {
            items: [{
              accountId: actorId,
              displayName: 'Fixture Builder',
              isAdmin: false,
              memberships: [{
                membershipId,
                role: 'builder',
                version: 1,
                state: 'active',
                maxActiveCases: 2,
                availableFrom: null,
                availableUntil: null,
                currentlyAvailable: true,
              }],
            }],
            nextCursor: null,
          },
          error: null,
        }
      case 'set_build_request_operator_membership_v1':
        return {
          data: {
            membershipId,
            accountId: actorId,
            accountDeidentified: false,
            operatorRole: 'builder',
            membershipVersion: 1,
            membershipState: 'active',
            maxActiveCases: 2,
            availableFrom: null,
            availableUntil: null,
            replayed: false,
            occurredAt,
          },
          error: null,
        }
      case 'record_build_request_readiness_v1':
        return {
          data: {
            gate: 'legal',
            evidenceVersion: 1,
            state: 'confirmed',
            validUntil: '2026-08-30T18:00:00.000Z',
            replayed: false,
            occurredAt,
          },
          error: null,
        }
      case 'submit_build_request_public_v1':
        return { data: commandReceipt(), error: null }
      case 'report_build_request_v1':
      case 'set_build_request_report_status_v1':
        return {
          data: {
            reportId,
            requestId,
            status:
              name === 'report_build_request_v1'
                ? 'open'
                : parameters.p_next_status,
            replayed: false,
            occurredAt,
          },
          error: null,
        }
      case 'list_build_request_reports_v1':
        return {
          data: {
            items: [{
              reportId,
              requestId,
              category: 'privacy',
              priority: 1,
              details: 'A bounded private report detail for the operator.',
              status: 'open',
              resolutionNote: null,
              alertStatus: 'pending',
              createdAt: occurredAt,
              updatedAt: occurredAt,
            }],
            nextCursor: null,
          },
          error: null,
        }
      case 'get_build_request_notification_preference_v1':
        return {
          data: {
            preferenceVersion: 1,
            transactionalEmailEnabled: true,
            changedAt: occurredAt,
          },
          error: null,
        }
      case 'set_build_request_notification_preference_v1':
        return {
          data: {
            preferenceVersion: 2,
            transactionalEmailEnabled: false,
            replayed: false,
            occurredAt,
          },
          error: null,
        }
      case 'get_build_request_publication_v1':
        return {
          data: publicationFixtureMode === 'withdrawal_only'
            ? {
                visibility: 'withdrawal_only',
                requestVersion: 8,
                publicationState: 'published',
                status: 'private_scope_expired',
                proposal: {
                  proposalId,
                  proposalVersion: 1,
                  status: 'published',
                  safeTitle: outcome.title,
                  safeSummary: outcome.summary,
                },
                capabilities: ['withdraw'],
              }
            : {
            visibility: 'full',
            requestVersion: 4,
            publicationState: 'consented_pending_airlock',
            consentEnabled: true,
            proposal: {
              proposalId,
              proposalVersion: 1,
              status: 'in_airlock',
              safeTitle: outcome.title,
              safeSummary: outcome.summary,
              requesterAttribution: 'anonymous',
              reusePermission: 'adapt_with_credit',
              requesterConsented: true,
              builderConsented: true,
              airlockReviewVerdict: 'approved',
              airlockReviewedAt: occurredAt,
              airlockReviewNote:
                'The exact proposal passed every independent airlock check.',
              publishedAt: null,
              updatedAt: occurredAt,
            },
            capabilities: ['publish_outcome'],
          },
          error: null,
        }
      case 'get_build_request_publication_withdrawal_receipt_v1':
        return {
          data: {
            requestId,
            commandId,
            occurredAt,
          },
          error: null,
        }
      case 'build_request_publication_command_v1':
        return {
          data: commandReceipt({
            proposalVersion: 1,
            proposalStatus: 'consent_pending',
          }),
          error: null,
        }
      case 'review_build_request_publication_v1':
        return {
          data: {
            proposalId,
            proposalVersion: 1,
            verdict: 'approved',
            replayed: false,
            occurredAt,
          },
          error: null,
        }
      case 'list_build_request_publication_queue_v1':
        return {
          data: {
            items: [{
              proposalId,
              requestId,
              proposalVersion: 1,
              status: 'in_airlock',
              safeTitle: outcome.title,
              safeSummary: outcome.summary,
              requesterConsented: true,
              builderConsented: true,
              requesterAttribution: 'anonymous',
              reusePermission: 'adapt_with_credit',
              airlockReviewVerdict: 'approved',
              airlockReviewedAt: occurredAt,
              airlockReviewNote:
                'The exact proposal passed every independent airlock check.',
              updatedAt: occurredAt,
              publishedAt: null,
            }],
            nextCursor: null,
          },
          error: null,
        }
      case 'list_public_build_request_outcomes_v1':
        return {
          data: {
            available: true,
            items: [outcome],
            nextCursor: {
              publishedAt: occurredAt,
              slug: publicSlug,
            },
          },
          error: null,
        }
      case 'get_public_build_request_outcome_v1':
        return { data: outcome, error: null }
      case 'issue_build_request_intake_risk_grant_v1':
        return {
          data: {
            status: 'clear',
            grantId: riskGrantId,
            expiresAt: '2026-07-30T18:10:00.000Z',
            reason: null,
            replayed: false,
          },
          error: null,
        }
      case 'project_build_request_notifications_v1':
        return {
          data: {
            eventsProjected: 2,
            reportsProjected: 1,
            controlEnabled: true,
          },
          error: null,
        }
      case 'claim_build_request_notifications_v1':
        return {
          data: {
            items: [{
              deliveryId,
              claimToken,
              templateKey: 'request_action_needed',
              requestPath: `/requests/${requestId}`,
              attempt: 1,
            }],
          },
          error: null,
        }
      case 'resolve_build_request_notification_send_v1':
        return {
          data: {
            status: 'authorized',
            deliveryId,
            claimToken,
            recipient: 'fixture@example.test',
            templateKey: 'request_action_needed',
            requestPath: `/requests/${requestId}`,
          },
          error: null,
        }
      case 'finish_build_request_notification_v1':
        return {
          data: { deliveryState: 'delivered', attempts: 1 },
          error: null,
        }
      case 'publish_build_request_outcome_v1':
        return {
          data: {
            publicSlug,
            publishedProjectId: projectId,
            publishedAt: occurredAt,
            replayed: false,
          },
          error: null,
        }
      case 'maintain_build_request_public_architecture_v1':
        return {
          data: {
            reportsPurged: 1,
            proposalsPurged: 1,
            riskGrantsDeleted: 2,
            notificationDeliveriesDeleted: 1,
            readinessEvidenceDeleted: 0,
          },
          error: null,
        }
      default:
        return {
          data: null,
          error: { message: `Unexpected fixture RPC ${name}.` },
        }
    }
  },
}

const application = createRequestPublicApplicationService(client)
const server = createRequestPublicServerService(client)

async function main() {
const availability = await application.getAvailability()
assert(
  availability.intakeEligibility === 'available' &&
    availability.remainingQueueCapacity === 19,
  'Availability parser lost capacity or eligibility.',
)
const operations = await application.getOperations()
assert(
  operations.readinessVersions.notification_transport === 1 &&
    operations.operatorCounts.builder === 2,
  'Operations parser lost readiness or roster data.',
)

await application.setControls({
  expectedControlsVersion: 3,
  idempotencyKey: 'wire-controls-update',
  acceptingRequests: true,
  assigningRequests: true,
  intakeAudience: 'authenticated',
  activeCaseCapacity: 20,
  fulfillmentCaseCapacity: 4,
  operatorRosterRequired: true,
  publicIntakeRiskScreening: true,
  transactionalNotificationsEnabled: true,
  publicationConsentEnabled: true,
  publicationAirlockEnabled: true,
  publicOutcomesEnabled: true,
  actorHourlyIntakeLimit: 5,
  networkHourlyIntakeLimit: 12,
  globalDailyIntakeLimit: 250,
  policyVersions: controls.policyVersions,
})
const controlsCall = rpcCalls.find(
  (call) => call.name === 'set_build_request_public_controls_v1',
)
sameJson(
  controlsCall?.parameters.p_controls,
  {
    accepting_requests: true,
    assigning_requests: true,
    intake_audience: 'authenticated',
    active_case_capacity: 20,
    fulfillment_case_capacity: 4,
    operator_roster_required: true,
    public_intake_risk_screening: true,
    transactional_notifications_enabled: true,
    publication_consent_enabled: true,
    publication_airlock_enabled: true,
    public_outcomes_enabled: true,
    actor_hourly_intake_limit: 5,
    network_hourly_intake_limit: 12,
    global_daily_intake_limit: 250,
    terms_version: 'request-terms-v1',
    privacy_version: 'request-privacy-v1',
    acceptable_use_version: 'request-aup-v1',
    requester_rights_version: 'request-rights-v1',
    publication_terms_version: 'request-publication-v1',
  },
  'Public controls serialization',
)

assert(
  (await application.listOperators()).items[0]?.memberships[0]
    ?.currentlyAvailable === true,
  'Operator directory parser lost current availability.',
)
await application.setOperatorMembership({
  accountId: actorId,
  role: 'builder',
  expectedMembershipVersion: 0,
  state: 'active',
  maxActiveCases: 2,
  availableFrom: null,
  availableUntil: null,
  reason: '  Fixture builder availability.  ',
  idempotencyKey: 'wire-operator-create',
})
const operatorCall = rpcCalls.find(
  (call) => call.name === 'set_build_request_operator_membership_v1',
)
assert(
  operatorCall?.parameters.p_reason === 'Fixture builder availability.',
  'Operator reason did not normalize once at the service boundary.',
)

await application.recordReadiness({
  gate: 'legal',
  expectedEvidenceVersion: 0,
  state: 'confirmed',
  evidenceReference: 'fixture://legal-v1',
  validUntil: '2026-08-30T18:00:00.000Z',
  note: '  Fixture legal proof.  ',
  idempotencyKey: 'wire-readiness-create',
})

await application.submitRequest({
  request: {
    contractVersion: 1,
    idempotencyKey: 'wire-public-intake',
    brief: {
      title: '  Public wire fixture  ',
      outcome:
        '  Deliver a bounded result through the reviewed architecture.  ',
      intendedUser: '  Confirmed requester  ',
      mustWorkScenario:
        '  The requester opens the exact independently reviewed result.  ',
      acceptanceChecks: [
        '  The approved result opens without an integrity error.  ',
      ],
      constraints: '  Keep the private brief out of public projections.  ',
      pathforgeReference: {
        kind: 'project',
        projectId,
      },
    },
  },
  riskGrantId,
  attestation: {
    termsVersion: 'request-terms-v1',
    privacyVersion: 'request-privacy-v1',
    acceptableUseVersion: 'request-aup-v1',
    requesterRightsVersion: 'request-rights-v1',
    termsAccepted: true,
    privacyAcknowledged: true,
    acceptableUseAccepted: true,
    requesterRightsAccepted: true,
  },
})
const submitCall = rpcCalls.find(
  (call) => call.name === 'submit_build_request_public_v1',
)
sameJson(
  submitCall?.parameters.p_brief,
  {
    title: 'Public wire fixture',
    outcome: 'Deliver a bounded result through the reviewed architecture.',
    intended_user: 'Confirmed requester',
    must_work_scenario:
      'The requester opens the exact independently reviewed result.',
    acceptance_checks: [
      'The approved result opens without an integrity error.',
    ],
    constraints: 'Keep the private brief out of public projections.',
    pathforge_reference: {
      kind: 'project',
      project_id: projectId,
    },
  },
  'Attested public intake serialization',
)

await application.reportRequest({
  requestId,
  category: 'privacy',
  details: '  A bounded private report detail for the operator.  ',
  idempotencyKey: 'wire-report-create',
})
assert(
  (await application.listReports({ scope: 'admin' })).items[0]
    ?.alertStatus === 'pending',
  'Report queue parser lost alert state.',
)
await application.listReports({
  scope: 'mine',
  requestId,
  limit: 5,
})
const scopedReportCall = rpcCalls
  .filter((call) => call.name === 'list_build_request_reports_v1')
  .at(-1)
assert(
  scopedReportCall?.parameters.p_request_id === requestId,
  'Participant report history did not bind the current private case.',
)
await application.setReportStatus({
  reportId,
  expectedStatus: 'open',
  nextStatus: 'reviewing',
  resolutionNote: null,
  idempotencyKey: 'wire-report-review',
})
await application.setReportStatus({
  reportId,
  expectedStatus: 'reviewing',
  nextStatus: 'resolved',
  resolutionNote:
    'The private concern was reviewed and the expected safeguards were verified.',
  idempotencyKey: 'wire-report-resolve',
})
const reportStatusCall = rpcCalls
  .filter((call) => call.name === 'set_build_request_report_status_v1')
  .at(-1)
assert(
  reportStatusCall?.parameters.p_resolution_note ===
    'The private concern was reviewed and the expected safeguards were verified.',
  'Report resolution did not preserve the bounded participant-safe note.',
)

assert(
  (await application.getNotificationPreference())
    .transactionalEmailEnabled,
  'Notification preference parser failed.',
)
await application.setNotificationPreference({
  expectedPreferenceVersion: 1,
  transactionalEmailEnabled: false,
  idempotencyKey: 'wire-notification-off',
})

const publication = await application.getPublication(requestId)
assert(
  publication.visibility === 'full' &&
    publication.capabilities.includes('publish_outcome'),
  'Publication parser lost the exact admin bridge capability.',
)
publicationFixtureMode = 'withdrawal_only'
const withdrawalOnlyPublication = await application.getPublication(requestId)
assert(
  withdrawalOnlyPublication.visibility === 'withdrawal_only' &&
    withdrawalOnlyPublication.requestVersion === 8 &&
    withdrawalOnlyPublication.capabilities[0] === 'withdraw',
  'Publication parser lost scoped post-retention withdrawal authority.',
)
publicationFixtureMode = 'full'
assert(
  (await application.getPublicationWithdrawalReceipt({
    requestId,
    commandId,
  })).commandId === commandId,
  'Publication withdrawal receipt parser failed.',
)
await application.executePublication({
  kind: 'propose',
  requestId,
  expectedRequestVersion: 3,
  expectedProposalVersion: null,
  idempotencyKey: 'wire-publication-propose',
  payload: {
    safeTitle: '  Reviewed PathForge outcome  ',
    safeSummary:
      '  A safe public summary that points only to an already-approved PathForge project.  ',
  },
})
const publicationCall = rpcCalls.find(
  (call) => call.name === 'build_request_publication_command_v1',
)
sameJson(
  publicationCall?.parameters.p_payload,
  {
    safe_title: 'Reviewed PathForge outcome',
    safe_summary:
      'A safe public summary that points only to an already-approved PathForge project.',
  },
  'Publication proposal serialization',
)
assert(
  (await application.reviewPublication({
    proposalId,
    expectedProposalVersion: 1,
    verdict: 'approve',
    checks: {
      privateContentExcluded: true,
      claimsSupportedByDelivery: true,
      attributionMatchesConsent: true,
      reusePermissionMatchesConsent: true,
      publicTruthReady: true,
    },
    reviewNotes:
      'The exact proposed summary passed every independent airlock check.',
    idempotencyKey: 'wire-publication-review',
  })).verdict === 'approved',
  'Publication review receipt parser failed.',
)
const publicationReviewCall = rpcCalls.find(
  (call) => call.name === 'review_build_request_publication_v1',
)
sameJson(
  publicationReviewCall?.parameters.p_checks,
  {
    private_content_excluded: true,
    claims_supported_by_delivery: true,
    attribution_matches_consent: true,
    reuse_permission_matches_consent: true,
    public_truth_ready: true,
  },
  'Publication review checklist serialization',
)
assert(
  (await application.listPublicationQueue()).items[0]?.status ===
    'in_airlock',
  'Publication queue parser lost airlock state.',
)
const publicOutcomePage = await application.listPublicOutcomes({
  cursor: {
    publishedAt: occurredAt,
    slug: publicSlug,
  },
  limit: 12,
})
assert(
  publicOutcomePage.items[0]?.projectHref ===
    `/prompt/${projectId}`,
  'Public outcome parser did not preserve the approved project route.',
)
sameJson(
  publicOutcomePage.nextCursor,
  { publishedAt: occurredAt, slug: publicSlug },
  'Public outcome cursor parsing',
)
const publicOutcomeCall = rpcCalls.find(
  (call) => call.name === 'list_public_build_request_outcomes_v1',
)
sameJson(
  publicOutcomeCall?.parameters,
  {
    p_contract_version: 1,
    p_limit: 12,
    p_cursor_published_at: occurredAt,
    p_cursor_slug: publicSlug,
  },
  'Public outcome cursor serialization',
)
assert(
  (await application.getPublicOutcome(publicSlug)).requester === null,
  'Anonymous requester attribution did not survive parsing.',
)

assert(
  (await server.issueRiskGrant({
    actorId,
    intakeIdempotencyKey: 'wire-public-intake',
    networkDigest: '1'.repeat(64),
    riskEngineVersion: 'fixture-risk-v1',
  })).status === 'clear',
  'Risk grant parser failed.',
)
assert(
  (await server.projectNotifications()).reportsProjected === 1,
  'Notification projection parser failed.',
)
const claim = await server.claimNotifications()
assert(
  claim.items[0]?.requestPath === `/requests/${requestId}`,
  'Notification claim parser lost its safe request route.',
)
assert(
  (await server.resolveNotificationSend({
    deliveryId,
    claimToken,
  })).status === 'authorized',
  'Immediate notification send resolver parser failed.',
)
assert(
  (await server.finishNotification({
    deliveryId,
    claimToken,
    succeeded: true,
    errorCode: null,
  })).deliveryState === 'delivered',
  'Notification finish parser failed.',
)
assert(
  (await server.publishOutcome({
    proposalId,
    publishedProjectId: projectId,
    idempotencyKey: 'wire-publish-outcome',
  })).publicSlug === publicSlug,
  'Outcome publication receipt parser failed.',
)
assert(
  (await server.maintain()).notificationDeliveriesDeleted === 1,
  'Public maintenance parser failed.',
)

const hostileControlsInput = {
  expectedControlsVersion: 3,
  idempotencyKey: 'wire-controls-hostile',
  acceptingRequests: true,
  assigningRequests: true,
  intakeAudience: 'authenticated',
  activeCaseCapacity: 20,
  fulfillmentCaseCapacity: 4,
  operatorRosterRequired: true,
  publicIntakeRiskScreening: true,
  transactionalNotificationsEnabled: true,
  publicationConsentEnabled: true,
  publicationAirlockEnabled: true,
  publicOutcomesEnabled: true,
  actorHourlyIntakeLimit: 5,
  networkHourlyIntakeLimit: 12,
  globalDailyIntakeLimit: 250,
  policyVersions: controls.policyVersions,
} as const
const hostilePublicationBase = {
  requestId,
  expectedRequestVersion: 4,
  expectedProposalVersion: 1,
  idempotencyKey: 'wire-publication-hostile',
} as const
const passingPublicationChecks = {
  privateContentExcluded: true,
  claimsSupportedByDelivery: true,
  attributionMatchesConsent: true,
  reusePermissionMatchesConsent: true,
  publicTruthReady: true,
} as const

for (const [label, action] of [
  [
    'unknown controls field',
    () => application.setControls({
      ...hostileControlsInput,
      unexpected: true,
    } as never),
  ],
  [
    'string controls boolean',
    () => application.setControls({
      ...hostileControlsInput,
      acceptingRequests: 'true',
    } as never),
  ],
  [
    'null controls boolean',
    () => application.setControls({
      ...hostileControlsInput,
      publicationConsentEnabled: null,
    } as never),
  ],
  [
    'invalid requester attribution',
    () => application.executePublication({
      ...hostilePublicationBase,
      kind: 'requester_consent',
      payload: {
        requesterAttribution: 'public',
        publicationTermsVersion: 'request-publication-v1',
      },
    } as never),
  ],
  [
    'null requester publication terms',
    () => application.executePublication({
      ...hostilePublicationBase,
      kind: 'requester_consent',
      payload: {
        requesterAttribution: 'anonymous',
        publicationTermsVersion: null,
      },
    } as never),
  ],
  [
    'invalid builder reuse permission',
    () => application.executePublication({
      ...hostilePublicationBase,
      kind: 'builder_consent',
      payload: {
        reusePermission: 'unrestricted',
        publicationTermsVersion: 'request-publication-v1',
      },
    } as never),
  ],
  [
    'publication command extra field',
    () => application.executePublication({
      ...hostilePublicationBase,
      kind: 'withdraw',
      payload: {},
      privateRequestId: requestId,
    } as never),
  ],
  [
    'nonempty decline payload',
    () => application.executePublication({
      ...hostilePublicationBase,
      kind: 'decline',
      payload: { reason: 'No longer wanted.' },
    } as never),
  ],
  [
    'new proposal with prior version',
    () => application.executePublication({
      ...hostilePublicationBase,
      kind: 'propose',
      payload: {
        safeTitle: outcome.title,
        safeSummary: outcome.summary,
      },
    } as never),
  ],
  [
    'approved review with failed check',
    () => application.reviewPublication({
      proposalId,
      expectedProposalVersion: 1,
      verdict: 'approve',
      checks: {
        ...passingPublicationChecks,
        publicTruthReady: false,
      },
      reviewNotes:
        'The proposal cannot be approved with a failed public-truth check.',
      idempotencyKey: 'wire-review-failed-check',
    }),
  ],
  [
    'changes-required review with all checks passing',
    () => application.reviewPublication({
      proposalId,
      expectedProposalVersion: 1,
      verdict: 'changes_required',
      checks: passingPublicationChecks,
      reviewNotes:
        'Changes required must identify at least one exact failed check.',
      idempotencyKey: 'wire-review-no-failed-check',
    }),
  ],
  [
    'nonboolean publication review check',
    () => application.reviewPublication({
      proposalId,
      expectedProposalVersion: 1,
      verdict: 'approve',
      checks: {
        ...passingPublicationChecks,
        privateContentExcluded: 'yes',
      },
      reviewNotes:
        'The exact review checklist cannot accept string-shaped booleans.',
      idempotencyKey: 'wire-review-string-check',
    } as never),
  ],
  [
    'unsafe notification success',
    () => server.finishNotification({
      deliveryId,
      claimToken,
      succeeded: true,
      errorCode: 'provider_error',
    }),
  ],
  [
    'oversized publication review note',
    () => application.reviewPublication({
      proposalId,
      expectedProposalVersion: 1,
      verdict: 'approve',
      checks: passingPublicationChecks,
      reviewNotes: 'x'.repeat(1_001),
      idempotencyKey: 'wire-review-oversized-note',
    }),
  ],
  [
    'arbitrary public outcome slug',
    () => application.getPublicOutcome('../private'),
  ],
] as const) {
  const callsBefore = rpcCalls.length
  let rejected = false
  try {
    await action()
  } catch {
    rejected = true
  }
  assert(rejected, `${label} did not fail before RPC.`)
  assert(
    rpcCalls.length === callsBefore,
    `${label} reached the RPC boundary.`,
  )
}

const leakingAvailability = createRequestPublicApplicationService({
  async rpc() {
    return {
      data: {
        ...controls,
        intakeEligibility: 'available',
        riskScreeningRequired: true,
        unavailableReason: null,
        privateRequestId: requestId,
      },
      error: null,
    }
  },
})
let leakingAvailabilityRejected = false
try {
  await leakingAvailability.getAvailability()
} catch {
  leakingAvailabilityRejected = true
}
assert(
  leakingAvailabilityRejected,
  'Availability output must reject unknown authority fields.',
)

const unsafeRecipientServer = createRequestPublicServerService({
  async rpc() {
    return {
      data: {
        items: [{
          deliveryId,
          claimToken,
          recipient: 'not-an-email',
          templateKey: 'request_status_changed',
          requestPath: `/requests/${requestId}`,
          attempt: 1,
        }],
      },
      error: null,
    }
  },
})
let unsafeRecipientRejected = false
try {
  await unsafeRecipientServer.claimNotifications()
} catch {
  unsafeRecipientRejected = true
}
assert(
  unsafeRecipientRejected,
  'Notification claims must reject any premature recipient identity.',
)

const mismatchedNotificationBinding = createRequestPublicServerService({
  async rpc() {
    return {
      data: {
        status: 'authorized',
        deliveryId: '9b100000-0000-4000-8000-000000000099',
        claimToken,
        recipient: 'fixture@example.test',
        templateKey: 'request_action_needed',
        requestPath: `/requests/${requestId}`,
      },
      error: null,
    }
  },
})
let mismatchedNotificationBindingRejected = false
try {
  await mismatchedNotificationBinding.resolveNotificationSend({
    deliveryId,
    claimToken,
  })
} catch {
  mismatchedNotificationBindingRejected = true
}
assert(
  mismatchedNotificationBindingRejected,
  'Notification send resolution must preserve the exact claim binding.',
)

console.log(
  'Request public architecture compiled wire contract passed: exact gated-control, roster, readiness, attested intake, report, notification, publication, public-outcome, risk, and maintenance serializers/parsers are connected and reject extra or unsafe authority fields.',
)
}

void main()
