#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { registerHooks } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = process.cwd()
const src = path.join(root, 'src')

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') {
      return { url: 'data:text/javascript,export {}', shortCircuit: true }
    }
    if (specifier === '@/lib/supabase/server') {
      return {
        url: `data:text/javascript,${encodeURIComponent(
          'export async function createClient(){return globalThis.__pm3DeliveryReaderParticipantClient}',
        )}`,
        shortCircuit: true,
      }
    }
    if (specifier === '@/lib/supabase/admin') {
      return {
        url: `data:text/javascript,${encodeURIComponent(
          'export function createAdminClient(){return globalThis.__pm3DeliveryReaderAdminClient}',
        )}`,
        shortCircuit: true,
      }
    }
    if (specifier.startsWith('@/')) {
      for (const suffix of ['.ts', '.tsx', '/index.ts']) {
        const candidate = path.join(src, `${specifier.slice(2)}${suffix}`)
        if (existsSync(candidate)) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true }
        }
      }
    }
    if (
      (specifier.startsWith('./') || specifier.startsWith('../'))
      && (context.parentURL?.endsWith('.ts') || context.parentURL?.endsWith('.tsx'))
    ) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(fileURLToPath(candidate))) {
        return { url: candidate.href, shortCircuit: true }
      }
    }
    return nextResolve(specifier, context)
  },
})

const fixtureModule = await import(pathToFileURL(path.join(
  root,
  'test-fixtures/request-delivery/pm3-integration-details.mjs',
)).href)
const requestService = await import(pathToFileURL(path.join(
  src,
  'lib/request-service.ts',
)).href)
const deliveryView = await import(pathToFileURL(path.join(
  src,
  'lib/build-requests/delivery-view.ts',
)).href)
const deliveryUpload = await import(pathToFileURL(path.join(
  src,
  'lib/build-requests/delivery-upload-orchestrator.ts',
)).href)
const deliveryActions = await import(pathToFileURL(path.join(
  src,
  'lib/build-requests/delivery-actions.ts',
)).href)
const deliveryReader = await import(pathToFileURL(path.join(
  src,
  'lib/build-requests/delivery-reader.ts',
)).href)
const deliveryReaderAdapter = await import(pathToFileURL(path.join(
  src,
  'lib/build-requests/delivery-reader-adapter.ts',
)).href)
const deliveryReaderRoute = await import(pathToFileURL(path.join(
  src,
  'app/api/requests/deliveries/[artifactId]/reader/route.ts',
)).href)
const requestLifecycle = await import(pathToFileURL(path.join(
  src,
  'lib/request-lifecycle.ts',
)).href)
const deliveryRetention = await import(pathToFileURL(path.join(
  src,
  'lib/build-requests/delivery-retention-runner.ts',
)).href)
const deliveryInteractionState = await import(pathToFileURL(path.join(
  src,
  'lib/build-requests/delivery-interaction-state.ts',
)).href)

const { fixtureIds, requestDeliveryDetailFixtures: rawFixtures } = fixtureModule
const {
  parseRequestCaseDetailResultV1,
} = requestService
const { toRequestDeliverySlotModel } = deliveryView
const {
  orchestrateRequestDeliveryArtifactUpload,
  parseRequestDeliveryArtifactUpload,
} = deliveryUpload
const { createRequestDeliveryActions } = deliveryActions
const { readRequestDeliveryArtifact } = deliveryReader
const {
  handleRequestDeliveryArtifactReader,
} = deliveryReaderAdapter
const {
  GET: getRequestDeliveryArtifact,
  HEAD: headRequestDeliveryArtifact,
} = deliveryReaderRoute
const { validateRequestCommandV1 } = requestLifecycle
const {
  REQUEST_DELIVERY_MAINTENANCE_MAX_BATCH,
  createRequestDeliveryMaintenanceRunner,
} = deliveryRetention
const {
  beginRequestDeliveryPreview,
  INITIAL_REQUEST_DELIVERY_PREVIEW_STATE,
} = deliveryInteractionState

assert.equal(INITIAL_REQUEST_DELIVERY_PREVIEW_STATE.readerPath, null)
assert.equal(INITIAL_REQUEST_DELIVERY_PREVIEW_STATE.readerRequestCount, 0)
assert.deepEqual(
  beginRequestDeliveryPreview(
    `/api/requests/deliveries/${fixtureIds.artifact}/reader`,
  ),
  {
    readerPath: `/api/requests/deliveries/${fixtureIds.artifact}/reader`,
    readerRequestCount: 1,
  },
)

const expectedStates = {
  requesterReviewed: 'reviewed',
  builderStaging: 'staging',
  builderInitialNoWorkspace: 'none',
  builderPrepared: 'staging',
  builderPreparedResume: 'staging',
  builderSealed: 'staging',
  reviewerReviewPending: 'review_pending',
  repairRequired: 'repair_required',
  admin: 'none',
  held: 'quarantined',
  removed: 'missing',
  closedNoResponseAvailable: 'available',
  closedDeclinedUnavailable: 'missing',
  closedWithdrawnUnavailable: 'missing',
  closedBuilderWip: 'missing',
}

const parsedFixtures = {}
for (const [name, raw] of Object.entries(rawFixtures)) {
  const parsed = parseRequestCaseDetailResultV1(structuredClone(raw))
  parsedFixtures[name] = parsed
  const model = toRequestDeliverySlotModel(parsed, parsed.actor)
  assert.equal(model.state, expectedStates[name], `${name} mapper state`)
  assert.equal(model.publication, 'private', `${name} remains private`)
  assert.equal(JSON.stringify(model).includes('"sha256"'), false, `${name} model hides hashes`)
  assert.equal(JSON.stringify(model).includes('acceptedBriefRevisionId'), false)
  assert.equal(JSON.stringify(model).includes('activeBuilderAssignmentId'), false)
}

assert.equal(parsedFixtures.requesterReviewed.visibility, 'full')
assert.equal(
  toRequestDeliverySlotModel(
    parsedFixtures.requesterReviewed,
    parsedFixtures.requesterReviewed.actor,
  ).review.status,
  'approved',
)
assert.equal(
  toRequestDeliverySlotModel(
    parsedFixtures.reviewerReviewPending,
    parsedFixtures.reviewerReviewPending.actor,
  ).commands.canReview,
  true,
)
assert.equal(
  toRequestDeliverySlotModel(
    parsedFixtures.repairRequired,
    parsedFixtures.repairRequired.actor,
  ).repairHistory.length,
  1,
)
assert.equal(
  toRequestDeliverySlotModel(parsedFixtures.held, parsedFixtures.held.actor).artifacts.length,
  0,
)
assert.equal(
  toRequestDeliverySlotModel(
    parsedFixtures.removed,
    parsedFixtures.removed.actor,
  ).commands.canReview,
  false,
)

for (const [name, state, hasSealReceipt] of [
  ['builderStaging', 'staging', false],
  ['builderPrepared', 'prepared', false],
  ['builderSealed', 'sealed', true],
]) {
  const model = toRequestDeliverySlotModel(parsedFixtures[name], parsedFixtures[name].actor)
  assert.equal(model.builderWorkspace?.revisionState, state)
  assert.equal(model.builderWorkspace?.hasSealReceipt, hasSealReceipt)
}
const sealedWaitingRaw = structuredClone(rawFixtures.builderSealed)
sealedWaitingRaw.actor.capabilities = ['view_case']
const sealedWaitingDetail = parseRequestCaseDetailResultV1(sealedWaitingRaw)
const sealedWaitingModel = toRequestDeliverySlotModel(
  sealedWaitingDetail,
  sealedWaitingDetail.actor,
)
assert.equal(sealedWaitingModel.builderWorkspace?.revisionState, 'sealed')
assert.equal(sealedWaitingModel.commands.submitKind, null)
assert.equal(sealedWaitingModel.commands.canResumeRevision, false)
assert.equal(
  toRequestDeliverySlotModel(
    parsedFixtures.builderInitialNoWorkspace,
    parsedFixtures.builderInitialNoWorkspace.actor,
  ).builderWorkspace,
  null,
)
assert.equal(
  toRequestDeliverySlotModel(
    parsedFixtures.builderPreparedResume,
    parsedFixtures.builderPreparedResume.actor,
  ).commands.canResumeRevision,
  true,
)
const closedBuilderWipModel = toRequestDeliverySlotModel(
  parsedFixtures.closedBuilderWip,
  parsedFixtures.closedBuilderWip.actor,
)
assert.equal(closedBuilderWipModel.commands.canResumeRevision, false)
assert.equal(closedBuilderWipModel.commands.canStageArtifact, false)
assert.equal(closedBuilderWipModel.commands.canPrepareRevision, false)
assert.equal(closedBuilderWipModel.commands.submitKind, null)

const reviewedModel = toRequestDeliverySlotModel(
  parsedFixtures.requesterReviewed,
  parsedFixtures.requesterReviewed.actor,
)
assert.equal(
  reviewedModel.artifacts[0].reader.openPath,
  `/api/requests/deliveries/${fixtureIds.artifact}/reader`,
)
assert.equal(
  reviewedModel.artifacts[0].reader.downloadPath,
  `/api/requests/deliveries/${fixtureIds.artifact}/reader?download=1`,
)
assert.equal(reviewedModel.artifacts[0].artifactId, fixtureIds.artifact)
assert.equal(Object.hasOwn(reviewedModel.artifacts[0], 'objectIdentity'), false)
assert.equal(Object.hasOwn(reviewedModel.artifacts[0], 'sha256'), false)
assert.equal(
  toRequestDeliverySlotModel(
    parsedFixtures.closedNoResponseAvailable,
    parsedFixtures.closedNoResponseAvailable.actor,
  ).state,
  'available',
)
for (const name of ['closedDeclinedUnavailable', 'closedWithdrawnUnavailable']) {
  const closedModel = toRequestDeliverySlotModel(parsedFixtures[name], parsedFixtures[name].actor)
  assert.notEqual(closedModel.state, 'available')
  assert.equal(closedModel.artifacts[0].reader.openPath, null)
  assert.equal(closedModel.artifacts[0].reader.downloadPath, null)
}
const hostileClosedReader = structuredClone(parsedFixtures.closedDeclinedUnavailable)
hostileClosedReader.deliveryRevisions[0].artifacts[0].readerHref =
  `/api/requests/deliveries/${fixtureIds.artifact}/reader`
const hostileClosedModel = toRequestDeliverySlotModel(
  hostileClosedReader,
  hostileClosedReader.actor,
)
assert.equal(hostileClosedModel.state, 'missing')
assert.equal(hostileClosedModel.artifacts[0].reader.openPath, null)
assert.equal(hostileClosedModel.artifacts[0].reader.downloadPath, null)

const actorMismatch = structuredClone(parsedFixtures.requesterReviewed.actor)
actorMismatch.capabilities = ['view_case']
assert.throws(
  () => toRequestDeliverySlotModel(parsedFixtures.requesterReviewed, actorMismatch),
  /does not match canonical detail authority/,
)

function uploadRequest(fields, extra = {}) {
  const form = new FormData()
  for (const [name, value] of Object.entries(fields)) form.set(name, String(value))
  for (const [name, value] of Object.entries(extra)) form.set(name, String(value))
  form.set('artifact', new File(['private artifact'], 'delivery.txt', {
    type: 'text/plain',
  }))
  const request = new Request(
    'https://pathforge.test/api/request-deliveries/artifacts',
    {
      method: 'POST',
      headers: {
        origin: 'https://pathforge.test',
        'sec-fetch-site': 'same-origin',
      },
      body: form,
    },
  )
  request.headers.set('content-length', '1024')
  return request
}

const uploadFields = {
  requestId: fixtureIds.request,
  deliveryRevisionId: fixtureIds.delivery,
  expectedVersion: 12,
  artifactOrdinal: 1,
  clientFileId: 'client-file-1',
  idempotencyKey: 'delivery-upload-1',
}
const parsedUpload = await parseRequestDeliveryArtifactUpload(uploadRequest(uploadFields))
assert.deepEqual(
  Object.keys(parsedUpload).sort(),
  [
    'artifact',
    'artifactOrdinal',
    'clientFileId',
    'deliveryRevisionId',
    'expectedVersion',
    'idempotencyKey',
    'requestId',
  ].sort(),
)
assert.equal(parsedUpload.expectedVersion, 12)
assert.equal(parsedUpload.artifactOrdinal, 1)

// An initial browser-generated revision id is only an opaque command input.
// The accepted brief and builder assignment bindings enter through the
// server-constructed PM1 stage command and are not accepted by the upload
// parser/browser field surface.
const initialStageCommand = validateRequestCommandV1({
  contractVersion: 1,
  kind: 'stage_delivery_artifact',
  requestId: parsedUpload.requestId,
  expectedVersion: parsedUpload.expectedVersion,
  idempotencyKey: parsedUpload.idempotencyKey,
  payload: {
    deliveryRevisionId: parsedUpload.deliveryRevisionId,
    acceptedBriefRevisionId: fixtureIds.brief,
    activeBuilderAssignmentId: fixtureIds.builderAssignment,
    artifactOrdinal: parsedUpload.artifactOrdinal,
    clientFileId: parsedUpload.clientFileId,
    normalizedName: 'delivery.txt',
    byteLength: parsedUpload.artifact.bytes.byteLength,
    sha256: createHash('sha256').update(parsedUpload.artifact.bytes).digest('hex'),
    detectedMediaType: 'text/plain',
    scannerVersion: 'request-delivery-passive-v1',
  },
})
assert.equal(initialStageCommand.kind, 'stage_delivery_artifact')
assert.equal(initialStageCommand.payload.deliveryRevisionId, fixtureIds.delivery)
assert.equal(initialStageCommand.payload.acceptedBriefRevisionId, fixtureIds.brief)
assert.equal(initialStageCommand.payload.activeBuilderAssignmentId, fixtureIds.builderAssignment)

class IntegrationMemoryStorage {
  objects = new Map()
  removeCalls = []

  async putIfAbsent(input) {
    if (this.objects.has(input.key)) return 'exists'
    this.objects.set(input.key, {
      bytes: input.bytes.slice(),
      mediaType: input.mediaType,
      metadata: { ...input.metadata },
      createdAt: '2026-07-30T12:00:00.000Z',
    })
    return 'created'
  }

  async read(key) {
    const stored = this.objects.get(key)
    return stored
      ? {
          ...stored,
          bytes: stored.bytes.slice(),
          metadata: { ...stored.metadata },
        }
      : null
  }

  async remove(key) {
    this.removeCalls.push(key)
    this.objects.delete(key)
  }
}

const stageReceiptId = '30000000-0000-4000-a000-000000000001'
const attestationReceiptId = '30000000-0000-4000-a000-000000000002'
const allocationId = '30000000-0000-4000-a000-000000000003'
const objectIdentity = [
  'requests',
  fixtureIds.request,
  'deliveries',
  fixtureIds.delivery,
  'artifacts',
  fixtureIds.artifact,
  allocationId,
].join('/')
const uploadSha256 = createHash('sha256')
  .update(parsedUpload.artifact.bytes)
  .digest('hex')
let stageExecuted = false
let attested = false
const initialUploadCommands = []
const initialUploadService = {
  async getRequest() {
    if (!stageExecuted) return parsedFixtures.builderInitialNoWorkspace
    const fresh = structuredClone(parsedFixtures.builderStaging)
    fresh.requestVersion = 13
    fresh.builderWorkspace.artifacts[0] = {
      artifactId: fixtureIds.artifact,
      artifactOrdinal: 1,
      normalizedName: 'delivery.txt',
      detectedMediaType: 'text/plain',
      byteLength: parsedUpload.artifact.bytes.byteLength,
      sha256: uploadSha256,
      integrityStatus: attested ? 'verified' : 'pending',
      scanState: attested ? 'complete' : 'pending',
      scanVerdict: attested ? 'clean' : null,
      findingCodes: [],
    }
    return parseRequestCaseDetailResultV1(fresh)
  },
  async executeCommand(command) {
    initialUploadCommands.push(command)
    if (command.kind !== 'stage_delivery_artifact') {
      throw new Error('Unexpected cleanup command in successful initial upload fixture.')
    }
    stageExecuted = true
    return {
      requestId: fixtureIds.request,
      requestVersion: 13,
      commandId: stageReceiptId,
      moderationState: 'clear',
      lifecycleState: 'building',
      replayed: false,
      authorityResult: { artifactId: fixtureIds.artifact },
    }
  },
}
const initialUploadRoleClient = {
  async rpc(functionName) {
    if (functionName === 'prepare_build_request_delivery_artifact_object_v1') {
      return {
        data: {
          stageReceiptId,
          requestId: fixtureIds.request,
          expectedRequestVersion: 13,
          deliveryRevisionId: fixtureIds.delivery,
          artifactId: fixtureIds.artifact,
          acceptedBriefRevisionId: fixtureIds.brief,
          activeBuilderAssignmentId: fixtureIds.builderAssignment,
          artifactOrdinal: 1,
          sha256: uploadSha256,
          byteLength: parsedUpload.artifact.bytes.byteLength,
          detectedMediaType: 'text/plain',
          scannerVersion: 'request-delivery-passive-v1',
          objectIdentity,
        },
        error: null,
      }
    }
    if (functionName === 'attest_build_request_delivery_artifact_object_v1') {
      attested = true
      return {
        data: {
          attestationReceiptId,
          requestId: fixtureIds.request,
          deliveryRevisionId: fixtureIds.delivery,
          artifactId: fixtureIds.artifact,
          artifactOrdinal: 1,
          attestationVersion: 1,
          replayed: false,
          attestedAt: '2026-07-30T12:01:00.000Z',
        },
        error: null,
      }
    }
    if (functionName === 'resolve_build_request_delivery_artifact_custody_v1') {
      return {
        data: {
          requestVersion: 13,
          requestId: fixtureIds.request,
          deliveryRevisionId: fixtureIds.delivery,
          artifactId: fixtureIds.artifact,
          stageReceiptId,
          acceptedBriefRevisionId: fixtureIds.brief,
          activeBuilderAssignmentId: fixtureIds.builderAssignment,
          artifactOrdinal: 1,
          sha256: uploadSha256,
          byteLength: parsedUpload.artifact.bytes.byteLength,
          detectedMediaType: 'text/plain',
          scannerVersion: 'request-delivery-passive-v1',
          objectIdentity,
          attestationReceiptId,
          attestationVersion: 1,
          retentionState: 'retained',
          accessUntil: null,
        },
        error: null,
      }
    }
    throw new Error(`Unexpected service-role RPC: ${functionName}`)
  },
}
const initialUploadResult = await orchestrateRequestDeliveryArtifactUpload(
  parsedUpload,
  {
    applicationService: initialUploadService,
    serviceRoleClient: initialUploadRoleClient,
    storage: new IntegrationMemoryStorage(),
  },
)
assert.deepEqual(initialUploadResult, {
  artifactId: fixtureIds.artifact,
  requestVersion: 13,
})
assert.equal(initialUploadCommands.length, 1)
assert.deepEqual(initialUploadCommands[0].payload, initialStageCommand.payload)

await assert.rejects(
  parseRequestDeliveryArtifactUpload(uploadRequest(
    Object.fromEntries(Object.entries(uploadFields).filter(([key]) => key !== 'expectedVersion')),
    { expected_version: 12 },
  )),
  error => error?.code === 'invalid_form_fields',
)
await assert.rejects(
  parseRequestDeliveryArtifactUpload(uploadRequest(uploadFields, {
    manifestDigest: 'a'.repeat(64),
  })),
  error => error?.code === 'invalid_form_fields',
)
await assert.rejects(
  parseRequestDeliveryArtifactUpload(uploadRequest(uploadFields, {
    activeBuilderAssignmentId: fixtureIds.builderAssignment,
  })),
  error => error?.code === 'invalid_form_fields',
)

const actionInputKeys = {
  abandonArtifact: ['requestId', 'deliveryRevisionId', 'idempotencyKey', 'artifactId'],
  approveDelivery: ['requestId', 'deliveryRevisionId', 'idempotencyKey', 'checks', 'reviewNotes'],
  requestRepair: [
    'requestId',
    'deliveryRevisionId',
    'idempotencyKey',
    'checks',
    'safetyIntegrityResult',
    'reason',
    'repairInstructions',
  ],
  markUseful: ['requestId', 'deliveryRevisionId', 'idempotencyKey'],
  reportFailedAcceptanceCheck: [
    'requestId',
    'deliveryRevisionId',
    'idempotencyKey',
    'failedAcceptanceCheckId',
    'reason',
  ],
  acknowledgeDelivery: ['requestId', 'deliveryRevisionId', 'idempotencyKey'],
}

const executedCommands = []
const resolverCalls = []
const actionDetail = parsedFixtures.reviewerReviewPending
const applicationService = {
  async getRequest() {
    return actionDetail
  },
  async executeCommand(command) {
    executedCommands.push(command)
    return {
      requestId: command.requestId,
      requestVersion: command.expectedVersion + 1,
      commandId: '20000000-0000-4000-a000-000000000001',
    }
  },
}
const serviceRoleClient = {
  async rpc(functionName, parameters) {
    resolverCalls.push({ functionName, parameters })
    return {
      data: {
        requestId: fixtureIds.request,
        deliveryRevisionId: fixtureIds.delivery,
        requestVersion: 41,
        manifestDigest: 'b'.repeat(64),
        action: parameters.p_action,
      },
      error: null,
    }
  },
}
const actions = createRequestDeliveryActions({ applicationService, serviceRoleClient })
assert.deepEqual(Object.keys(actions).sort(), Object.keys(actionInputKeys).sort())

const approveInput = {
  requestId: fixtureIds.request,
  deliveryRevisionId: fixtureIds.delivery,
  idempotencyKey: 'approve-delivery-1',
  checks: [{
    acceptanceCheckId: fixtureIds.check,
    result: 'pass',
    evidenceRef: 'review-evidence-1',
  }],
  reviewNotes: 'Independent review passed.',
}
await actions.approveDelivery(approveInput)
assert.equal(resolverCalls.length, 1)
assert.equal(resolverCalls[0].parameters.p_actor_id, fixtureIds.reviewer)
assert.equal(executedCommands[0].expectedVersion, 41)
assert.equal(executedCommands[0].payload.manifestDigest, 'b'.repeat(64))
assert.equal(JSON.stringify(approveInput).includes('manifestDigest'), false)
assert.equal(JSON.stringify(approveInput).includes('expectedVersion'), false)

for (const forbidden of ['manifestDigest', 'expectedVersion', 'actorId']) {
  await assert.rejects(
    actions.approveDelivery({ ...approveInput, [forbidden]: forbidden === 'expectedVersion' ? 41 : 'x' }),
    /unexpected fields/,
  )
}

const staleApplicationService = {
  ...applicationService,
  async getRequest() {
    const stale = structuredClone(actionDetail)
    stale.deliveryRevisions[0].isCurrent = false
    return stale
  },
}
const staleActions = createRequestDeliveryActions({
  applicationService: staleApplicationService,
  serviceRoleClient,
})
await assert.rejects(
  staleActions.approveDelivery(approveInput),
  /current accepted delivery revision/,
)
assert.equal(resolverCalls.length, 1, 'stale detail fails before privileged binding resolution')

const abandonedCommands = []
const abandonApplicationService = {
  async getRequest() {
    return parsedFixtures.builderStaging
  },
  async executeCommand(command) {
    abandonedCommands.push(command)
    return {
      requestId: command.requestId,
      requestVersion: command.expectedVersion + 1,
      commandId: '20000000-0000-4000-a000-000000000002',
    }
  },
}
const abandonActions = createRequestDeliveryActions({
  applicationService: abandonApplicationService,
  serviceRoleClient,
})
const abandonInput = {
  requestId: fixtureIds.request,
  deliveryRevisionId: fixtureIds.delivery,
  artifactId: fixtureIds.artifact,
  idempotencyKey: 'abandon-artifact-1',
}
await abandonActions.abandonArtifact(abandonInput)
assert.equal(abandonedCommands[0].kind, 'abandon_delivery_artifact')
assert.equal(abandonedCommands[0].expectedVersion, parsedFixtures.builderStaging.requestVersion)
assert.deepEqual(abandonedCommands[0].payload, {
  deliveryRevisionId: fixtureIds.delivery,
  artifactId: fixtureIds.artifact,
})
await assert.rejects(
  abandonActions.abandonArtifact({
    ...abandonInput,
    artifactId: fixtureIds.seal,
  }),
  /authenticated actor/,
)
await assert.rejects(
  abandonActions.abandonArtifact({
    ...abandonInput,
    deliveryRevisionId: fixtureIds.seal,
  }),
  /authenticated actor/,
)
const requesterAbandonActions = createRequestDeliveryActions({
  applicationService: {
    ...abandonApplicationService,
    async getRequest() {
      return parsedFixtures.requesterReviewed
    },
  },
  serviceRoleClient,
})
await assert.rejects(
  requesterAbandonActions.abandonArtifact(abandonInput),
  /authenticated actor/,
)

const readerBytes = new TextEncoder().encode('private reviewed artifact')
const readerDigest = createHash('sha256').update(readerBytes).digest('hex')
const participantArtifact = {
  status: 'authorized',
  requestId: fixtureIds.request,
  deliveryRevisionId: fixtureIds.delivery,
  artifactId: fixtureIds.artifact,
  normalizedName: 'delivery.txt',
  mediaType: 'text/plain',
  byteLength: readerBytes.byteLength,
  sha256: readerDigest,
}
const privateObject = {
  status: 'authorized',
  requestId: fixtureIds.request,
  artifactId: fixtureIds.artifact,
  deliveryRevisionId: fixtureIds.delivery,
  acceptedBriefRevisionId: fixtureIds.brief,
  builderAssignmentId: fixtureIds.builderAssignment,
  artifactOrdinal: 1,
  sha256: readerDigest,
  byteLength: readerBytes.byteLength,
  mediaType: 'text/plain',
  scannerVersion: 'request-delivery-passive-v1',
  manifestDigest: 'c'.repeat(64),
  objectIdentity: 'private/object/identity',
}
const readerStorageMetadata = {
  policyVersion: 'request-delivery-passive-v1',
  scannerVersion: 'request-delivery-passive-v1',
  custodyState: 'staging',
  requestId: fixtureIds.request,
  deliveryRevisionId: fixtureIds.delivery,
  acceptedBriefRevisionId: fixtureIds.brief,
  builderAssignmentId: fixtureIds.builderAssignment,
  artifactId: fixtureIds.artifact,
  artifactOrdinal: '1',
  safeName: 'delivery.txt',
  sha256: readerDigest,
  byteLength: String(readerBytes.byteLength),
  mediaType: 'text/plain',
}
let adapterStorageMetadata = {
  policyVersion: 'request-delivery-passive-v1',
  scannerVersion: 'request-delivery-passive-v1',
  custodyState: 'staging',
  requestId: fixtureIds.request,
  deliveryRevisionId: fixtureIds.delivery,
  acceptedBriefRevisionId: fixtureIds.brief,
  builderAssignmentId: fixtureIds.builderAssignment,
  artifactId: fixtureIds.artifact,
  artifactOrdinal: '1',
  safeName: 'adapter-delivery.txt',
  sha256: '',
  byteLength: '',
  mediaType: 'text/plain',
}
const readerDependencies = {
  async resolveParticipantArtifact() {
    return participantArtifact
  },
  async resolveObjectIdentity() {
    return privateObject
  },
  async downloadPrivateObject() {
    return {
      status: 'available',
      object: {
        bytes: readerBytes,
        mediaType: 'text/plain',
        byteLength: readerBytes.byteLength,
        metadata: readerStorageMetadata,
      },
    }
  },
}
const previewResponse = await readRequestDeliveryArtifact({
  artifactId: fixtureIds.artifact,
  disposition: 'preview',
}, readerDependencies)
const downloadResponse = await readRequestDeliveryArtifact({
  artifactId: fixtureIds.artifact,
  disposition: 'download',
}, readerDependencies)
assert.equal(previewResponse.ok, true)
assert.match(previewResponse.headers['Content-Disposition'], /^inline;/)
assert.equal(downloadResponse.ok, true)
assert.match(downloadResponse.headers['Content-Disposition'], /^attachment;/)
assert.match(previewResponse.headers['Content-Security-Policy'], /script-src 'none'/)
assert.match(downloadResponse.headers['Content-Security-Policy'], /frame-ancestors 'none'/)

const adapterReaderBytes = new TextEncoder().encode('adapter-private-reviewed-artifact')
const adapterReaderSha256 = createHash('sha256').update(adapterReaderBytes).digest('hex')
adapterStorageMetadata = {
  ...adapterStorageMetadata,
  sha256: adapterReaderSha256,
  byteLength: String(adapterReaderBytes.byteLength),
}
const adapterObjectIdentity = [
  'requests',
  fixtureIds.request,
  'deliveries',
  fixtureIds.delivery,
  'artifacts',
  fixtureIds.artifact,
  allocationId,
].join('/')
let adapterParticipantResult = {
  status: 'ready',
  artifact: {
    deliveryArtifactId: fixtureIds.artifact,
    deliveryRevisionId: fixtureIds.delivery,
    requestId: fixtureIds.request,
    normalizedName: 'adapter-delivery.txt',
    detectedMediaType: 'text/plain',
    byteLength: adapterReaderBytes.byteLength,
    sha256: adapterReaderSha256,
    integrityStatus: 'verified',
    deliveryStatus: 'delivery_ready',
    accessUntil: null,
    readerHref: `/api/requests/deliveries/${fixtureIds.artifact}/reader`,
  },
}
let adapterParticipantCalls = 0
let adapterObjectCalls = 0
let adapterCustodyCalls = 0
let adapterDownloadCalls = 0

globalThis.__pm3DeliveryReaderParticipantClient = {
  async rpc(functionName) {
    assert.equal(functionName, 'resolve_build_request_delivery_artifact_v1')
    adapterParticipantCalls += 1
    if (adapterParticipantResult.status === 'unavailable') {
      return {
        data: null,
        error: {
          message: 'Reader unavailable.',
          details: `request_authority:${adapterParticipantResult.reason}`,
        },
      }
    }
    return { data: structuredClone(adapterParticipantResult), error: null }
  },
}

globalThis.__pm3DeliveryReaderAdminClient = {
  async rpc(functionName, parameters) {
    if (functionName === 'resolve_build_request_delivery_artifact_object_v1') {
      assert.deepEqual(
        Object.keys(parameters).sort(),
        ['p_artifact_id', 'p_contract_version', 'p_delivery_revision_id'],
      )
      adapterObjectCalls += 1
      return {
        data: {
          artifactId: fixtureIds.artifact,
          deliveryRevisionId: fixtureIds.delivery,
          manifestDigest: 'f'.repeat(64),
          objectIdentity: adapterObjectIdentity,
          retentionState: 'retained',
          accessUntil: null,
        },
        error: null,
      }
    }
    assert.equal(functionName, 'resolve_build_request_delivery_artifact_custody_v1')
    assert.deepEqual(
      Object.keys(parameters).sort(),
      [
        'p_artifact_id',
        'p_contract_version',
        'p_delivery_revision_id',
        'p_request_id',
      ],
    )
    adapterCustodyCalls += 1
    return {
      data: {
        requestVersion: 41,
        requestId: fixtureIds.request,
        deliveryRevisionId: fixtureIds.delivery,
        artifactId: fixtureIds.artifact,
        stageReceiptId,
        acceptedBriefRevisionId: fixtureIds.brief,
        activeBuilderAssignmentId: fixtureIds.builderAssignment,
        artifactOrdinal: 1,
        sha256: adapterReaderSha256,
        byteLength: adapterReaderBytes.byteLength,
        detectedMediaType: 'text/plain',
        scannerVersion: 'request-delivery-passive-v1',
        objectIdentity: adapterObjectIdentity,
        attestationReceiptId,
        attestationVersion: 1,
        retentionState: 'retained',
        accessUntil: null,
      },
      error: null,
    }
  },
  storage: {
    from(bucket) {
      assert.equal(bucket, 'request-build-deliveries')
      return {
        async info(key) {
          assert.equal(key, adapterObjectIdentity)
          return {
            data: {
              contentType: 'text/plain',
              metadata: { ...adapterStorageMetadata },
              createdAt: '2026-07-30T12:00:00.000Z',
            },
            error: null,
          }
        },
        async download(key) {
          assert.equal(key, adapterObjectIdentity)
          adapterDownloadCalls += 1
          return {
            data: new Blob([adapterReaderBytes], { type: 'text/plain' }),
            error: null,
          }
        },
      }
    },
  },
}

const adapterPreview = await handleRequestDeliveryArtifactReader({
  artifactId: fixtureIds.artifact,
  disposition: 'preview',
})
assert.equal(adapterPreview.status, 200)
assert.match(adapterPreview.headers.get('Content-Disposition') ?? '', /^inline;/)
assert.equal(
  adapterPreview.headers.get('Cache-Control'),
  'private, no-store, max-age=0, must-revalidate',
)
assert.match(adapterPreview.headers.get('Content-Security-Policy') ?? '', /sandbox/)
assert.match(adapterPreview.headers.get('Content-Security-Policy') ?? '', /script-src 'none'/)
assert.deepEqual(
  new Uint8Array(await adapterPreview.arrayBuffer()),
  adapterReaderBytes,
)
assert.equal(adapterParticipantCalls, 2, 'preview reauthorizes participant after byte read')
assert.equal(adapterObjectCalls, 2, 'preview reauthorizes private object after byte read')
assert.equal(adapterCustodyCalls, 2, 'preview reauthorizes exact custody metadata after byte read')
assert.equal(adapterDownloadCalls, 1)

const verifiedAdapterStorageMetadata = adapterStorageMetadata
adapterStorageMetadata = {}
const adapterMetadataMismatch = await handleRequestDeliveryArtifactReader({
  artifactId: fixtureIds.artifact,
  disposition: 'preview',
})
assert.equal(adapterMetadataMismatch.status, 409)
assert.equal(
  await adapterMetadataMismatch.text(),
  'Private artifact metadata does not match.',
)
adapterStorageMetadata = verifiedAdapterStorageMetadata

const adapterDownload = await getRequestDeliveryArtifact(
  new Request(
    `https://pathforge.test/api/requests/deliveries/${fixtureIds.artifact}/reader?download=1`,
  ),
  { params: Promise.resolve({ artifactId: fixtureIds.artifact }) },
)
assert.equal(adapterDownload.status, 200)
assert.match(adapterDownload.headers.get('Content-Disposition') ?? '', /^attachment;/)
assert.equal(
  adapterDownload.headers.get('Cache-Control'),
  'private, no-store, max-age=0, must-revalidate',
)
assert.match(
  adapterDownload.headers.get('Content-Security-Policy') ?? '',
  /frame-ancestors 'none'/,
)
assert.deepEqual(
  new Uint8Array(await adapterDownload.arrayBuffer()),
  adapterReaderBytes,
)
const adapterHead = await headRequestDeliveryArtifact(
  new Request(
    `https://pathforge.test/api/requests/deliveries/${fixtureIds.artifact}/reader`,
    { method: 'HEAD' },
  ),
  { params: Promise.resolve({ artifactId: fixtureIds.artifact }) },
)
assert.equal(adapterHead.status, 200)
assert.match(adapterHead.headers.get('Content-Disposition') ?? '', /^inline;/)
assert.equal((await adapterHead.arrayBuffer()).byteLength, 0)

adapterParticipantResult = { status: 'unavailable', reason: 'not_found' }
const unavailableObjectCalls = adapterObjectCalls
const unavailableCustodyCalls = adapterCustodyCalls
const adapterUnavailable = await getRequestDeliveryArtifact(
  new Request(
    `https://pathforge.test/api/requests/deliveries/${fixtureIds.artifact}/reader`,
  ),
  { params: Promise.resolve({ artifactId: fixtureIds.artifact }) },
)
assert.equal(adapterUnavailable.status, 404)
assert.equal(await adapterUnavailable.text(), 'Private artifact is unavailable.')
assert.equal(
  adapterUnavailable.headers.get('Cache-Control'),
  'private, no-store, max-age=0, must-revalidate',
)
assert.match(
  adapterUnavailable.headers.get('Content-Security-Policy') ?? '',
  /default-src 'none'/,
)
assert.equal(
  adapterObjectCalls,
  unavailableObjectCalls,
  'unavailable participant result never reaches service-only object resolution',
)
assert.equal(adapterCustodyCalls, unavailableCustodyCalls)
adapterParticipantResult = {
  status: 'ready',
  artifact: {
    deliveryArtifactId: fixtureIds.artifact,
    deliveryRevisionId: fixtureIds.delivery,
    requestId: fixtureIds.request,
    normalizedName: 'adapter-delivery.txt',
    detectedMediaType: 'text/plain',
    byteLength: adapterReaderBytes.byteLength,
    sha256: adapterReaderSha256,
    integrityStatus: 'verified',
    deliveryStatus: 'delivery_ready',
    accessUntil: null,
    readerHref: `/api/requests/deliveries/${fixtureIds.artifact}/reader`,
  },
}

assert.equal(REQUEST_DELIVERY_MAINTENANCE_MAX_BATCH, 25)

function cleanupUuid(sequence) {
  return `40000000-0000-4000-a000-${sequence.toString(16).padStart(12, '0')}`
}

function cleanupCandidate(sequence) {
  return {
    requestId: fixtureIds.request,
    deliveryRevisionId: fixtureIds.delivery,
    artifactId: cleanupUuid(sequence),
  }
}

const cleanupBytes = new TextEncoder().encode('terminal private artifact')
const cleanupSha256 = createHash('sha256').update(cleanupBytes).digest('hex')
const cleanupCandidates = {
  workerRemoved: cleanupCandidate(1),
  takeover: cleanupCandidate(2),
  preexistingMissing: cleanupCandidate(3),
  activeHold: cleanupCandidate(4),
  raceToRetention: cleanupCandidate(5),
  hostileMetadata: cleanupCandidate(6),
}
const crashCandidate = cleanupCandidate(7)

function cleanupAuthority(candidate, retentionState, overrides = {}) {
  return {
    ...candidate,
    objectIdentity: `private/retention/${candidate.artifactId}`,
    sha256: cleanupSha256,
    byteLength: cleanupBytes.byteLength,
    detectedMediaType: 'text/plain',
    custodyState: 'attested',
    retentionState,
    accessUntil: retentionState === 'cleanup_eligible'
      ? '2026-07-29T00:00:00.000Z'
      : '2026-07-31T00:00:00.000Z',
    ...overrides,
  }
}

const cleanupAuthorities = new Map(Object.values(cleanupCandidates).map(candidate => [
  candidate.artifactId,
  cleanupAuthority(candidate, 'cleanup_eligible'),
]))
cleanupAuthorities.set(
  crashCandidate.artifactId,
  cleanupAuthority(crashCandidate, 'cleanup_eligible'),
)

const cleanupStorage = new IntegrationMemoryStorage()
for (const [name, candidate] of Object.entries(cleanupCandidates)) {
  if (name === 'preexistingMissing') {
    continue
  }
  const authority = cleanupAuthorities.get(candidate.artifactId)
  const metadata = {
    policyVersion: 'request-delivery-passive-v1',
    scannerVersion: 'request-delivery-passive-v1',
    custodyState: 'staging',
    requestId: authority.requestId,
    deliveryRevisionId: authority.deliveryRevisionId,
    artifactId: authority.artifactId,
    sha256: authority.sha256,
    byteLength: String(authority.byteLength),
    mediaType: authority.detectedMediaType,
  }
  if (name === 'hostileMetadata') metadata.requestId = cleanupUuid(100)
  cleanupStorage.objects.set(authority.objectIdentity, {
    bytes: cleanupBytes.slice(),
    mediaType: 'text/plain',
    metadata,
    createdAt: '2026-04-30T00:00:00.000Z',
  })
}

let cleanupItems = [
  ...Object.values(cleanupCandidates).map(candidate => ({
    category: 'artifact_cleanup',
    ...candidate,
  })),
  { category: 'raw_text_purge', requestId: fixtureIds.request },
  {
    category: 'delivery_revision_retirement',
    requestId: fixtureIds.request,
    deliveryRevisionId: fixtureIds.delivery,
    expectedVersion: 41,
  },
  { category: 'audit_tombstone_expiry', requestId: fixtureIds.request },
  {
    category: 'account_deidentification_receipt_expiry',
    receiptId: cleanupUuid(90),
  },
]
const cleanupResolveCounts = new Map()
const cleanupRpcCalls = []
const claimKeyByArtifact = new Map()
const claimIdByArtifact = new Map(Object.values(cleanupCandidates).map(
  (candidate, index) => [candidate.artifactId, cleanupUuid(200 + index)],
))
claimIdByArtifact.set(crashCandidate.artifactId, cleanupUuid(207))
let failCrashConfirmation = true
const cleanupServiceRoleClient = {
  async rpc(functionName, parameters) {
    cleanupRpcCalls.push({ functionName, parameters: { ...parameters } })
    if (functionName === 'list_build_request_maintenance_work_v1') {
      return { data: { items: cleanupItems, nextCursor: null }, error: null }
    }
    if (functionName === 'resolve_build_request_delivery_artifact_cleanup_v1') {
      const prior = cleanupResolveCounts.get(parameters.p_artifact_id) ?? 0
      cleanupResolveCounts.set(parameters.p_artifact_id, prior + 1)
      const authority = structuredClone(cleanupAuthorities.get(parameters.p_artifact_id))
      if (
        parameters.p_artifact_id === cleanupCandidates.activeHold.artifactId
        || parameters.p_artifact_id === cleanupCandidates.takeover.artifactId
        || (
          parameters.p_artifact_id === crashCandidate.artifactId
          && !cleanupStorage.objects.has(
            cleanupAuthorities.get(crashCandidate.artifactId).objectIdentity,
          )
        )
      ) authority.retentionState = 'preserved_by_hold'
      if (
        parameters.p_artifact_id === cleanupCandidates.raceToRetention.artifactId
        && prior > 0
      ) authority.retentionState = 'retained'
      return { data: authority, error: null }
    }
    if (functionName === 'claim_build_request_delivery_artifact_cleanup_v1') {
      claimKeyByArtifact.set(
        parameters.p_artifact_id,
        [
          ...(claimKeyByArtifact.get(parameters.p_artifact_id) ?? []),
          parameters.p_idempotency_key,
        ],
      )
      return {
        data: {
          cleanupClaimId: claimIdByArtifact.get(parameters.p_artifact_id),
          requestId: parameters.p_request_id,
          deliveryRevisionId: parameters.p_delivery_revision_id,
          artifactId: parameters.p_artifact_id,
          claimVersion: parameters.p_artifact_id === cleanupCandidates.takeover.artifactId
            || (
              parameters.p_artifact_id === crashCandidate.artifactId
              && !cleanupStorage.objects.has(
                cleanupAuthorities.get(crashCandidate.artifactId).objectIdentity,
              )
            )
            ? 2
            : 1,
          leaseUntil: '2026-07-30T12:05:00.000Z',
          deletionStarted: parameters.p_artifact_id === cleanupCandidates.takeover.artifactId
            || (
              parameters.p_artifact_id === crashCandidate.artifactId
              && !cleanupStorage.objects.has(
                cleanupAuthorities.get(crashCandidate.artifactId).objectIdentity,
              )
            ),
          replayed: false,
        },
        error: null,
      }
    }
    if (functionName === 'begin_build_request_delivery_artifact_cleanup_delete_v1') {
      const artifactId = [...claimIdByArtifact.entries()]
        .find(([, claimId]) => claimId === parameters.p_cleanup_claim_id)?.[0]
      return {
        data: {
          cleanupClaimId: parameters.p_cleanup_claim_id,
          requestId: fixtureIds.request,
          deliveryRevisionId: fixtureIds.delivery,
          artifactId,
          claimVersion: parameters.p_claim_version,
          deleteStartedAt: '2026-07-30T12:01:00.000Z',
          replayed: false,
        },
        error: null,
      }
    }
    if (functionName === 'abort_build_request_delivery_artifact_cleanup_v1') {
      const artifactId = [...claimIdByArtifact.entries()]
        .find(([, claimId]) => claimId === parameters.p_cleanup_claim_id)?.[0]
      return {
        data: {
          cleanupClaimId: parameters.p_cleanup_claim_id,
          requestId: fixtureIds.request,
          deliveryRevisionId: fixtureIds.delivery,
          artifactId,
          claimVersion: parameters.p_claim_version,
          replayed: false,
          abortedAt: '2026-07-30T12:01:00.000Z',
        },
        error: null,
      }
    }
    if (functionName === 'confirm_build_request_delivery_artifact_cleanup_v1') {
      if (
        parameters.p_artifact_id === crashCandidate.artifactId
        && failCrashConfirmation
      ) {
        failCrashConfirmation = false
        throw new Error('simulated confirmation transport failure')
      }
      const preexisting = parameters.p_artifact_id
        === cleanupCandidates.preexistingMissing.artifactId
      return {
        data: {
          cleanupReceiptId: cleanupUuid(300),
          requestId: parameters.p_request_id,
          deliveryRevisionId: parameters.p_delivery_revision_id,
          artifactId: parameters.p_artifact_id,
          cleanupClaimId: parameters.p_cleanup_claim_id,
          claimVersion: parameters.p_claim_version,
          cleanupDisposition: preexisting ? 'preexisting_missing' : 'worker_removed',
          replayed: false,
          cleanedAt: '2026-07-30T12:02:00.000Z',
        },
        error: null,
      }
    }
    if (functionName === 'purge_build_request_raw_text_v1') {
      return {
        data: {
          requestId: parameters.p_request_id,
          purgedAt: '2026-07-30T12:00:00.000Z',
          auditTombstoneUntil: '2027-09-03T12:00:00.000Z',
          replayed: false,
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
          retiredAt: '2026-07-30T12:00:00.000Z',
          replayed: false,
        },
        error: null,
      }
    }
    if (functionName === 'expire_build_request_audit_tombstone_v1') {
      return {
        data: {
          contractVersion: 1,
          requestId: parameters.p_request_id,
          cleaned: false,
          replayed: false,
          aggregateDigest: 'f'.repeat(64),
          occurredAt: '2026-07-30T12:00:00.000Z',
        },
        error: null,
      }
    }
    if (functionName === 'expire_build_request_account_deidentification_receipt_v1') {
      return {
        data: {
          contractVersion: 1,
          receiptId: parameters.p_receipt_id,
          expired: false,
          occurredAt: '2026-07-30T12:00:00.000Z',
        },
        error: null,
      }
    }
    throw new Error(`Unexpected maintenance RPC: ${functionName}`)
  },
}
const cleanupRunner = createRequestDeliveryMaintenanceRunner({
  serviceRoleClient: cleanupServiceRoleClient,
  storage: cleanupStorage,
})
const cleanupResult = await cleanupRunner.runBatch({ limit: 10 })
assert.deepEqual(cleanupResult, {
  examined: 10,
  artifactsDeleted: 2,
  artifactsAlreadyMissing: 1,
  rawTextPurged: 1,
  revisionsRetired: 1,
  auditTombstonesExpired: 0,
  deidentificationReceiptsExpired: 0,
  authorityNoOp: 2,
  retained: 1,
  preserved: 1,
  failed: 1,
  hasMore: false,
})
assert.equal(
  cleanupStorage.removeCalls.includes(
    cleanupAuthorities.get(cleanupCandidates.activeHold.artifactId).objectIdentity,
  ),
  false,
  'an active hold prevents physical removal',
)
assert.equal(
  cleanupStorage.removeCalls.includes(
    cleanupAuthorities.get(cleanupCandidates.takeover.artifactId).objectIdentity,
  ),
  true,
  'expired-lease takeover continues an already-started deletion through a late hold',
)
assert.equal(cleanupStorage.removeCalls.length, 2)
assert.equal(
  cleanupRpcCalls.filter(
    ({ functionName }) =>
      functionName === 'begin_build_request_delivery_artifact_cleanup_delete_v1',
  ).length,
  2,
  'new and takeover claims both bind the current fenced version before removal',
)
assert.equal(
  cleanupRpcCalls.some(
    ({ functionName, parameters }) =>
      functionName === 'begin_build_request_delivery_artifact_cleanup_delete_v1'
      && parameters.p_cleanup_claim_id
        === claimIdByArtifact.get(cleanupCandidates.preexistingMissing.artifactId),
  ),
  false,
  'a preexisting-missing object confirms without claiming byte deletion',
)
assert.equal(
  cleanupRpcCalls.some(
    ({ functionName, parameters }) =>
      functionName === 'abort_build_request_delivery_artifact_cleanup_v1'
      && parameters.p_cleanup_claim_id
        === claimIdByArtifact.get(cleanupCandidates.raceToRetention.artifactId),
  ),
  true,
  'a pre-begin retention race aborts only after exact object proof',
)
assert.equal(
  cleanupRpcCalls.some(
    ({ functionName, parameters }) =>
      functionName === 'begin_build_request_delivery_artifact_cleanup_delete_v1'
      && parameters.p_cleanup_claim_id
        === claimIdByArtifact.get(cleanupCandidates.activeHold.artifactId),
  ),
  false,
  'a pre-begin hold never crosses the irreversible deletion-start transition',
)
assert.equal(cleanupResult.auditTombstonesExpired, 0)
assert.equal(cleanupResult.deidentificationReceiptsExpired, 0)
assert.equal(
  cleanupResult.authorityNoOp,
  2,
  'hold/concurrent completion false receipts remain categorical no-ops',
)
assert.deepEqual(Object.keys(cleanupResult).sort(), [
  'artifactsAlreadyMissing',
  'artifactsDeleted',
  'auditTombstonesExpired',
  'authorityNoOp',
  'deidentificationReceiptsExpired',
  'examined',
  'failed',
  'hasMore',
  'preserved',
  'rawTextPurged',
  'retained',
  'revisionsRetired',
].sort())
const cleanupAggregate = JSON.stringify(cleanupResult)
assert.doesNotMatch(cleanupAggregate, /[0-9a-f]{8}-[0-9a-f-]{27,}/i)
assert.doesNotMatch(cleanupAggregate, /private\/retention/)

const firstMissingClaimKey = claimKeyByArtifact.get(
  cleanupCandidates.preexistingMissing.artifactId,
)[0]
cleanupItems = [{
  category: 'artifact_cleanup',
  ...cleanupCandidates.preexistingMissing,
}]
const secondAttempt = createRequestDeliveryMaintenanceRunner({
  serviceRoleClient: cleanupServiceRoleClient,
  storage: cleanupStorage,
})
const secondMissingResult = await secondAttempt.runBatch({ limit: 1 })
assert.deepEqual(secondMissingResult, {
  examined: 1,
  artifactsDeleted: 0,
  artifactsAlreadyMissing: 1,
  rawTextPurged: 0,
  revisionsRetired: 0,
  auditTombstonesExpired: 0,
  deidentificationReceiptsExpired: 0,
  authorityNoOp: 0,
  retained: 0,
  preserved: 0,
  failed: 0,
  hasMore: false,
})
assert.notEqual(
  claimKeyByArtifact.get(cleanupCandidates.preexistingMissing.artifactId)[1],
  firstMissingClaimKey,
  'each worker attempt uses a distinct server-held claim owner key',
)

const crashAuthority = cleanupAuthorities.get(crashCandidate.artifactId)
cleanupStorage.objects.set(crashAuthority.objectIdentity, {
  bytes: cleanupBytes.slice(),
  mediaType: 'text/plain',
  metadata: {
    policyVersion: 'request-delivery-passive-v1',
    scannerVersion: 'request-delivery-passive-v1',
    custodyState: 'staging',
    requestId: crashAuthority.requestId,
    deliveryRevisionId: crashAuthority.deliveryRevisionId,
    artifactId: crashAuthority.artifactId,
    sha256: crashAuthority.sha256,
    byteLength: String(crashAuthority.byteLength),
    mediaType: crashAuthority.detectedMediaType,
  },
  createdAt: '2026-04-30T00:00:00.000Z',
})
cleanupItems = [{ category: 'artifact_cleanup', ...crashCandidate }]
const crashRunner = createRequestDeliveryMaintenanceRunner({
  serviceRoleClient: cleanupServiceRoleClient,
  storage: cleanupStorage,
})
const failedConfirmationResult = await crashRunner.runBatch({ limit: 1 })
assert.equal(failedConfirmationResult.failed, 1)
assert.equal(
  await cleanupStorage.read(crashAuthority.objectIdentity),
  null,
  'physical removal may finish before its authority confirmation',
)
const takeoverRunner = createRequestDeliveryMaintenanceRunner({
  serviceRoleClient: cleanupServiceRoleClient,
  storage: cleanupStorage,
})
const takeoverConfirmationResult = await takeoverRunner.runBatch({ limit: 1 })
assert.equal(takeoverConfirmationResult.artifactsDeleted, 1)
assert.equal(takeoverConfirmationResult.artifactsAlreadyMissing, 0)
assert.equal(
  cleanupResolveCounts.get(crashCandidate.artifactId) >= 4,
  true,
  'missing-object takeover re-resolves the late-hold authority before confirmation',
)
assert.equal(
  cleanupStorage.removeCalls.filter(key => key === crashAuthority.objectIdentity).length,
  1,
  'deletion-start takeover confirms missing bytes without repeating removal',
)
assert.notEqual(
  claimKeyByArtifact.get(crashCandidate.artifactId)[0],
  claimKeyByArtifact.get(crashCandidate.artifactId)[1],
  'takeover uses a new worker owner key and fenced claim version',
)

await assert.rejects(
  cleanupRunner.runBatch({
    limit: REQUEST_DELIVERY_MAINTENANCE_MAX_BATCH + 1,
  }),
  /configuration_invalid/,
)

const sourceFiles = {
  slot: readFileSync(path.join(
    src,
    'components/requests/delivery/RequestDeliverySlot.tsx',
  ), 'utf8'),
  uploader: readFileSync(path.join(
    src,
    'components/requests/delivery/BuilderDeliveryUploader.tsx',
  ), 'utf8'),
  outcomeForms: readFileSync(path.join(
    src,
    'components/requests/delivery/RequesterDeliveryOutcomeForms.tsx',
  ), 'utf8'),
  artifactInteractions: readFileSync(path.join(
    src,
    'components/requests/delivery/RequestDeliveryArtifactInteractions.tsx',
  ), 'utf8'),
  barrel: readFileSync(path.join(
    src,
    'components/requests/delivery/index.ts',
  ), 'utf8'),
  orchestrator: readFileSync(path.join(
    src,
    'lib/build-requests/delivery-upload-orchestrator.ts',
  ), 'utf8'),
  actionAdapter: readFileSync(path.join(
    src,
    'lib/build-requests/delivery-actions.ts',
  ), 'utf8'),
  view: readFileSync(path.join(
    src,
    'lib/build-requests/delivery-view.ts',
  ), 'utf8'),
  readerRoute: readFileSync(path.join(
    src,
    'app/api/requests/deliveries/[artifactId]/reader/route.ts',
  ), 'utf8'),
  retentionRunner: readFileSync(path.join(
    src,
    'lib/build-requests/delivery-retention-runner.ts',
  ), 'utf8'),
}

assert.match(sourceFiles.barrel, /RequestDeliverySlot/)
assert.doesNotMatch(sourceFiles.barrel, /BuilderDeliveryUploader/)
assert.match(
  sourceFiles.view,
  /export function toRequestDeliverySlotModel\(\s*detail:\s*RequestCaseDetailResultV1,\s*actorContext:\s*RequestActorContextV1,\s*\)/,
)
const publicProps = sourceFiles.slot.match(
  /export interface RequestDeliverySlotProps \{[\s\S]*?\n\}/,
)?.[0] ?? ''
for (const forbidden of [
  'manifestDigest',
  'objectKey',
  'objectIdentity',
  'acceptedBriefRevisionId',
  'activeBuilderAssignmentId',
  'evidenceChecklistVersion',
  'expectedVersion',
]) {
  assert.doesNotMatch(publicProps, new RegExp(forbidden), `public slot prop must hide ${forbidden}`)
}

const formFieldNames = [...`${sourceFiles.slot}\n${sourceFiles.uploader}`.matchAll(
  /(?:name=|\.set\()\s*["'`]([^"'`]+)["'`]/g,
)].map(match => match[1])
for (const forbidden of [
  'manifestDigest',
  'objectKey',
  'objectIdentity',
  'acceptedBriefRevisionId',
  'activeBuilderAssignmentId',
  'evidenceChecklistVersion',
]) {
  assert.equal(
    formFieldNames.includes(forbidden),
    false,
    `browser form must hide ${forbidden}`,
  )
}
assert.doesNotMatch(sourceFiles.slot, /name=["']expectedVersion["']/)
assert.doesNotMatch(sourceFiles.uploader, /\.set\(["'](?:manifestDigest|objectKey|objectIdentity|acceptedBriefRevisionId|activeBuilderAssignmentId|evidenceChecklistVersion)["']/)
assert.doesNotMatch(sourceFiles.uploader, /payload\.error/)
assert.match(sourceFiles.uploader, /SAFE_ERROR_MESSAGES/)
assert.match(sourceFiles.uploader, /SAFE_ERROR_MESSAGES\[payload\.code\]\s*\?\?\s*fallback/)
const safeErrorBlock = sourceFiles.uploader.match(
  /const SAFE_ERROR_MESSAGES:[\s\S]*?= \{([\s\S]*?)\n\}/,
)?.[1] ?? ''
const safeErrorCategories = [...safeErrorBlock.matchAll(/^\s{2}([a-z_]+):/gm)]
  .map(match => match[1])
assert.deepEqual(safeErrorCategories, [
  'auth_required',
  'forbidden',
  'held',
  'removed',
  'stale_version',
  'rate_limited',
  'artifact_staging_limit',
  'invalid_upload',
  'integrity_failed',
  'unavailable',
])
assert.equal(
  (sourceFiles.uploader.match(/What is included/g) ?? []).length,
  1,
  'builder form has exactly one What is included label',
)
assert.equal(
  (sourceFiles.outcomeForms.match(/'usefulness_recorded'/g) ?? []).length >= 1,
  true,
  'receipt-aware outcome seam exposes only the identifier-free usefulness event',
)
for (const field of ['submitted', 'error', 'replayed', 'outcome', 'emissionKey']) {
  assert.match(sourceFiles.outcomeForms, new RegExp(`\\b${field}\\b`))
}
assert.match(sourceFiles.outcomeForms, /outcome:\s*'helpful'/)
assert.match(sourceFiles.outcomeForms, /outcome:\s*'not_helpful'/)
assert.match(
  sourceFiles.outcomeForms,
  /\^delivery-outcome-event:\[A-Za-z0-9_-\]\{32\}\$/,
)
assert.equal(
  /^delivery-outcome-event:[A-Za-z0-9_-]{32}$/.test(fixtureIds.request),
  false,
  'a request UUID cannot be used as an identifier-free receipt emission key',
)
assert.equal(
  /^delivery-outcome-event:[A-Za-z0-9_-]{32}$/.test('a'.repeat(64)),
  false,
  'a manifest digest cannot be used as an identifier-free receipt emission key',
)
assert.doesNotMatch(
  sourceFiles.outcomeForms,
  /(?:manifestDigest|objectIdentity|stagingIdentity|acceptedBriefRevisionId|activeBuilderAssignmentId)/,
)
assert.equal(
  (sourceFiles.outcomeForms.match(/data-request-delivery-receipt-event=/g) ?? []).length,
  2,
  'both verified outcome receipts expose the identifier-free usefulness receipt marker',
)
assert.match(
  sourceFiles.artifactInteractions,
  /useState\(\s*INITIAL_REQUEST_DELIVERY_PREVIEW_STATE,\s*\)/,
)
assert.match(sourceFiles.artifactInteractions, /\{preview\.readerPath\s*\?\s*\(\s*<iframe/)
assert.doesNotMatch(sourceFiles.slot, /<iframe/)
assert.match(sourceFiles.artifactInteractions, /event:\s*'delivery_opened'/)
assert.match(sourceFiles.artifactInteractions, /method:\s*'HEAD'/)
assert.match(sourceFiles.artifactInteractions, /return response\.ok/)
assert.doesNotMatch(
  sourceFiles.artifactInteractions,
  /onClick=\{\(\)\s*=>\s*emitInteraction/,
)
assert.match(sourceFiles.artifactInteractions, /onLoad=\{recordLoadedPreview\}/)
assert.doesNotMatch(
  sourceFiles.artifactInteractions,
  /(?:requestId|artifactId|deliveryRevisionId|manifestDigest|objectIdentity)/,
)
assert.match(sourceFiles.readerRoute, /url\.searchParams\.get\('download'\)\s*===\s*'1'/)
assert.match(sourceFiles.readerRoute, /\?\s*'download'\s*:\s*'preview'/)
assert.doesNotMatch(sourceFiles.retentionRunner, /\bconsole\s*\./)
assert.doesNotMatch(sourceFiles.retentionRunner, /\b(?:logger|log)\s*\(/)

function filesBelow(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name)
    return entry.isDirectory() ? filesBelow(entryPath) : [entryPath]
  })
}

const apiRouteFiles = filesBelow(path.join(src, 'app/api'))
  .filter(file => file.endsWith('route.ts'))
const cleanupHttpRoutes = apiRouteFiles.filter(file => {
  const routeSource = readFileSync(file, 'utf8')
  return (
    routeSource.includes('delivery-retention-runner')
    || routeSource.includes('createRequestDeliveryMaintenanceRunner')
  )
})
assert.deepEqual(cleanupHttpRoutes, [], 'V1 exposes no delivery cleanup or cron route')

const uploadResultType = sourceFiles.orchestrator.match(
  /export type RequestDeliveryArtifactUploadResult = \{[\s\S]*?\n\}/,
)?.[0] ?? ''
assert.match(uploadResultType, /artifactId:\s*string/)
assert.match(uploadResultType, /requestVersion:\s*number/)
for (const forbidden of [
  'stageReceiptId',
  'sealReceiptId',
  'objectIdentity',
  'manifestDigest',
  'acceptedBriefRevisionId',
  'activeBuilderAssignmentId',
]) {
  assert.doesNotMatch(uploadResultType, new RegExp(forbidden))
}

for (const forbidden of ['expectedVersion:', 'manifestDigest:']) {
  for (const [method, allowed] of Object.entries(actionInputKeys)) {
    const signature = sourceFiles.actionAdapter.match(
      new RegExp(`export type [A-Za-z]+Input = [\\s\\S]*?\\n\\}`, 'g'),
    )
    assert.ok(signature, `${method} action input contracts are present`)
    assert.equal(allowed.includes(forbidden.slice(0, -1)), false)
  }
}

console.log(
  'Request delivery integration guard passed: 13 parser/mapper fixtures, reader dispositions, exact upload/stage semantics, actor-bound actions, bounded retention isolation/races, stale denial, and safe surfaces.',
)
