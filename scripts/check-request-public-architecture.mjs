#!/usr/bin/env node

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

const migration = read(
  'supabase/migrations/20260730171646_request_build_public_architecture_v1.sql',
)
const contracts = read('src/lib/request-public-architecture.ts')
const service = read('src/lib/request-public-service.ts')
const server = read('src/lib/build-requests/server.ts')
const intakeAction = read('src/app/requests/new/actions.ts')
const participantAction = read('src/app/requests/[id]/actions.ts')
const participantTools = read(
  'src/components/requests/case/RequestParticipantTrustTools.tsx',
)
const adminOperations = read(
  'src/components/requests/admin/RequestPublicOperations.tsx',
)
const adminPage = read('src/app/admin/build-requests/page.tsx')
const publicListPage = read('src/app/requests/outcomes/page.tsx')
const publicDetailPage = read('src/app/requests/outcomes/[slug]/page.tsx')
const publicOutcomeCatalog = read(
  'src/components/requests/public/RequestPublicOutcomeCatalog.tsx',
)
const publicOutcomeDetail = read(
  'src/components/requests/public/RequestPublicOutcomeDetail.tsx',
)
const publicOutcomeCursor = read(
  'src/lib/build-requests/public-outcome-cursor.ts',
)
const notificationRoute = read(
  'src/app/api/cron/request-build-notifications/route.ts',
)
const maintenanceRoute = read(
  'src/app/api/cron/request-build-public-maintenance/route.ts',
)
const notificationWorker = read(
  'src/lib/build-requests/request-notification-worker.ts',
)
const intakeForm = read(
  'src/components/requests/intake/RequestIntakeForm.tsx',
)
const policyHub = read('src/app/requests/policies/page.tsx')
const policyTerms = read('src/app/requests/policies/terms/page.tsx')
const policyPrivacy = read('src/app/requests/policies/privacy/page.tsx')
const policyAcceptableUse = read(
  'src/app/requests/policies/acceptable-use/page.tsx',
)
const policyRights = read(
  'src/app/requests/policies/requester-rights/page.tsx',
)
const policyPublication = read(
  'src/app/requests/policies/publication/page.tsx',
)
const environmentExample = read('.env.local.example')

for (const [label, pattern] of [
  [
    'transactional notifications default off',
    /transactional_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE/,
  ],
  [
    'publication consent default off',
    /publication_consent_enabled BOOLEAN NOT NULL DEFAULT FALSE/,
  ],
  [
    'publication airlock default off',
    /publication_airlock_enabled BOOLEAN NOT NULL DEFAULT FALSE/,
  ],
  [
    'public outcomes default off',
    /public_outcomes_enabled BOOLEAN NOT NULL DEFAULT FALSE/,
  ],
  [
    'authenticated intake safety ordering',
    /intake_audience <> 'authenticated'[\s\S]*public_intake_risk_screening[\s\S]*operator_roster_required/,
  ],
  [
    'public outcome gate ordering',
    /NOT public_outcomes_enabled[\s\S]*publication_airlock_enabled[\s\S]*publication_consent_enabled/,
  ],
  [
    'active notification participant timing',
    /participant\.active[\s\S]*participant\.joined_at <= event_value\.occurred_at/,
  ],
  [
    'active notification assignment timing',
    /assignment\.active[\s\S]*assignment\.assigned_at <= event_value\.occurred_at/,
  ],
  [
    'notification claim reauthorization',
    /suppression_reason = 'authorization_ended'[\s\S]*NOT private\.request_notification_event_recipient_v1\(/,
  ],
  [
    'terminal notification recipient authority',
    /request_notification_event_recipient_v1[\s\S]*event_value\.occurred_at >= request_case\.terminal_at[\s\S]*final_revision\.authored_by = p_recipient_id[\s\S]*final_review\.reviewer_id = p_recipient_id/,
  ],
  [
    'terminal notification projection reauthorization',
    /new_recipients[\s\S]*private\.request_notification_event_recipient_v1\([\s\S]*recipient\.recipient_id/,
  ],
  [
    'runtime notification readiness',
    /transactional_notifications_enabled[\s\n]+AND private\.request_public_readiness_gate_v1\([\s\n]+'notification_transport'/,
  ],
  [
    'notification shutdown suppression',
    /IF NOT v_enabled THEN[\s\S]*suppression_reason = 'control_off'[\s\S]*RETURN jsonb_build_object\('items', '\[\]'::JSONB\)/,
  ],
  [
    'runtime publication consent readiness',
    /v_consent_ready :=[\s\n]+v_controls\.publication_consent_enabled[\s\n]+AND private\.request_public_readiness_gate_v1\('legal'\)/,
  ],
  [
    'service publication readiness',
    /NOT v_controls\.publication_consent_enabled[\s\n]+OR NOT private\.request_public_readiness_gate_v1\('legal'\)/,
  ],
  [
    'account deidentification publication hold release',
    /Public outcome consent ended when a participant account was deidentified\./,
  ],
  [
    'builder deidentification publication-state alignment',
    /SET publication_state = 'withdrawn'[\s\S]*proposal\.builder_id[\s\S]*NEW\.subject_digest/,
  ],
  [
    'moderation-held public outcome exclusion',
    /request_case\.moderation_state = 'clear'[\s\n]+AND request_case\.publication_state = 'published'/,
  ],
  [
    'immutable publication consent copy',
    /safe_title_snapshot[\s\S]*safe_summary_snapshot/,
  ],
  [
    'legal readiness policy binding',
    /evidence\.policy_snapshot = jsonb_build_object\([\s\S]*publicationTerms/,
  ],
  [
    'readiness version receipt authority',
    /max\(receipt\.evidence_version\)[\s\S]*build_request_readiness_receipts/,
  ],
  [
    'terminal final-builder continuation',
    /final_revision\.authored_by = p_actor_id/,
  ],
  [
    'terminal exact-reviewer continuation',
    /final_review\.manifest_digest =[\s\n]+final_revision\.artifact_manifest_digest/,
  ],
  [
    'notification projection starvation guard',
    /new_recipients[\s\S]*NOT EXISTS[\s\S]*build_request_notification_deliveries/,
  ],
  [
    'publication participant notification reauthorization',
    /event_value\.event_kind LIKE 'publication_%'[\s\S]*proposal\.requester_id, proposal\.builder_id/,
  ],
  [
    'request-scoped participant reports',
    /p_request_id UUID DEFAULT NULL[\s\S]*report\.request_id = p_request_id/,
  ],
  [
    'deidentified operator durable receipt',
    /'accountDeidentified', v_existing\.account_deidentified/,
  ],
  [
    'operator workload concurrency lock',
    /request_enforce_operator_roster_v1[\s\S]*pg_advisory_xact_lock\(hashtextextended\([\s\n]+'request-operator:' \|\| NEW\.account_id::TEXT \|\| ':' \|\| v_role/,
  ],
  [
    'same-case role-separation concurrency lock',
    /request_enforce_operator_roster_v1[\s\S]*'request-assignment-identity:' \|\| NEW\.request_id::TEXT[\s\S]*'request-operator:' \|\| NEW\.account_id::TEXT/,
  ],
  [
    'bounded network-digest retention',
    /risk_grant_id UUID,[\s\S]*risk_screening_verified_at TIMESTAMPTZ[\s\S]*WHERE grant_row\.issued_at[\s\n]+<= clock_timestamp\(\) - INTERVAL '30 days'/,
  ],
]) {
  assert.match(migration, pattern, `Missing ${label}.`)
}

const rosterReadyStart = migration.indexOf(
  'CREATE OR REPLACE FUNCTION private.request_public_roster_ready_v1()',
)
const rosterReadyEnd = migration.indexOf(
  'CREATE OR REPLACE FUNCTION',
  rosterReadyStart + 40,
)
const rosterReadySource = migration.slice(rosterReadyStart, rosterReadyEnd)
assert.match(
  rosterReadySource,
  /request_public_operator_is_rostered_v1\(/,
  'Demand-queue readiness must use in-window staffing authority.',
)
assert.doesNotMatch(
  rosterReadySource,
  /request_public_operator_is_available_v1\(/,
  'Demand-queue readiness must not require a free assignment slot.',
)

assert.doesNotMatch(
  migration,
  /\bDROP\b[\s\S]{0,30}\bCASCADE\b/i,
  'The public-ready architecture must remain forward-only.',
)
const deniedGrantReturn = migration.indexOf(
  "IF v_decision = 'denied' THEN",
)
const clearGrantInsert = migration.indexOf(
  'INSERT INTO public.build_request_intake_risk_grants',
  deniedGrantReturn,
)
assert.ok(
  deniedGrantReturn >= 0 &&
    clearGrantInsert > deniedGrantReturn &&
    migration.slice(deniedGrantReturn, clearGrantInsert).includes('RETURN'),
  'Over-limit risk attempts must return without creating denial rows.',
)
assert.doesNotMatch(
  migration,
  /p_network_source|\bINET\b/,
  'A raw intake network address must never reach the Supabase RPC.',
)
assert.match(
  migration,
  /p_network_digest !~ '\^\[0-9a-f\]\{64\}\$'/,
  'The risk RPC must accept only an application-server HMAC.',
)
assert.match(
  intakeForm,
  /<option value="">No PathForge reference<\/option>/,
  'The no-reference intake option must serialize the exact empty discriminator accepted by the server action.',
)
assert.doesNotMatch(
  intakeForm,
  /<option value="none">No PathForge reference<\/option>/,
  'The intake form must not serialize an unsupported no-reference discriminator.',
)
assert.doesNotMatch(
  migration,
  /\bGRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)\s+ON\s+(?:TABLE\s+)?public\.build_request_(?:operator|intake|readiness|public_control|reports|report_receipts|notification|publication|public_outcomes)/i,
  'New public-ready relations must remain RPC-only.',
)
assert.match(
  migration,
  /REVOKE ALL ON FUNCTION[\s\S]*public\.submit_build_request_v1\(INTEGER, TEXT, JSONB\)[\s\S]*public\.set_build_request_controls_v1\([\s\n]+INTEGER, INTEGER, TEXT, BOOLEAN, BOOLEAN, INTEGER[\s\n]+\)[\s\S]*FROM PUBLIC, anon, authenticated, service_role;/,
  'The legacy intake and partial-control RPCs must be retired after the canonical public-ready interfaces are installed.',
)

for (const [path, source] of [
  ['intake action', intakeAction],
  ['participant action', participantAction],
  ['participant tools', participantTools],
  ['admin page', adminPage],
  ['public outcome list', publicListPage],
  ['public outcome detail', publicDetailPage],
]) {
  assert.doesNotMatch(
    source,
    /\.from\s*\(/,
    `${path} must not query Request tables directly.`,
  )
  assert.doesNotMatch(
    source,
    /createAdminClient|SUPABASE_(?:SECRET|SERVICE_ROLE)/,
    `${path} must not acquire service-role authority.`,
  )
}

assert.match(server, /^import 'server-only'/)
assert.match(
  server,
  /createRequestPublicApplicationService\(await createClient\(\)\)/,
  'Participant reads and writes must use the actor-derived RPC client.',
)
assert.match(
  server,
  /createRequestPublicServerService\(createAdminClient\(\)\)/,
  'Only the server-only factory may bind service-role RPC authority.',
)
assert.doesNotMatch(
  service,
  /\.from\s*\(/,
  'The Request public application service must consume RPCs only.',
)
assert.match(
  intakeAction,
  /REQUEST_BUILD_RATE_LIMIT_SECRET[\s\S]*createHmac\('sha256', secret\)[\s\S]*networkDigest/,
  'Broad intake must HMAC the trusted network before service-role resolution.',
)
assert.match(
  environmentExample,
  /REQUEST_BUILD_RATE_LIMIT_SECRET=/,
  'The production environment contract must name the Request network HMAC secret.',
)
assert.match(
  notificationWorker,
  /signal: AbortSignal\.timeout\(5_000\)/,
  'The transactional email provider call must have a bounded timeout.',
)

for (const [path, source, version] of [
  ['/requests/policies', policyHub, 'request-terms-v1'],
  ['/requests/policies/terms', policyTerms, 'request-terms-v1'],
  ['/requests/policies/privacy', policyPrivacy, 'request-privacy-v1'],
  [
    '/requests/policies/acceptable-use',
    policyAcceptableUse,
    'request-aup-v1',
  ],
  [
    '/requests/policies/requester-rights',
    policyRights,
    'request-rights-v1',
  ],
  [
    '/requests/policies/publication',
    policyPublication,
    'request-publication-v1',
  ],
]) {
  assert.match(source, new RegExp(version))
  assert.match(
    source,
    /robots:\s*\{\s*index: false, follow: false\s*\}/,
    `${path} must remain outside public indexing until policy release.`,
  )
}
for (const href of [
  '/requests/policies/terms',
  '/requests/policies/privacy',
  '/requests/policies/acceptable-use',
  '/requests/policies/requester-rights',
]) {
  assert.match(
    intakeForm,
    new RegExp(href),
    `Intake must link the exact acknowledgement to ${href}.`,
  )
}

const outcomeType = contracts.match(
  /export type RequestPublicOutcomeV1 = \{([\s\S]*?)\n\}/,
)?.[1] ?? ''
assert.ok(outcomeType, 'The safe public outcome contract must exist.')
for (const forbidden of [
  'requestId',
  'proposalId',
  'accountId',
  'manifestDigest',
  'objectIdentity',
  'brief',
  'email',
]) {
  assert.doesNotMatch(
    outcomeType,
    new RegExp(`\\b${forbidden}\\b`),
    `Safe public outcomes must not expose ${forbidden}.`,
  )
}
assert.match(
  service,
  /requestPublicPatterns\.slug\.test\(slug\)/,
  'Public outcome projections must validate their authority-issued slug.',
)
assert.match(
  migration,
  /\(\s*public_outcome\.published_at,\s*public_outcome\.public_slug\s*\)\s*<\s*\(\s*p_cursor_published_at,\s*p_cursor_slug\s*\)/,
  'Public outcome discovery must use a stable timestamp-and-slug keyset cursor.',
)
assert.match(
  `${publicListPage}\n${publicOutcomeCatalog}`,
  /decodeRequestPublicOutcomeCursor\(query\.cursor\)[\s\S]*listPublicOutcomes\(\{ limit: 24, cursor \}\)[\s\S]*encodeRequestPublicOutcomeCursor\(page\.nextCursor\)/,
  'The public outcome route must validate, consume, and render its authority cursor.',
)
assert.match(
  publicDetailPage,
  /generateMetadata[\s\S]*loadPublicOutcome\(slug\)[\s\S]*canonicalMetadata\(`\/requests\/outcomes\/\$\{outcome\.slug\}`\)/,
  'A public outcome must use its safe projection for exact canonical metadata.',
)
assert.match(
  publicDetailPage,
  /<RequestPublicOutcomeDetail outcome=\{outcome\} \/>/,
  'The metadata and rendered outcome must consume the same safe projection.',
)
assert.doesNotMatch(
  `${publicOutcomeCatalog}\n${publicOutcomeDetail}`,
  /\b(?:requestId|proposalId|manifestDigest|objectIdentity|brief|email)\b/,
  'Public outcome renderers must remain narrow and participant-safe.',
)
assert.match(
  publicOutcomeCursor,
  /Object\.keys\(parsed\)\.sort\(\)\.join\(','\) !== 'publishedAt,slug'[\s\S]*requestPublicPatterns\.slug\.test\(parsed\.slug\)/,
  'Public outcome cursor decoding must be exact and validate the authority slug.',
)

for (const command of ['requester_consent', 'builder_consent']) {
  const commandIndex = participantAction.indexOf(
    `command === '${command}'`,
  )
  const envelopeIndex = participantAction.indexOf(
    "formData.getAll('publicationConsent')",
    commandIndex,
  )
  const serviceIndex = participantAction.indexOf(
    'getRequestPublicApplicationService()',
    commandIndex,
  )
  assert.ok(
    commandIndex >= 0 &&
      envelopeIndex > commandIndex &&
      serviceIndex > envelopeIndex,
    `${command} must validate its exact visible consent envelope before service resolution.`,
  )
}
assert.match(
  participantTools,
  /type="hidden" name="publicationConsent" value="no"[\s\S]*type="checkbox"[\s\S]*name="publicationConsent"[\s\S]*value="yes"[\s\S]*required/,
  'Publication consent must serialize an explicit no plus required yes envelope.',
)
assert.match(
  participantTools,
  /The[\s\n]+private brief and delivery remain private/,
  'Requester consent must preserve the private-case boundary in visible copy.',
)
assert.match(
  participantTools,
  /type="hidden"[\s\n]+name="publicationWithdrawal"[\s\n]+value="no"[\s\S]*type="checkbox"[\s\n]+name="publicationWithdrawal"[\s\n]+value="yes"[\s\n]+required/,
  'Public-outcome withdrawal must require an exact visible confirmation.',
)
assert.match(
  participantAction,
  /command === 'withdraw'[\s\S]*formData\.getAll\('publicationWithdrawal'\)[\s\S]*confirmation_required[\s\S]*getRequestPublicApplicationService\(\)/,
  'Withdrawal confirmation must fail before resolving publication authority.',
)
assert.match(
  adminOperations,
  /type="hidden"[\s\n]+name="controlConfirmation"[\s\n]+value="no"[\s\S]*type="checkbox"[\s\n]+name="controlConfirmation"[\s\n]+value="yes"[\s\n]+required/,
  'Release-control changes must require an exact attended confirmation.',
)
assert.match(
  read('src/app/admin/build-requests/actions.ts'),
  /controlFlag\(formData, 'controlConfirmation'\)[\s\S]*getRequestPublicApplicationService\(\)/,
  'Attended control confirmation must fail before resolving authority.',
)

assert.match(
  adminPage,
  /Public-ready controls unavailable[\s\S]*No empty or enabled[\s\n]+state is inferred/,
  'Admin operations must render a truthful unavailable state.',
)
assert.match(
  publicOutcomeCatalog,
  /Outcome status unavailable[\s\S]*No empty or enabled publication state is inferred/,
  'The public outcome list must distinguish authority failure from empty.',
)
assert.match(
  publicDetailPage,
  /requestPublicPatterns\.slug/,
  'The public outcome detail route must reject malformed slugs before RPC.',
)

for (const route of [notificationRoute, maintenanceRoute]) {
  assert.match(route, /export const runtime = 'nodejs'/)
  assert.match(route, /process\.env\.CRON_SECRET/)
}

console.log(
  'Request public architecture static contract passed: default-off gates, runtime readiness, RPC-only boundaries, notification reauthorization, explicit consent, safe public projection, deidentification cleanup, and truthful unavailable states are intact.',
)
