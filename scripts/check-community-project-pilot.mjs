import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import {
  decodeCommunityArtifactBytes,
  scanCommunityArtifactText,
  scanCommunityEvidenceText,
} from '../src/lib/community-project-scanner-core.mjs'

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

const migration = readFileSync(
  path.join(root, 'supabase', 'migrations', '20260723054558_community_project_pilot.sql'),
  'utf8',
)
const actions = readFileSync(path.join(root, 'src', 'lib', 'community-project-actions.ts'), 'utf8')
const adminClient = readFileSync(path.join(root, 'src', 'lib', 'supabase', 'admin.ts'), 'utf8')
const alerts = readFileSync(path.join(root, 'src', 'lib', 'community-project-alerts.ts'), 'utf8')
const preparedPage = readFileSync(path.join(root, 'src', 'components', 'PreparedSourceRunPage.tsx'), 'utf8')
const privateReview = readFileSync(path.join(root, 'src', 'components', 'CommunityArtifactSourceReview.tsx'), 'utf8')
const nextConfig = readFileSync(path.join(root, 'next.config.ts'), 'utf8')
const cronRoute = readFileSync(
  path.join(root, 'src', 'app', 'api', 'cron', 'community-project-reconcile', 'route.ts'),
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
assert.ok(
  actions.indexOf('scanCommunityProjectArtifact(artifact)') < actions.indexOf('.upload(uploadedPath'),
  'The server must scan bytes before private storage upload.',
)
assert.match(actions, /artifact_original_name: safeOriginalFilename/)
assert.match(actions, /verifyQuarantinedArtifact/)
assert.match(actions, /REPORT_RATE_LIMIT_SECRET/)
assert.match(actions, /SUPABASE_SECRET_KEY/)
assert.match(adminClient, /process\.env\.SUPABASE_SECRET_KEY\?\.trim\(\)\s*\|\|\s*process\.env\.SUPABASE_SERVICE_ROLE_KEY\?\.trim\(\)/)
assert.match(adminClient, /server-only Supabase credentials/)
assert.match(adminClient, /detectSessionInUrl: false/)
assert.match(envExample, /^SUPABASE_SECRET_KEY=your_supabase_secret_key$/m)
assert.match(envExample, /^SUPABASE_SERVICE_ROLE_KEY=$/m)
assert.match(actions, /sendCommunityProjectOperatorAlert/)
assert.match(actions, /communityProjectOperatorAlertsConfigured/)
assert.match(actions, /membership\?\.member_kind === 'invited_builder'/)
assert.match(actions, /escapeLikePattern\(username\)/)
assert.match(actions, /record_community_project_report_readiness/)
assert.match(alerts, /COMMUNITY_PROJECT_ALERT_WEBHOOK_URL/)
assert.doesNotMatch(alerts, /reporter_email|report_details|artifact/i)
assert.match(privateReview, /inert source text/)
assert.doesNotMatch(privateReview, /iframe|srcDoc|dangerouslySetInnerHTML/)
assert.match(preparedPage, /preparedProjectIsPublic\(project\.id\).*notFound/s)
assert.match(nextConfig, /source: '\/artifacts\/:path\*'[\s\S]*destination: '\/api\/prepared-artifacts\/:path\*'/)
assert.match(cronRoute, /CRON_SECRET/)
assert.match(cronRoute, /community_project_publication_drift/)
assert.match(cronRoute, /begin_community_project_reconciliation/)
assert.match(cronRoute, /record_community_project_artifact_integrity/)
assert.match(cronRoute, /purge_community_project_retention/)
for (const route of [publicArtifactRoute, privateArtifactRoute]) {
  assert.match(route, /SUPABASE_CONFIGURED/)
  assert.match(route, /catch \{/)
  assert.match(route, /return unavailable\(\)/)
}
assert.match(publicArtifactRoute, /createAdminClient/)
assert.doesNotMatch(publicArtifactRoute, /createPublicReadClient/)
for (const listReader of [publicData, publicProfiles]) {
  assert.match(listReader, /rpc\('get_public_community_projects'/)
  assert.match(listReader, /community_project: communityByPrompt\.get\(project\.id\) \?\? null/)
}
assert.match(discovery, /communityProject \? `\/api\/community-artifacts\/\$\{communityProject\.prompt_id\}` : null/)
assert.match(discovery, /fallbackVerified: Boolean\(communityProject\)/)
assert.match(discovery, /provider: prompt\.community_project\.provider/)
assert.match(discovery, /fallbackProvider: communityProject\?\.provider/)
assert.match(discovery, /fallbackIsCommunityArtifact: Boolean\(communityProject\)/)
assert.match(discovery, /isCommunityArtifact: canonicalDefaultVariant\.isCommunityArtifact/)
assert.match(profilePresentation, /communityProject \? `\/api\/community-artifacts\/\$\{communityProject\.prompt_id\}` : null/)
assert.match(profilePresentation, /provider: communityProject\.provider/)
assert.match(profilePresentation, /isCommunityArtifact: Boolean\(communityProject\)/)
assert.match(artifactViewer, /\/api\\\/community-artifacts\\\//)
assert.match(artifactViewer, /allowArtifactDownloads=\{!isCommunityArtifact\}/)
assert.match(artifactViewer, /allowArtifactScripts=\{!isCommunityArtifact\}/)
assert.match(communityProjectPage, /allowArtifactScripts=\{false\}/)
assert.match(communityProjectPage, /data-community-static-preview/)
assert.match(sourceRunShowcase, /STATIC_ARTIFACT_CSP/)
assert.match(sourceRunShowcase, /"script-src 'none'"/)
assert.match(sourceRunShowcase, /data-artifact-execution-mode=\{allowArtifactScripts \? 'interactive-trusted' : 'static-untrusted'\}/)
assert.match(protectedArtifactWrapper, /data-pathforge-execution-mode="\$\{executionMode\}"/)
assert.match(protectedArtifactWrapper, /sandbox="\$\{artifactSandbox\}"/)
assert.match(protectedArtifactWrapper, /pointer-events: none/)
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
  packageScripts['check:community-project-auth-browser'],
  'node scripts/check-community-project-auth-browser.mjs',
  'The fresh-account rendered browser gate must remain wired.',
)
assert.equal(
  packageScripts['check:community-project-live-acceptance'],
  'node scripts/check-community-project-live-acceptance.mjs',
  'The deployed fresh-account upload lifecycle gate must remain wired.',
)
assert.match(authBrowserGuard, /auth\/signup\?next=%2Fbuild/)
assert.match(authBrowserGuard, /anonymous \/build exposed an upload control/)
assert.match(authBrowserGuard, /overflowed horizontally/)
assert.match(authBrowserGuard, /community artifact viewer routed to a not-found state/)
assert.match(authBrowserGuard, /community artifact viewer exposed a download action/)
assert.match(authBrowserGuard, /contrastRatio/)
assert.match(authBrowserGuard, /community artifact default-canvas contrast/)
assert.match(authBrowserGuard, /community-static-preview/)
assert.match(authBrowserGuard, /Explore\/profile static community cards/)
assert.match(authBrowserGuard, /isExpectedFixtureInterceptionCancellation/)
assert.match(authBrowserGuard, /pendingFixtureFulfills/)
assert.match(authBrowserGuard, /await closeChrome\(chrome\)/)
assert.match(authBrowserGuard, /detached: process\.platform !== 'win32'/)
assert.match(authBrowserGuard, /process\.kill\(-child\.pid, signal\)/)
assert.match(authBrowserGuard, /await client\.send\('Browser\.close'\)/)
assert.match(liveAcceptanceGuard, /auth\/login\?next=%2Fbuild/)
assert.match(liveAcceptanceGuard, /requested_member_kind: 'internal_acceptance'/)
assert.match(liveAcceptanceGuard, /SUPABASE_SECRET_KEY[\s\S]*SUPABASE_SERVICE_ROLE_KEY/)
assert.match(liveAcceptanceGuard, /not currently in the pilot/)
assert.match(liveAcceptanceGuard, /Submit private review bundle/)
assert.match(liveAcceptanceGuard, /Withdraw and purge artifact|textContent\.includes\('Withdraw'\)/)
assert.match(liveAcceptanceGuard, /allow_invited_submissions/)
assert.match(liveAcceptanceGuard, /deleteUser\(userId\)/)
assert.match(liveAcceptanceGuard, /acceptance-slot postcondition/)
assert.match(liveAcceptanceGuard, /Disposable cleanup verification failed/)
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

console.log('Community project pilot guard passed: 1 safe fixture, 15 hostile fixtures, envelope limits, publication controls, and reconciliation wiring.')
