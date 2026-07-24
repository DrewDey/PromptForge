import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  decodeCommunityArtifactBytes,
  scanCommunityArtifactText,
  scanCommunityEvidenceText,
} from '../src/lib/community-project-scanner-core.mjs'
import { canSubmitCommunityProjectRepair } from '../src/lib/community-project-pilot-policy.mjs'

const root = process.cwd()
const fixtureRoot = path.join(root, 'test-fixtures', 'community-project')

function fixture(name) {
  return new Uint8Array(readFileSync(path.join(fixtureRoot, name)))
}

function findings(name) {
  const html = decodeCommunityArtifactBytes(name, fixture(name), 2_000_000)
  return scanCommunityArtifactText(html)
}

assert.deepEqual(findings('valid.html'), [], 'The safe interactive fixture must pass.')
assert.deepEqual(
  findings('valid-with-hidden-content.html'),
  [],
  'A useful static preview may include helper content that is hidden.',
)
for (const [name, expected] of [
  ['reject-form.html', 'active form submission'],
  ['reject-frame.html', 'embedded frame or plugin'],
  ['reject-dynamic-frame.html', 'embedded frame or plugin'],
  ['reject-network.html', 'network request API'],
  ['reject-webrtc.html', 'WebRTC network API'],
  ['reject-set-html-unsafe.html', 'dynamic HTML API'],
  ['reject-navigation.html', 'popup or external navigation API'],
  ['reject-infinite-loop.html', 'obvious non-terminating loop'],
  ['reject-download.html', 'automatic file generation'],
  ['reject-remote-dependency.html', 'external script dependency'],
  ['reject-remote-media.html', 'external media dependency'],
  ['reject-remote-css.html', 'external CSS dependency'],
  ['reject-secret.html', 'OpenAI-style API key'],
  ['reject-pii.html', 'personal email address'],
  ['reject-redirect.html', 'automatic redirect'],
  ['reject-encoded-redirect.html', 'automatic redirect'],
  ['reject-svg-animation.html', 'active SVG animation'],
  ['reject-script-only.html', 'no useful script-disabled preview'],
  ['reject-hidden-attribute.html', 'no useful script-disabled preview'],
  ['reject-hidden-inline-style.html', 'no useful script-disabled preview'],
  ['reject-hidden-stylesheet.html', 'no useful script-disabled preview'],
  ['reject-aria-hidden.html', 'no useful script-disabled preview'],
  ['reject-relative-link.html', 'navigation-capable hyperlink'],
  ['reject-area-link.html', 'navigation-capable hyperlink'],
  ['reject-srcset.html', 'external media dependency'],
  ['reject-svg-resource.html', 'external media dependency'],
  ['reject-input-image.html', 'external media dependency'],
  ['reject-background-resource.html', 'external media dependency'],
  ['reject-navigation-ping.html', 'navigation ping'],
]) {
  assert.ok(findings(name).includes(expected), `${name} must report ${expected}.`)
}

assert.throws(
  () => decodeCommunityArtifactBytes('artifact.txt', fixture('valid.html'), 2_000_000),
  /\.html or \.htm/,
)
assert.throws(
  () => decodeCommunityArtifactBytes('artifact.html', new Uint8Array(), 2_000_000),
  /between 1 byte and 2 MB/,
)
assert.throws(
  () => decodeCommunityArtifactBytes('artifact.html', new Uint8Array(2_000_001), 2_000_000),
  /between 1 byte and 2 MB/,
)
assert.throws(
  () => decodeCommunityArtifactBytes('artifact.html', new Uint8Array([0xc3, 0x28]), 2_000_000),
  /UTF-8/,
)
assert.throws(
  () => decodeCommunityArtifactBytes('artifact.html', new TextEncoder().encode('<p>fragment</p>'), 2_000_000),
  /complete HTML document/,
)
assert.deepEqual(scanCommunityEvidenceText('safe@example.com and 555-010-1234'), [])
assert.ok(scanCommunityEvidenceText('private.person@private-mail.test').includes('personal email address'))
for (const [status, expected] of [
  ['eligible', true],
  ['temporarily_paused', true],
  ['signed_out', false],
  ['not_admitted', false],
  ['expired', false],
  ['revoked', false],
  ['unavailable', false],
  ['unexpected', false],
]) {
  assert.equal(
    canSubmitCommunityProjectRepair(status),
    expected,
    `repair policy drifted for ${status}`,
  )
}

const migration = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260723054558_community_project_pilot.sql'),
  'utf8',
)
const purgeConfirmationMigration = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260723140556_harden_immediate_artifact_purge_confirmation.sql'),
  'utf8',
)
const compatibilityMigration = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260723152046_restore_legacy_source_run_compatibility_and_source_privacy.sql'),
  'utf8',
)
const releaseReviewMigration = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260723173000_harden_community_project_release_review.sql'),
  'utf8',
)
const alertReadinessMigration = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260723191235_enforce_community_invitation_and_report_alert_readiness.sql'),
  'utf8',
)
const operationalGapsMigration = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260723204000_close_community_report_operational_gaps.sql'),
  'utf8',
)
const admissionStatusMigration = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260724032412_distinguish_community_pilot_admission_status.sql'),
  'utf8',
)
const actions = readFileSync(path.join(root, 'src', 'lib', 'community-project-actions.ts'), 'utf8')
const communityProjectData = readFileSync(path.join(root, 'src', 'lib', 'data', 'community-projects.ts'), 'utf8')
const buildPage = readFileSync(path.join(root, 'src', 'app', 'build', 'page.tsx'), 'utf8')
const ownerProjectPage = readFileSync(
  path.join(root, 'src', 'app', 'my-forge', 'community-projects', '[id]', 'page.tsx'),
  'utf8',
)
const sourceRunData = readFileSync(path.join(root, 'src', 'lib', 'data', 'source-runs.ts'), 'utf8')
const sourceRunReview = readFileSync(path.join(root, 'src', 'lib', 'source-run-review.ts'), 'utf8')
const legacySourceRunIntake = readFileSync(
  path.join(root, 'src', 'app', 'prompt', 'new', 'LegacySourceRunIntakeClient.tsx'),
  'utf8',
)
const legacySourceRunRepair = readFileSync(
  path.join(root, 'src', 'app', 'build', 'LegacySourceRunRepairClient.tsx'),
  'utf8',
)
const adminClient = readFileSync(path.join(root, 'src', 'lib', 'supabase', 'admin.ts'), 'utf8')
const serverClient = readFileSync(
  path.join(root, 'src', 'lib', 'supabase', 'server-client.mjs'),
  'utf8',
)
const serverKeyTransportGuard = readFileSync(
  path.join(root, 'scripts', 'check-supabase-server-key-transport.mjs'),
  'utf8',
)
const alerts = readFileSync(path.join(root, 'src', 'lib', 'community-project-alerts.ts'), 'utf8')
const preparedPage = readFileSync(path.join(root, 'src', 'components', 'PreparedSourceRunPage.tsx'), 'utf8')
const privateReview = readFileSync(path.join(root, 'src', 'components', 'CommunityArtifactSourceReview.tsx'), 'utf8')
const nextConfig = readFileSync(path.join(root, 'next.config.ts'), 'utf8')
const cronRoute = readFileSync(
  path.join(root, 'src', 'app', 'api', 'cron', 'community-project-reconcile', 'route.ts'),
  'utf8',
)
const alertRecoveryRoute = readFileSync(
  path.join(root, 'src', 'app', 'api', 'cron', 'community-project-alerts', 'route.ts'),
  'utf8',
)
const publicArtifactRoute = readFileSync(
  path.join(root, 'src', 'app', 'api', 'community-artifacts', '[promptId]', 'route.ts'),
  'utf8',
)
const privateArtifactRoute = readFileSync(
  path.join(root, 'src', 'app', 'api', 'community-artifacts', 'submissions', '[id]', 'route.ts'),
  'utf8',
)
const publicData = readFileSync(path.join(root, 'src', 'lib', 'data.ts'), 'utf8')
const publicProfiles = readFileSync(path.join(root, 'src', 'lib', 'data', 'public-profiles.ts'), 'utf8')
const discovery = readFileSync(path.join(root, 'src', 'lib', 'path-discovery.ts'), 'utf8')
const profilePresentation = readFileSync(path.join(root, 'src', 'lib', 'profile-presentation.ts'), 'utf8')
const authBrowserGuard = readFileSync(path.join(root, 'scripts', 'check-community-project-auth-browser.mjs'), 'utf8')
const liveAcceptanceGuard = readFileSync(path.join(root, 'scripts', 'check-community-project-live-acceptance.mjs'), 'utf8')
const projectSubmissionFixture = readFileSync(
  path.join(root, 'src', 'app', 'qa', 'community-project-submission', 'page.tsx'),
  'utf8',
)
const releaseControlsFixture = readFileSync(
  path.join(root, 'src', 'app', 'qa', 'community-release-controls', 'page.tsx'),
  'utf8',
)
const artifactViewer = readFileSync(path.join(root, 'src', 'app', 'artifact-viewer', 'page.tsx'), 'utf8')
const communityProjectPage = readFileSync(path.join(root, 'src', 'components', 'CommunityProjectPage.tsx'), 'utf8')
const sourceRunShowcase = readFileSync(path.join(root, 'src', 'components', 'SourceRunShowcase.tsx'), 'utf8')
const protectedArtifactWrapper = readFileSync(path.join(root, 'src', 'lib', 'protected-artifact-wrapper.mjs'), 'utf8')
const projectPreview = readFileSync(path.join(root, 'src', 'components', 'ProjectPreview.tsx'), 'utf8')
const interactiveBuildPathCard = readFileSync(path.join(root, 'src', 'components', 'discovery', 'InteractiveBuildPathCard.tsx'), 'utf8')
const builderWorkCard = readFileSync(path.join(root, 'src', 'components', 'BuilderWorkCard.tsx'), 'utf8')
const homeHero = readFileSync(path.join(root, 'src', 'components', 'home', 'HomeHero.tsx'), 'utf8')
const whatToBuild = readFileSync(path.join(root, 'src', 'app', 'what-to-build', 'page.tsx'), 'utf8')
const adminReviewPage = readFileSync(path.join(root, 'src', 'app', 'admin', 'community-projects', '[id]', 'page.tsx'), 'utf8')
const adminCommunityPage = readFileSync(path.join(root, 'src', 'app', 'admin', 'community-projects', 'page.tsx'), 'utf8')
const invitationControl = readFileSync(
  path.join(root, 'src', 'app', 'admin', 'community-projects', 'InvitationControlForm.tsx'),
  'utf8',
)
const reportForm = readFileSync(
  path.join(root, 'src', 'app', 'report', 'project', '[id]', 'ReportProjectForm.tsx'),
  'utf8',
)
const launchContract = readFileSync(
  path.join(root, 'docs', 'community-project-pilot-launch-contract.md'),
  'utf8',
)
const operationsRunbook = readFileSync(
  path.join(root, 'docs', 'community-project-pilot-operations.md'),
  'utf8',
)
const adminPromptRow = readFileSync(path.join(root, 'src', 'app', 'admin', 'AdminPromptRow.tsx'), 'utf8')
const legacyActions = readFileSync(path.join(root, 'src', 'lib', 'actions.ts'), 'utf8')
const communityReleaseWorkflow = readFileSync(
  path.join(root, '.github', 'workflows', 'community-project-release.yml'),
  'utf8',
)
const envExample = readFileSync(path.join(root, '.env.local.example'), 'utf8')

function assertUnfilteredPullRequestWorkflow(workflow) {
  assert.doesNotMatch(
    workflow,
    /(?:^|\n)\s*(?:['"]?paths(?:-ignore)?['"]?)\s*:|(?:^|\n)\s*pull_request\s*:\s*\{[^}\n]*(?:['"]?paths(?:-ignore)?['"]?)\s*:/m,
    'The required community release workflow must not contain pull-request path filters.',
  )
  assert.match(
    workflow,
    /^  pull_request:\s*$/m,
    'The community release workflow must declare a standalone pull_request event.',
  )
}

for (const required of [
  "'community-project-quarantine'",
  'public.get_public_community_projects(target_prompts UUID[])',
  "member_kind IN ('internal_acceptance', 'invited_builder')",
  'allow_internal_acceptance_submissions BOOLEAN NOT NULL DEFAULT TRUE',
  'allow_publication BOOLEAN NOT NULL DEFAULT FALSE',
  'private.record_community_project_report_readiness',
  'private.set_community_project_publication_control',
  'private.guard_community_prompt_review_mutation',
  'REVOKE INSERT ON TABLE public.prompts FROM authenticated',
  'REVOKE INSERT ON TABLE public.prompt_steps FROM authenticated',
  "submission.status = 'published'",
  "project.status = 'approved'",
  'private.publish_community_project_submission',
  'private.withdraw_community_project_submission',
  'private.set_community_project_report_status',
  'private.community_project_publication_drift',
  'private.community_project_storage_orphans',
  'private.pathforge_resolve_community_fork',
  'private.create_legacy_source_run_repair',
  'private.begin_community_project_reconciliation',
  'private.record_community_project_artifact_integrity',
  'private.purge_community_project_retention',
  "INTERVAL '90 days'",
  "INTERVAL '400 days'",
  'reporter_fingerprint',
  'TO service_role',
]) {
  assert.ok(migration.includes(required), `Migration is missing ${required}.`)
}
assert.doesNotMatch(migration, /CREATE POLICY "Published community artifacts are readable"/)
assert.doesNotMatch(migration, /CREATE OR REPLACE FUNCTION public\.community_project_artifact_is_public/)
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_public_community_project_artifact_path\(UUID\)\s+TO service_role/)
assert.match(
  compatibilityMigration,
  /GRANT INSERT\s*\([\s\S]*title[\s\S]*author_id[\s\S]*status[\s\S]*\)\s+ON TABLE public\.source_run_submissions TO authenticated/,
)
assert.match(
  compatibilityMigration,
  /CREATE POLICY "Users submit untouched queued source runs"[\s\S]*author_id = \(SELECT auth\.uid\(\)\)[\s\S]*status = 'queued'[\s\S]*extracted_prompt_id IS NULL[\s\S]*resubmission_of_id IS NULL/,
)
assert.match(
  compatibilityMigration,
  /pathforge_validate_community_source_url[\s\S]*without a query string or fragment/,
)
assert.match(compatibilityMigration, /source_url ~ '\[\?#\]'/)
for (const required of [
  'DROP POLICY IF EXISTS "Prompt steps are viewable with their prompt"',
  'CREATE POLICY "Approved prompt steps are public"',
  'CREATE POLICY "Pending prompt steps are visible to owners and admins"',
  'ON DELETE RESTRICT',
  "source_visibility TEXT NOT NULL DEFAULT 'review_only'",
  'source_publication_consent_at TIMESTAMPTZ',
  'Changing a public source link requires renewed explicit contributor consent.',
  'private.require_legacy_source_run_publication_consent',
  'Prepared publication requires explicit consent for the public source link.',
  'sibling.resubmission_of_id = source_run_submissions.resubmission_of_id',
  "status IN ('queued', 'needs_repair', 'published')",
  'public.get_public_community_project_artifact_manifest',
  'private.set_community_project_invitation_control',
  'private.require_current_community_artifact_scan_for_publication',
  'Publication requires a verified html-static-v3 artifact scan.',
  'Script-disabled HTML preview included.',
  'private.require_community_project_removal_reason',
  'A moderation removal reason between 10 and 2000 characters is required.',
]) {
  assert.ok(releaseReviewMigration.includes(required), `Release-review migration is missing ${required}.`)
}
assert.match(
  releaseReviewMigration,
  /CREATE TRIGGER require_legacy_source_run_publication_consent_on_update[\s\S]*BEFORE UPDATE OF[\s\S]*source_url,[\s\S]*source_visibility,[\s\S]*source_publication_consent_at/,
)
assert.match(
  releaseReviewMigration,
  /REVOKE ALL ON FUNCTION public\.get_public_community_project_artifact_manifest\(UUID\)\s+FROM PUBLIC, anon, authenticated;[\s\S]*GRANT EXECUTE ON FUNCTION public\.get_public_community_project_artifact_manifest\(UUID\)\s+TO service_role;/,
)
assert.match(
  releaseReviewMigration,
  /CREATE POLICY "Users submit untouched queued source runs"[\s\S]*resubmission_of_id IS NULL[\s\S]*EXISTS \([\s\S]*prior\.author_id = \(SELECT auth\.uid\(\)\)[\s\S]*ROW\([\s\S]*IS NOT DISTINCT FROM ROW\(/,
)
for (const required of [
  "ADD COLUMN alert_status TEXT NOT NULL DEFAULT 'pending'",
  'private.record_community_project_report_alert_delivery',
  'private.record_community_project_invitation_readiness',
  "'invitation_expansion'",
  "last_metrics->>'operator_alert_delivery' = 'verified'",
  'External invitations require a fresh database-verified expansion record and healthy operational gates.',
  "report.alert_status <> 'delivered'",
  "'exploitation'",
  "'credentials'",
  "'imminent_harm'",
]) {
  assert.ok(alertReadinessMigration.includes(required), `Alert-readiness migration is missing ${required}.`)
}
assert.match(
  alertReadinessMigration,
  /REVOKE ALL ON FUNCTION public\.record_community_project_report_alert_delivery\(UUID, BOOLEAN, TEXT, UUID\)[\s\S]*GRANT EXECUTE ON FUNCTION public\.record_community_project_report_alert_delivery\(UUID, BOOLEAN, TEXT, UUID\)\s+TO service_role;/,
)
assert.match(
  alertReadinessMigration,
  /CREATE OR REPLACE FUNCTION private\.pathforge_actor_can_submit_community_project[\s\S]*member\.member_kind = 'invited_builder'[\s\S]*operation\.operation = 'reconciliation'[\s\S]*operation\.operation = 'report_intake'[\s\S]*operator_alert_delivery' = 'verified'/,
)
const hardenedPurge = releaseReviewMigration.slice(
  releaseReviewMigration.indexOf('CREATE OR REPLACE FUNCTION private.confirm_community_project_artifact_purged'),
)
assert.ok(
  hardenedPurge.indexOf('SELECT candidate.* INTO submission')
    < hardenedPurge.indexOf('FROM storage.objects AS object'),
  'Purge confirmation must lock and authorize the submission before checking Storage.',
)
assert.match(hardenedPurge, /FOR UPDATE;/)
assert.ok(
  hardenedPurge.indexOf("submission.artifact_integrity_status = 'purged'")
    < hardenedPurge.indexOf('FROM storage.objects AS object'),
  'Repeated purge confirmation must become a no-op while holding the row lock.',
)
assert.ok(
  purgeConfirmationMigration.indexOf('FROM storage.objects')
    < purgeConfirmationMigration.indexOf('UPDATE public.community_project_submissions'),
  'Immediate purge confirmation must prove that the quarantine object is gone before clearing its database identity.',
)
assert.ok(
  actions.indexOf('scanCommunityProjectArtifact(artifact)') < actions.indexOf('.upload(uploadedPath'),
  'The server must scan bytes before private storage upload.',
)
assert.ok(
  actions.indexOf("select('id', { count: 'exact', head: true })")
    < actions.indexOf('.upload(uploadedPath'),
  'The server must preflight pilot capacity before placing bytes in private Storage.',
)
assert.match(actions, /\.in\('status', \['queued', 'needs_repair', 'published'\]\)/)
assert.match(actions, /50-active-submission cap/)
assert.match(actions, /sourceUrl,[\s\S]*\.\.\.buildSteps/)
assert.match(actions, /artifact_original_name: safeOriginalFilename/)
assert.match(actions, /verifyQuarantinedArtifact/)
assert.match(actions, /REPORT_RATE_LIMIT_SECRET/)
assert.match(actions, /SUPABASE_SECRET_KEY/)
assert.match(adminClient, /resolveSupabaseServerKey\(process\.env\)/)
assert.match(adminClient, /createSupabaseServerClient/)
assert.match(adminClient, /server-only Supabase credentials/)
assert.doesNotMatch(adminClient, /createClient\(/)
assert.match(serverClient, /SUPABASE_SECRET_KEY must contain a current sb_secret_ key/)
assert.match(serverClient, /SUPABASE_SERVICE_ROLE_KEY must contain a legacy JWT with the service_role claim/)
assert.match(serverClient, /payload\?\.role === 'service_role'/)
assert.match(serverClient, /authorization === `Bearer \$\{secretKey\}`/)
assert.match(serverClient, /headers\.delete\('authorization'\)/)
assert.match(serverClient, /detectSessionInUrl: false/)
assert.match(serverKeyTransportGuard, /\/rest\/v1\/rpc\/transport_probe_rpc/)
assert.match(serverKeyTransportGuard, /\/auth\/v1\/admin\/users/)
assert.match(serverKeyTransportGuard, /\/storage\/v1\/object\/list\/transport-probe/)
assert.match(serverKeyTransportGuard, /\/functions\/v1\/transport-probe/)
assert.match(serverKeyTransportGuard, /must preserve a real user\/session bearer token/)
assert.match(envExample, /^SUPABASE_SECRET_KEY=sb_secret_your_supabase_secret_key$/m)
assert.match(envExample, /^SUPABASE_SERVICE_ROLE_KEY=$/m)
assert.match(envExample, /^COMMUNITY_PROJECT_ALERT_WEBHOOK_URL=https:\/\//m)
assert.match(envExample, /^COMMUNITY_PROJECT_ALERT_ESCALATION_WEBHOOK_URL=https:\/\//m)
assert.match(actions, /sendCommunityProjectOperatorAlert/)
assert.match(actions, /communityProjectOperatorAlertsConfigured/)
assert.match(actions, /membership\?\.member_kind === 'invited_builder'/)
assert.match(actions, /escapeLikePattern\(username\)/)
assert.match(actions, /record_community_project_report_readiness/)
assert.match(actions, /set_community_project_invitation_control/)
assert.match(actions, /reason\.length < 10 \|\| reason\.length > 2000/)
assert.match(sourceRunData, /const detectedProvider = detectSourceRunProvider\(sourceUrl\)/)
assert.match(sourceRunData, /provider !== detectedProvider/)
assert.match(sourceRunData, /source_visibility: 'public'/)
assert.match(sourceRunData, /source_publication_consent_at: sourcePublicationConsentAt/)
assert.match(sourceRunReview, /host === 'g\.co'\) return 'Gemini'/)
for (const sourceRunForm of [legacySourceRunIntake, legacySourceRunRepair]) {
  assert.match(sourceRunForm, /data-detected-source-provider/)
  assert.match(sourceRunForm, /provider: detectedProvider/)
  assert.equal(
    (sourceRunForm.match(/type="checkbox"/g) ?? []).length,
    3,
    'Every legacy source-run form must render all three explicit consent statements.',
  )
  assert.doesNotMatch(sourceRunForm, /providerOptions|<select/)
}
assert.match(alerts, /COMMUNITY_PROJECT_ALERT_WEBHOOK_URL/)
assert.match(alerts, /COMMUNITY_PROJECT_ALERT_ESCALATION_WEBHOOK_URL/)
assert.match(alerts, /primary\.href === escalation\.href/)
assert.doesNotMatch(alerts, /reporter_email|report_details|artifact/i)
assert.match(alerts, /ALERT_MAX_ATTEMPTS = 2/)
assert.match(alerts, /'exploitation'[\s\S]*'credentials'[\s\S]*'imminent_harm'/)
assert.match(privateReview, /inert source text/)
assert.doesNotMatch(privateReview, /iframe|srcDoc|dangerouslySetInnerHTML/)
assert.match(preparedPage, /preparedProjectIsPublic\(project\.id\).*notFound/s)
assert.match(nextConfig, /source: '\/artifacts\/:path\*'[\s\S]*destination: '\/api\/prepared-artifacts\/:path\*'/)
assert.match(cronRoute, /CRON_SECRET/)
assert.match(cronRoute, /community_project_publication_drift/)
assert.match(cronRoute, /begin_community_project_reconciliation/)
assert.match(cronRoute, /record_community_project_artifact_integrity/)
assert.match(cronRoute, /purge_community_project_retention/)
assert.match(cronRoute, /undeliveredReportAlertCount/)
assert.match(cronRoute, /operator_readiness_probe/)
assert.match(cronRoute, /record_community_project_report_readiness/)
assert.doesNotMatch(cronRoute, /record_community_project_report_alert_delivery/)
assert.match(alertRecoveryRoute, /begin_community_project_report_alert_delivery/)
assert.match(alertRecoveryRoute, /get_community_project_report_alert_batch/)
assert.match(alertRecoveryRoute, /record_community_project_report_alert_delivery/)
assert.match(alertRecoveryRoute, /REPORT_ALERT_RETRY_BATCH_LIMIT = 50/)
assert.match(alertRecoveryRoute, /criticalRemaining/)
assert.match(operationalGapsMigration, /private\.get_community_project_report_queue/)
assert.match(operationalGapsMigration, /private\.get_community_project_report_queue_counts/)
assert.match(operationalGapsMigration, /operation\.operation = 'report_alerts'[\s\S]*INTERVAL '1 hour'/)
assert.match(admissionStatusMigration, /private\.pathforge_community_project_pilot_status\(actor UUID\)/)
assert.match(admissionStatusMigration, /WHEN member\.user_id IS NULL THEN 'not_admitted'/)
assert.match(admissionStatusMigration, /WHEN NOT member\.active THEN 'revoked'/)
assert.match(admissionStatusMigration, /member\.expires_at <= NOW\(\)\) THEN 'expired'/)
assert.match(admissionStatusMigration, /ELSE 'temporarily_paused'/)
assert.match(admissionStatusMigration, /public\.community_project_pilot_status\(\)/)
assert.match(
  admissionStatusMigration,
  /public\.community_project_pilot_status\(\)[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = ''/,
)
assert.match(
  admissionStatusMigration,
  /REVOKE ALL ON FUNCTION public\.community_project_pilot_status\(\)[\s\S]*GRANT EXECUTE ON FUNCTION public\.community_project_pilot_status\(\)[\s\S]*TO authenticated/,
)
assert.doesNotMatch(
  admissionStatusMigration,
  /GRANT EXECUTE ON FUNCTION public\.community_project_pilot_status\(\)[\s\S]*TO anon/,
)
assert.match(
  admissionStatusMigration,
  /private\.pathforge_actor_can_repair_community_project\(actor UUID\)[\s\S]*IN \('eligible', 'temporarily_paused'\)/,
)
assert.match(
  admissionStatusMigration,
  /public\.replace_community_project_submission\([\s\S]*IF NOT private\.pathforge_actor_can_repair_community_project\(actor\)[\s\S]*Current pilot admission is required to repair this community project/,
)
assert.match(
  admissionStatusMigration,
  /REVOKE EXECUTE ON FUNCTION private\.replace_community_project_submission\(UUID, UUID, JSONB, UUID\)[\s\S]*FROM service_role/,
)
assert.match(communityProjectData, /supabase\.rpc\('community_project_pilot_status'\)/)
assert.match(communityProjectData, /eligible: status === 'eligible'/)
assert.match(actions, /supabase\.rpc\('community_project_pilot_status'\)/)
assert.match(actions, /canSubmitCommunityProjectRepair\(eligibilityStatus\)/)
assert.match(actions, /You are admitted to the pilot, but new project submissions are temporarily paused/)
assert.match(actions, /Your internal acceptance access has expired/)
assert.match(actions, /This account has not been admitted to the invitation-only pilot/)
assert.match(buildPage, /status === 'temporarily_paused'/)
assert.match(buildPage, /You are admitted to the pilot, but new project submissions are temporarily paused/)
assert.match(buildPage, /status === 'expired'/)
assert.match(buildPage, /canSubmitCommunityProjectRepair\(eligibility\.status\)/)
assert.match(
  ownerProjectPage,
  /submitted === '1' && submission\.status === 'queued'/,
  'the submission receipt must not override a later authoritative status',
)
for (const route of [publicArtifactRoute, privateArtifactRoute]) {
  assert.match(route, /SUPABASE_CONFIGURED/)
  assert.match(route, /catch \{/)
  assert.match(route, /return unavailable\(\)/)
}
assert.match(publicArtifactRoute, /createAdminClient/)
assert.doesNotMatch(publicArtifactRoute, /createPublicReadClient/)
assert.match(publicArtifactRoute, /get_public_community_project_artifact_manifest/)
assert.doesNotMatch(publicArtifactRoute, /get_public_community_project_artifact_path/)
assert.match(publicArtifactRoute, /MAX_CACHE_BYTES = 8_000_000/)
assert.match(publicArtifactRoute, /MAX_CACHE_ENTRIES = 8/)
assert.ok(
  publicArtifactRoute.indexOf("'get_public_community_project_artifact_manifest'")
    < publicArtifactRoute.indexOf("request.headers.get('if-none-match')"),
  'Every artifact response, including 304, must recheck the revocable manifest first.',
)
assert.ok(
  publicArtifactRoute.indexOf("'get_public_community_project_artifact_manifest'")
    < publicArtifactRoute.indexOf('cachedArtifact(cacheKey)'),
  'Cached artifact bytes must remain behind the current public manifest.',
)
for (const listReader of [publicData, publicProfiles]) {
  assert.match(listReader, /rpc\('get_public_community_projects'/)
  assert.match(listReader, /community_project: communityByPrompt\.get\(project\.id\) \?\? null/)
}
assert.match(discovery, /communityProject \? `\/api\/community-artifacts\/\$\{communityProject\.prompt_id\}` : null/)
assert.match(discovery, /fallbackVerified: Boolean\(communityProject\)/)
assert.match(discovery, /deriveDiscoveryRunCounts\([\s\S]*Boolean\(communityProject\)/)
assert.match(discovery, /provider: prompt\.community_project\.provider/)
assert.match(discovery, /fallbackProvider: communityProject\?\.provider/)
assert.match(discovery, /fallbackIsCommunityArtifact: Boolean\(communityProject\)/)
assert.match(discovery, /isCommunityArtifact: canonicalDefaultVariant\.isCommunityArtifact/)
assert.match(profilePresentation, /communityProject \? `\/api\/community-artifacts\/\$\{communityProject\.prompt_id\}` : null/)
assert.match(profilePresentation, /provider: communityProject\.provider/)
assert.match(profilePresentation, /isCommunityArtifact: Boolean\(communityProject\)/)
assert.match(profilePresentation, /verifiedModelRunCount = Math\.max\(verifiedRuns\.length, communityProject \? 1 : 0\)/)
assert.match(artifactViewer, /\/api\\\/community-artifacts\\\//)
assert.match(artifactViewer, /allowArtifactDownloads=\{!isCommunityArtifact\}/)
assert.match(artifactViewer, /allowArtifactScripts=\{!isCommunityArtifact\}/)
assert.match(artifactViewer, /allowArtifactInteraction/)
assert.match(communityProjectPage, /allowArtifactScripts=\{false\}/)
assert.match(communityProjectPage, /allowArtifactInteraction/)
assert.match(communityProjectPage, /data-community-static-preview/)
assert.match(communityProjectPage, /preview-initiated downloads do not run/)
assert.match(communityProjectPage, /non-executable text download/)
assert.match(sourceRunShowcase, /STATIC_ARTIFACT_CSP/)
assert.match(sourceRunShowcase, /"script-src 'none'"/)
assert.match(sourceRunShowcase, /data-artifact-execution-mode=\{allowArtifactScripts \? 'interactive-trusted' : 'static-untrusted'\}/)
assert.match(sourceRunShowcase, /data-artifact-interaction-mode=\{allowArtifactInteraction \? 'reader-enabled' : 'visual-only'\}/)
assert.match(protectedArtifactWrapper, /data-pathforge-execution-mode="\$\{executionMode\}"/)
assert.match(protectedArtifactWrapper, /data-pathforge-interaction-mode="\$\{interactionMode\}"/)
assert.match(protectedArtifactWrapper, /sandbox="\$\{artifactSandbox\}"/)
assert.match(protectedArtifactWrapper, /allowArtifactInteraction = allowArtifactScripts \|\| options\.allowArtifactInteraction === true/)
assert.match(protectedArtifactWrapper, /nonInteractiveFrameStyle[\s\S]*pointer-events: none/)
assert.match(projectPreview, /isCommunityArtifactPath/)
assert.match(projectPreview, /isCommunityArtifact \|\| isCommunityArtifactPath\(artifactPath\)/)
assert.match(projectPreview, /allowArtifactDownloads=\{!isStaticCommunityPreview\}/)
assert.match(projectPreview, /allowArtifactScripts=\{!isStaticCommunityPreview\}/)
assert.match(interactiveBuildPathCard, /isCommunityArtifact=\{selectedVariant\.isCommunityArtifact\}/)
assert.match(builderWorkCard, /isCommunityArtifact=\{evidence\.isCommunityArtifact\}/)
assert.match(homeHero, /isCommunityArtifact=\{featured\.isCommunityArtifact\}/)
assert.match(whatToBuild, /isCommunityArtifact=\{featured\.isCommunityArtifact\}/)
assert.match(adminReviewPage, /CopySourceReviewUrl/)
assert.doesNotMatch(adminReviewPage, /Open source anonymously/)
assert.match(adminPromptRow, /Community workflow only/)
assert.match(adminPromptRow, /const requiresSpecialReview = requiresSourceRunReview \|\| isCommunityProject/)
assert.match(adminPromptRow, /!isCommunityProject && \(/)
assert.match(adminCommunityPage, /InvitationControlForm/)
assert.match(invitationControl, /Verify gates and enable invited-builder submissions/)
assert.match(invitationControl, /Lock external submissions/)
assert.match(invitationControl, /Supabase leaked-password protection is enabled/)
assert.match(invitationControl, /every current\s+security-advisor warning has a reviewed disposition/)
assert.match(invitationControl, /launch_readiness_confirmed/)
assert.match(invitationControl, /launch_readiness_reference/)
assert.doesNotMatch(invitationControl, /window\.confirm/)
assert.match(actions, /record_community_project_invitation_readiness/)
assert.match(actions, /operator-alert readiness probe was not delivered/)
assert.match(actions, /record_community_project_report_alert_delivery/)
assert.match(actions, /Operator notification is queued for automatic retry[\s\S]*publication and external invitations remain blocked until delivery succeeds/)
assert.match(alerts, /redirect: 'error'/)
assert.match(reportForm, /receipt could not be confirmed[\s\S]*first request may still have been stored/)
assert.match(reportForm, /value="exploitation"/)
assert.match(reportForm, /value="credentials"/)
assert.match(reportForm, /value="imminent_harm"/)
assert.doesNotMatch(alertReadinessMigration, /Contact PathForge directly/)
assert.match(launchContract, /does not invent or backfill[\s\S]*new\s+explicit\s+permission/)
assert.match(launchContract, /auth_leaked_password_protection/)
assert.match(operationsRunbook, /auth_leaked_password_protection/)
assert.match(operationsRunbook, /Disabled leaked-password\s+protection is also a hard stop/)
assert.doesNotMatch(publicData, /export async function createProject/)
assert.doesNotMatch(legacyActions, /export async function submitProject/)
assert.match(publicData, /Generic moderation is blocked for community projects/)

const packageScripts = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).scripts
assert.equal(
  packageScripts['check:community-project-db'],
  'node scripts/check-community-project-db.mjs',
  'The executable disposable database gate must remain wired.',
)
assert.equal(
  packageScripts['check:community-project-alert-recovery'],
  'node scripts/check-community-project-alert-recovery.mjs',
  'The bounded alert-recovery gate must remain wired.',
)
assert.equal(
  packageScripts['check:community-project-auth-browser'],
  'node scripts/check-community-project-auth-browser.mjs',
  'The fresh-account rendered browser gate must remain wired.',
)
assert.equal(
  packageScripts['check:community-project-live-acceptance'],
  'node scripts/check-community-project-live-acceptance.mjs',
  'The deployed fresh-account upload lifecycle gate must remain wired.',
)
assert.equal(
  packageScripts['check:supabase-server-key-transport'],
  'node scripts/check-supabase-server-key-transport.mjs',
  'The emitted server-key header regression must remain wired.',
)
assert.match(packageScripts.prebuild, /check:supabase-server-key-transport/)
assert.match(packageScripts.autoreview, /check:supabase-server-key-transport/)
assert.match(authBrowserGuard, /auth\/signup\?next=%2Fbuild/)
assert.match(authBrowserGuard, /anonymous \/build exposed an upload control/)
assert.match(authBrowserGuard, /overflowed horizontally/)
assert.match(authBrowserGuard, /community artifact viewer routed to a not-found state/)
assert.match(authBrowserGuard, /community artifact viewer exposed a download action/)
assert.match(authBrowserGuard, /contrastRatio/)
assert.match(authBrowserGuard, /community artifact default-canvas contrast/)
assert.match(authBrowserGuard, /project-upload-admitted-/)
assert.match(authBrowserGuard, /community-release-controls-/)
assert.match(authBrowserGuard, /launch_readiness_reference/)
assert.match(authBrowserGuard, /value === 'yes'/)
assert.match(authBrowserGuard, /user-wheel static artifact scroll/)
assert.match(authBrowserGuard, /reader-enabled/)
assert.match(authBrowserGuard, /visual-only/)
assert.match(authBrowserGuard, /community-static-preview/)
assert.match(authBrowserGuard, /Explore\/profile visual-only cards/)
assert.match(authBrowserGuard, /isExpectedFixtureInterceptionCancellation/)
assert.match(authBrowserGuard, /pendingFixtureFulfills/)
assert.match(authBrowserGuard, /await closeChrome\(chrome\)/)
assert.match(authBrowserGuard, /detached: process\.platform !== 'win32'/)
assert.match(authBrowserGuard, /process\.kill\(-child\.pid, signal\)/)
assert.match(authBrowserGuard, /await client\.send\('Browser\.close'\)/)
assert.match(projectSubmissionFixture, /ProjectSubmissionClient/)
assert.match(projectSubmissionFixture, /VERCEL_ENV === 'production'[\s\S]*notFound\(\)/)
assert.match(releaseControlsFixture, /InvitationControlForm/)
assert.match(releaseControlsFixture, /PublicationControlForm/)
assert.match(releaseControlsFixture, /ReportProjectForm/)
assert.match(releaseControlsFixture, /VERCEL_ENV === 'production'[\s\S]*notFound\(\)/)
assert.match(liveAcceptanceGuard, /auth\/signup\?next=%2Fbuild/)
assert.match(liveAcceptanceGuard, /COMMUNITY_PROJECT_ACCEPTANCE_EMAIL/)
assert.match(liveAcceptanceGuard, /document\.querySelector\('input\[name="username"\]'\)/)
assert.match(liveAcceptanceGuard, /admin\.auth\.admin\.generateLink/)
assert.match(liveAcceptanceGuard, /token_hash/)
assert.match(liveAcceptanceGuard, /type', 'magiclink'/)
assert.doesNotMatch(liveAcceptanceGuard, /admin\.auth\.admin\.createUser/)
assert.match(liveAcceptanceGuard, /width: 390,[\s\S]*height: 844,[\s\S]*mobile: true/)
assert.match(liveAcceptanceGuard, /live-private-submission-receipt-desktop/)
assert.match(liveAcceptanceGuard, /requested_member_kind: 'internal_acceptance'/)
assert.match(liveAcceptanceGuard, /resolveSupabaseServerKey\(process\.env\)/)
assert.match(liveAcceptanceGuard, /isSupabaseSecretKey\(serverKey\)/)
assert.match(liveAcceptanceGuard, /deployed acceptance gate requires SUPABASE_SECRET_KEY/)
assert.match(liveAcceptanceGuard, /createSupabaseServerClient\(supabaseUrl, serverKey\)/)
assert.doesNotMatch(liveAcceptanceGuard, /createClient\(/)
assert.match(liveAcceptanceGuard, /not currently in the pilot/)
assert.match(liveAcceptanceGuard, /Submit private review bundle/)
assert.match(liveAcceptanceGuard, /completed guided upload step/)
assert.match(liveAcceptanceGuard, /data-active-community-submission-step/)
assert.match(liveAcceptanceGuard, /Withdraw and purge artifact|textContent\.includes\('Withdraw'\)/)
assert.match(liveAcceptanceGuard, /allow_invited_submissions/)
assert.match(liveAcceptanceGuard, /deleteUser\(userId\)/)
assert.match(liveAcceptanceGuard, /disposable submission cleanup/)
assert.ok(
  liveAcceptanceGuard.indexOf("disposable submission cleanup")
    < liveAcceptanceGuard.indexOf("Auth user deletion"),
  'Disposable acceptance rows must be removed before the protected profile is deleted.',
)
assert.match(liveAcceptanceGuard, /acceptance-slot postcondition/)
assert.match(liveAcceptanceGuard, /Disposable cleanup verification failed/)
assert.match(communityReleaseWorkflow, /npm run check:supabase-server-key-transport/)
assert.match(communityReleaseWorkflow, /npm run check:community-project-auth-browser -- --base-url http:\/\/127\.0\.0\.1:3111/)
assertUnfilteredPullRequestWorkflow(communityReleaseWorkflow)
for (const filteredWorkflow of [
  communityReleaseWorkflow.replace(
    /^  pull_request:\s*$/m,
    "  pull_request:\n    paths:\n      - 'src/**'",
  ),
  communityReleaseWorkflow.replace(
    /^  pull_request:\s*$/m,
    "  pull_request:\n    paths-ignore:\n      - 'docs/**'",
  ),
  communityReleaseWorkflow.replace(
    /^  pull_request:\s*$/m,
    "  pull_request: { paths: ['src/**'] }",
  ),
  communityReleaseWorkflow.replace(
    /^  pull_request:\s*$/m,
    "  pull_request: { paths-ignore: ['docs/**'] }",
  ),
]) {
  assert.throws(
    () => assertUnfilteredPullRequestWorkflow(filteredWorkflow),
    /must not contain pull-request path filters/,
  )
}
assert.ok(
  liveAcceptanceGuard.indexOf('Disposable cleanup verification failed')
    < liveAcceptanceGuard.indexOf('Live fresh-account acceptance passed and cleanup verified'),
  'The deployed acceptance gate must verify cleanup before reporting success.',
)

console.log('Community project pilot guard passed: 2 safe fixtures, 29 hostile fixtures, envelope limits, publication controls, compatibility, and reconciliation wiring.')
