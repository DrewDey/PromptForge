#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import {
  assertPreparedLegacyPackageBinding,
  preparedLegacySourceRunBindings,
} from '../src/lib/prepared-legacy-source-runs.mjs'

const FEATURED_PROJECTS_PATH = 'src/lib/featured-projects.ts'
const PREPARED_PROJECTS_PATH = 'src/lib/prepared-showcase-projects.ts'
const IMPORTER_PATH = 'scripts/import-pathforge-source-run.mjs'
const PROVISIONER_PATH = 'scripts/create-pathforge-seed-profile.mjs'
const PUBLISHER_PATH = 'src/lib/data/source-runs.ts'
const ENGAGEMENT_PATH = 'src/lib/project-engagement.ts'
const PROFILE_BINDING_MIGRATION_PATH =
  'supabase/migrations/20260726210000_prepared_legacy_seed_profile_binding.sql'
const LEGACY_PUBLICATION_MIGRATION_PATH =
  'supabase/migrations/20260726203000_legacy_public_source_grandfathering.sql'

function legacyPublicationMigrationPath() {
  const flagIndex = process.argv.indexOf('--database-contract')
  if (flagIndex === -1) return LEGACY_PUBLICATION_MIGRATION_PATH
  const value = process.argv[flagIndex + 1]
  if (!value || value.startsWith('--')) {
    fail('--database-contract requires the PM1 migration path')
  }
  return value
}

const targets = [
  {
    constant: 'POMODORO_TIMER_PROJECT_ID',
    exportName: 'POMODORO_TIMER_SHOWCASE_PROJECT',
    projectId: '3b9c61d8-4e27-4f0a-9c5d-2a8f1e6b7c40',
    sourceRunId: '6a1f9bc4-c390-832f-88a5-d978d2e42577',
    authorUsername: 'JordanWells',
    authorDisplayName: 'Jordan Wells',
    registryId: 'pathforge-seed-504',
    artifactPath: 'public/artifacts/pomodoro-focus-timer-gpt55-instant.html',
    artifactSha256: '2944262b85983740b2c0c4d708a740fe90cdb3a99c8d0a60a13db8db1c6bebcd',
    packageFile: 'pomodoro-focus-timer-chatgpt-gpt55-instant-source-run.json',
    evidenceScope: 'curated_four_step_generated_html_payload_path',
    responseCaptureScope: 'generated_html_code_payloads',
    responseMode: 'artifact_payload',
  },
  {
    constant: 'WEEKEND_CHECKLIST_REAL_FORK_PROJECT_ID',
    exportName: 'WEEKEND_CHECKLIST_REAL_FORK_SHOWCASE_PROJECT',
    projectId: 'e3f1d1a7-1d18-4a7b-ba54-045526cd2661',
    sourceRunId: '80b083bb-4f94-4411-b071-a5da731d3e2d',
    authorUsername: 'NoraBrooks',
    authorDisplayName: 'Nora Brooks',
    registryId: 'pathforge-seed-006',
    artifactPath:
      'public/artifacts/weekend-plan-checklist-chatgpt-family-road-trip-fork-step-4.html',
    artifactSha256: 'ba8142cd693b3b4f659e1ed628e410425fde5f13b2fc749f9f9d7475e8448a1e',
    packageFile: 'weekend-plan-checklist-chatgpt-family-road-trip-fork.json',
    evidenceScope: 'selected_branch_shared_steps_1_through_3_and_child_step_4',
    responseCaptureScope: 'assistant_text_messages_and_separate_generated_html_files',
    responseMode: 'assistant_text',
  },
  {
    constant: 'SCHOOL_DESK_HP_CALCULATOR_FORK_PROJECT_ID',
    exportName: 'SCHOOL_DESK_HP_CALCULATOR_FORK_SHOWCASE_PROJECT',
    projectId: 'f25f83df-29c5-4d07-97b8-e7f6d2a902b8',
    sourceRunId: 'd9fa40e7-7725-4387-ad5b-14f25cf744ce',
    authorUsername: 'RowanPierce',
    authorDisplayName: 'Rowan Pierce',
    registryId: 'pathforge-seed-503',
    artifactPath:
      'public/artifacts/school-desk-hp-10bii-calculator-claude-5-fable-max-fork.html',
    artifactSha256: 'c4af9259664a6d5d7fd09096e83f9556a3409fdd4dbaf43db4912eae4fb3ae35',
    packageFile: 'school-desk-hp-10bii-calculator-claude-5-fable-max-fork.json',
    evidenceScope: 'selected_published_path',
    responseCaptureScope: 'mixed_assistant_text_and_generated_html_payload',
    expectedStepCaptureKinds: [
      'assistant_text',
      'generated_html_code_payload',
    ],
    expectedCapturedStepNumbers: [2, 3],
    expectedFinalStepNumber: 3,
    responseMode: 'preserved_raw_payload',
    rawResponsePath:
      'public/artifacts/school-desk-hp-10bii-calculator-fable-5-max-claude-capture.html',
    rawResponseSha256:
      'fba5d51a27b0ea2d6c83d00d78cdbe260358edd42c0fee35a99f8918f643f78e',
    expectedRunStartedAt: '2026-06-09T19:27:14.000Z',
    expectedRunFinishedAt: '2026-06-09T19:43:10.000Z',
    expectedArtifactCapturedAt: '2026-06-09T19:44:22.000Z',
    expectedProjectCreatedAt: '2026-06-10T03:15:56.000Z',
    expectedProjectUpdatedAt: '2026-06-10T03:42:18.000Z',
    expectedFirstLiveAt: '2026-06-10T03:17:14.000Z',
  },
]

const liveVerificationSql = `WITH targets(project_id, source_run_id, registry_id, author_username) AS (
  VALUES
    ('3b9c61d8-4e27-4f0a-9c5d-2a8f1e6b7c40'::uuid, '6a1f9bc4-c390-832f-88a5-d978d2e42577'::uuid, 'pathforge-seed-504', 'JordanWells'),
    ('e3f1d1a7-1d18-4a7b-ba54-045526cd2661'::uuid, '80b083bb-4f94-4411-b071-a5da731d3e2d'::uuid, 'pathforge-seed-006', 'NoraBrooks'),
    ('f25f83df-29c5-4d07-97b8-e7f6d2a902b8'::uuid, 'd9fa40e7-7725-4387-ad5b-14f25cf744ce'::uuid, 'pathforge-seed-503', 'RowanPierce')
)
SELECT
  targets.*,
  source_run_submissions.status AS source_run_status,
  source_run_submissions.author_id AS intake_author_id,
  source_run_submissions.extracted_prompt_id,
  source_run_submissions.source_package_file,
  source_run_submissions.source_package_sha256,
  source_run_submissions.intake_evidence->>'profile_registry_id' AS intake_registry_id,
  profiles.username,
  profiles.display_name,
  profiles.role,
  profile_provenance.kind AS provenance_kind,
  pathforge_profile_operators.kind AS operator_kind,
  (auth_users.email_confirmed_at IS NOT NULL) AS email_confirmed,
  (
    COALESCE(auth_users.raw_app_meta_data->>'pathforge_seed', 'false') = 'true'
  ) AS auth_seed_marker,
  prompts.status AS project_status,
  prompts.author_id AS project_author_id,
  (prompts.author_id = source_run_submissions.author_id) AS prompt_author_matches_intake
FROM targets
LEFT JOIN public.source_run_submissions
  ON source_run_submissions.id = targets.source_run_id
LEFT JOIN public.profiles
  ON profiles.id = source_run_submissions.author_id
LEFT JOIN public.profile_provenance
  ON profile_provenance.profile_id = profiles.id
LEFT JOIN private.pathforge_profile_operators AS pathforge_profile_operators
  ON pathforge_profile_operators.profile_id = profiles.id
LEFT JOIN auth.users AS auth_users
  ON auth_users.id = profiles.id
LEFT JOIN public.prompts
  ON prompts.id = targets.project_id
ORDER BY targets.project_id;`

function fail(message) {
  throw new Error(message)
}

function read(path) {
  if (!existsSync(path)) fail(`${path}: missing`)
  return readFileSync(path, 'utf8')
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function exportBlock(source, exportName) {
  const start = source.indexOf(`export const ${exportName}`)
  if (start === -1) fail(`${PREPARED_PROJECTS_PATH}: missing ${exportName}`)
  const next = source.indexOf('\nexport const ', start + 1)
  return source.slice(start, next === -1 ? source.length : next)
}

function literal(block, field) {
  const match = block.match(new RegExp(`${field}:\\s*['"]([^'"]+)['"]`))
  return match?.[1] ?? null
}

function verifyArtifactStep(packagePath, step) {
  if (typeof step.artifact_version_path !== 'string') {
    fail(`${packagePath}: step ${step.step_number} is missing artifact_version_path`)
  }
  if (!existsSync(step.artifact_version_path)) {
    fail(`${packagePath}: step ${step.step_number} artifact is missing`)
  }
  const digest = sha256(step.artifact_version_path)
  if (step.artifact_sha256 !== digest) {
    fail(`${packagePath}: step ${step.step_number} artifact SHA-256 drifted`)
  }
  return digest
}

function auditPackage(target) {
  const packagePath = `seed-runs/${target.packageFile}`
  const packageText = read(packagePath)
  const pkg = JSON.parse(packageText)
  const binding = assertPreparedLegacyPackageBinding(pkg)

  if (
    binding.projectId !== target.projectId ||
    binding.sourceRunId !== target.sourceRunId ||
    binding.registryId !== target.registryId ||
    binding.username !== target.authorUsername ||
    binding.displayName !== target.authorDisplayName
  ) {
    fail(`${packagePath}: exact prepared source-run/profile binding drifted`)
  }
  if (pkg.source_run_submission_id !== pkg.source_run_id) {
    fail(`${packagePath}: compatibility source-run alias must exactly equal source_run_id`)
  }
  if (pkg.final_artifact_path !== target.artifactPath) {
    fail(`${packagePath}: final_artifact_path differs from the prepared registry`)
  }
  if (sha256(target.artifactPath) !== target.artifactSha256) {
    fail(`${target.artifactPath}: expected final artifact hash drifted`)
  }
  if (pkg.artifact_sha256 !== target.artifactSha256) {
    fail(`${packagePath}: final artifact SHA-256 differs from the preserved file`)
  }
  if (pkg.evidence_scope !== target.evidenceScope) {
    fail(`${packagePath}: evidence_scope does not disclose the approved curated boundary`)
  }
  if (pkg.response_capture_normalization?.scope !== target.responseCaptureScope) {
    fail(`${packagePath}: response capture normalization scope drifted`)
  }
  if (pkg.response_capture_normalization?.provider_serialization_envelope_preserved !== false) {
    fail(`${packagePath}: package must not claim a complete provider serialization envelope`)
  }
  if (pkg.public_status !== 'not_public_not_published') {
    fail(`${packagePath}: package must not claim publication`)
  }
  if (/https:\/\/(?:chatgpt\.com|claude\.ai)\/share\//.test(packageText)) {
    fail(`${packagePath}: verified public links belong only in the source-run public-link registry`)
  }
  if (!Array.isArray(pkg.steps) || pkg.prompt_count !== pkg.steps.length) {
    fail(`${packagePath}: prompt_count must equal the curated step evidence count`)
  }
  if (
    target.expectedStepCaptureKinds &&
    (
      target.expectedStepCaptureKinds.length !== pkg.steps.length ||
      target.expectedStepCaptureKinds.some(
        (kind, index) => pkg.steps[index]?.response_capture_kind !== kind,
      )
    )
  ) {
    fail(`${packagePath}: per-step response capture kinds drifted`)
  }
  if (
    target.expectedCapturedStepNumbers &&
    (
      target.expectedCapturedStepNumbers.length !== pkg.steps.length ||
      target.expectedCapturedStepNumbers.some(
        (stepNumber, index) => pkg.steps[index]?.step_number !== stepNumber,
      )
    )
  ) {
    fail(`${packagePath}: curated historical step numbering drifted`)
  }
  if (target.expectedFinalStepNumber) {
    const finalStep = pkg.steps.find(
      (step) => step.artifact_version_path === pkg.final_artifact_path,
    )
    if (finalStep?.step_number !== target.expectedFinalStepNumber) {
      fail(`${packagePath}: final artifact is no longer bound to its historical final step`)
    }
  }
  for (const [field, expected] of [
    ['run_started_at', target.expectedRunStartedAt],
    ['run_finished_at', target.expectedRunFinishedAt],
    ['artifact_captured_at', target.expectedArtifactCapturedAt],
  ]) {
    if (expected && pkg[field] !== expected) {
      fail(`${packagePath}: ${field} drifted from preserved source telemetry`)
    }
  }
  if (
    target.expectedFirstLiveAt &&
    !String(pkg.verification_notes ?? '').includes(target.expectedFirstLiveAt)
  ) {
    fail(`${packagePath}: first-live verification timestamp drifted`)
  }

  const stepDigests = pkg.steps.map((step) => verifyArtifactStep(packagePath, step))
  if (target.responseMode === 'artifact_payload') {
    for (const step of pkg.steps) {
      if (step.response_exact !== read(step.artifact_version_path)) {
        fail(`${packagePath}: step ${step.step_number} response_exact differs from its captured HTML payload`)
      }
    }
  }
  if (target.responseMode === 'preserved_raw_payload') {
    if (sha256(target.rawResponsePath) !== target.rawResponseSha256) {
      fail(`${target.rawResponsePath}: preserved raw response hash drifted`)
    }
    if (pkg.steps.at(-1)?.response_exact !== read(target.rawResponsePath)) {
      fail(`${packagePath}: final response_exact differs from the preserved raw response`)
    }
    const omittedAttempt = pkg.omitted_provider_turns?.some(
      (turn) => (
        turn?.status === 'aborted_without_final_response' &&
        turn?.included_in_published_path === false
      ),
    )
    if (!omittedAttempt) {
      fail(`${packagePath}: omitted aborted provider turn is not disclosed`)
    }
  }
  if (target.responseMode === 'assistant_text') {
    const excludedParentContinuation = pkg.omitted_provider_turns?.some(
      (turn) => (
        turn?.scope === 'parent_continuation_steps_4_through_6' &&
        turn?.included_in_selected_branch === false
      ),
    )
    if (!excludedParentContinuation) {
      fail(`${packagePath}: parent continuation steps 4 through 6 must be explicitly excluded`)
    }
  }

  return {
    packagePath,
    packageSha256: createHash('sha256').update(packageText).digest('hex'),
    projectId: binding.projectId,
    sourceRunId: binding.sourceRunId,
    registryId: binding.registryId,
    authorUsername: binding.username,
    artifactSha256: target.artifactSha256,
    stepDigests,
    evidenceScope: pkg.evidence_scope,
    responseCaptureScope: pkg.response_capture_normalization.scope,
    importerReady: true,
  }
}

function verifyWorkflowSource() {
  const importer = read(IMPORTER_PATH)
  const provisioner = read(PROVISIONER_PATH)
  const publisher = read(PUBLISHER_PATH)
  const engagement = read(ENGAGEMENT_PATH)

  for (const required of [
    "rpc(\n    'import_legacy_prepared_source_run'",
    'legacyImportRpcArgs(binding, payload, forkFields)',
    'immutable_intake: immutableLegacyIntake(payload)',
    'immutable_fork: canonicalForkEvidence(forkFields)',
    'Prepared legacy imports require SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY',
    "'check_prepared_legacy_seed_profile_binding'",
    'assertAuthoritativePreparedLegacyProfileBinding(binding, verified)',
  ]) {
    if (!importer.includes(required)) fail(`${IMPORTER_PATH}: missing ${required}`)
  }
  for (const forbidden of [
    'source_publication_consent_at:',
    'source_visibility:',
  ]) {
    if (importer.includes(forbidden)) {
      fail(`${IMPORTER_PATH}: service legacy import must not invent publication consent`)
    }
  }
  for (const required of [
    'assertPreparedLegacyPackageBinding(pkg)',
    "'check_prepared_legacy_seed_profile_binding'",
    'assertAuthoritativePreparedLegacyProfileBinding(binding, verified)',
    'findAuthUsersByPreparedUsername(',
    'Repair that partial account before provisioning; no duplicate was created.',
    'existing: true',
    'Protected seed handle ${protectedHandle.username} may only be provisioned from its exact prepared package.',
    'Created seed profile failed exact identity and provenance readback.',
  ]) {
    if (!provisioner.includes(required)) fail(`${PROVISIONER_PATH}: missing ${required}`)
  }
  for (const required of [
    'assertPreparedLegacyPackageBinding(',
    '!preparedBinding &&',
    "sourceRun.source_visibility !== 'public'",
    "'publish_prepared_showcase_source_run'",
    'Prepared publish blocked: package seed profile differs from the prepared byline.',
    "'check_prepared_legacy_seed_profile_binding'",
    'assertAuthoritativePreparedLegacyProfileBinding(',
  ]) {
    if (!publisher.includes(required)) fail(`${PUBLISHER_PATH}: missing ${required}`)
  }
  const packageBindingIndex = publisher.indexOf(
    'const preparedBinding = assertPreparedLegacyPackageBinding(',
  )
  const ordinaryConsentGateIndex = publisher.indexOf(
    '!preparedBinding &&',
    packageBindingIndex,
  )
  const atomicPublishRpcIndex = publisher.indexOf(
    "'publish_prepared_showcase_source_run'",
    ordinaryConsentGateIndex,
  )
  if (
    packageBindingIndex === -1 ||
    ordinaryConsentGateIndex <= packageBindingIndex ||
    atomicPublishRpcIndex <= ordinaryConsentGateIndex
  ) {
    fail(
      `${PUBLISHER_PATH}: exact legacy package classification must precede the ordinary consent check and still reach the atomic publication RPC`,
    )
  }
  const preBindingPublisher = publisher.slice(
    publisher.indexOf('export async function publishPreparedShowcaseProjectFromSourceRun'),
    packageBindingIndex,
  )
  if (
    preBindingPublisher.includes("sourceRun.source_visibility !== 'public'") ||
    preBindingPublisher.includes('sourceRun.source_publication_consent_at')
  ) {
    fail(
      `${PUBLISHER_PATH}: review_only legacy imports are still rejected before exact package classification`,
    )
  }

  const databaseContractPath = legacyPublicationMigrationPath()
  let databaseGateChecked = false
  if (existsSync(databaseContractPath)) {
    const migration = read(databaseContractPath)
    for (const required of [
      'private.source_run_public_share_is_publishable(',
      'link.project_id = checked_project_id',
      'link.source_run_id = checked_source_run_id',
      'Prepared publication requires a separately consented and anonymously verified public source link.',
      'CREATE OR REPLACE FUNCTION public.publish_prepared_showcase_source_run(',
      "'review_only'",
      'target_project_id,\n    target_source_run_id',
      'The active public source link belongs to a different prepared project.',
    ]) {
      if (!migration.includes(required)) {
        fail(`${databaseContractPath}: missing database publication gate ${required}`)
      }
    }
    databaseGateChecked = true
  }

  const profileBindingMigration = read(PROFILE_BINDING_MIGRATION_PATH)
  for (const required of [
    'CREATE OR REPLACE FUNCTION public.check_prepared_legacy_seed_profile_binding(',
    'INNER JOIN auth.users AS auth_user',
    'INNER JOIN private.pathforge_profile_operators AS operator',
    "operator.kind = 'pathforge_seed'",
    'auth_user.email_confirmed_at IS NOT NULL',
    "auth_user.raw_app_meta_data->>'pathforge_seed'",
    'Admin or service access required.',
    ') TO authenticated, service_role;',
  ]) {
    if (!profileBindingMigration.includes(required)) {
      fail(`${PROFILE_BINDING_MIGRATION_PATH}: missing authoritative seed check ${required}`)
    }
  }

  const preparedPage = read('src/components/PreparedSourceRunPage.tsx')
  const showcase = read('src/components/SourceRunShowcase.tsx')
  const forkBuildPath = read('src/components/ProjectForkBuildPath.tsx')
  for (const required of [
    'Captured generated HTML payload',
    'Captured assistant text',
    "scope === 'assistant_text'",
    'Only the selected published path is represented.',
    'These four steps are a curated generated-code path.',
    'This is the selected child branch: shared steps 1–3 plus child step 4.',
    'The full provider serialization envelope was not preserved.',
  ]) {
    if (!preparedPage.includes(required)) {
      fail(`src/components/PreparedSourceRunPage.tsx: missing visible capture boundary ${required}`)
    }
  }
  if (
    !preparedPage.includes(
      'defaultStepNumber(sourceRun) === continuation.stepNumber',
    )
  ) {
    fail(
      'src/components/PreparedSourceRunPage.tsx: final fork evidence must use the historical final step rather than curated prompt count',
    )
  }
  for (const required of [
    'data-response-capture-boundary',
    'data-response-capture-disclosure',
    'data-response-capture-label',
  ]) {
    if (!showcase.includes(required)) {
      fail(`src/components/SourceRunShowcase.tsx: missing rendered capture boundary ${required}`)
    }
  }
  for (const required of [
    'responseLabel: step.responseLabel',
    'responseDisclosure: step.responseDisclosure',
  ]) {
    if (!preparedPage.includes(required)) {
      fail(`src/components/PreparedSourceRunPage.tsx: fork response boundary drops ${required}`)
    }
  }
  for (const required of [
    'data-fork-response-capture-disclosure',
    'data-fork-continuation-capture-disclosure',
    'A captured response is preserved in this branch.',
  ]) {
    if (!forkBuildPath.includes(required)) {
      fail(`src/components/ProjectForkBuildPath.tsx: missing fork capture boundary ${required}`)
    }
  }
  if (forkBuildPath.includes('The complete response is preserved in this branch.')) {
    fail(
      'src/components/ProjectForkBuildPath.tsx: curated fork captures must not claim a complete response',
    )
  }

  for (const target of targets) {
    if (!engagement.includes(target.constant)) {
      fail(
        `${ENGAGEMENT_PATH}: ${target.constant} must stay non-persistable until its canonical row is published`,
      )
    }
  }
  return {
    applicationReviewOnlyBypassChecked: true,
    databasePublicShareGateChecked: databaseGateChecked,
    databaseContractPath,
  }
}

function main() {
  if (process.argv.includes('--print-live-sql')) {
    process.stdout.write(`${liveVerificationSql}\n`)
    return
  }

  const featuredSource = read(FEATURED_PROJECTS_PATH)
  const preparedSource = read(PREPARED_PROJECTS_PATH)
  const registeredBindings = preparedLegacySourceRunBindings()
  if (registeredBindings.length !== targets.length) {
    fail('Prepared legacy source-run binding registry must contain exactly the three recovery targets')
  }

  const report = targets.map((target) => {
    const constantPattern = new RegExp(
      `export const ${target.constant} = ['"]${target.projectId}['"]`,
    )
    if (!constantPattern.test(featuredSource)) {
      fail(`${FEATURED_PROJECTS_PATH}: ${target.constant} drifted`)
    }
    const block = exportBlock(preparedSource, target.exportName)
    if (literal(block, 'sourceRunId') !== target.sourceRunId) {
      fail(`${PREPARED_PROJECTS_PATH}: ${target.exportName} sourceRunId drifted`)
    }
    if (literal(block, 'sourceRunPackageFile') !== target.packageFile) {
      fail(`${PREPARED_PROJECTS_PATH}: ${target.exportName} package file drifted`)
    }
    if (
      literal(block, 'authorUsername') !== target.authorUsername &&
      !block.includes(
        'authorUsername: WEEKEND_CHECKLIST_SHOWCASE_PROJECT.authorUsername',
      )
    ) {
      fail(`${PREPARED_PROJECTS_PATH}: ${target.exportName} byline handle drifted`)
    }
    if (
      literal(block, 'authorDisplayName') !== target.authorDisplayName &&
      !block.includes(
        'authorDisplayName: WEEKEND_CHECKLIST_SHOWCASE_PROJECT.authorDisplayName',
      )
    ) {
      fail(`${PREPARED_PROJECTS_PATH}: ${target.exportName} byline name drifted`)
    }
    if (
      target.expectedProjectCreatedAt &&
      literal(block, 'createdAt') !== target.expectedProjectCreatedAt
    ) {
      fail(`${PREPARED_PROJECTS_PATH}: ${target.exportName} createdAt drifted`)
    }
    if (
      target.expectedProjectUpdatedAt &&
      literal(block, 'updatedAt') !== target.expectedProjectUpdatedAt
    ) {
      fail(`${PREPARED_PROJECTS_PATH}: ${target.exportName} updatedAt drifted`)
    }

    const evidence = auditPackage(target)
    const preparedSourceUrl = literal(block, 'sourceUrl')
    const packageSourceUrl = JSON.parse(read(evidence.packagePath)).source_url
    if (preparedSourceUrl !== packageSourceUrl) {
      fail(
        `${PREPARED_PROJECTS_PATH}: ${target.exportName} must preserve its immutable package locator`,
      )
    }
    return {
      ...evidence,
      preparedSourceUrl,
    }
  })

  const workflow = verifyWorkflowSource()
  process.stdout.write(`${JSON.stringify({ targets: report, workflow }, null, 2)}\n`)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
