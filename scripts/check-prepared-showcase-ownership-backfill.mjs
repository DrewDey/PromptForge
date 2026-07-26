#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'

const FEATURED_PROJECTS_PATH = 'src/lib/featured-projects.ts'
const PREPARED_PROJECTS_PATH = 'src/lib/prepared-showcase-projects.ts'
const SOURCE_RUN_IMPORTER_PATH = 'scripts/import-pathforge-source-run.mjs'
const DISPLAY_NAME_MIGRATION_PATH =
  'supabase/migrations/20260712021954_backfill_seed_profile_display_names.sql'

const targets = [
  {
    constant: 'POMODORO_TIMER_PROJECT_ID',
    exportName: 'POMODORO_TIMER_SHOWCASE_PROJECT',
    projectId: '3b9c61d8-4e27-4f0a-9c5d-2a8f1e6b7c40',
    sourceRunId: '6a1f9bc4-c390-832f-88a5-d978d2e42577',
    authorUsername: 'JordanWells',
    authorDisplayName: 'Jordan Wells',
    artifactPath: 'public/artifacts/pomodoro-focus-timer-gpt55-instant.html',
    packageFile: null,
    expectedState: 'blocked_missing_source_package',
  },
  {
    constant: 'WEEKEND_CHECKLIST_REAL_FORK_PROJECT_ID',
    exportName: 'WEEKEND_CHECKLIST_REAL_FORK_SHOWCASE_PROJECT',
    projectId: 'e3f1d1a7-1d18-4a7b-ba54-045526cd2661',
    sourceRunId: '80b083bb-4f94-4411-b071-a5da731d3e2d',
    authorUsername: 'NoraBrooks',
    authorDisplayName: 'Nora Brooks',
    artifactPath:
      'public/artifacts/weekend-plan-checklist-chatgpt-family-road-trip-fork-step-4.html',
    packageFile: 'weekend-plan-checklist-chatgpt-family-road-trip-fork.json',
    expectedState: 'repair_package_metadata_then_import',
  },
  {
    constant: 'SCHOOL_DESK_HP_CALCULATOR_FORK_PROJECT_ID',
    exportName: 'SCHOOL_DESK_HP_CALCULATOR_FORK_SHOWCASE_PROJECT',
    projectId: 'f25f83df-29c5-4d07-97b8-e7f6d2a902b8',
    sourceRunId: 'd9fa40e7-7725-4387-ad5b-14f25cf744ce',
    authorUsername: 'RowanPierce',
    authorDisplayName: 'Rowan Pierce',
    artifactPath:
      'public/artifacts/school-desk-hp-10bii-calculator-claude-5-fable-max-fork.html',
    packageFile: 'school-desk-hp-10bii-calculator-claude-5-fable-max-fork.json',
    expectedState:
      'evidence_prepared_blocked_private_source_mock_profile_and_consent_workflow',
    nonVerbatimResponsePattern:
      /Claude responded with one complete self-contained HTML code block/i,
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
    expectedEvidenceScope: 'selected_published_path',
    expectedResponseCaptureScope: 'generated_html_code_payload',
    expectedAdminReviewStatus:
      'evidence_prepared_blocked_pending_authorized_profile_and_public_share_consent',
    expectedPublicStatus: 'not_public_not_published',
    requirePreparedSourceUrlMatch: true,
    requireSameIdPublicConsentWorkflow: true,
  },
]

const liveVerificationSql = `WITH targets(project_id, source_run_id, author_username) AS (
  VALUES
    ('3b9c61d8-4e27-4f0a-9c5d-2a8f1e6b7c40'::uuid, '6a1f9bc4-c390-832f-88a5-d978d2e42577'::uuid, 'JordanWells'),
    ('e3f1d1a7-1d18-4a7b-ba54-045526cd2661'::uuid, '80b083bb-4f94-4411-b071-a5da731d3e2d'::uuid, 'NoraBrooks'),
    ('f25f83df-29c5-4d07-97b8-e7f6d2a902b8'::uuid, 'd9fa40e7-7725-4387-ad5b-14f25cf744ce'::uuid, 'RowanPierce')
)
SELECT
  targets.project_id,
  prompts.title AS canonical_project_title,
  prompts.status AS canonical_project_status,
  targets.source_run_id,
  source_run_submissions.status AS source_run_status,
  source_run_submissions.extracted_prompt_id,
  targets.author_username,
  profiles.id AS author_profile_id,
  profiles.display_name AS author_display_name
FROM targets
LEFT JOIN public.prompts ON prompts.id = targets.project_id
LEFT JOIN public.source_run_submissions ON source_run_submissions.id = targets.source_run_id
LEFT JOIN public.profiles ON profiles.username = targets.author_username
ORDER BY targets.project_id;

SELECT
  COUNT(*) FILTER (WHERE profiles.username = 'JordanLee') AS legitimate_jordan_lee_rows,
  COUNT(*) FILTER (WHERE profiles.username <> 'JordanLee') AS cloned_seed_display_names
FROM public.profiles AS profiles
JOIN auth.users AS auth_users ON auth_users.id = profiles.id
WHERE profiles.display_name = 'Jordan Lee'
  AND LOWER(auth_users.email) LIKE '%@pathforge-seed.example.com';`

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

function isPublicProviderShareUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return false
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.search || url.hash) return false
    const host = url.hostname.toLowerCase()
    if (host === 'chatgpt.com') return /^\/share\/[A-Za-z0-9-]+\/?$/.test(url.pathname)
    if (host === 'claude.ai') return /^\/share\/[A-Za-z0-9-]+\/?$/.test(url.pathname)
    if (host === 'g.co') return /^\/gemini\/share\/[A-Za-z0-9-]+\/?$/.test(url.pathname)
    if (host === 'gemini.google.com') return /^\/share\/[A-Za-z0-9-]+\/?$/.test(url.pathname)
    return false
  } catch {
    return false
  }
}

function isDurableProfileRegistryId(value) {
  return (
    typeof value === 'string' &&
    Boolean(value.trim()) &&
    !value.startsWith('prepared-showcase-mock-')
  )
}

function exportBlock(source, exportName) {
  const start = source.indexOf(`export const ${exportName}`)
  if (start === -1) fail(`${PREPARED_PROJECTS_PATH}: missing ${exportName}`)
  const next = source.indexOf('\nexport const ', start + 1)
  return source.slice(start, next === -1 ? source.length : next)
}

function literal(block, field) {
  const match = block.match(new RegExp(`${field}:\\s*['\"]([^'\"]+)['\"]`))
  return match?.[1] ?? null
}

function packageAudit(target) {
  if (!target.packageFile) {
    return {
      packagePath: null,
      packageExists: false,
      packageSha256: null,
      sourceRunIdentity: null,
      artifactSha256Declared: null,
      responseEvidenceVerbatim: false,
      importerReady: false,
      blockers: ['missing source-run package'],
    }
  }

  const packagePath = `seed-runs/${target.packageFile}`
  if (!existsSync(packagePath)) fail(`${packagePath}: declared package is missing`)
  const pkg = JSON.parse(read(packagePath))
  const artifactPath = pkg.final_artifact_path
  if (artifactPath !== target.artifactPath) {
    fail(`${packagePath}: final_artifact_path differs from the prepared registry`)
  }
  if (!existsSync(artifactPath)) fail(`${artifactPath}: final artifact is missing`)

  const artifactDigest = sha256(artifactPath)
  if (pkg.artifact_sha256 && pkg.artifact_sha256 !== artifactDigest) {
    fail(`${packagePath}: artifact_sha256 differs from the actual artifact`)
  }

  const sourceRunIdentity = pkg.source_run_id ?? pkg.source_run_submission_id ?? null
  if (sourceRunIdentity !== target.sourceRunId) {
    fail(`${packagePath}: source-run identity differs from the prepared registry`)
  }

  const steps = Array.isArray(pkg.steps) ? pkg.steps : []
  const finalStep = steps.at(-1)
  const responseEvidenceVerbatim = steps.length > 0 && steps.every((step) => (
    typeof step.response_exact === 'string' &&
    step.response_exact.trim() &&
    !target.nonVerbatimResponsePattern?.test(step.response_exact)
  ))
  let finalResponseMatchesPreservedCapture = null
  let rawResponseSha256 = null
  if (target.rawResponsePath) {
    if (!existsSync(target.rawResponsePath)) {
      fail(`${target.rawResponsePath}: preserved raw response capture is missing`)
    }
    rawResponseSha256 = sha256(target.rawResponsePath)
    if (rawResponseSha256 !== target.rawResponseSha256) {
      fail(`${target.rawResponsePath}: preserved raw response capture hash drifted`)
    }
    finalResponseMatchesPreservedCapture =
      typeof finalStep?.response_exact === 'string' &&
      finalStep.response_exact === read(target.rawResponsePath)
  }

  if (target.expectedRunStartedAt && pkg.run_started_at !== target.expectedRunStartedAt) {
    fail(`${packagePath}: run_started_at differs from authoritative capture telemetry`)
  }
  if (target.expectedRunFinishedAt && pkg.run_finished_at !== target.expectedRunFinishedAt) {
    fail(`${packagePath}: run_finished_at differs from authoritative capture telemetry`)
  }
  if (
    target.expectedArtifactCapturedAt &&
    pkg.artifact_captured_at !== target.expectedArtifactCapturedAt
  ) {
    fail(`${packagePath}: artifact_captured_at differs from authoritative capture telemetry`)
  }
  if (target.expectedEvidenceScope && pkg.evidence_scope !== target.expectedEvidenceScope) {
    fail(`${packagePath}: evidence_scope must disclose its curated published-path boundary`)
  }
  if (
    target.expectedAdminReviewStatus &&
    pkg.admin_review_status !== target.expectedAdminReviewStatus
  ) {
    fail(`${packagePath}: admin_review_status must remain fail-closed`)
  }
  if (target.expectedPublicStatus && pkg.public_status !== target.expectedPublicStatus) {
    fail(`${packagePath}: public_status must not claim publication`)
  }
  if (
    target.expectedFirstLiveAt &&
    !String(pkg.verification_notes ?? '').includes(target.expectedFirstLiveAt)
  ) {
    fail(`${packagePath}: verification_notes must preserve the first live proof timestamp`)
  }

  const sourceUrlIsPublicProviderShare = isPublicProviderShareUrl(pkg.source_url)
  const profileRegistryIdIsDurable = isDurableProfileRegistryId(
    pkg.submitted_by_profile_registry_id,
  )
  const selectedPathIsExplicit = (
    pkg.evidence_scope === 'selected_published_path' &&
    Array.isArray(pkg.omitted_provider_turns) &&
    pkg.omitted_provider_turns.some((turn) => (
      turn?.status === 'aborted_without_final_response' &&
      turn?.included_in_published_path === false
    ))
  )
  const responseCaptureNormalizationIsExplicit = (
    pkg.response_capture_normalization?.scope === target.expectedResponseCaptureScope &&
    pkg.response_capture_normalization?.removed_provider_ui_language_label === true &&
    pkg.response_capture_normalization?.trimmed_outer_whitespace === true &&
    pkg.response_capture_normalization?.appended_final_newline === true &&
    pkg.response_capture_normalization?.provider_serialization_envelope_preserved === false
  )
  const promptCount = Number.isInteger(pkg.prompt_count) ? pkg.prompt_count : steps.length
  const futureForkSourceReady = (
    Number.isInteger(finalStep?.step_number) &&
    promptCount === finalStep.step_number
  )
  const sourceRunImporter = read(SOURCE_RUN_IMPORTER_PATH)
  const sameIdPublicConsentWorkflowAvailable = (
    /source_visibility\s*:/.test(sourceRunImporter) &&
    /source_publication_consent_at\s*:/.test(sourceRunImporter)
  )
  const blockers = []
  if (!pkg.source_run_id) blockers.push('source_run_id is missing (legacy alias alone is not importer identity)')
  if (!pkg.artifact_sha256) blockers.push('artifact_sha256 is missing')
  if (!responseEvidenceVerbatim) blockers.push('response_exact contains non-verbatim summary evidence')
  if (finalResponseMatchesPreservedCapture === false) {
    blockers.push('successful response_exact does not match the preserved raw response bytes')
  }
  if (!sourceUrlIsPublicProviderShare) {
    blockers.push('source_url is not an anonymously accessible public provider share URL')
  }
  if (!profileRegistryIdIsDurable) {
    blockers.push('submitted_by_profile_registry_id is a mock or missing profile identity')
  }
  if (target.expectedEvidenceScope && !selectedPathIsExplicit) {
    blockers.push('omitted aborted provider turn is not disclosed')
  }
  if (
    target.expectedResponseCaptureScope &&
    !responseCaptureNormalizationIsExplicit
  ) {
    blockers.push('raw response extraction normalization is not disclosed')
  }
  if (
    target.requireSameIdPublicConsentWorkflow &&
    !sameIdPublicConsentWorkflowAvailable
  ) {
    blockers.push(
      'canonical importer has no authorized same-ID workflow to record public-source consent',
    )
  }

  return {
    packagePath,
    packageExists: true,
    packageSha256: sha256(packagePath),
    sourceRunIdentity,
    sourceUrl: pkg.source_url ?? null,
    artifactSha256Actual: artifactDigest,
    artifactSha256Declared: pkg.artifact_sha256 ?? null,
    responseEvidenceVerbatim,
    rawResponsePath: target.rawResponsePath ?? null,
    rawResponseSha256,
    finalResponseMatchesPreservedCapture,
    sourceUrlIsPublicProviderShare,
    profileRegistryIdIsDurable,
    selectedPathIsExplicit,
    responseCaptureNormalizationIsExplicit,
    futureForkSourceReady,
    sameIdPublicConsentWorkflowAvailable,
    importerReady: blockers.length === 0,
    blockers,
  }
}

function main() {
  if (process.argv.includes('--print-live-sql')) {
    process.stdout.write(`${liveVerificationSql}\n`)
    return
  }

  const featuredSource = read(FEATURED_PROJECTS_PATH)
  const preparedSource = read(PREPARED_PROJECTS_PATH)
  const migration = read(DISPLAY_NAME_MIGRATION_PATH)

  for (const requiredGuard of [
    "profile.display_name = 'Jordan Lee'",
    "LOWER(profile.username) <> 'jordanlee'",
    "LIKE '%@pathforge-seed.example.com'",
    "LIKE LOWER(profile.username) || '.%'",
  ]) {
    if (!migration.includes(requiredGuard)) {
      fail(`${DISPLAY_NAME_MIGRATION_PATH}: missing safety guard ${requiredGuard}`)
    }
  }

  const report = targets.map((target) => {
    const constantPattern = new RegExp(
      `export const ${target.constant} = ['\"]${target.projectId}['\"]`,
    )
    if (!constantPattern.test(featuredSource)) {
      fail(`${FEATURED_PROJECTS_PATH}: ${target.constant} drifted from ${target.projectId}`)
    }

    const block = exportBlock(preparedSource, target.exportName)
    if (!block.includes(`id: ${target.constant}`)) {
      fail(`${PREPARED_PROJECTS_PATH}: ${target.exportName} does not use ${target.constant}`)
    }
    if (literal(block, 'sourceRunId') !== target.sourceRunId) {
      fail(`${PREPARED_PROJECTS_PATH}: ${target.exportName} sourceRunId drifted`)
    }
    if (literal(block, 'authorUsername') !== target.authorUsername &&
        !block.includes('authorUsername: WEEKEND_CHECKLIST_SHOWCASE_PROJECT.authorUsername')) {
      fail(`${PREPARED_PROJECTS_PATH}: ${target.exportName} authorUsername drifted`)
    }
    if (literal(block, 'authorDisplayName') !== target.authorDisplayName &&
        !block.includes('authorDisplayName: WEEKEND_CHECKLIST_SHOWCASE_PROJECT.authorDisplayName')) {
      fail(`${PREPARED_PROJECTS_PATH}: ${target.exportName} authorDisplayName drifted`)
    }
    if (literal(block, 'artifactPath') !== target.artifactPath.replace(/^public/, '')) {
      fail(`${PREPARED_PROJECTS_PATH}: ${target.exportName} artifactPath drifted`)
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
    if (target.packageFile && literal(block, 'sourceRunPackageFile') !== target.packageFile) {
      fail(`${PREPARED_PROJECTS_PATH}: ${target.exportName} package declaration drifted`)
    }
    if (!existsSync(target.artifactPath)) fail(`${target.artifactPath}: missing`)

    const evidence = packageAudit(target)
    const preparedSourceUrl = literal(block, 'sourceUrl')
    if (
      target.requirePreparedSourceUrlMatch &&
      preparedSourceUrl !== evidence.sourceUrl
    ) {
      fail(`${PREPARED_PROJECTS_PATH}: ${target.exportName} sourceUrl differs from its package`)
    }

    return {
      projectId: target.projectId,
      sourceRunId: target.sourceRunId,
      authorUsername: target.authorUsername,
      authorDisplayName: target.authorDisplayName,
      artifactPath: target.artifactPath,
      artifactSha256: sha256(target.artifactPath),
      expectedState: target.expectedState,
      preparedSourceUrl,
      evidence,
    }
  })

  process.stdout.write(`${JSON.stringify({ targets: report }, null, 2)}\n`)
}

try {
  main()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
