#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

const migration = read(
  'supabase/migrations/20260730171646_request_build_public_architecture_v1.sql',
)
const foundationMigration = read(
  'supabase/migrations/20260730040819_request_build_private_authority_v1.sql',
)
const repairMigration = read(
  'supabase/migrations/20260731032731_request_build_command_provenance_repair_v1.sql',
)
const contracts = read('src/lib/request-public-architecture.ts')
const service = read('src/lib/request-public-service.ts')
const server = read('src/lib/build-requests/server.ts')
const intakeAction = read('src/app/requests/new/actions.ts')
const participantAction = read('src/app/requests/[id]/actions.ts')
const participantTools = read(
  'src/components/requests/case/RequestParticipantTrustTools.tsx',
)
const participantPage = read('src/app/requests/[id]/page.tsx')
const publicationContinuation = read(
  'src/components/requests/case/RequestPublicationContinuation.tsx',
)
const publicationWithdrawalReceiptPage = read(
  'src/app/requests/[id]/publication-withdrawn/page.tsx',
)
const adminAction = read('src/app/admin/build-requests/actions.ts')
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
    'transactional migration apply contract',
    /APPLY CONTRACT:[\s\S]*Supabase CLI transactional[\s\S]*psql\/SQL-editor autocommit execution is unsupported/,
  ],
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
    'scoped publication audit preservation',
    /request_publication_preservation_active_v1[\s\S]*proposal_status IN \([\s\n]+'fully_consented', 'in_airlock', 'published'/,
  ],
  [
    'long-lived narrow participant withdrawal',
    /request_publication_actor_can_continue_v1[\s\S]*proposal\.requester_id, proposal\.builder_id/,
  ],
  [
    'held participant withdrawal exception',
    /v_request\.moderation_state = 'held'[\s\n]+AND p_command = 'withdraw'[\s\S]*v_actor_id IN \(v_proposal\.requester_id, v_proposal\.builder_id\)/,
  ],
  [
    'actor-verified withdrawal receipt',
    /get_build_request_publication_withdrawal_receipt_v1[\s\S]*receipt\.actor_id = v_actor_id[\s\S]*receipt\.command_kind = 'publication_withdraw'/,
  ],
  [
    'review-rejected consent block',
    /blocked_review\.verdict = 'changes_required'/,
  ],
  [
    'notification claim identity exclusion',
    /jsonb_build_object\([\s\n]+'deliveryId', claimed\.id,[\s\n]+'claimToken', claimed\.claim_token,[\s\n]+'templateKey'/,
  ],
  [
    'immediate notification send reauthorization',
    /resolve_build_request_notification_send_v1[\s\S]*delivery_state <> 'claimed'[\s\S]*request_notification_event_recipient_v1[\s\S]*transactional_email_enabled[\s\S]*auth_user\.email_confirmed_at/,
  ],
  [
    'independent publication airlock review authority',
    /CREATE TABLE public\.build_request_publication_reviews[\s\S]*review_build_request_publication_v1/,
  ],
  [
    'publish binds exact approved airlock review',
    /publish_build_request_outcome_v1[\s\S]*build_request_publication_reviews AS publication_review[\s\S]*publication_review\.verdict = 'approved'/,
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
    'event notification deidentification-safe idempotency',
    /CREATE UNIQUE INDEX build_request_notification_event_recipient_unique[\s\S]*WHERE event_id IS NOT NULL AND recipient_id IS NOT NULL/,
  ],
  [
    'report notification deidentification-safe idempotency',
    /CREATE UNIQUE INDEX build_request_notification_report_recipient_unique[\s\S]*WHERE report_id IS NOT NULL AND recipient_id IS NOT NULL/,
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
  [
    'strict policy acknowledgement JSON authority',
    /jsonb_typeof\(p_attestation->'terms_accepted'\)[\s\n]+IS DISTINCT FROM 'boolean'[\s\S]*p_attestation->'terms_accepted' IS DISTINCT FROM 'true'::JSONB/,
  ],
  [
    'null-safe policy version equality',
    /p_attestation->>'terms_version'[\s\n]+IS DISTINCT FROM v_controls\.terms_version/,
  ],
]) {
  assert.match(migration, pattern, `Missing ${label}.`)
}

assert.equal(
  createHash('sha256').update(foundationMigration).digest('hex'),
  '76738ecd6f21641b2c90f7d29469ecec91ad1f130c89635eab846fc2e7479d03',
  'The already-applied private authority migration must remain byte-identical.',
)
assert.equal(
  createHash('sha256').update(repairMigration).digest('hex'),
  'f8dcf692c30f8861ba0844a400a380c46a6fec7e69034b2b27a3fe70d94c47bb',
  'The reviewed forward-only Request production repair must remain byte-identical.',
)
assert.doesNotMatch(
  foundationMigration,
  /request_command_provenance_v1|request_publication_preservation_v1|request_pilot_admission_replay_v1/,
  'Forward repairs must not be hidden in the already-applied private migration.',
)
assert.match(
  repairMigration,
  /request_command_provenance_v1: stage accepted brief validation[\s\S]*jsonb_typeof\(p_payload->'acceptedBriefRevisionId'\)[\s\n]+IS DISTINCT FROM 'string'[\s\S]*request_command_provenance_v1: stage accepted brief binding[\s\S]*acceptedBriefRevisionId'\)::UUID[\s\n]+IS DISTINCT FROM v_request\.current_brief_revision_id/,
  'Artifact staging must reject JSON-null/malformed brief provenance and compare the exact accepted revision null-safely.',
)
assert.match(
  repairMigration,
  /request_command_provenance_v1: requester outcome revision validation[\s\S]*jsonb_typeof\(p_payload->'deliveryRevisionId'\)[\s\n]+IS DISTINCT FROM 'string'[\s\S]*request_command_provenance_v1: requester outcome revision binding[\s\S]*deliveryRevisionId'\)::UUID[\s\n]+IS DISTINCT FROM v_request\.current_delivery_revision_id/,
  'Requester outcomes must reject JSON-null/malformed delivery provenance and compare the exact revision null-safely.',
)
assert.match(
  repairMigration,
  /request_command_provenance_v1: acknowledgement revision validation[\s\S]*jsonb_typeof\(p_payload->'deliveryRevisionId'\)[\s\n]+IS DISTINCT FROM 'string'[\s\S]*request_command_provenance_v1: acknowledgement revision binding[\s\S]*deliveryRevisionId'\)::UUID[\s\n]+IS DISTINCT FROM v_request\.current_delivery_revision_id/,
  'Delivery acknowledgement must reject JSON-null/malformed provenance and compare the exact revision null-safely.',
)
assert.match(
  repairMigration,
  /'category', 'audit_tombstone_expiry'[\s\S]*request_publication_preservation_v1: maintenance enumeration fence[\s\S]*NOT private\.request_publication_preservation_active_v1/,
  'Scoped publication preservation must fence only audit-root expiry.',
)
assert.match(
  repairMigration,
  /request_publication_preservation_v1: audit expiry fence[\s\S]*OR private\.request_publication_preservation_active_v1\(p_request_id\)/,
  'Scoped publication preservation must also fence direct audit expiry.',
)
assert.match(
  repairMigration,
  /request_pilot_admission_replay_v1: replay precedes mutable subject validation[\s\S]*IF FOUND THEN[\s\S]*IF \(p_admitted AND p_expires_at/,
  'Pilot admission replay must precede fresh-operation expiry and subject validation.',
)
const rawCleanupStart = repairMigration.indexOf(
  "'category', 'raw_text_purge'",
)
const auditCleanupStart = repairMigration.indexOf(
  "'category', 'audit_tombstone_expiry'",
)
assert.doesNotMatch(
  repairMigration.slice(rawCleanupStart, auditCleanupStart),
  /request_publication_preservation_active_v1/,
  'Publication preservation must not retain raw text or artifact bytes.',
)
assert.doesNotMatch(
  repairMigration,
  /\bCREATE\s+(?:TABLE|TYPE)\b|\bALTER\s+TABLE\b|\bDROP\b/i,
  'The production repair must remain a bounded forward-only RPC replacement.',
)
const claimFunctionStart = migration.indexOf(
  'CREATE OR REPLACE FUNCTION public.claim_build_request_notifications_v1',
)
const sendResolverStart = migration.indexOf(
  'public.resolve_build_request_notification_send_v1',
  claimFunctionStart,
)
assert.doesNotMatch(
  migration.slice(claimFunctionStart, sendResolverStart),
  /'recipient'/,
  'Notification claims must not contain a recipient identity.',
)
assert.match(
  notificationWorker,
  /resolveNotificationSend\([\s\S]*transport\.send/,
  'The worker must resolve current send authority immediately before transport.',
)

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
  ['participant page', participantPage],
  ['publication continuation', publicationContinuation],
  ['withdrawal receipt', publicationWithdrawalReceiptPage],
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
const privateCaseRead = participantPage.indexOf('detail = await service.getRequest(id)')
const continuationRead = participantPage.indexOf(
  'getPublicationForContinuation(id, true)',
)
const continuationRender = participantPage.indexOf(
  '<RequestPublicationContinuation',
)
assert.ok(
  privateCaseRead >= 0 &&
    continuationRead > privateCaseRead &&
    continuationRender > continuationRead,
  'The participant route must fall back from expired private scope to actor-scoped publication withdrawal.',
)
assert.match(
  participantPage,
  /!publication \|\| publication\.visibility !== 'withdrawal_only'\) notFound\(\)/,
  'The participant route must reject every non-withdrawal continuation shape.',
)
assert.match(
  participantPage,
  /detail\?\.visibility === 'held'[\s\S]*getPublicationForContinuation\(id, false\)[\s\S]*publication\?\.visibility === 'withdrawal_only'[\s\S]*publication\.status === 'held'[\s\S]*continuation = publication[\s\S]*<RequestPublicationContinuation/,
  'A held participant must retain the sole safe publication-withdrawal exception without mounting private sections.',
)
assert.match(
  participantPage,
  /async function getPublicationForContinuation[\s\S]*getRequestPublicApplicationService\(\)[\s\S]*publicService\.getPublication\(requestId\)[\s\S]*requestAuthorityErrorCode\(error\) !== 'not_found'[\s\S]*missingIsNotFound\) notFound\(\)/,
  'The continuation helper must remain actor-derived, non-enumerating, and truthful on unavailable reads.',
)
assert.match(
  participantAction,
  /const receipt = await service\.executePublication\(input\)[\s\S]*command === 'withdraw'[\s\S]*publication-withdrawn\?receipt=/,
  'A successful publication withdrawal must redirect with its durable command receipt.',
)
assert.match(
  publicationWithdrawalReceiptPage,
  /getPublicationWithdrawalReceipt\(\{[\s\n]+requestId: id,[\s\n]+commandId,[\s\n]+\}\)[\s\S]*Public consent withdrawn/,
  'The post-withdrawal page must verify the actor-owned durable receipt before claiming success.',
)
assert.match(
  publicationContinuation,
  /data-request-publication-continuation[\s\S]*name="command" value="withdraw"[\s\S]*name="publicationWithdrawal"[\s\S]*Withdraw public consent/,
  'The scoped continuation must expose only an explicitly confirmed withdrawal.',
)
assert.doesNotMatch(
  publicationContinuation,
  /reportAction|notificationAction|requester_consent|builder_consent|publish_outcome/,
  'The scoped continuation must not regain private trust or publication-expansion actions.',
)
assert.match(
  participantTools,
  /data-request-publication-review-result[\s\S]*proposal\.airlockReviewNote/,
  'Participants must see the safe independent-review verdict and repair note.',
)
assert.match(
  adminOperations,
  /flag\('privateContentExcluded', false\)[\s\S]*flag\('publicTruthReady', false\)/,
  'Independent publication checks must start unchecked.',
)
assert.match(
  adminAction,
  /reviewNotes\.length < 20[\s\S]*reviewNotes\.length > 1_000[\s\S]*requestPublicPatterns\.key\.test\(idempotencyKey\)[\s\S]*getRequestPublicApplicationService\(\)/,
  'Publication review notes and idempotency identity must fail before service resolution.',
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
