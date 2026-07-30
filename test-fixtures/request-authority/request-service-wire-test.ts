import {
  createRequestApplicationService,
  createRequestAccountDeidentificationReceiptCleanupService,
  createRequestAuditTombstoneCleanupService,
  createRequestDeliveryArtifactCleanupClaimService,
  createRequestDeliveryArtifactCleanupConfirmationService,
  createRequestDeliveryArtifactObjectResolver,
  createRequestDeliveryRevisionRetirementService,
  createRequestMaintenanceWorkService,
  createRequestRawTextPurgeService,
  createRequestStagedArtifactCustodyService,
  parseRequestAuthorityErrorCode,
  parseRequestAvailabilityV1,
  parseRequestDeliveryManifestV1,
  parseRequestMaintenanceWorkPageV1,
  parseRequestPilotAdmissionCandidatePageV1,
  type RequestRpcClient,
  RequestAuthorityError,
} from '../../src/lib/request-service'
import {
  validateRequestDeliveryReviewV1,
  type RequestDeliveryReviewV1,
  type RequestParticipantCommandV1,
} from '../../src/lib/request-lifecycle'

type Capture = {
  functionName: string
  parameters: Record<string, unknown>
}

const requestId = '85000000-0000-4000-8000-000000000001'
const deliveryRevisionId = '85100000-0000-4000-8000-000000000001'
const briefRevisionId = '85200000-0000-4000-8000-000000000001'
const builderAssignmentId = '85300000-0000-4000-8000-000000000001'
const artifactId = '85400000-0000-4000-8000-000000000001'
const acceptanceCheckId = '85400000-0000-4000-8000-000000000002'
const clarificationId = '85400000-0000-4000-8000-000000000003'
const stageReceiptId = '85500000-0000-4000-8000-000000000001'
const attestationReceiptId = '85600000-0000-4000-8000-000000000001'
const cleanupClaimId = '85600000-0000-4000-8000-000000000002'
const preparationReceiptId = '85700000-0000-4000-8000-000000000001'
const sealReceiptId = '85800000-0000-4000-8000-000000000001'
const approvedProjectId = '81200000-0000-4000-8000-000000000001'
const approvedModelVariantId = '81300000-0000-4000-8000-000000000001'
const sha256 = 'a'.repeat(64)
const manifestDigest = 'b'.repeat(64)
const objectIdentity = 'requests/private/8500/revision-8510/artifact-8540'
const occurredAt = '2026-07-30T12:00:00.000Z'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function sameJson(actual: unknown, expected: unknown, label: string) {
  const actualJson = JSON.stringify(actual)
  const expectedJson = JSON.stringify(expected)
  assert(actualJson === expectedJson, `${label} mismatch.\nactual=${actualJson}\nexpected=${expectedJson}`)
}

function verifyMaintenanceWorkParser() {
  const valid = parseRequestMaintenanceWorkPageV1({
    items: [
      { category: 'raw_text_purge', requestId },
      {
        category: 'artifact_cleanup',
        requestId,
        deliveryRevisionId,
        artifactId,
      },
      { category: 'audit_tombstone_expiry', requestId },
      {
        category: 'account_deidentification_receipt_expiry',
        receiptId: attestationReceiptId,
      },
      {
        category: 'delivery_revision_retirement',
        requestId,
        deliveryRevisionId,
        expectedVersion: 8,
      },
    ],
    nextCursor: null,
  })
  assert(valid.items.length === 5, 'Maintenance work parser lost a valid item.')
  for (const hostile of [
    {
      items: [{
        category: 'artifact_cleanup',
        requestId,
        deliveryRevisionId,
        artifactId,
        objectIdentity,
      }],
      nextCursor: null,
    },
    {
      items: [{
        category: 'raw_text_purge',
        requestId,
        artifactId,
      }],
      nextCursor: null,
    },
    {
      items: [{
        category: 'unknown_cleanup',
        requestId,
      }],
      nextCursor: null,
    },
    {
      items: [{
        category: 'account_deidentification_receipt_expiry',
        requestId,
        receiptId: attestationReceiptId,
      }],
      nextCursor: null,
    },
    {
      items: [{
        category: 'account_deidentification_receipt_expiry',
      }],
      nextCursor: null,
    },
    {
      items: [{
        category: 'delivery_revision_retirement',
        requestId,
        deliveryRevisionId,
      }],
      nextCursor: null,
    },
  ]) {
    let rejected = false
    try {
      parseRequestMaintenanceWorkPageV1(hostile)
    } catch {
      rejected = true
    }
    assert(rejected, 'Maintenance work parser accepted an unsafe projection.')
  }
}

function verifyCanonicalManifestClarificationProvenance() {
  const manifest = {
    version: 'request-delivery-manifest-v1',
    policyVersion: 'request-delivery-passive-v1',
    requestId,
    deliveryRevisionId,
    acceptedBriefRevisionId: briefRevisionId,
    acceptedBrief: {
      title: 'Fixture request',
      outcome: 'Deliver a complete fixture that satisfies the accepted scope.',
      intendedUser: 'Fixture requester',
      mustWorkScenario: 'The requester can inspect and download the fixture.',
      constraints: 'Text-only private managed-service request.',
      pathforgeReference: {
        kind: 'project',
        projectId: approvedProjectId,
      },
      acceptanceChecks: [{
        acceptanceCheckId,
        ordinal: 1,
        text: 'The delivered fixture passes its deterministic check.',
      }],
    },
    acceptedClarifications: [{
      clarificationId,
      sequence: 1,
      question: 'Which deterministic behavior is required?',
      answer: 'The fixture must preserve the accepted clarification snapshot.',
    }],
    acceptedClarificationCount: 1,
    acceptedClarificationDigest: 'c'.repeat(64),
    clarificationAcceptanceCutoff: occurredAt,
    builderAssignmentId,
    revisionLabel: 'Initial delivery',
    summary: 'Verified fixture delivery.',
    artifactCount: 1,
    totalBytes: 1234,
    evidenceChecklistVersion: 1,
    rightsSnapshot: {
      version: 'request-rights-v1',
      builderIsAuthor: true,
      requesterRights: ['non_exclusive_use', 'download'],
      confidential: false,
      exclusive: false,
      workForHire: false,
    },
    builderEvidence: [{
      acceptanceCheckId,
      result: 'pass',
      evidenceText: 'Rendered successfully.',
      evidenceRef: null,
    }],
    approvedPathForgeReference: null,
    artifacts: [{
      artifactId,
      artifactOrdinal: 1,
      safeName: 'pathforge-result.html',
      sha256,
      byteLength: 1234,
      mediaType: 'text/html',
    }],
  }
  parseRequestDeliveryManifestV1(manifest)
  parseRequestDeliveryManifestV1({
    ...manifest,
    approvedPathForgeReference: {
      kind: 'response',
      projectId: approvedProjectId,
      modelVariantId: approvedModelVariantId,
      responseStepNumber: 1,
    },
  })

  for (const hostile of [
    {
      ...manifest,
      acceptedClarifications: [{
        ...manifest.acceptedClarifications[0],
        answer: null,
      }],
    },
    {
      ...manifest,
      acceptedClarifications: [{
        ...manifest.acceptedClarifications[0],
        sequence: 2,
      }],
    },
    {
      ...manifest,
      acceptedClarificationCount: 0,
    },
    {
      ...manifest,
      clarificationAcceptanceCutoff: '2026-07-30',
    },
    {
      ...manifest,
      acceptedBrief: {
        ...manifest.acceptedBrief,
        pathforgeReference: {
          kind: 'project',
          project_id: approvedProjectId,
        },
      },
    },
  ]) {
    let rejected = false
    try {
      parseRequestDeliveryManifestV1(hostile)
    } catch {
      rejected = true
    }
    assert(rejected, 'Invalid canonical manifest provenance was accepted.')
  }
}

function verifyDeliveryReviewTimestampContract() {
  const review: RequestDeliveryReviewV1 = {
    deliveryRevisionId,
    checklistVersion: 1,
    checks: [{
      acceptanceCheckId,
      result: 'pass',
      evidenceRef: 'fixture-review-evidence',
    }],
    safetyIntegrityResult: 'pass',
    verdict: 'approve',
    reason: null,
    reviewNotes: 'Independent review passed.',
    repairInstructions: null,
    reviewer: {
      displayName: 'Fixture Reviewer',
      deidentified: false,
    },
    reviewedAt: occurredAt,
    isCurrent: true,
  }
  for (const reviewedAt of [
    '1',
    'July 30, 2026 12:00:00',
    '2026-07-30',
    '2026-02-30T12:00:00Z',
    '2026-07-30T12:00:00+24:00',
  ]) {
    let rejected = false
    try {
      validateRequestDeliveryReviewV1({ ...review, reviewedAt })
    } catch {
      rejected = true
    }
    assert(rejected, `Delivery review accepted hostile reviewedAt ${reviewedAt}.`)
  }
  for (const reviewedAt of [
    '2026-07-30T12:00:00.123456789Z',
    '2026-07-30T08:00:00.123-04:00',
  ]) {
    assert(
      validateRequestDeliveryReviewV1({ ...review, reviewedAt }).reviewedAt
        === reviewedAt,
      `Delivery review rejected valid reviewedAt ${reviewedAt}.`,
    )
  }
}

function verifyAvailabilityContract() {
  const operationalStates = [
    {
      label: 'open',
      acceptingRequests: true,
      assigningRequests: true,
      activeCaseCount: 1,
      activeCaseCapacity: 4,
      remainingCapacity: 3,
      unavailableReason: null,
    },
    {
      label: 'controls_off',
      acceptingRequests: false,
      assigningRequests: false,
      activeCaseCount: 1,
      activeCaseCapacity: 4,
      remainingCapacity: 3,
      unavailableReason: 'controls_off',
    },
    {
      label: 'capacity_full',
      acceptingRequests: true,
      assigningRequests: true,
      activeCaseCount: 4,
      activeCaseCapacity: 4,
      remainingCapacity: 0,
      unavailableReason: 'capacity_full',
    },
    {
      label: 'fail_closed',
      acceptingRequests: true,
      assigningRequests: true,
      activeCaseCount: 1,
      activeCaseCapacity: 4,
      remainingCapacity: 3,
      unavailableReason: 'unavailable',
    },
  ] as const
  for (const intakeEligibility of [
    'sign_in_required',
    'not_admitted',
    'already_active',
    'available',
  ] as const) {
    for (const operationalState of operationalStates) {
      const { label, ...wireState } = operationalState
      const parsed = parseRequestAvailabilityV1({
        intakeEligibility,
        controlsVersion: 9,
        ...wireState,
      })
      assert(
        parsed.intakeEligibility === intakeEligibility,
        `${intakeEligibility}/${label} drifted.`,
      )
    }
  }

  for (const leakedField of [
    'admissionVersion',
    'admissionExpiresAt',
    'admissionReason',
    'admittedAccounts',
  ]) {
    let leakedAdmissionDetailsRejected = false
    try {
      parseRequestAvailabilityV1({
        intakeEligibility: 'not_admitted',
        controlsVersion: 9,
        ...(() => {
          const { label, ...wireState } = operationalStates[0]
          void label
          return wireState
        })(),
        [leakedField]: leakedField === 'admittedAccounts' ? [] : 'private',
      })
    } catch {
      leakedAdmissionDetailsRejected = true
    }
    assert(
      leakedAdmissionDetailsRejected,
      `Non-admitted availability exposed ${leakedField}.`,
    )
  }

  for (const inconsistent of [
    {
      acceptingRequests: false,
      activeCaseCount: 1,
      activeCaseCapacity: 4,
      remainingCapacity: 3,
      unavailableReason: null,
    },
    {
      acceptingRequests: true,
      activeCaseCount: 4,
      activeCaseCapacity: 4,
      remainingCapacity: 0,
      unavailableReason: null,
    },
    {
      acceptingRequests: true,
      activeCaseCount: 1,
      activeCaseCapacity: 4,
      remainingCapacity: 3,
      unavailableReason: 'capacity_full',
    },
  ] as const) {
    let inconsistencyRejected = false
    try {
      parseRequestAvailabilityV1({
        intakeEligibility: 'not_admitted',
        controlsVersion: 9,
        assigningRequests: true,
        ...inconsistent,
      })
    } catch {
      inconsistencyRejected = true
    }
    assert(
      inconsistencyRejected,
      'Operational reason was inferred from eligibility instead of flags/count.',
    )
  }
}

function verifyPilotAdmissionCandidateParser() {
  const safeRows = [
    {
      accountId: '8c000000-0000-4000-8000-000000000003',
      displayName: 'Admission Fixture A Absent',
      admissionVersion: 0,
      admitted: false,
      expiresAt: null,
    },
    {
      accountId: '8c000000-0000-4000-8000-000000000004',
      displayName: 'Admission Fixture B Revoked',
      admissionVersion: 2,
      admitted: false,
      expiresAt: null,
    },
    {
      accountId: '8c000000-0000-4000-8000-000000000005',
      displayName: 'Admission Fixture C Active',
      admissionVersion: 3,
      admitted: true,
      expiresAt: '2026-08-09T12:00:00.000Z',
    },
    {
      accountId: '8c000000-0000-4000-8000-000000000006',
      displayName: 'Admission Fixture D Expired',
      admissionVersion: 4,
      admitted: true,
      expiresAt: '2026-07-29T12:00:00.000Z',
    },
  ]
  const parsed = parseRequestPilotAdmissionCandidatePageV1({
    items: safeRows,
    nextCursor: null,
  })
  assert(parsed.items.length === 4, 'Pilot admission safe rows drifted.')

  for (const invalidPage of [
    {
      items: [{ ...safeRows[0], email: 'private@example.com' }],
      nextCursor: null,
    },
    {
      items: [{ ...safeRows[0], reason: 'private roster reason' }],
      nextCursor: null,
    },
    { items: safeRows, nextCursor: 'unsigned-cursor' },
    { items: Array.from({ length: 51 }, () => safeRows[0]), nextCursor: null },
  ]) {
    let rejected = false
    try {
      parseRequestPilotAdmissionCandidatePageV1(invalidPage)
    } catch {
      rejected = true
    }
    assert(rejected, 'Pilot admission parser accepted a private or malformed page.')
  }
}

function verifyAuthorityErrorCodes() {
  assert(
    parseRequestAuthorityErrorCode(
      'request_authority:invalid_transition',
    ) === 'invalid_transition',
    'PostgREST invalid-transition detail was not classified.',
  )
  assert(
    parseRequestAuthorityErrorCode(
      'request_authority:delivery_revision_limit',
    ) === 'delivery_revision_limit',
    'PostgREST delivery-revision-limit detail was not classified.',
  )
  assert(
    parseRequestAuthorityErrorCode(
      'request_authority:artifact_staging_limit',
    ) === 'artifact_staging_limit',
    'PostgREST artifact-staging-limit detail was not classified.',
  )
  for (const unexpected of [
    'request_authority:internal_table_name',
    'request_authority:invalid_transition:private',
    { details: 'request_authority:invalid_transition' },
  ]) {
    assert(
      parseRequestAuthorityErrorCode(unexpected) === 'unknown',
      'Unexpected authority detail was reflected as a public error code.',
    )
  }
}

function commandReceipt(parameters: Record<string, unknown>) {
  const command = parameters.p_command
  const closePayload = parameters.p_payload as Record<string, unknown> | undefined
  const isClose = command === 'close'
  return [{
    contract_version: 1,
    command_id: '85900000-0000-4000-8000-000000000001',
    request_id: requestId,
    request_version: 1,
    event_id: '85900000-0000-4000-8000-000000000002',
    lifecycle_state: isClose ? 'closed' : 'building',
    moderation_state: 'clear',
    publication_state: 'private',
    close_reason: isClose ? closePayload?.reason : null,
    replayed: false,
    occurred_at: occurredAt,
    authority_result:
      command === 'stage_delivery_artifact'
        ? { deliveryRevisionId, artifactId }
        : command === 'prepare_delivery_revision'
          ? { deliveryRevisionId }
          : {},
  }]
}

const captures: Capture[] = []
const client: RequestRpcClient = {
  async rpc(functionName, parameters) {
    captures.push({ functionName, parameters })
    if (functionName === 'build_request_command_v1') {
      return { data: commandReceipt(parameters), error: null }
    }
    if (functionName === 'list_build_request_eligible_assignees_v1') {
      return {
        data: {
          items: [{
            accountId: builderAssignmentId,
            displayName: 'Eligible Fixture Builder',
          }],
          nextCursor: null,
        },
        error: null,
      }
    }
    if (functionName === 'set_build_request_pilot_admission_v1') {
      return {
        data: {
          contractVersion: 1,
          accountId: parameters.p_account_id,
          admissionVersion:
            (parameters.p_expected_admission_version as number) + 1,
          admitted: parameters.p_admitted,
          expiresAt: parameters.p_expires_at ?? null,
          replayed: false,
          occurredAt,
        },
        error: null,
      }
    }
    if (functionName === 'deidentify_build_request_account_v1') {
      return {
        data: {
          contractVersion: 1,
          accountId: parameters.p_account_id,
          affectedCaseCount: 3,
          terminalizedCaseCount: 2,
          admissionRevoked: true,
          replayed: false,
          occurredAt,
        },
        error: null,
      }
    }
    if (functionName === 'expire_build_request_audit_tombstone_v1') {
      return {
        data: {
          contractVersion: 1,
          requestId: parameters.p_request_id,
          cleaned: true,
          replayed: false,
          aggregateDigest: 'd'.repeat(64),
          occurredAt,
        },
        error: null,
      }
    }
    if (functionName === 'list_build_request_maintenance_work_v1') {
      return {
        data: {
          items: [
            { category: 'raw_text_purge', requestId },
            {
              category: 'artifact_cleanup',
              requestId,
              deliveryRevisionId,
              artifactId,
            },
            { category: 'audit_tombstone_expiry', requestId },
            {
              category: 'account_deidentification_receipt_expiry',
              receiptId: attestationReceiptId,
            },
            {
              category: 'delivery_revision_retirement',
              requestId,
              deliveryRevisionId,
              expectedVersion: 8,
            },
          ],
          nextCursor: null,
        },
        error: null,
      }
    }
    if (functionName === 'purge_build_request_raw_text_v1') {
      return {
        data: {
          requestId: parameters.p_request_id,
          purgedAt: occurredAt,
          auditTombstoneUntil: '2027-09-03T12:00:00.000Z',
          replayed: false,
        },
        error: null,
      }
    }
    if (
      functionName === 'claim_build_request_delivery_artifact_cleanup_v1'
    ) {
      return {
        data: {
          cleanupClaimId,
          requestId: parameters.p_request_id,
          deliveryRevisionId: parameters.p_delivery_revision_id,
          artifactId: parameters.p_artifact_id,
          claimVersion: 1,
          leaseUntil: '2026-07-30T12:05:00.000Z',
          deletionStarted: false,
          replayed: false,
        },
        error: null,
      }
    }
    if (
      functionName ===
      'begin_build_request_delivery_artifact_cleanup_delete_v1'
    ) {
      return {
        data: {
          cleanupClaimId: parameters.p_cleanup_claim_id,
          requestId,
          deliveryRevisionId,
          artifactId,
          claimVersion: parameters.p_claim_version,
          deleteStartedAt: occurredAt,
          replayed: false,
        },
        error: null,
      }
    }
    if (
      functionName ===
      'confirm_build_request_delivery_artifact_cleanup_v1'
    ) {
      return {
        data: {
          cleanupReceiptId: attestationReceiptId,
          requestId: parameters.p_request_id,
          deliveryRevisionId: parameters.p_delivery_revision_id,
          artifactId: parameters.p_artifact_id,
          cleanupClaimId: parameters.p_cleanup_claim_id,
          claimVersion: parameters.p_claim_version,
          cleanupDisposition: 'worker_removed',
          replayed: false,
          cleanedAt: occurredAt,
        },
        error: null,
      }
    }
    if (
      functionName === 'abort_build_request_delivery_artifact_cleanup_v1'
    ) {
      return {
        data: {
          cleanupClaimId: parameters.p_cleanup_claim_id,
          requestId,
          deliveryRevisionId,
          artifactId,
          claimVersion: parameters.p_claim_version,
          replayed: false,
          abortedAt: occurredAt,
        },
        error: null,
      }
    }
    if (
      functionName
        === 'expire_build_request_account_deidentification_receipt_v1'
    ) {
      return {
        data: {
          contractVersion: 1,
          receiptId: parameters.p_receipt_id,
          expired: true,
          occurredAt,
        },
        error: null,
      }
    }
    if (functionName === 'retire_build_request_delivery_revision_v1') {
      return {
        data: {
          requestId: parameters.p_request_id,
          deliveryRevisionId: parameters.p_delivery_revision_id,
          revisionState: 'abandoned',
          retiredAt: occurredAt,
          replayed: false,
        },
        error: null,
      }
    }
    if (functionName === 'prepare_build_request_delivery_artifact_object_v1') {
      return {
        data: {
          stageReceiptId,
          requestId,
          expectedRequestVersion: 2,
          deliveryRevisionId,
          artifactId,
          acceptedBriefRevisionId: briefRevisionId,
          activeBuilderAssignmentId: builderAssignmentId,
          artifactOrdinal: 1,
          sha256,
          byteLength: 1234,
          detectedMediaType: 'text/html',
          scannerVersion: 'fixture-scanner-v1',
          objectIdentity,
        },
        error: null,
      }
    }
    if (functionName === 'attest_build_request_delivery_artifact_object_v1') {
      return {
        data: {
          attestationReceiptId,
          requestId,
          deliveryRevisionId,
          artifactId,
          artifactOrdinal: 1,
          attestationVersion: 1,
          replayed: false,
          attestedAt: occurredAt,
        },
        error: null,
      }
    }
    if (functionName === 'resolve_build_request_delivery_artifact_custody_v1') {
      return {
        data: {
          requestVersion: 2,
          requestId,
          deliveryRevisionId,
          artifactId,
          stageReceiptId,
          acceptedBriefRevisionId: briefRevisionId,
          activeBuilderAssignmentId: builderAssignmentId,
          artifactOrdinal: 1,
          sha256,
          byteLength: 1234,
          detectedMediaType: 'text/html',
          scannerVersion: 'fixture-scanner-v1',
          objectIdentity,
          attestationReceiptId,
          attestationVersion: 1,
          retentionState: 'retained',
          accessUntil: null,
        },
        error: null,
      }
    }
    if (functionName === 'resolve_build_request_delivery_artifact_object_v1') {
      return {
        data: {
          artifactId,
          deliveryRevisionId,
          manifestDigest,
          objectIdentity,
          retentionState: 'retained',
          accessUntil: null,
        },
        error: null,
      }
    }
    if (functionName === 'seal_build_request_delivery_revision_v1') {
      return {
        data: {
          sealReceiptId,
          requestId,
          deliveryRevisionId,
          manifestDigest,
          manifestContractVersion: 'request-delivery-manifest-v1',
          policyVersion: 'request-delivery-passive-v1',
          artifactCount: 1,
          totalBytes: 1234,
          replayed: false,
          sealedAt: occurredAt,
        },
        error: null,
      }
    }
    return {
      data: null,
      error: { message: `Unexpected RPC ${functionName}` },
    }
  },
}

const application = createRequestApplicationService(client)
const tombstoneCleanup = createRequestAuditTombstoneCleanupService(client)
const deidentificationReceiptCleanup =
  createRequestAccountDeidentificationReceiptCleanupService(client)
const deliveryRevisionRetirement =
  createRequestDeliveryRevisionRetirementService(client)
const custody = createRequestStagedArtifactCustodyService(client)
const objectResolver = createRequestDeliveryArtifactObjectResolver(client)
const maintenanceWork = createRequestMaintenanceWorkService(client)
const rawTextPurge = createRequestRawTextPurgeService(client)
const artifactCleanupClaim =
  createRequestDeliveryArtifactCleanupClaimService(client)
const artifactCleanupConfirmation =
  createRequestDeliveryArtifactCleanupConfirmationService(client)

async function main() {
verifyCanonicalManifestClarificationProvenance()
verifyMaintenanceWorkParser()
verifyAvailabilityContract()
verifyPilotAdmissionCandidateParser()
verifyAuthorityErrorCodes()
verifyDeliveryReviewTimestampContract()
await application.inviteRequestPilotParticipant({
  accountId: builderAssignmentId,
  expectedAdmissionVersion: 0,
  idempotencyKey: 'adapter-admit-0001',
  reason: '  Approved private pilot participant.  ',
  expiresAt: '2099-08-30T12:00:00.000Z',
})
await application.revokeRequestPilotParticipant({
  accountId: builderAssignmentId,
  expectedAdmissionVersion: 1,
  idempotencyKey: 'adapter-revoke-0001',
  reason: '  Pilot access revoked.  ',
})
await application.listEligibleAssignees({
  requestId,
  role: 'builder',
  query: '  Fixture Builder  ',
  limit: 10,
})
let unavailableQueueRejected = false
try {
  await createRequestApplicationService({
    async rpc() {
      return {
        data: null,
        error: {
          code: 'PGRST500',
          message: 'Backend unavailable.',
          details: 'unsafe backend detail',
        },
      }
    },
  }).listAssignedQueue({ scope: 'builder' })
} catch (error) {
  unavailableQueueRejected =
    error instanceof RequestAuthorityError && error.code === 'unknown'
}
assert(
  unavailableQueueRejected,
  'Assigned queue read failure was normalized to a false empty page.',
)
await application.deidentifyRequestAccount({
  accountId: builderAssignmentId,
  idempotencyKey: 'adapter-deidentify-account-0001',
})
await tombstoneCleanup.expireBuildRequestAuditTombstone({
  requestId,
  idempotencyKey: 'adapter-expire-tombstone-0001',
})
await maintenanceWork.listEligibleMaintenanceWork({ limit: 25 })
await rawTextPurge.purgeBuildRequestRawText({ requestId })
await artifactCleanupClaim.claimDeliveryArtifactCleanup({
  requestId,
  deliveryRevisionId,
  artifactId,
  idempotencyKey: 'adapter-claim-cleanup-0001',
})
await artifactCleanupClaim.beginDeliveryArtifactCleanupDelete({
  cleanupClaimId,
  claimVersion: 1,
  idempotencyKey: 'adapter-begin-cleanup-delete-0001',
})
await artifactCleanupClaim.abortDeliveryArtifactCleanup({
  cleanupClaimId,
  claimVersion: 1,
  idempotencyKey: 'adapter-abort-cleanup-0001',
})
await artifactCleanupConfirmation.confirmDeliveryArtifactCleanup({
  requestId,
  deliveryRevisionId,
  artifactId,
  cleanupClaimId,
  claimVersion: 1,
  idempotencyKey: 'adapter-confirm-cleanup-0001',
})
sameJson(
  captures.filter(({ functionName }) => [
    'list_build_request_maintenance_work_v1',
    'purge_build_request_raw_text_v1',
    'claim_build_request_delivery_artifact_cleanup_v1',
    'begin_build_request_delivery_artifact_cleanup_delete_v1',
    'abort_build_request_delivery_artifact_cleanup_v1',
    'confirm_build_request_delivery_artifact_cleanup_v1',
  ].includes(functionName)),
  [
    {
      functionName: 'list_build_request_maintenance_work_v1',
      parameters: {
        p_contract_version: 1,
        p_cursor: null,
        p_limit: 25,
      },
    },
    {
      functionName: 'purge_build_request_raw_text_v1',
      parameters: {
        p_contract_version: 1,
        p_request_id: requestId,
      },
    },
    {
      functionName: 'claim_build_request_delivery_artifact_cleanup_v1',
      parameters: {
        p_contract_version: 1,
        p_request_id: requestId,
        p_delivery_revision_id: deliveryRevisionId,
        p_artifact_id: artifactId,
        p_idempotency_key: 'adapter-claim-cleanup-0001',
      },
    },
    {
      functionName:
        'begin_build_request_delivery_artifact_cleanup_delete_v1',
      parameters: {
        p_contract_version: 1,
        p_cleanup_claim_id: cleanupClaimId,
        p_claim_version: 1,
        p_idempotency_key: 'adapter-begin-cleanup-delete-0001',
      },
    },
    {
      functionName: 'abort_build_request_delivery_artifact_cleanup_v1',
      parameters: {
        p_contract_version: 1,
        p_cleanup_claim_id: cleanupClaimId,
        p_claim_version: 1,
        p_idempotency_key: 'adapter-abort-cleanup-0001',
      },
    },
    {
      functionName: 'confirm_build_request_delivery_artifact_cleanup_v1',
      parameters: {
        p_contract_version: 1,
        p_request_id: requestId,
        p_delivery_revision_id: deliveryRevisionId,
        p_artifact_id: artifactId,
        p_cleanup_claim_id: cleanupClaimId,
        p_claim_version: 1,
        p_idempotency_key: 'adapter-confirm-cleanup-0001',
      },
    },
  ],
  'maintenance RPC wire',
)
await deidentificationReceiptCleanup
  .expireRequestAccountDeidentificationReceipt({
    receiptId: stageReceiptId,
  })
await deliveryRevisionRetirement.retireBuildRequestDeliveryRevision({
  requestId,
  deliveryRevisionId,
  expectedVersion: 11,
  idempotencyKey: 'adapter-retire-revision-0001',
})

await application.executeCommand({
  contractVersion: 1,
  kind: 'stage_delivery_artifact',
  requestId,
  expectedVersion: 1,
  idempotencyKey: 'adapter-stage-0001',
  payload: {
    deliveryRevisionId,
    acceptedBriefRevisionId: briefRevisionId,
    activeBuilderAssignmentId: builderAssignmentId,
    artifactOrdinal: 1,
    clientFileId: 'client-file-0001',
    normalizedName: 'pathforge-result.html',
    byteLength: 1234,
    sha256,
    detectedMediaType: 'text/html',
    scannerVersion: 'fixture-scanner-v1',
  },
})

await application.executeCommand({
  contractVersion: 1,
  kind: 'prepare_delivery_revision',
  requestId,
  expectedVersion: 2,
  idempotencyKey: 'adapter-prepare-0001',
  payload: {
    deliveryRevisionId,
    acceptedBriefRevisionId: briefRevisionId,
    activeBuilderAssignmentId: builderAssignmentId,
    revisionLabel: '  Initial delivery  ',
    summary: '  Verified fixture delivery.  ',
    builderEvidence: [{
      acceptanceCheckId,
      result: 'pass',
      evidenceText: '  Rendered successfully.  ',
      evidenceRef: null,
    }],
  },
})

const staged = await custody.prepareStagedArtifactObject({
  requestId,
  deliveryRevisionId,
  artifactId,
  stageReceiptId,
})
await custody.attestStagedArtifactObject({
  ...staged,
  idempotencyKey: 'adapter-attest-0001',
  scanVerdict: 'clean',
})
await custody.resolveDeliveryArtifactCustody({
  requestId,
  deliveryRevisionId,
  artifactId,
})
await objectResolver.resolveDeliveryArtifactObject({
  artifactId,
  deliveryRevisionId,
})
await custody.sealDeliveryRevision({
  requestId,
  deliveryRevisionId,
  preparationReceiptId,
  idempotencyKey: 'adapter-seal-0001',
  artifacts: [{ artifactOrdinal: 1, artifactId }],
})

await application.executeCommand({
  contractVersion: 1,
  kind: 'submit_delivery',
  requestId,
  expectedVersion: 3,
  idempotencyKey: 'adapter-submit-0001',
  payload: { deliveryRevisionId, sealReceiptId },
})

await application.executeCommand({
  contractVersion: 1,
  kind: 'close',
  requestId,
  expectedVersion: 0,
  idempotencyKey: 'adapter-close-existing-0001',
  payload: {
    reason: 'existing_resolution',
    note: '  The approved project already resolves this request.  ',
    resolutionReference: { kind: 'project', projectId: approvedProjectId },
  },
})

await application.executeCommand({
  contractVersion: 1,
  kind: 'close',
  requestId,
  expectedVersion: 0,
  idempotencyKey: 'adapter-close-duplicate-0001',
  payload: {
    reason: 'duplicate',
  },
})

const commandCaptures = captures.filter(({ functionName }) => functionName === 'build_request_command_v1')
sameJson(
  captures
    .filter(({ functionName }) => (
      functionName === 'retire_build_request_delivery_revision_v1'
    ))
    .map(({ parameters }) => parameters),
  [{
    p_contract_version: 1,
    p_request_id: requestId,
    p_delivery_revision_id: deliveryRevisionId,
    p_expected_version: 11,
    p_idempotency_key: 'adapter-retire-revision-0001',
  }],
  'delivery revision retirement RPC wire',
)

sameJson(
  commandCaptures.map(({ parameters }) => ({
    command: parameters.p_command,
    payload: parameters.p_payload,
  })),
  [
    {
      command: 'stage_delivery_artifact',
      payload: {
        deliveryRevisionId,
        acceptedBriefRevisionId: briefRevisionId,
        activeBuilderAssignmentId: builderAssignmentId,
        artifactOrdinal: 1,
        clientFileId: 'client-file-0001',
        normalizedName: 'pathforge-result.html',
        byteLength: 1234,
        sha256,
        detectedMediaType: 'text/html',
        scannerVersion: 'fixture-scanner-v1',
      },
    },
    {
      command: 'prepare_delivery_revision',
      payload: {
        deliveryRevisionId,
        acceptedBriefRevisionId: briefRevisionId,
        activeBuilderAssignmentId: builderAssignmentId,
        revisionLabel: 'Initial delivery',
        summary: 'Verified fixture delivery.',
        builderEvidence: [{
          acceptanceCheckId,
          result: 'pass',
          evidenceText: 'Rendered successfully.',
          evidenceRef: null,
        }],
        approvedPathForgeReference: null,
      },
    },
    {
      command: 'submit_delivery',
      payload: { deliveryRevisionId, sealReceiptId },
    },
    {
      command: 'close',
      payload: {
        reason: 'existing_resolution',
        note: 'The approved project already resolves this request.',
        resolutionReference: { kind: 'project', projectId: approvedProjectId },
      },
    },
    {
      command: 'close',
      payload: {
        reason: 'duplicate',
      },
    },
  ],
  'RequestApplicationService command wire',
)

sameJson(
  captures
    .filter(({ functionName }) => (
      functionName
        === 'expire_build_request_account_deidentification_receipt_v1'
    ))
    .map(({ parameters }) => parameters),
  [{
    p_contract_version: 1,
    p_receipt_id: stageReceiptId,
  }],
  'account deidentification receipt expiry RPC wire',
)

sameJson(
  captures
    .filter(({ functionName }) => (
      functionName === 'expire_build_request_audit_tombstone_v1'
    ))
    .map(({ parameters }) => parameters),
  [{
    p_contract_version: 1,
    p_request_id: requestId,
    p_idempotency_key: 'adapter-expire-tombstone-0001',
  }],
  'audit tombstone expiry RPC wire',
)

sameJson(
  captures
    .filter(({ functionName }) => (
      functionName === 'deidentify_build_request_account_v1'
    ))
    .map(({ parameters }) => parameters),
  [{
    p_contract_version: 1,
    p_account_id: builderAssignmentId,
    p_idempotency_key: 'adapter-deidentify-account-0001',
  }],
  'account deidentification RPC wire',
)

sameJson(
  captures
    .filter(({ functionName }) => functionName === 'set_build_request_pilot_admission_v1')
    .map(({ parameters }) => parameters),
  [
    {
      p_contract_version: 1,
      p_account_id: builderAssignmentId,
      p_expected_admission_version: 0,
      p_idempotency_key: 'adapter-admit-0001',
      p_admitted: true,
      p_reason: 'Approved private pilot participant.',
      p_expires_at: '2099-08-30T12:00:00.000Z',
    },
    {
      p_contract_version: 1,
      p_account_id: builderAssignmentId,
      p_expected_admission_version: 1,
      p_idempotency_key: 'adapter-revoke-0001',
      p_admitted: false,
      p_reason: 'Pilot access revoked.',
      p_expires_at: null,
    },
  ],
  'pilot admission RPC wire',
)

sameJson(
  captures
    .filter(({ functionName }) => functionName === 'list_build_request_eligible_assignees_v1')
    .map(({ parameters }) => parameters),
  [{
    p_contract_version: 1,
    p_request_id: requestId,
    p_assignment_role: 'builder',
    p_query: 'Fixture Builder',
    p_cursor: null,
    p_limit: 10,
  }],
  'eligible assignee RPC wire',
)

sameJson(
  captures
    .filter(({ functionName }) => (
      functionName !== 'build_request_command_v1'
      && functionName !== 'list_build_request_eligible_assignees_v1'
      && functionName !== 'set_build_request_pilot_admission_v1'
      && functionName !== 'deidentify_build_request_account_v1'
      && functionName !== 'expire_build_request_audit_tombstone_v1'
      && functionName !== 'list_build_request_maintenance_work_v1'
      && functionName !== 'purge_build_request_raw_text_v1'
      && functionName
        !== 'claim_build_request_delivery_artifact_cleanup_v1'
      && functionName
        !== 'begin_build_request_delivery_artifact_cleanup_delete_v1'
      && functionName
        !== 'abort_build_request_delivery_artifact_cleanup_v1'
      && functionName
        !== 'confirm_build_request_delivery_artifact_cleanup_v1'
      && functionName
        !== 'expire_build_request_account_deidentification_receipt_v1'
      && functionName !== 'retire_build_request_delivery_revision_v1'
    ))
    .map(({ functionName, parameters }) => ({ functionName, parameters })),
  [
    {
      functionName: 'prepare_build_request_delivery_artifact_object_v1',
      parameters: {
        p_contract_version: 1,
        p_request_id: requestId,
        p_delivery_revision_id: deliveryRevisionId,
        p_artifact_id: artifactId,
        p_stage_receipt_id: stageReceiptId,
      },
    },
    {
      functionName: 'attest_build_request_delivery_artifact_object_v1',
      parameters: {
        p_contract_version: 1,
        p_idempotency_key: 'adapter-attest-0001',
        p_expected_request_version: 2,
        p_stage_receipt_id: stageReceiptId,
        p_request_id: requestId,
        p_delivery_revision_id: deliveryRevisionId,
        p_artifact_id: artifactId,
        p_accepted_brief_revision_id: briefRevisionId,
        p_active_builder_assignment_id: builderAssignmentId,
        p_artifact_ordinal: 1,
        p_sha256: sha256,
        p_byte_length: 1234,
        p_detected_media_type: 'text/html',
        p_scanner_version: 'fixture-scanner-v1',
        p_object_identity: objectIdentity,
        p_scan_verdict: 'clean',
      },
    },
    {
      functionName: 'resolve_build_request_delivery_artifact_custody_v1',
      parameters: {
        p_contract_version: 1,
        p_request_id: requestId,
        p_delivery_revision_id: deliveryRevisionId,
        p_artifact_id: artifactId,
      },
    },
    {
      functionName: 'resolve_build_request_delivery_artifact_object_v1',
      parameters: {
        p_contract_version: 1,
        p_artifact_id: artifactId,
        p_delivery_revision_id: deliveryRevisionId,
      },
    },
    {
      functionName: 'seal_build_request_delivery_revision_v1',
      parameters: {
        p_contract_version: 1,
        p_request_id: requestId,
        p_delivery_revision_id: deliveryRevisionId,
        p_preparation_receipt_id: preparationReceiptId,
        p_idempotency_key: 'adapter-seal-0001',
        p_artifacts: [{ artifact_ordinal: 1, artifact_id: artifactId }],
      },
    },
  ],
  'server custody RPC wire',
)

let snakeAliasRejected = false
try {
  await application.executeCommand({
    contractVersion: 1,
    kind: 'close',
    requestId,
    expectedVersion: 0,
    idempotencyKey: 'adapter-close-snake-0001',
    payload: {
      reason: 'existing_resolution',
      note: 'Snake aliases are forbidden.',
      resolution_reference: { kind: 'project', project_id: approvedProjectId },
    },
  } as unknown as RequestParticipantCommandV1)
} catch {
  snakeAliasRejected = true
}
assert(snakeAliasRejected, 'RequestApplicationService accepted a snake-case command alias.')

await application.executeCommand({
  contractVersion: 1,
  kind: 'requester_delivery_outcome',
  requestId,
  expectedVersion: 11,
  idempotencyKey: 'adapter-valid-failed-check',
  payload: {
    deliveryRevisionId,
    manifestDigest,
    outcome: 'failed_acceptance_check',
    failedAcceptanceCheckId: acceptanceCheckId,
    reason: 'The UUID-bound accepted check failed.',
  },
})
const capturesBeforeInvalidFailedCheck = captures.length
let opaqueFailedCheckRejected = false
try {
  await application.executeCommand({
    contractVersion: 1,
    kind: 'requester_delivery_outcome',
    requestId,
    expectedVersion: 11,
    idempotencyKey: 'adapter-invalid-failed-check',
    payload: {
      deliveryRevisionId,
      manifestDigest,
      outcome: 'failed_acceptance_check',
      failedAcceptanceCheckId: 'opaque-check-token',
      reason: 'This malformed check identity must be rejected locally.',
    },
  })
} catch {
  opaqueFailedCheckRejected = true
}
assert(
  opaqueFailedCheckRejected && captures.length === capturesBeforeInvalidFailedCheck,
  'Invalid failedAcceptanceCheckId reached RequestRpcClient.rpc.',
)

const validReceiptRow = commandReceipt({
  p_command: 'start_build',
  p_payload: {},
})[0]
for (const hostileReceipt of [
  { ...validReceiptRow, unexpected: 'field' },
  { ...validReceiptRow, command_id: 'not-a-uuid' },
  { ...validReceiptRow, request_id: 'not-a-uuid' },
  { ...validReceiptRow, event_id: 'not-a-uuid' },
  { ...validReceiptRow, request_version: -1 },
  { ...validReceiptRow, request_version: 10_000_001 },
  { ...validReceiptRow, occurred_at: 'not-a-timestamp' },
  { ...validReceiptRow, occurred_at: '2026-07-30' },
  { ...validReceiptRow, occurred_at: 'July 30, 2026 12:00 UTC' },
  { ...validReceiptRow, occurred_at: '1' },
]) {
  const hostileApplication = createRequestApplicationService({
    async rpc() {
      return { data: [hostileReceipt], error: null }
    },
  })
  let rejected = false
  try {
    await hostileApplication.executeCommand({
      contractVersion: 1,
      kind: 'start_build',
      requestId,
      expectedVersion: 1,
      idempotencyKey: 'adapter-hostile-receipt',
      payload: {},
    })
  } catch {
    rejected = true
  }
  assert(rejected, 'Hostile command receipt passed strict parsing.')
}

const validControlsReceipt = {
  controls_version: 2,
  accepting_requests: false,
  assigning_requests: false,
  active_case_capacity: 4,
  replayed: false,
  occurred_at: occurredAt,
}
for (const hostileControlsReceipt of [
  { ...validControlsReceipt, unexpected: 'field' },
  { ...validControlsReceipt, controls_version: -1 },
  { ...validControlsReceipt, controls_version: 10_000_001 },
  { ...validControlsReceipt, active_case_capacity: 0 },
  { ...validControlsReceipt, active_case_capacity: 5 },
  { ...validControlsReceipt, occurred_at: 'not-a-timestamp' },
  { ...validControlsReceipt, occurred_at: '2026-07-30' },
  { ...validControlsReceipt, occurred_at: 'July 30, 2026 12:00 UTC' },
  { ...validControlsReceipt, occurred_at: '1' },
]) {
  const hostileApplication = createRequestApplicationService({
    async rpc() {
      return { data: hostileControlsReceipt, error: null }
    },
  })
  let rejected = false
  try {
    await hostileApplication.updateControls({
      expectedControlsVersion: 1,
      idempotencyKey: 'adapter-hostile-controls',
      acceptingRequests: false,
      assigningRequests: false,
      activeCaseCapacity: 4,
    })
  } catch {
    rejected = true
  }
  assert(rejected, 'Hostile controls receipt passed strict parsing.')
}

for (const hostileDuplicatePayload of [
  { reason: 'duplicate', note: 'Private duplicate target.' },
  {
    reason: 'duplicate',
    resolutionReference: { kind: 'project', projectId: approvedProjectId },
  },
]) {
  let hostileDuplicateRejected = false
  try {
    await application.executeCommand({
      contractVersion: 1,
      kind: 'close',
      requestId,
      expectedVersion: 0,
      idempotencyKey: 'adapter-hostile-duplicate-0001',
      payload: hostileDuplicatePayload,
    } as unknown as RequestParticipantCommandV1)
  } catch {
    hostileDuplicateRejected = true
  }
  assert(
    hostileDuplicateRejected,
    'Duplicate close accepted a private target field.',
  )
}

async function expectRejectedBeforeRpc(
  operation: () => Promise<unknown>,
  label: string,
) {
  const captureCount = captures.length
  let rejected = false
  try {
    await operation()
  } catch {
    rejected = true
  }
  assert(
    rejected && captures.length === captureCount,
    `${label} reached RequestRpcClient.rpc.`,
  )
}

for (const [label, reason] of [
  ['URL', 'See https://private.example.com for reassignment context.'],
  ['secret', 'private_key=abcdefghijklmnop'],
  ['501-character', 'r'.repeat(501)],
] as const) {
  await expectRejectedBeforeRpc(
    () => application.executeCommand({
      contractVersion: 1,
      kind: 'reassign_builder',
      requestId,
      expectedVersion: 1,
      idempotencyKey: `adapter-hostile-reassign-${label}`,
      payload: { builderId: builderAssignmentId, reason },
    }),
    `${label} reassignment reason`,
  )
}

await application.executeCommand({
  contractVersion: 1,
  kind: 'reassign_builder',
  requestId,
  expectedVersion: 1,
  idempotencyKey: 'adapter-valid-reassign-500',
  payload: {
    builderId: builderAssignmentId,
    reason: 'r'.repeat(500),
  },
})

for (const [label, reason] of [
  ['tab-only', '\t\t'],
  ['LF-only', '\n\n'],
  ['NUL', 'safe\0unsafe'],
  ['carriage-return', 'safe\runsafe'],
] as const) {
  await expectRejectedBeforeRpc(
    () => application.executeCommand({
      contractVersion: 1,
      kind: 'reassign_reviewer',
      requestId,
      expectedVersion: 1,
      idempotencyKey: `adapter-control-reassign-${label}`,
      payload: { reviewerId: builderAssignmentId, reason },
    }),
    `${label} reassignment reason`,
  )
}

await application.executeCommand({
  contractVersion: 1,
  kind: 'reassign_reviewer',
  requestId,
  expectedVersion: 1,
  idempotencyKey: 'adapter-multiline-reassign',
  payload: {
    reviewerId: builderAssignmentId,
    reason: ' \tFirst safe line.\nSecond safe line.\n ',
  },
})
const multilineReassignCapture = captures.at(-1)
assert(
  multilineReassignCapture?.functionName === 'build_request_command_v1' &&
    (multilineReassignCapture.parameters.p_payload as { reason?: unknown }).reason ===
      'First safe line.\nSecond safe line.',
  'Outer whitespace was not normalized while preserving interior LF.',
)

for (const [label, reason] of [
  ['URL', 'See https://private.example.com for admission context.'],
  ['secret', 'bearer abcdefghijklmnop'],
  ['501-character', 'a'.repeat(501)],
] as const) {
  await expectRejectedBeforeRpc(
    () => application.inviteRequestPilotParticipant({
      accountId: builderAssignmentId,
      expectedAdmissionVersion: 0,
      idempotencyKey: `adapter-hostile-admission-${label}`,
      reason,
      expiresAt: null,
    }),
    `${label} pilot admission reason`,
  )
}

await application.inviteRequestPilotParticipant({
  accountId: builderAssignmentId,
  expectedAdmissionVersion: 0,
  idempotencyKey: 'adapter-valid-admission-500',
  reason: 'a'.repeat(500),
  expiresAt: null,
})

for (const expiresAt of [
  '2099-08-30',
  'August 30, 2099 12:00 UTC',
  '1',
]) {
  await expectRejectedBeforeRpc(
    () => application.inviteRequestPilotParticipant({
      accountId: builderAssignmentId,
      expectedAdmissionVersion: 0,
      idempotencyKey: 'adapter-hostile-admission-timestamp',
      reason: 'Valid bounded admission reason.',
      expiresAt,
    }),
    `non-RFC3339 pilot expiry ${expiresAt}`,
  )
}

console.log('Request application-service RPC wire fixture passed.')
}

void main()
