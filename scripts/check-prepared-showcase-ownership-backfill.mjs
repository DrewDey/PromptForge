#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'

const FEATURED_PROJECTS_PATH = 'src/lib/featured-projects.ts'
const PREPARED_PROJECTS_PATH = 'src/lib/prepared-showcase-projects.ts'
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
    expectedState: 'blocked_non_verbatim_response_evidence',
    nonVerbatimResponsePattern:
      /Claude responded with one complete self-contained HTML code block/i,
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
  const responseEvidenceVerbatim = steps.length > 0 && steps.every((step) => (
    typeof step.response_exact === 'string' &&
    step.response_exact.trim() &&
    !target.nonVerbatimResponsePattern?.test(step.response_exact)
  ))
  const blockers = []
  if (!pkg.source_run_id) blockers.push('source_run_id is missing (legacy alias alone is not importer identity)')
  if (!pkg.artifact_sha256) blockers.push('artifact_sha256 is missing')
  if (!responseEvidenceVerbatim) blockers.push('response_exact contains non-verbatim summary evidence')

  return {
    packagePath,
    packageExists: true,
    packageSha256: sha256(packagePath),
    sourceRunIdentity,
    artifactSha256Actual: artifactDigest,
    artifactSha256Declared: pkg.artifact_sha256 ?? null,
    responseEvidenceVerbatim,
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
    if (target.packageFile && literal(block, 'sourceRunPackageFile') !== target.packageFile) {
      fail(`${PREPARED_PROJECTS_PATH}: ${target.exportName} package declaration drifted`)
    }
    if (!existsSync(target.artifactPath)) fail(`${target.artifactPath}: missing`)

    return {
      projectId: target.projectId,
      sourceRunId: target.sourceRunId,
      authorUsername: target.authorUsername,
      authorDisplayName: target.authorDisplayName,
      artifactPath: target.artifactPath,
      artifactSha256: sha256(target.artifactPath),
      expectedState: target.expectedState,
      evidence: packageAudit(target),
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
