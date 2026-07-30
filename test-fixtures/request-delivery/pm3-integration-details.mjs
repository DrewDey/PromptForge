const ids = {
  request: '10000000-0000-4000-a000-000000000001',
  brief: '10000000-0000-4000-a000-000000000002',
  check: '10000000-0000-4000-a000-000000000003',
  builderAssignment: '10000000-0000-4000-a000-000000000004',
  reviewerAssignment: '10000000-0000-4000-a000-000000000005',
  delivery: '10000000-0000-4000-a000-000000000006',
  artifact: '10000000-0000-4000-a000-000000000007',
  seal: '10000000-0000-4000-a000-000000000008',
  requester: '10000000-0000-4000-a000-000000000009',
  builder: '10000000-0000-4000-a000-00000000000a',
  reviewer: '10000000-0000-4000-a000-00000000000b',
  admin: '10000000-0000-4000-a000-00000000000c',
}

const at = '2026-07-30T12:00:00.000Z'
const digest = 'a'.repeat(64)

const unread = {
  unreadCount: 0,
  latestEventSequence: 0,
  lastReadEventSequence: 0,
}

const eventPage = { items: [], nextCursor: null }

const assignments = [
  {
    assignmentId: ids.builderAssignment,
    role: 'builder',
    active: true,
    assignedAt: at,
    endedAt: null,
  },
  {
    assignmentId: ids.reviewerAssignment,
    role: 'reviewer',
    active: true,
    assignedAt: at,
    endedAt: null,
  },
]

const acceptanceChecks = [{
  acceptanceCheckId: ids.check,
  ordinal: 1,
  text: 'The delivered artifact satisfies the accepted scenario.',
}]

const evidence = [{
  acceptanceCheckId: ids.check,
  result: 'pass',
  evidenceText: 'Verified against the accepted scenario.',
  evidenceRef: 'evidence-1',
}]

const workspaceArtifact = {
  artifactId: ids.artifact,
  artifactOrdinal: 1,
  normalizedName: 'delivery.txt',
  detectedMediaType: 'text/plain',
  byteLength: 18,
  sha256: digest,
  integrityStatus: 'verified',
  scanState: 'complete',
  scanVerdict: 'clean',
  findingCodes: [],
}

function actor(accountId, roles, capabilities = [], operatorAuthority = 'none') {
  return {
    accountId,
    roles,
    operatorAuthority,
    capabilities,
    allowedCloseReasons: [],
    unreadCount: 0,
  }
}

function fullDetail({
  lifecycleState,
  actorContext,
  deliveryRevisions = [],
  builderWorkspace = null,
  moderationState = 'clear',
}) {
  return {
    contractVersion: 1,
    requestId: ids.request,
    requestVersion: 12,
    lifecycleState,
    moderationState,
    publicationState: 'private',
    closeReason: null,
    resolutionReference: null,
    title: 'Build a bounded private deliverable',
    activeActorRoles: actorContext.roles,
    nextActions: [],
    unread,
    submittedAt: at,
    updatedAt: at,
    visibility: 'full',
    targetDate: '2026-08-15',
    closureNote: null,
    briefRevisionId: ids.brief,
    brief: {
      title: 'Build a bounded private deliverable',
      outcome: 'Produce a private passive artifact that meets the accepted brief.',
      intendedUser: 'The authenticated requester',
      mustWorkScenario: 'The requester opens the exact reviewed artifact privately.',
      acceptanceChecks,
      constraints: 'No publication and no active executable content.',
      pathforgeReference: null,
    },
    participants: [
      { role: 'requester', displayName: 'Requester', deidentified: false },
      { role: 'builder', displayName: 'Builder', deidentified: false },
      { role: 'reviewer', displayName: 'Reviewer', deidentified: false },
    ],
    assignments,
    clarifications: [],
    deliveryRevisions,
    requesterOutcomes: [],
    builderWorkspace,
    events: eventPage,
    notices: [],
    actor: actorContext,
  }
}

function currentDelivery(reviews = [], options = {}) {
  const artifact = { ...workspaceArtifact }
  if (options.readerHref !== false) {
    artifact.readerHref = `/api/requests/deliveries/${ids.artifact}/reader`
  }
  return {
    deliveryRevisionId: ids.delivery,
    acceptedBriefRevisionId: ids.brief,
    activeBuilderAssignmentId: ids.builderAssignment,
    sealReceiptId: ids.seal,
    artifactCount: 1,
    totalBytes: 18,
    evidenceChecklistVersion: 1,
    rightsSnapshotVersion: 1,
    revisionLabel: 'Reviewed delivery',
    summary: 'Exact passive artifact for the accepted brief.',
    builderEvidence: evidence,
    approvedPathForgeReference: null,
    revisionNumber: 1,
    authoredBy: { displayName: 'Builder', deidentified: false },
    submittedAt: at,
    isCurrent: true,
    artifacts: [artifact],
    reviews,
  }
}

function approvedReview() {
  return {
    deliveryRevisionId: ids.delivery,
    checklistVersion: 1,
    checks: [{
      acceptanceCheckId: ids.check,
      result: 'pass',
      evidenceRef: 'review-evidence-1',
    }],
    safetyIntegrityResult: 'pass',
    verdict: 'approve',
    reason: null,
    reviewNotes: 'Independent review passed.',
    repairInstructions: null,
    reviewer: { displayName: 'Reviewer', deidentified: false },
    reviewedAt: at,
    isCurrent: true,
  }
}

function repairReview() {
  return {
    deliveryRevisionId: ids.delivery,
    checklistVersion: 1,
    checks: [{
      acceptanceCheckId: ids.check,
      result: 'fail',
      evidenceRef: 'review-evidence-1',
    }],
    safetyIntegrityResult: 'pass',
    verdict: 'repair',
    reason: 'The accepted scenario did not pass.',
    reviewNotes: null,
    repairInstructions: 'Submit a new revision that passes the accepted scenario.',
    reviewer: { displayName: 'Reviewer', deidentified: false },
    reviewedAt: at,
    isCurrent: true,
  }
}

function workspace(revisionState) {
  return {
    deliveryRevisionId: ids.delivery,
    acceptedBriefRevisionId: ids.brief,
    activeBuilderAssignmentId: ids.builderAssignment,
    revisionState,
    revisionLabel: revisionState === 'staging' ? null : 'Prepared delivery',
    summary: revisionState === 'staging' ? null : 'Prepared passive artifact.',
    builderEvidence: revisionState === 'staging' ? [] : evidence,
    approvedPathForgeReference: null,
    artifacts: revisionState === 'staging'
      ? [{ ...workspaceArtifact, integrityStatus: 'pending', scanState: 'pending', scanVerdict: null }]
      : [workspaceArtifact],
    sealReceiptId: revisionState === 'sealed' ? ids.seal : null,
  }
}

function restricted(visibility) {
  const held = visibility === 'held'
  return {
    visibility,
    contractVersion: 1,
    requestId: ids.request,
    requestVersion: 12,
    lifecycleState: 'building',
    moderationState: visibility,
    publicationState: 'private',
    closeReason: null,
    safeLabel: held ? 'Request held for moderation review' : 'Request removed',
    unread,
    submittedAt: at,
    updatedAt: at,
    events: eventPage,
    notices: held
      ? [{ kind: 'moderation_hold', label: 'Work and delivery are frozen.', effectiveUntil: null }]
      : [],
    actor: actor(ids.admin, [], held
      ? ['release_moderation_hold', 'remove_for_moderation']
      : [], 'admin'),
  }
}

export const fixtureIds = ids

export const requestDeliveryDetailFixtures = {
  requesterReviewed: fullDetail({
    lifecycleState: 'delivery_ready',
    actorContext: actor(ids.requester, ['requester'], [
      'view_case',
      'acknowledge_delivery',
      'requester_delivery_outcome',
    ]),
    deliveryRevisions: [currentDelivery([approvedReview()])],
  }),
  builderStaging: fullDetail({
    lifecycleState: 'building',
    actorContext: actor(ids.builder, ['builder'], [
      'view_case',
      'stage_delivery_artifact',
      'abandon_delivery_artifact',
      'prepare_delivery_revision',
      'submit_delivery',
    ]),
    builderWorkspace: workspace('staging'),
  }),
  builderInitialNoWorkspace: fullDetail({
    lifecycleState: 'building',
    actorContext: actor(ids.builder, ['builder'], [
      'view_case',
      'stage_delivery_artifact',
      'prepare_delivery_revision',
      'submit_delivery',
    ]),
  }),
  builderPrepared: fullDetail({
    lifecycleState: 'building',
    actorContext: actor(ids.builder, ['builder'], ['view_case', 'submit_delivery']),
    builderWorkspace: workspace('prepared'),
  }),
  builderPreparedResume: fullDetail({
    lifecycleState: 'building',
    actorContext: actor(ids.builder, ['builder'], ['view_case']),
    builderWorkspace: workspace('prepared'),
  }),
  builderSealed: fullDetail({
    lifecycleState: 'building',
    actorContext: actor(ids.builder, ['builder'], ['view_case', 'submit_delivery']),
    builderWorkspace: workspace('sealed'),
  }),
  reviewerReviewPending: fullDetail({
    lifecycleState: 'review_pending',
    actorContext: actor(ids.reviewer, ['reviewer'], [
      'view_case',
      'approve_delivery',
      'request_repair',
    ]),
    deliveryRevisions: [currentDelivery()],
  }),
  repairRequired: fullDetail({
    lifecycleState: 'repair_required',
    actorContext: actor(ids.requester, ['requester'], ['view_case']),
    deliveryRevisions: [currentDelivery([repairReview()])],
  }),
  admin: fullDetail({
    lifecycleState: 'building',
    actorContext: actor(ids.admin, [], [], 'admin'),
  }),
  held: restricted('held'),
  removed: restricted('removed'),
  closedNoResponseAvailable: {
    ...fullDetail({
      lifecycleState: 'closed',
      actorContext: actor(ids.requester, ['requester'], ['view_case']),
      deliveryRevisions: [currentDelivery([approvedReview()])],
    }),
    closeReason: 'no_response',
    closureNote: null,
  },
  closedDeclinedUnavailable: {
    ...fullDetail({
      lifecycleState: 'closed',
      actorContext: actor(ids.requester, ['requester'], ['view_case']),
      deliveryRevisions: [currentDelivery([approvedReview()], { readerHref: false })],
    }),
    closeReason: 'declined',
    closureNote: 'The case was closed without a private reader authorization.',
  },
  closedWithdrawnUnavailable: {
    ...fullDetail({
      lifecycleState: 'closed',
      actorContext: actor(ids.requester, ['requester'], ['view_case']),
      deliveryRevisions: [currentDelivery([approvedReview()], { readerHref: false })],
    }),
    closeReason: 'withdrawn',
    closureNote: 'The requester withdrew the case.',
  },
  closedBuilderWip: {
    ...fullDetail({
      lifecycleState: 'closed',
      actorContext: actor(ids.builder, ['builder'], ['view_case']),
      builderWorkspace: workspace('sealed'),
    }),
    closeReason: 'declined',
    closureNote: 'The retained builder workspace is pending authority retirement.',
  },
}
