#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = process.cwd()
const src = path.join(root, 'src')
const uploaderSource = readFileSync(path.join(
  src,
  'components/requests/delivery/BuilderDeliveryUploader.tsx',
), 'utf8')

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') {
      return { url: 'data:text/javascript,export {}', shortCircuit: true }
    }
    if (specifier === 'next/cache') {
      return {
        url: 'data:text/javascript,export function revalidatePath(){}',
        shortCircuit: true,
      }
    }
    if (specifier === 'next/navigation') {
      return {
        url: `data:text/javascript,${encodeURIComponent(`
          export function redirect(path) {
            const error = new Error('redirect')
            error.path = path
            throw error
          }
        `)}`,
        shortCircuit: true,
      }
    }
    if (specifier === '@/lib/build-requests/server') {
      return {
        url: `data:text/javascript,${encodeURIComponent(`
          export async function getRequestViewerState() {
            globalThis.__deliveryViewerCalls += 1
            return globalThis.__deliveryViewerState
          }
          export async function getRequestApplicationService() {
            globalThis.__deliveryActionServiceFactoryCalls += 1
            return globalThis.__deliveryActionService
          }
          export function requestAuthorityErrorCode() {
            return 'unknown'
          }
        `)}`,
        shortCircuit: true,
      }
    }
    if (specifier === '@/lib/supabase/admin') {
      return {
        url: `data:text/javascript,${encodeURIComponent(`
          export function createAdminClient() {
            globalThis.__deliveryActionAdminFactoryCalls += 1
            return globalThis.__deliveryActionAdmin
          }
        `)}`,
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

const {
  deriveRequestDeliveryRouteIdempotencyKey,
  parseRequestDeliveryAbandonInput,
  parseRequestDeliveryPreparationInput,
  parseRequestDeliverySubmissionInput,
  prepareRequestDeliveryRevision,
  requireRequestDeliveryViewer,
  submitRequestDeliveryRevision,
} = await import(pathToFileURL(path.join(
  src,
  'lib/build-requests/delivery-route.ts',
)).href)

const ids = {
  request: '10000000-0000-4000-a000-000000000001',
  revision: '10000000-0000-4000-a000-000000000002',
  brief: '10000000-0000-4000-a000-000000000003',
  assignment: '10000000-0000-4000-a000-000000000004',
  artifact: '10000000-0000-4000-a000-000000000005',
  check: '10000000-0000-4000-a000-000000000006',
  command: '10000000-0000-4000-a000-000000000007',
  seal: '10000000-0000-4000-a000-000000000008',
}

const evidence = [{
  acceptanceCheckId: ids.check,
  result: 'pass',
  evidenceText: 'Verified the exact accepted offline behavior.',
  evidenceRef: null,
}]
const preparationBody = {
  requestId: ids.request,
  expectedVersion: 10,
  deliveryRevisionId: ids.revision,
  idempotencyKey: `delivery-prepare-${ids.revision}`,
  revisionLabel: 'Initial delivery',
  summary: 'A private static checklist.',
  builderEvidence: evidence,
  builderAttestation: 'confirmed',
}
const submissionBody = {
  requestId: ids.request,
  expectedVersion: 11,
  deliveryRevisionId: ids.revision,
  idempotencyKey: `delivery-seal-submit-${ids.revision}-11`,
}

assert.deepEqual(parseRequestDeliveryPreparationInput(preparationBody), preparationBody)
assert.deepEqual(parseRequestDeliverySubmissionInput(submissionBody), submissionBody)
assert.deepEqual(parseRequestDeliveryAbandonInput({
  requestId: ids.request,
  deliveryRevisionId: ids.revision,
  artifactId: ids.artifact,
  idempotencyKey: 'delivery-abandon-safe',
}), {
  requestId: ids.request,
  deliveryRevisionId: ids.revision,
  artifactId: ids.artifact,
  idempotencyKey: 'delivery-abandon-safe',
})
assert.equal(
  requireRequestDeliveryViewer({
    status: 'signed_in',
    user: { id: ids.assignment },
  }),
  ids.assignment,
)
assert.throws(
  () => requireRequestDeliveryViewer({ status: 'signed_out' }),
  error => error?.code === 'auth_required',
)
assert.throws(
  () => requireRequestDeliveryViewer({ status: 'unavailable' }),
  error => error?.code === 'unavailable',
)

for (const hostile of [
  { ...preparationBody, unexpected: true },
  { ...preparationBody, builderAttestation: 'no' },
  { ...submissionBody, requestedCommand: 'submit_delivery' },
  { ...submissionBody, expectedVersion: -1 },
]) {
  assert.throws(
    () => (
      'builderAttestation' in hostile
        ? parseRequestDeliveryPreparationInput(hostile)
        : parseRequestDeliverySubmissionInput(hostile)
    ),
  )
}

const boundaryPreparation = {
  ...preparationBody,
  revisionLabel: 'L'.repeat(80),
  summary: 'S'.repeat(2_000),
  builderEvidence: [{
    ...evidence[0],
    evidenceText: 'E'.repeat(2_000),
    evidenceRef: `ref-${'r'.repeat(156)}`,
  }],
}
assert.equal(
  parseRequestDeliveryPreparationInput(boundaryPreparation).revisionLabel.length,
  80,
)
for (const invalid of [
  { ...preparationBody, revisionLabel: '   ' },
  { ...preparationBody, revisionLabel: 'L'.repeat(81) },
  { ...preparationBody, summary: 'S'.repeat(2_001) },
  {
    ...preparationBody,
    builderEvidence: [{ ...evidence[0], evidenceText: '   ' }],
  },
  {
    ...preparationBody,
    builderEvidence: [{ ...evidence[0], evidenceText: 'E'.repeat(2_001) }],
  },
  {
    ...preparationBody,
    builderEvidence: [{ ...evidence[0], evidenceRef: 'unsafe ref' }],
  },
  {
    ...preparationBody,
    builderEvidence: [evidence[0], evidence[0]],
  },
]) {
  assert.throws(() => parseRequestDeliveryPreparationInput(invalid))
}

const maximumIntent = `a${'b'.repeat(127)}`
for (const phase of ['seal', 'submit']) {
  const derived = deriveRequestDeliveryRouteIdempotencyKey(phase, maximumIntent)
  assert.match(derived, /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/)
  assert.ok(derived.length <= 128)
  assert.equal(
    derived,
    deriveRequestDeliveryRouteIdempotencyKey(phase, maximumIntent),
  )
}

function workspace(state) {
  return {
    deliveryRevisionId: ids.revision,
    acceptedBriefRevisionId: ids.brief,
    activeBuilderAssignmentId: ids.assignment,
    revisionState: state,
    revisionLabel: state === 'staging' ? null : preparationBody.revisionLabel,
    summary: state === 'staging' ? null : preparationBody.summary,
    builderEvidence: state === 'staging' ? [] : evidence,
    approvedPathForgeReference: null,
    artifacts: [{
      artifactId: ids.artifact,
      artifactOrdinal: 1,
    }],
    sealReceiptId: state === 'sealed' ? ids.seal : null,
  }
}

function detail(state, options = {}) {
  return {
    visibility: 'full',
    moderationState: 'clear',
    lifecycleState: options.lifecycle ?? 'building',
    requestVersion: options.version ?? (state === 'staging' ? 10 : 11),
    actor: {
      accountId: ids.assignment,
      roles: ['builder'],
      capabilities: options.capabilities ?? (
        state === 'staging'
          ? ['prepare_delivery_revision']
          : state === 'sealed'
            ? ['submit_delivery']
            : []
      ),
    },
    brief: {
      acceptanceChecks: [{ acceptanceCheckId: ids.check }],
    },
    builderWorkspace: options.noWorkspace ? null : workspace(state),
    deliveryRevisions: options.deliveryRevisions ?? [],
  }
}

function serviceRole(sealCalls) {
  return {
    async rpc(_name, parameters) {
      if (parameters.p_actor_id) {
        return {
          data: {
            requestId: ids.request,
            deliveryRevisionId: ids.revision,
            preparationReceiptId: ids.command,
            expectedRequestVersion: 10,
            idempotencyKey: preparationBody.idempotencyKey,
          },
          error: null,
        }
      }
      sealCalls.push(parameters)
      return {
        data: {
          sealReceiptId: ids.seal,
          requestId: ids.request,
          deliveryRevisionId: ids.revision,
          manifestDigest: 'a'.repeat(64),
          manifestContractVersion: 'request-delivery-manifest-v1',
          policyVersion: 'request-delivery-passive-v1',
          artifactCount: 1,
          totalBytes: 100,
          replayed: sealCalls.length > 1,
          sealedAt: '2026-07-30T12:00:00.000Z',
        },
        error: null,
      }
    },
  }
}

const prepareCommands = []
const sealCalls = []
const stagingService = {
  async getRequest() {
    return detail('staging')
  },
  async executeCommand(command) {
    prepareCommands.push(command)
    return {
      commandId: ids.command,
      requestVersion: 11,
      replayed: false,
    }
  },
}
assert.deepEqual(
  await prepareRequestDeliveryRevision(preparationBody, {
    applicationService: stagingService,
    serviceRoleClient: serviceRole(sealCalls),
  }),
  { requestVersion: 11 },
)
assert.equal(prepareCommands[0].kind, 'prepare_delivery_revision')
assert.equal(sealCalls.length, 1)
assert.ok(sealCalls[0].p_idempotency_key.length <= 128)

// Named crash fixture: the prepare command committed, but seal/response did
// not. The same payload and intent replay the original receipt and seal.
const preparedRetryCommands = []
const preparedService = {
  async getRequest() {
    const prepared = detail('prepared')
    prepared.builderWorkspace.builderEvidence = [{
      evidenceRef: null,
      evidenceText: evidence[0].evidenceText,
      result: 'pass',
      acceptanceCheckId: ids.check,
    }]
    return prepared
  },
  async executeCommand(command) {
    preparedRetryCommands.push(command)
    return {
      commandId: ids.command,
      requestVersion: 11,
      replayed: true,
    }
  },
}
await prepareRequestDeliveryRevision({
  ...preparationBody,
  revisionLabel: `  ${preparationBody.revisionLabel}  `,
  summary: ` ${preparationBody.summary} `,
  builderEvidence: [{
    ...evidence[0],
    evidenceText: ` ${evidence[0].evidenceText} `,
  }],
}, {
  applicationService: preparedService,
  serviceRoleClient: serviceRole(sealCalls),
})
assert.equal(preparedRetryCommands.length, 1)
assert.equal(sealCalls.length, 2)
await assert.rejects(
  prepareRequestDeliveryRevision(
    { ...preparationBody, summary: 'Changed after the committed prepare.' },
    {
      applicationService: preparedService,
      serviceRoleClient: serviceRole(sealCalls),
    },
  ),
)
assert.equal(preparedRetryCommands.length, 1)

for (const [capability, expectedKind] of [
  ['submit_delivery', 'submit_delivery'],
  ['resubmit_delivery', 'resubmit_delivery'],
]) {
  const commands = []
  const service = {
    async getRequest() {
      return detail('sealed', { capabilities: [capability] })
    },
    async executeCommand(command) {
      commands.push(command)
      return { requestVersion: 12, replayed: false }
    },
  }
  const submission = await submitRequestDeliveryRevision(submissionBody, {
    applicationService: service,
    serviceRoleClient: serviceRole([]),
  })
  assert.deepEqual(submission, {
    requestVersion: 12,
    submissionStatus: 'submitted',
  })
  assert.equal(commands[0].kind, expectedKind)
  assert.equal(commands[0].payload.sealReceiptId, ids.seal)
  assert.ok(commands[0].idempotencyKey.length <= 128)
}

// Named page-refresh recovery: the browser has only the authority-projected
// prepared workspace. The server replays prepare, seals, fresh-reads, submits.
let preparedRefreshReads = 0
const preparedRefreshCommands = []
await submitRequestDeliveryRevision(submissionBody, {
  applicationService: {
    async getRequest() {
      preparedRefreshReads += 1
      return preparedRefreshReads === 1
        ? detail('prepared', { version: 14 })
        : detail('sealed', { version: 14, capabilities: ['submit_delivery'] })
    },
    async executeCommand(command) {
      preparedRefreshCommands.push(command)
      return command.kind === 'prepare_delivery_revision'
        ? { commandId: ids.command, requestVersion: 11, replayed: true }
        : { requestVersion: 12, replayed: false }
    },
  },
  serviceRoleClient: serviceRole([]),
})
assert.deepEqual(
  preparedRefreshCommands.map(command => command.kind),
  ['prepare_delivery_revision', 'submit_delivery'],
)
assert.equal(preparedRefreshCommands[0].expectedVersion, 10)
assert.equal(preparedRefreshCommands[1].expectedVersion, 14)

// Arbitrary authority interleavings (hold, release, then reviewer assignment)
// may advance the case well beyond the original preparation version. The
// service-only binding remains the sole replay authority.
let interleavedReads = 0
const interleavedCommands = []
const interleavedResult = await submitRequestDeliveryRevision(submissionBody, {
  applicationService: {
    async getRequest() {
      interleavedReads += 1
      return interleavedReads === 1
        ? detail('prepared', { version: 18 })
        : detail('sealed', { version: 18, capabilities: ['submit_delivery'] })
    },
    async executeCommand(command) {
      interleavedCommands.push(command)
      return command.kind === 'prepare_delivery_revision'
        ? { commandId: ids.command, requestVersion: 11, replayed: true }
        : { requestVersion: 19, replayed: false }
    },
  },
  serviceRoleClient: serviceRole([]),
})
assert.deepEqual(
  interleavedCommands.map(command => [command.kind, command.expectedVersion]),
  [
    ['prepare_delivery_revision', 10],
    ['submit_delivery', 18],
  ],
)
assert.deepEqual(interleavedResult, {
  requestVersion: 19,
  submissionStatus: 'submitted',
})

// Preparing before reviewer assignment is a truthful partial success. The
// sealed workspace waits without executing submit; a later authority refresh
// with an assigned reviewer exposes submit and advances normally.
let prematureSubmitCalls = 0
const waitingResult = await submitRequestDeliveryRevision(submissionBody, {
  applicationService: {
    async getRequest() {
      return detail('sealed', { version: 11, capabilities: [] })
    },
    async executeCommand() {
      prematureSubmitCalls += 1
    },
  },
  serviceRoleClient: serviceRole([]),
})
assert.deepEqual(waitingResult, {
  requestVersion: 11,
  submissionStatus: 'sealed_waiting_for_reviewer',
})
assert.equal(prematureSubmitCalls, 0)

const assignedReviewerCommands = []
const reviewerAssignedSubmissionBody = {
  ...submissionBody,
  expectedVersion: 15,
  idempotencyKey: `delivery-seal-submit-${ids.revision}-15`,
}
const afterReviewerAssignment = await submitRequestDeliveryRevision(reviewerAssignedSubmissionBody, {
  applicationService: {
    async getRequest() {
      return detail('sealed', {
        version: 15,
        capabilities: ['submit_delivery'],
      })
    },
    async executeCommand(command) {
      assignedReviewerCommands.push(command)
      return { requestVersion: 16, replayed: false }
    },
  },
  serviceRoleClient: serviceRole([]),
})
assert.deepEqual(afterReviewerAssignment, {
  requestVersion: 16,
  submissionStatus: 'submitted',
})
assert.equal(assignedReviewerCommands[0].expectedVersion, 15)

// Submit response loss reconciles from the exact current submitted revision;
// it does not issue a second transition after lifecycle advancement.
let replayExecuteCalls = 0
const reconciled = await submitRequestDeliveryRevision(submissionBody, {
  applicationService: {
    async getRequest() {
      return detail('sealed', {
        lifecycle: 'review_pending',
        version: 12,
        capabilities: [],
        noWorkspace: true,
        deliveryRevisions: [{
          isCurrent: true,
          deliveryRevisionId: ids.revision,
          sealReceiptId: ids.seal,
        }],
      })
    },
    async executeCommand() {
      replayExecuteCalls += 1
    },
  },
  serviceRoleClient: serviceRole([]),
})
assert.deepEqual(reconciled, {
  requestVersion: 12,
  submissionStatus: 'submitted',
})
assert.equal(replayExecuteCalls, 0)
assert.doesNotMatch(
  uploaderSource,
  /if\s*\(\s*!canPrepareRevision\s*\)/,
  'The client must not gate post-stage prepare on its stale render-time capability.',
)
assert.ok(
  uploaderSource.indexOf('const response = await fetch(UPLOAD_ROUTE')
  < uploaderSource.indexOf('const preparationResponse = await fetch(PREPARE_ROUTE'),
)
assert.match(
  uploaderSource,
  /sealed_waiting_for_reviewer/,
  'The one-click flow must render sealed reviewer-waiting as a bounded success.',
)
assert.ok(
  uploaderSource.indexOf('const preparationResponse = await fetch(PREPARE_ROUTE')
  < uploaderSource.indexOf('const response = await fetch(SUBMIT_ROUTE'),
)

globalThis.__deliveryActionServiceFactoryCalls = 0
globalThis.__deliveryActionAdminFactoryCalls = 0
globalThis.__deliveryActionService = {}
globalThis.__deliveryActionAdmin = {}
const {
  recordRequestDeliveryOutcomeAction,
  requestDeliveryReviewAction,
} = await import(pathToFileURL(path.join(
  src,
  'app/requests/[id]/delivery-actions.ts',
)).href)

function actionIdentityForm(command) {
  const form = new FormData()
  form.set('command', command)
  form.set('request_id', ids.request)
  form.set('delivery_revision_id', ids.revision)
  form.set('idempotency_intent', 'delivery-action-safe')
  return form
}

await assert.rejects(
  requestDeliveryReviewAction(actionIdentityForm('hostile_review')),
  /redirect/,
)
assert.equal(globalThis.__deliveryActionServiceFactoryCalls, 0)
assert.equal(globalThis.__deliveryActionAdminFactoryCalls, 0)

globalThis.__deliveryViewerCalls = 0
globalThis.__deliveryViewerState = { status: 'signed_out' }
globalThis.__deliveryActionServiceFactoryCalls = 0
globalThis.__deliveryActionAdminFactoryCalls = 0

function sameOriginJsonRequest(url, value, method = 'POST') {
  const body = JSON.stringify(value)
  return new Request(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'Content-Length': String(new TextEncoder().encode(body).byteLength),
      Origin: new URL(url).origin,
      'Sec-Fetch-Site': 'same-origin',
    },
    body,
  })
}

const prepareRoute = await import(pathToFileURL(path.join(
  src,
  'app/api/request-deliveries/prepare/route.ts',
)).href)
const submitRoute = await import(pathToFileURL(path.join(
  src,
  'app/api/request-deliveries/submit/route.ts',
)).href)
const artifactRoute = await import(pathToFileURL(path.join(
  src,
  'app/api/request-deliveries/artifacts/route.ts',
)).href)

for (const [route, body] of [
  [prepareRoute, preparationBody],
  [submitRoute, submissionBody],
]) {
  const response = await route.POST(sameOriginJsonRequest(
    'https://pathforge.example/api/request-deliveries/test',
    body,
  ))
  assert.equal(response.status, 401)
  assert.deepEqual(await response.json(), { code: 'auth_required' })
}
const abandonBody = {
  requestId: ids.request,
  deliveryRevisionId: ids.revision,
  artifactId: ids.artifact,
  idempotencyKey: 'delivery-abandon-safe',
}
const abandonRequest = sameOriginJsonRequest(
  'https://pathforge.example/api/request-deliveries/artifacts',
  abandonBody,
  'DELETE',
)
const abandonResponse = await artifactRoute.DELETE(abandonRequest)
assert.equal(abandonResponse.status, 401)
assert.deepEqual(await abandonResponse.json(), { code: 'auth_required' })

const uploadForm = new FormData()
uploadForm.set('requestId', ids.request)
uploadForm.set('expectedVersion', '10')
uploadForm.set('deliveryRevisionId', ids.revision)
uploadForm.set('artifactOrdinal', '1')
uploadForm.set('clientFileId', ids.artifact)
uploadForm.set('idempotencyKey', 'delivery-stage-safe-intent')
uploadForm.set(
  'artifact',
  new File(['safe private evidence'], 'evidence.txt', { type: 'text/plain' }),
)
const encodedUpload = new Request(
  'https://pathforge.example/api/request-deliveries/artifacts',
  { method: 'POST', body: uploadForm },
)
const uploadBytes = await encodedUpload.arrayBuffer()
const uploadRequest = new Request(encodedUpload.url, {
  method: 'POST',
  headers: {
    'Content-Type': encodedUpload.headers.get('content-type'),
    'Content-Length': String(uploadBytes.byteLength),
    Origin: new URL(encodedUpload.url).origin,
    'Sec-Fetch-Site': 'same-origin',
  },
  body: uploadBytes,
})
const uploadResponse = await artifactRoute.POST(uploadRequest)
assert.equal(uploadResponse.status, 401)
assert.deepEqual(await uploadResponse.json(), { code: 'auth_required' })

assert.equal(globalThis.__deliveryViewerCalls, 4)
assert.equal(globalThis.__deliveryActionServiceFactoryCalls, 0)
assert.equal(globalThis.__deliveryActionAdminFactoryCalls, 0)

// Malformed semantic payloads fail before auth verification, cookie-scoped
// application services, or service-role custody.
globalThis.__deliveryViewerState = {
  status: 'signed_in',
  user: { id: ids.assignment },
}
globalThis.__deliveryViewerCalls = 0
const malformedResponse = await prepareRoute.POST(sameOriginJsonRequest(
  'https://pathforge.example/api/request-deliveries/prepare',
  { ...preparationBody, revisionLabel: ' '.repeat(81) },
))
assert.equal(malformedResponse.status, 400)
assert.equal(globalThis.__deliveryViewerCalls, 0)
assert.equal(globalThis.__deliveryActionServiceFactoryCalls, 0)
assert.equal(globalThis.__deliveryActionAdminFactoryCalls, 0)

const hostileOutcome = actionIdentityForm('requester_delivery_outcome_failed')
hostileOutcome.set('outcome', 'failed_acceptance_check')
hostileOutcome.set('failed_acceptance_check_id', 'not-a-uuid')
hostileOutcome.set('reason', 'A check failed.')
const hostileOutcomeState = await recordRequestDeliveryOutcomeAction({
  submitted: false,
  error: null,
  replayed: false,
  outcome: null,
  emissionKey: null,
}, hostileOutcome)
assert.equal(hostileOutcomeState.error, 'invalid_input')
assert.equal(globalThis.__deliveryActionServiceFactoryCalls, 0)
assert.equal(globalThis.__deliveryActionAdminFactoryCalls, 0)

for (const routePath of [
  'src/app/api/request-deliveries/prepare/route.ts',
  'src/app/api/request-deliveries/submit/route.ts',
  'src/app/api/request-deliveries/artifacts/route.ts',
]) {
  const source = readFileSync(path.join(root, routePath), 'utf8')
  const parserIndex = source.indexOf(
    routePath.includes('/prepare/')
      ? 'parseRequestDeliveryPreparationInput(body)'
      : routePath.includes('/submit/')
        ? 'parseRequestDeliverySubmissionInput(body)'
        : 'parseRequestDeliveryAbandonInput(body)',
  )
  const serviceIndex = source.indexOf('getRequestApplicationService()', parserIndex)
  assert.ok(parserIndex >= 0 && serviceIndex > parserIndex, `${routePath} parses before service creation`)
}

console.log(
  'Request delivery route guard passed: exact fail-closed envelopes and auth, bounded keys, interleaved prepare replay/seal, reviewer-waiting success, authority-derived submit/resubmit, and response-loss reconciliation.',
)
