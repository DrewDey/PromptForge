#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const FIXTURE_ROUTE = 'src/app/qa/request-build/page.tsx'
const FIXTURE_MODELS = 'src/lib/build-requests/fixtures.ts'

const route = readFileSync(FIXTURE_ROUTE, 'utf8')
const models = readFileSync(FIXTURE_MODELS, 'utf8')
const intake = readFileSync('src/components/requests/intake/RequestIntakeForm.tsx', 'utf8')
const adminOperations = readFileSync(
  'src/components/requests/admin/AdminRequestDetailOperations.tsx',
  'utf8',
)
const caseShell = readFileSync(
  'src/components/requests/case/RequestCaseShell.tsx',
  'utf8',
)
assert.doesNotMatch(
  caseShell,
  /function Delivery\(|aria-labelledby="request-case-delivery"|<h2 id="request-case-delivery"/,
  'The shared case shell must leave the single semantic delivery section and heading to PM 3.',
)
assert.match(
  caseShell,
  /<div className=\{styles\.deliverySlot\}>\{deliverySlot\}<\/div>/,
  'The shared case shell must keep only a layout wrapper around the delivery slot.',
)
const browserGuard = readFileSync('scripts/check-request-build-browser.mjs', 'utf8')
const intakeAction = readFileSync('src/app/requests/new/actions.ts', 'utf8')
const intakePage = readFileSync('src/app/requests/new/page.tsx', 'utf8')
const intakeEnvelopeSource = readFileSync(
  'src/lib/build-requests/intake-envelope.ts',
  'utf8',
)
const intakeEnvelopeModule = await import(
  `data:text/javascript;base64,${Buffer.from(
    ts.transpileModule(intakeEnvelopeSource, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  ).toString('base64')}`
)
function acceptanceEnvelope(values) {
  const formData = new FormData()
  values.forEach((value) => formData.append('acceptanceChecks', value))
  return formData
}
assert.deepEqual(
  intakeEnvelopeModule.readRequestIntakeAcceptanceChecks(
    acceptanceEnvelope(['One exact check']),
  ),
  ['One exact check'],
  'One submitted acceptance check must pass through exactly.',
)
assert.deepEqual(
  intakeEnvelopeModule.readRequestIntakeAcceptanceChecks(
    acceptanceEnvelope(['First exact check', 'Second exact check', 'Third exact check']),
  ),
  ['First exact check', 'Second exact check', 'Third exact check'],
  'Three submitted acceptance checks must pass through exactly.',
)
for (const [label, formData] of [
  ['zero checks', acceptanceEnvelope([])],
  ['four checks', acceptanceEnvelope(['one', 'two', 'three', 'four'])],
  [
    'mixed File and text checks',
    acceptanceEnvelope([
      'one',
      new File(['not text'], 'check.txt', { type: 'text/plain' }),
    ]),
  ],
]) {
  assert.throws(
    () => intakeEnvelopeModule.readRequestIntakeAcceptanceChecks(formData),
    /Acceptance checks must contain one to three text values\./,
    `${label} must be rejected without silent filtering or truncation.`,
  )
}
assert.match(
  intakeAction,
  /readRequestIntakeAcceptanceChecks\(formData\)[\s\S]*validateSubmitBuildRequestV1/,
  'The intake Server Action must validate the exact acceptance-check envelope before authority validation.',
)
assert.doesNotMatch(
  intakeAction,
  /getAll\('acceptanceChecks'\)[\s\S]{0,120}\.(?:filter|slice)\(/,
  'The intake Server Action must not filter or truncate submitted acceptance checks.',
)
assert.match(
  intakeAction,
  /referenceKind !== ''[\s\S]*referenceKind !== 'project'[\s\S]*referenceKind !== 'response'[\s\S]*throw new RequestContractError/,
  'Intake must reject an unknown optional-reference discriminant.',
)
const participantCaseAction = readFileSync('src/app/requests/[id]/actions.ts', 'utf8')
const participantCasePage = readFileSync('src/app/requests/[id]/page.tsx', 'utf8')
const presentation = readFileSync('src/lib/build-requests/presentation.ts', 'utf8')
const serverAdapter = readFileSync('src/lib/build-requests/server.ts', 'utf8')
const adminActions = readFileSync('src/app/admin/build-requests/actions.ts', 'utf8')
const adminControls = readFileSync(
  'src/components/requests/admin/RequestAdminServiceControls.tsx',
  'utf8',
)
const pilotExpirySource = readFileSync(
  'src/lib/build-requests/pilot-expiry.ts',
  'utf8',
)
const pilotExpiryModule = await import(
  `data:text/javascript;base64,${Buffer.from(
    ts.transpileModule(pilotExpirySource, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  ).toString('base64')}`
)
assert.equal(
  pilotExpiryModule.parsePilotExpiryUtc('2026-08-15T14:30'),
  '2026-08-15T14:30:00.000Z',
  'Pilot admission expiry must preserve the exact UTC instant.',
)
assert.equal(
  pilotExpiryModule.parsePilotExpiryUtc(''),
  null,
  'An omitted pilot expiry must remain absent.',
)
for (const malformedExpiry of ['2026-02-30T12:00', '2026-08-15', 'not-a-date']) {
  assert.throws(
    () => pilotExpiryModule.parsePilotExpiryUtc(malformedExpiry),
    /invalid_pilot_expiry/,
    `Malformed pilot expiry ${malformedExpiry} must take the bounded error path.`,
  )
}
const jsonRouteGuardSource = readFileSync(
  'src/lib/build-requests/request-json-route.ts',
  'utf8',
).replace("import 'server-only'", '')
const jsonRouteGuardModule = await import(
  `data:text/javascript;base64,${Buffer.from(
    ts.transpileModule(jsonRouteGuardSource, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  ).toString('base64')}`
)
function guardedJsonRequest(
  bodyValue,
  headers = {},
) {
  const body = JSON.stringify(bodyValue)
  return new Request('https://pathforge.test/api/request-deliveries/prepare', {
    method: 'POST',
    headers: {
      origin: 'https://pathforge.test',
      'sec-fetch-site': 'same-origin',
      'content-type': 'application/json',
      'content-length': String(new TextEncoder().encode(body).byteLength),
      ...headers,
    },
    body,
  })
}
const guardedPayload = await jsonRouteGuardModule.parseSameOriginRequestJson(
  guardedJsonRequest({ requestId: 'opaque' }),
  { keys: ['requestId'], maxBytes: 128 },
)
assert.deepEqual(
  guardedPayload,
  { requestId: 'opaque' },
  'Same-origin JSON guard must accept only the exact bounded payload.',
)
for (const [label, request, code] of [
  [
    'cross origin',
    guardedJsonRequest(
      { requestId: 'opaque' },
      { origin: 'https://attacker.invalid', 'sec-fetch-site': 'cross-site' },
    ),
    'forbidden',
  ],
  [
    'missing origin',
    guardedJsonRequest({ requestId: 'opaque' }, { origin: '' }),
    'forbidden',
  ],
  [
    'wrong content type',
    guardedJsonRequest(
      { requestId: 'opaque' },
      { 'content-type': 'text/plain' },
    ),
    'unsupported_media_type',
  ],
  [
    'oversize',
    guardedJsonRequest({ requestId: 'x'.repeat(140) }),
    'payload_too_large',
  ],
  [
    'extra field',
    guardedJsonRequest({ requestId: 'opaque', privateCaseId: 'forbidden' }),
    'invalid_fields',
  ],
]) {
  await assert.rejects(
    () => jsonRouteGuardModule.parseSameOriginRequestJson(
      request,
      { keys: ['requestId'], maxBytes: 128 },
    ),
    (error) => error?.code === code,
    `${label} JSON request must fail with ${code}.`,
  )
}
assert.match(
  adminControls,
  /Optional expiry \(UTC\)[\s\S]{0,180}data-request-expiry-time-zone="UTC"/,
  'Pilot admission must label datetime-local input as UTC.',
)
for (const name of ['acceptingRequests', 'assigningRequests']) {
  assert.match(
    adminControls,
    new RegExp(
      `type="hidden" name="${name}" value="no"[\\s\\S]{0,180}type="checkbox"[\\s\\S]{0,120}name="${name}"[\\s\\S]{0,80}value="yes"`,
    ),
    `${name} must use an unambiguous hidden no plus checkbox yes envelope.`,
  )
}
assert.match(
  adminActions,
  /function controlFlag[\s\S]*values\.length === 1 && values\[0\] === 'no'[\s\S]*values\.length === 2 && values\[0\] === 'no' && values\[1\] === 'yes'[\s\S]*throw new Error/,
  'Service control booleans must accept only exact no or no+yes envelopes.',
)
assert.ok(
  adminActions.indexOf("controlFlag(formData, 'acceptingRequests')") <
    adminActions.indexOf('getRequestApplicationService()'),
  'Service control envelopes must be parsed before resolving the application service.',
)
assert.match(
  adminActions,
  /expiresAt: parsePilotExpiryUtc\(rawExpiry\)/,
  'Pilot admission must use the deterministic validated UTC parser.',
)
assert.match(
  adminActions,
  /admissionAction !== 'invite' && admissionAction !== 'revoke'[\s\S]*actionError=unavailable[\s\S]*getRequestApplicationService\(\)/,
  'Pilot admission must reject an unknown discriminant before resolving its service.',
)
assert.doesNotMatch(
  adminActions,
  /if \(text\(formData, 'admissionAction'\) === 'invite'\)[\s\S]*\} else \{/,
  'Pilot admission must not make revoke the default branch.',
)
assert.doesNotMatch(
  adminActions,
  /new Date\(rawExpiry\)/,
  'Pilot expiry must not depend on the server local timezone.',
)
assert.match(
  participantCaseAction,
  /kind === 'withdraw'[\s\S]*text\(formData, 'confirmation'\) !== 'confirmed'[\s\S]*redirect\([\s\S]*confirmation_required[\s\S]*command =/,
  'Participant withdrawal must be rejected before command construction without explicit confirmation.',
)
assert.match(
  participantCaseAction,
  /\} else \{\s*redirect\([\s\S]*actionError=unavailable/,
  'Unsupported participant commands must use bounded recovery.',
)
assert.match(
  adminActions,
  /text\(formData, 'confirmed'\) !== 'yes'[\s\S]*actionError=confirmation_required/,
  'Unconfirmed reassignment must use bounded confirmation recovery.',
)
assert.match(
  participantCasePage,
  /<select[\s\S]{0,160}name="confirmation"[\s\S]{0,160}required[\s\S]{0,360}<option value="confirmed">/,
  'Participant withdrawal must serialize a required explicit confirmation.',
)
assert.match(
  participantCasePage,
  /I understand this permanently closes the private request\./,
  'Participant withdrawal must explain the terminal effect before submission.',
)
const adminQueuePage = readFileSync('src/app/admin/build-requests/page.tsx', 'utf8')
const myForgePage = readFileSync('src/app/my-forge/page.tsx', 'utf8')
const adminQueue = readFileSync(
  'src/components/requests/admin/AdminRequestQueue.tsx',
  'utf8',
)
const assignedWorkUnavailable = readFileSync(
  'src/components/requests/my-forge/AssignedRequestWorkUnavailable.tsx',
  'utf8',
)
assert.match(
  myForgePage,
  /assignedQueueUnavailable\s*=\s*[\s\S]{0,120}builder\.status === 'rejected' \|\| reviewer\.status === 'rejected'/,
  'My Forge must distinguish a rejected assigned-work read from a fulfilled empty scope.',
)
assert.match(
  myForgePage,
  /assignedQueueUnavailable \? <AssignedRequestWorkUnavailable \/> : null/,
  'My Forge must render one bounded assigned-work unavailable panel.',
)
assert.match(
  assignedWorkUnavailable,
  /Assigned Request work could not be verified[\s\S]*empty assigned queue is not being\s+claimed/,
  'The assigned-work error must avoid a false empty or role conclusion.',
)
assert.match(
  adminQueue,
  /const headingId = `request-\$\{model\.scope\}-queue-heading`/,
  'Each assigned queue must use a scope-specific heading ID.',
)
assert.match(
  browserGuard,
  /my-forge-assigned-builder-rejected[\s\S]*my-forge-assigned-reviewer-rejected[\s\S]*my-forge-assigned-dual-ready/,
  'Browser fixtures must distinguish rejected and empty queues and cover dual assignments.',
)
assert.match(
  browserGuard,
  /duplicateIds[\s\S]*invalidAriaLabelledBy/,
  'The browser guard must prove unique queue IDs and valid aria-labelledby references.',
)
for (const privateRoutePath of [
  'src/app/requests/new/page.tsx',
  'src/app/requests/[id]/page.tsx',
  'src/app/admin/build-requests/page.tsx',
  'src/app/admin/build-requests/[id]/page.tsx',
]) {
  assert.match(
    readFileSync(privateRoutePath, 'utf8'),
    /robots:\s*\{\s*index: false,\s*follow: false\s*\}/,
    `${privateRoutePath} must be noindex and nofollow.`,
  )
}
assert.doesNotMatch(
  readFileSync('src/app/requests/page.tsx', 'utf8'),
  /index: false/,
  'The truthful public Request service desk should remain indexable.',
)
for (const errorPath of [
  'src/app/admin/build-requests/error.tsx',
  'src/app/admin/build-requests/[id]/error.tsx',
]) {
  assert.match(
    readFileSync(errorPath, 'utf8'),
    /<RequestRouteError/,
    `${errorPath} must reuse the focused Request error boundary.`,
  )
}
for (const actionName of [
  'updateRequestControlsAction',
  'updatePilotAdmissionAction',
]) {
  const start = adminActions.indexOf(`function ${actionName}`)
  const next = adminActions.indexOf('export async function', start + 20)
  const source = adminActions.slice(start, next === -1 ? undefined : next)
  assert.match(
    source,
    /catch \(error\)[\s\S]*requestAuthorityErrorCode\(error\)[\s\S]*actionError=/,
    `${actionName} must redirect failures to bounded operator recovery.`,
  )
  assert.doesNotMatch(
    source,
    /error\.message/,
    `${actionName} must not expose raw error text.`,
  )
}
assert.match(
  adminQueuePage,
  /query\.actionError[\s\S]*data-request-case-error-summary[\s\S]*No success is claimed\./,
  'Admin queue must focus a bounded failure and re-read authority state.',
)
const whatToBuild = readFileSync('src/app/what-to-build/page.tsx', 'utf8')
const homeSupport = readFileSync('src/components/home/HomeSupportRoutes.tsx', 'utf8')
for (const [source, label] of [
  [whatToBuild, 'what-to-build'],
  [homeSupport, 'home support'],
]) {
  assert.doesNotMatch(
    source,
    /(?:community board|community for a build|let builders respond|Open Build Requests)/i,
    `${label} must not describe the retired public request board.`,
  )
  assert.match(
    source,
    /private[\s\S]{0,180}(?:capacity-controlled|managed service)/i,
    `${label} must describe the private managed-service boundary.`,
  )
}
const readAcknowledger = readFileSync(
  'src/components/requests/RequestReadAcknowledger.tsx',
  'utf8',
)
const clarificationAction = readFileSync(
  'src/components/requests/RequestClarificationAction.tsx',
  'utf8',
)
assert.match(
  clarificationAction,
  /state\.status === 'submitted'[\s\S]*eventName: 'clarification_submitted'[\s\S]*replayed: state\.replayed/,
  'Clarification analytics must emit only after a verified receipt state.',
)
assert.ok(
  clarificationAction.indexOf("if (state.status === 'submitted')") <
    clarificationAction.indexOf("state.status === 'error' ?"),
  'Clarification success analytics must remain inside the submitted receipt branch.',
)

assert.match(
  readAcknowledger,
  /action\(\{ requestId, expectedEventSequence, idempotencyKey \}\)\.catch\(\(\) => \{/,
  'Rejected read acknowledgment must be absorbed without claiming local read state.',
)
assert.doesNotMatch(
  readAcknowledger,
  /set(?:Unread|Read)|useState/,
  'Read acknowledgment must not create false browser-local read authority.',
)

function functionSource(name, nextName) {
  const start = adminOperations.indexOf(`function ${name}(`)
  const end = adminOperations.indexOf(`function ${nextName}(`, start + 1)
  assert.notEqual(start, -1, `Missing ${name}.`)
  assert.notEqual(end, -1, `Missing boundary after ${name}.`)
  return adminOperations.slice(start, end)
}

for (const [name, nextName, expectedCommand, requiredFields] of [
  ['ClarificationForm', 'AcceptAssignmentForm', 'request_clarification', ['question']],
  ['AcceptAssignmentForm', 'StartBuildForm', 'accept', ['builderUserId', 'targetDate']],
  ['ReviewerAssignmentForm', 'ModerationReasonForm', 'assign_reviewer', ['reviewerUserId']],
]) {
  const source = functionSource(name, nextName)
  const commands = [...source.matchAll(/name="command" value="([^"]+)"/g)]
    .map((match) => match[1])
  const submitted = new FormData()
  for (const command of commands) submitted.append('command', command)
  assert.deepEqual(
    submitted.getAll('command'),
    [expectedCommand],
    `${name} must submit exactly one ${expectedCommand} discriminant.`,
  )
  for (const field of requiredFields) {
    assert.match(
      source,
      new RegExp(`name="${field}"`),
      `${name} must submit ${field}.`,
    )
  }
}
for (const [name, nextName, expectedCommandCount] of [
  ['ResolutionForms', 'SimpleCommandForm', 2],
  ['CloseForm', 'AdminRequestDetailOperations', 1],
]) {
  const source = functionSource(name, nextName)
  const commands = [...source.matchAll(/name="command" value="([^"]+)"/g)]
    .map((match) => match[1])
  assert.equal(
    commands.length,
    expectedCommandCount,
    `${name} must submit one command discriminant per rendered form.`,
  )
  assert.ok(
    commands.every((command) => command === 'close'),
    `${name} must submit only the exact close discriminant.`,
  )
}
assert.match(
  adminActions,
  /commandName === 'close' && resolution === 'existing_resolution'[\s\S]*commandName === 'close' && resolution === 'duplicate'/,
  'Resolution parsing must require the exact close command discriminant.',
)
assert.match(
  adminActions,
  /kind !== 'project' && kind !== 'response'[\s\S]*actionError=unavailable/,
  'Existing-resolution parsing must reject an unknown reference discriminant.',
)
assert.match(
  adminActions,
  /\} else \{\s*redirect\([\s\S]*actionError=unavailable/,
  'Unknown admin command discriminants must fail into bounded recovery.',
)

for (const expectedCommand of [
  'begin_triage',
  'start_build',
  'reassign_triager',
  'reassign_builder',
  'reassign_reviewer',
  'close_no_response',
]) {
  assert.match(
    adminOperations,
    new RegExp(`(?:command="${expectedCommand}"|value="${expectedCommand}")`),
    `Admin forms must expose the exact ${expectedCommand} discriminant.`,
  )
}
assert.match(
  adminOperations,
  /capabilities\.canCloseNoResponse && actions\.closeNoResponse[\s\S]*No client timing evidence or note is accepted\.[\s\S]*command="close_no_response"/,
  'No-response closure must be a dedicated authority-projected empty-payload command.',
)
assert.doesNotMatch(
  functionSource('SimpleCommandForm', 'ReassignmentForm'),
  /name="(?:note|closeReason|timing|elapsed)"/,
  'Simple no-response closure must not accept client timing, note, or generic reason fields.',
)

assert.match(
  serverAdapter,
  /^import 'server-only'/,
  'Request application-service adapter must be server-only.',
)
assert.match(
  serverAdapter,
  /isAuthSessionMissingError\(error\)[\s\S]{0,120}status: 'signed_out'[\s\S]{0,120}status: 'unavailable'/,
  'Session-not-found must remain distinct from identity transport failure.',
)
assert.match(
  intakeAction,
  /const viewer = await getRequestViewerState\(\)[\s\S]{0,260}viewer\.status === 'signed_out'[\s\S]{0,220}serviceError: 'auth_required'/,
  'Mutation path must recheck an expired session and return auth_required.',
)
assert.match(
  intakeAction,
  /error instanceof RequestContractError[\s\S]{0,160}\? error\.message/,
  'Only canonical contract errors may surface their message.',
)
assert.match(
  intakeAction,
  /error instanceof RequestContractError[\s\S]{0,220}: 'unavailable'/,
  'Unknown provider, SQL, endpoint, or runtime errors must collapse to unavailable.',
)
assert.doesNotMatch(
  intakeAction,
  /message: error instanceof Error[\s\S]{0,80}error\.message/,
  'Unknown runtime errors must never be returned as raw form copy.',
)
assert.match(
  intakePage,
  /availability\.intakeEligibility === 'already_active'[\s\S]{0,80}\? 'already_active'/,
  'Already-active intake must remain distinct from duplicate mutation errors.',
)
assert.match(
  intakePage,
  /availability\.unavailableReason === 'capacity_full'[\s\S]{0,80}\? 'capacity_full'/,
  'Direct intake must block the form on authoritative full capacity.',
)
assert.match(
  intake,
  /already_active: 'This account already has an active private request\./,
  'Already-active intake must explain the distinct state.',
)
assert.match(
  intake,
  /serviceError === 'already_active'[\s\S]{0,180}Open My Forge requests/,
  'Already-active intake must link to My Forge.',
)
assert.match(
  presentation,
  /function participantActorRole[\s\S]*function operatorActorRole[\s\S]*operatorAuthority === 'admin'[\s\S]*actorRole: operatorActorRole\(detail\.actor\)/,
  'Participant and operator role precedence must be context-aware for dual-role accounts.',
)
assert.match(
  presentation,
  /question: latestClarification\.question,[\s\S]{0,100}answer: latestClarification\.answer/,
  'Answered clarification must preserve both the durable question and answer.',
)
assert.match(
  presentation,
  /assignment\.role === 'builder' && assignment\.active[\s\S]{0,120}detail\.targetDate/,
  'Full case presentation must project the canonical active-builder target date.',
)
assert.match(
  presentation,
  /targetDate: detail\.targetDate/,
  'Admin detail must project the canonical service target date.',
)
assert.doesNotMatch(
  presentation,
  /Open approved model variant/,
  'A DB modelVariantId must not be presented as a routable public variant locator.',
)
assert.match(
  presentation,
  /select the referenced variant shown below/,
  'Response resolution must distinguish project-family navigation from the exact non-default variant identity.',
)

assert.match(
  route,
  /process\.env\.NODE_ENV === 'production'[\s\S]*process\.env\.VERCEL_ENV === 'production'[\s\S]*\) notFound\(\)/,
  'Request fixture route must fail closed in every production runtime.',
)

assert.doesNotMatch(
  models,
  /actorRole !== 'system'/,
  'Fixtures must not grant a generic action to every non-system actor.',
)

assert.match(
  adminOperations,
  /name="referenceResponseStepNumber"[\s\S]{0,180}min=\{1\}[\s\S]{0,80}max=\{100\}/,
  'Admin existing-resolution response step must match authority limits.',
)
assert.match(
  adminOperations,
  /approved published model-variant response evidence/,
  'Admin existing-resolution copy must describe exact published evidence.',
)
assert.match(
  adminOperations,
  /Participant-facing resolution note[\s\S]{0,100}name="note"/,
  'Existing-resolution form must collect the required participant-facing note.',
)
assert.doesNotMatch(
  adminOperations,
  /<input[^>]+name="(?:builderUserId|reviewerUserId)"/,
  'Admin assignment must use the eligible-assignee projection, not raw ID entry.',
)
assert.doesNotMatch(
  adminOperations,
  /<select[^>]+name="moderation"/,
  'Moderation must use exact commands, not a generic state setter.',
)
for (const command of [
  'place_moderation_hold',
  'remove_for_moderation',
]) {
  assert.match(
    adminOperations,
    new RegExp(`command="${command}"`),
    `Admin moderation must render exact ${command} command shape.`,
  )
}
assert.match(
  adminOperations,
  /name="command" value="release_moderation_hold"/,
  'Admin moderation must render exact release_moderation_hold command shape.',
)
assert.match(
  adminOperations,
  /model\.allowedCloseReasons\.length > 0/,
  'Admin close reasons must come from the authority projection.',
)
assert.match(
  caseShell,
  /model\.capabilities\.some\(\(capability\) => capability\.id === primaryAction\.capabilityId\)/,
  'Case shell must reject a primary action absent from canonical capabilities.',
)
assert.match(
  browserGuard,
  /case-action-mismatched[\s\S]*expectedPrimaryCount: 0/,
  'Browser guard must cover a mismatched primary action.',
)
assert.match(
  browserGuard,
  /case-held-authorized-action[\s\S]*expectedPrimaryCount: 1[\s\S]*case-held-mismatched-action[\s\S]*expectedPrimaryCount: 0/,
  'Browser guard must distinguish authorized and mismatched held-state actions.',
)

for (const [field, minimum, maximum] of [
  ['request-title', 4, 120],
  ['request-outcome', 20, 4000],
  ['request-intended-user', 2, 1000],
  ['request-must-work-scenario', 10, 1000],
]) {
  assert.match(
    intake,
    new RegExp(`id="${field}"[\\s\\S]{0,320}minLength=\\{${minimum}\\}[\\s\\S]{0,120}maxLength=\\{${maximum}\\}`),
    `${field} browser guidance must match authority limits.`,
  )
}
assert.match(
  intake,
  /name="acceptanceChecks"[\s\S]{0,180}minLength=\{4\}[\s\S]{0,100}maxLength=\{500\}/,
  'Acceptance-check browser guidance must match authority limits.',
)
assert.match(
  intake,
  /name="constraints"[\s\S]{0,120}maxLength=\{2000\}/,
  'Constraint browser guidance must match authority limits.',
)
assert.match(
  intake,
  /name="referenceResponseStepNumber"[\s\S]{0,220}min=\{1\}[\s\S]{0,80}max=\{100\}/,
  'Response-step browser guidance must match authority limits.',
)
assert.match(
  intake,
  /published model-variant response evidence/,
  'Response-reference guidance must describe exact published evidence.',
)
assert.doesNotMatch(
  intake,
  /authoritative prompt count/,
  'Response-reference guidance must not claim generic prompt-count validation.',
)
for (const exactCapability of [
  'submit_clarification',
  'withdraw',
  'begin_triage',
  'request_clarification',
  'start_build',
  'release_moderation_hold',
]) {
  assert.match(
    models,
    new RegExp(`['"]${exactCapability}['"]`),
    `Fixture capability matrix must include ${exactCapability}.`,
  )
}
assert.match(
  models,
  /PM 3 owns builder delivery, exact review, delivery open, and outcome actions/,
  'Fixture capability matrix must leave custody and exact review actions to PM 3.',
)

for (const productionComponent of [
  'RequestServiceOverview',
  'RequestSubmissionReceipt',
  'RequestIntakeForm',
  'RequestCaseShell',
  'MyForgeRequestsList',
  'AdminRequestQueue',
  'AdminRequestDetailOperations',
]) {
  assert.match(
    route,
    new RegExp(`\\b${productionComponent}\\b`),
    `Request fixture must mount the real ${productionComponent} component.`,
  )
}

for (const collection of [
  'REQUEST_LIFECYCLES',
  'REQUEST_ACTOR_ROLES',
  'REQUEST_MODERATION_STATES',
  'REQUEST_CLOSE_REASONS',
  'REQUEST_SERVICE_STATES',
  'REQUEST_INTAKE_STATES',
  'REQUEST_RECEIPT_STATES',
  'REQUEST_CASE_ERROR_STATES',
  'REQUEST_DELIVERY_STATES',
  'REQUEST_MY_FORGE_STATES',
  'REQUEST_ADMIN_QUEUE_STATES',
  'REQUEST_ADMIN_SCOPES',
  'REQUEST_ADMIN_DETAIL_STATES',
]) {
  assert.match(models, new RegExp(`export const ${collection}\\s*=`))
  assert.match(route, new RegExp(`\\b${collection}\\b`))
}

for (const lifecycle of [
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
]) {
  assert.match(models, new RegExp(`'${lifecycle}'`), `Missing lifecycle fixture ${lifecycle}.`)
}

for (const actor of ['requester', 'triager', 'builder', 'reviewer', 'system']) {
  assert.match(models, new RegExp(`'${actor}'`), `Missing actor fixture ${actor}.`)
}

for (const moderation of ['clear', 'held', 'removed']) {
  assert.match(models, new RegExp(`'${moderation}'`), `Missing moderation fixture ${moderation}.`)
}

for (const closeReason of [
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
]) {
  assert.match(models, new RegExp(`'${closeReason}'`), `Missing close-reason fixture ${closeReason}.`)
}

for (const state of [
  'loading',
  'unavailable',
  'closed',
  'capacity_full',
  'available',
  'private',
  'sign_in_required',
  'not_admitted',
  'already_active',
  'rate_limited',
  'stale_version',
  'forbidden_input',
  'idempotent_replay',
  'missing_delivery',
  'hash_mismatch',
  'publication_blocked',
  'controls_off',
  'assignment_off',
]) {
  assert.match(models, new RegExp(`'${state}'`), `Missing Request state fixture ${state}.`)
}

assert.match(
  models,
  /kind: 'response',[\s\S]*projectId:[\s\S]*modelVariantId:[\s\S]*responseStepNumber:/,
  'Response-reference fixture must use the exact project/model-variant/step tuple.',
)
assert.doesNotMatch(
  models,
  /pathforgeReference:\s*\{[\s\S]{0,180}\burl:/,
  'PathForge fixture references must not use URLs.',
)

assert.match(route, /data-request-delivery-placeholder/)
assert.match(route, /Placeholder · not custody or hash evidence/)
assert.match(route, /does not prove live[\s\S]*artifact custody[\s\S]*hash verification/)
assert.doesNotMatch(
  route,
  /\b(uploaded artifact|verified artifact bytes|custody verified)\b/i,
  'Fixture must not claim PM 3 custody or artifact proof.',
)

assert.match(route, /async function fixtureAction\(_formData: FormData\)[\s\S]*'use server'/)
assert.doesNotMatch(
  route,
  /\b(from|insert|update|delete)\s*\(\s*['"`](?:build_|request_)/i,
  'Fixture route must not access Request tables.',
)

console.log(
  'Request a Build deterministic fixture contract passed: all actors, lifecycle/moderation/closure, availability/error states, exact typed references, real-component seams, production hiding, and PM 3 non-evidence boundary are present.',
)
