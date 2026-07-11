#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, relative } from 'node:path'

const failures = []

function read(path, { optional = false } = {}) {
  if (!existsSync(path)) {
    if (!optional) failures.push(`${path}: missing required file`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

function mustInclude(path, text, message) {
  const content = read(path)
  if (!content.includes(text)) failures.push(`${path}: ${message}`)
}

function mustNotMatch(path, pattern, message) {
  const content = read(path)
  if (pattern.test(content)) failures.push(`${path}: ${message}`)
}

function mustNotInclude(path, text, message) {
  const content = read(path)
  if (content.includes(text)) failures.push(`${path}: ${message}`)
}

function optionalMustInclude(path, text, message) {
  if (!existsSync(path)) return
  const content = read(path, { optional: true })
  if (!content.includes(text)) failures.push(`${path}: ${message}`)
}

function optionalMustNotInclude(path, text, message) {
  if (!existsSync(path)) return
  const content = read(path, { optional: true })
  if (content.includes(text)) failures.push(`${path}: ${message}`)
}

function listJsonFiles(directory) {
  if (!existsSync(directory)) return []
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) return listJsonFiles(entryPath)
    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : []
  })
}

const importer = 'scripts/import-pathforge-source-run.mjs'
mustInclude(importer, "source_run_submissions", 'importer must write only to source_run_submissions')
mustInclude(importer, "--submit-draft has been disabled", 'importer must hard-fail the old direct draft flag')
mustInclude(importer, 'checkedPackageSourceRunId', 'importer must centralize checked source-run identity validation')
mustInclude(importer, 'UUID_PATTERN.test(sourceRunId)', 'importer must validate an explicitly checked source-run identity')
mustInclude(importer, 'POSTGRES_UUID_PATTERN.test(args.profileId)', 'connector handoff must accept exact PostgreSQL UUID profile identities, including seeded non-versioned values')
mustInclude(importer, ".eq('id', checkedSourceRunId)", 'checked source-run imports must be idempotent by immutable identity')
mustInclude(importer, 'different intake evidence', 'checked source-run identity collisions must fail closed')
mustInclude(importer, 'immutablePayloadDifferences', 'checked source-run identity must compare the full normalized immutable payload')
mustInclude(importer, 'canonical_source_url', 'package imports must persist canonical source URL identity')
mustInclude(importer, 'source_package_file', 'package imports must persist normalized source package file identity')
mustInclude(importer, 'source_package_sha256', 'package imports must persist the exact package SHA-256')
mustInclude(importer, 'intake_evidence', 'package imports must persist canonical immutable intake evidence')
mustInclude(importer, "if (arg === '--emit-intake-json')", 'importer must expose the checked connector handoff mode')
mustInclude(importer, '--emit-intake-json requires --profile-id with the exact non-admin profile UUID.', 'connector handoff must require an exact author profile UUID')
mustInclude(importer, 'Use either --dry-run or --emit-intake-json, not both.', 'dry-run and connector handoff modes must be mutually exclusive')
mustInclude(importer, 'console.log(JSON.stringify(buildSubmissionPayload({', 'connector handoff must emit the same canonical queue payload used by direct import')
mustInclude(importer, 'Exact-run fork source is neither a published model variant nor the immutable final response of an approved prepared project.', 'exact-run imports must fail closed unless model-variant or prepared-project evidence resolves')
for (const evidenceKey of [
  'model_used',
  'model_settings',
  'prompt_count',
  'final_artifact_path',
  'final_artifact_sha256',
  'profile_registry_id',
  'verification_notes',
  'artifact_version_notes',
  'source_inspiration_notes',
]) {
  mustInclude(importer, evidenceKey, `canonical intake evidence must include ${evidenceKey}`)
}
mustInclude(importer, 'sourceRunStatus', 'idempotent importer output must report the row\'s actual status')
mustInclude(importer, 'validatePackageSteps', 'importer must reject invalid step identities before dry-run or upload')
mustInclude(importer, 'reconcileForkWithParentPackage', 'variant-aware forks must reconcile with parent package evidence when present')
mustInclude(importer, "pkg.source_url = requireString(pkg.source_url, 'source_url')", 'importer must require a real source_url')
mustInclude(importer, "pkg.provider = requireString(pkg.provider, 'provider')", 'importer must require provider metadata')
mustInclude(importer, "pkg.model = requireString(pkg.model || pkg.model_used, 'model')", 'importer must require model metadata')
mustInclude(importer, 'Array.isArray(value)', 'importer must preserve array-style package notes instead of dropping them')
mustInclude(importer, '`Provider: ${provider || \'Not specified\'}`', 'importer notes must include stable provider metadata')
mustInclude(importer, '`Model used: ${modelUsed || \'Not specified\'}`', 'importer notes must include stable model metadata')
mustInclude(importer, "mode: 'source-run-intake'", 'importer result must identify source-run intake mode')
mustInclude(importer, 'No prompt/upvote page is created by this importer.', 'importer output must state that it does not create a prompt page')
mustNotMatch(importer, /\.from\(['"`]prompts['"`]\)/, 'importer must not insert into prompts')
mustNotMatch(importer, /\.from\(['"`]prompt_steps['"`]\)/, 'importer must not insert into prompt_steps')
mustNotMatch(importer, /args\.submitDraft\s*=\s*true|submitDraft:\s*true|mode:\s*['"`]draft['"`]/, 'importer must not support direct pending draft mode')
mustNotMatch(importer, /vote_count|bookmark_count|category_id:\s*category\.id|result_content:\s*pkg/, 'importer must not populate public/upvote-page fields')

const packageFiles = listJsonFiles('seed-runs')
const packagesByRunId = new Map()
for (const packagePath of packageFiles) {
  let pkg
  try {
    pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
  } catch {
    continue
  }
  const packageName = relative('seed-runs', packagePath)
  if (Array.isArray(pkg.steps) && pkg.steps.length > 0) {
    const stepNumbers = pkg.steps.map((step) => step?.step_number)
    const validStepNumbers = stepNumbers.every((stepNumber, index) => (
      Number.isInteger(stepNumber) &&
      stepNumber > 0 &&
      (index === 0 || stepNumber === stepNumbers[index - 1] + 1)
    ))
    if (!validStepNumbers || new Set(stepNumbers).size !== stepNumbers.length) {
      failures.push(`${packagePath}: exact step identities must be positive, unique, and sequential`)
    }
  }
  const runId = typeof pkg.source_run_id === 'string'
    ? pkg.source_run_id.trim()
    : typeof pkg.source_run_submission_id === 'string'
      ? pkg.source_run_submission_id.trim()
      : ''
  if (runId) {
    if (packagesByRunId.has(runId)) {
      failures.push(`${packagePath}: duplicate immutable source run package identity ${runId}`)
    } else {
      packagesByRunId.set(runId, { pkg, packageName })
    }
  }
}

for (const packagePath of packageFiles) {
  let pkg
  try {
    pkg = JSON.parse(readFileSync(packagePath, 'utf8'))
  } catch {
    continue
  }
  const fork = pkg.fork_source
  if (!fork?.source_run_id) continue
  const expectedStepId = `${fork.source_project_id}:${fork.source_run_id}:step:${fork.source_step_number}`
  if (!fork.source_step_id || !Number.isInteger(fork.source_step_number) || fork.source_step_id !== expectedStepId) {
    failures.push(`${packagePath}: variant-aware fork needs matching source_step_id and source_step_number`)
    continue
  }
  const parent = packagesByRunId.get(String(fork.source_run_id).trim())
  if (!parent) continue
  const parentStep = parent.pkg.steps?.find((step) => step?.step_number === fork.source_step_number)
  if (
    !parentStep ||
    parentStep.artifact_version_path !== fork.source_artifact_path ||
    String(parentStep.artifact_sha256 ?? '').toLowerCase() !==
      String(fork.source_artifact_sha256 ?? '').toLowerCase()
  ) {
    failures.push(`${packagePath}: variant-aware fork does not reconcile with parent package ${parent.packageName}`)
  }
}

const legacySeeder = 'scripts/seed-submission.mjs'
optionalMustInclude(legacySeeder, 'Deprecated compatibility shim', 'legacy seed-submission script must stay a safe wrapper, not a second importer')
optionalMustInclude(legacySeeder, 'import-pathforge-source-run.mjs', 'legacy seed-submission script must delegate to the canonical importer')
optionalMustInclude(legacySeeder, 'Old --title/--link/--notes usage is refused', 'legacy seed-submission script must refuse metadata-light submissions')
optionalMustNotInclude(legacySeeder, 'SUPABASE_SERVICE_ROLE_KEY', 'legacy seed-submission script must not load service-role credentials')
optionalMustNotInclude(legacySeeder, "from('source_run_submissions')", 'legacy seed-submission script must not insert source-run rows directly')
optionalMustNotInclude(legacySeeder, 'createClient(', 'legacy seed-submission script must not create its own Supabase client')

const buildPage = 'src/app/prompt/new/page.tsx'
mustInclude(buildPage, 'source link, model info, and notes only', 'source-run card must describe the actual intake fields')
mustInclude(buildPage, 'AI service', 'source-run form must ask where the run happened separately from the model')
mustInclude(buildPage, 'Exact model', 'source-run form must ask for the actual visible model')
mustInclude(buildPage, 'Service name', 'source-run form must let Other providers enter a custom service name')
mustInclude(buildPage, 'sourceRunCustomProvider', 'source-run form must preserve a custom service name when Other is selected')
mustInclude(buildPage, "selectedSourceRunProvider === 'Other'", 'source-run form must branch Other into custom provider entry')
mustInclude(buildPage, 'OpenRouter is the service/router. Put the actual model in the model field.', 'source-run form must not treat OpenRouter as the model')
mustInclude(buildPage, 'Add the exact model shown for this source run, or type Not sure.', 'source-run form must require a model value or explicit Not sure')
mustInclude(buildPage, 'Pick the AI service for this source run.', 'source-run form must require provider metadata')
mustInclude(buildPage, 'disabled={sourceRunSubmitting || !canSubmitSourceRun}', 'source-run submit button must stay disabled until provider/model metadata is present')
mustInclude(buildPage, 'Model settings', 'source-run form must ask for optional visible model settings')
mustInclude(buildPage, 'It does not create a public project page.', 'source-run form must say it does not create a public page')
mustInclude(buildPage, 'Nothing is public until an explicit publish step.', 'source-run flow must preserve the publish boundary')
mustInclude(buildPage, 'fork_source: forkSource', 'source-run form must preserve structured fork metadata when submitting from a fork point')
mustInclude(buildPage, 'Not available for now', 'manual entry card must stay visibly closed for now')
mustInclude(buildPage, '-rotate-6', 'manual entry card must keep the diagonal closed-state bar')
mustNotInclude(buildPage, "setIntakeMode('manual')", 'manual entry card must not activate manual upload mode')
mustNotInclude(buildPage, 'drafts the project page from the source link and notes', 'source-run UI must not promise page drafting on submission')
mustNotInclude(buildPage, 'Agent builds the final-artifact-first project page.', 'source-run UI must not say it builds a page during intake')
mustNotInclude(buildPage, 'Build project page', 'queued source-run card must not list project-page creation as an intake step')
mustNotInclude(buildPage, 'Paste the run and let the agent draft the page.', 'source-run empty state must not frame intake as page drafting')

const repoRunbooks = [
  'PATHFORGE_AGENT_NOTES.md',
  'PATHFORGE_PROFILE_TO_PUBLIC_PAGE_SCOPE.md',
]

for (const path of repoRunbooks) {
  mustInclude(path, 'source-run intake', `${path} must keep intake as the named submission boundary`)
  mustNotInclude(path, 'pending review draft', `${path} must not use pending draft as submission language`)
  mustNotInclude(path, 'If an entry starts as a session link, the agent drafts the project page first.', `${path} must not say session-link intake creates a page first`)
  mustNotInclude(path, 'Turns queued session links into pending PathForge project pages.', `${path} must not define source-run intake as page creation`)
}

mustInclude('src/lib/data/source-runs.ts', 'Add the exact model shown for this source run, or type Not sure.', 'server action must enforce model metadata for user source-run uploads')
mustInclude('src/lib/data/source-runs.ts', 'Pick the AI service for this source run.', 'server action must enforce provider metadata for user source-run uploads')
mustInclude('src/lib/data/source-runs.ts', 'projectForkSourceToSubmissionFields', 'server action must store structured fork metadata for forked source-run uploads')
mustInclude('src/lib/data/source-runs.ts', 'sourceRunForkColumnsMissing', 'server action must keep source-run intake working before fork SQL is applied')
mustInclude('src/lib/data/source-runs.ts', 'assertExactForkTuple', 'prepared publish must compare intake, prepared, and package fork tuples')
mustInclude('src/lib/data/source-runs.ts', "'publish_prepared_showcase_source_run'", 'prepared publish must prefer the atomic database RPC')
mustInclude('src/lib/data/source-runs.ts', 'source_package_sha256', 'prepared publish must verify the immutable package digest')
mustInclude('src/lib/data/source-runs.ts', 'intake_evidence', 'prepared publish must verify canonical immutable intake evidence')
mustInclude('src/lib/data/source-runs.ts', 'canonical_source_url', 'prepared publish must exact-compare canonical source URL identity')
mustInclude('src/lib/data/source-runs.ts', 'source_package_file', 'prepared publish must exact-compare source package file identity')
mustInclude('src/lib/data/source-runs.ts', 'public_href: project.href', 'atomic project payload must use the finalized public_href key')
mustNotInclude('src/lib/data/source-runs.ts', 'const insertPayload = {', 'prepared publish must not retain a non-atomic public prompt fallback')
mustInclude('src/lib/source-run-package.ts', 'validateSequentialSteps', 'source package reads must reject invalid step identities')
mustInclude('src/lib/source-run-package.ts', 'reconcileVariantAwareForkWithParentPackage', 'source package reads must reconcile variant forks with parent evidence')
mustInclude('src/lib/source-run-package.ts', 'buildSourceRunIntakeEvidence', 'runtime publishing must rebuild the same canonical intake evidence as the importer')
mustInclude('src/lib/source-run-review.ts', "labeledValue(notes, 'Provider/model')", 'admin metadata parser must preserve legacy provider/model notes')
mustInclude('src/lib/source-run-review.ts', "labeledValue(notes, 'Provider/model/settings')", 'admin metadata parser must preserve legacy provider/model/settings notes')
mustInclude('src/app/admin/page.tsx', 'modelMetadataForSourceRunReview', 'admin pending rows must surface model metadata')
mustInclude('src/app/admin/page.tsx', 'projectForkSourceFromSubmissionFields', 'admin pending rows must surface structured fork metadata')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', 'Model captured', 'admin source-run detail must surface captured model metadata')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', 'Fork source', 'admin source-run detail must surface structured fork metadata')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', 'linkedPromptStatus', 'admin detail must inspect linked prompt status before labeling source-run review state')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', 'Rejected source-run page', 'admin detail must not label rejected linked pages as pending')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', 'Declined source run', 'admin detail must not label declined source-run intakes as pending')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', 'Prepared page pending approval', 'admin detail must distinguish prepared pages from raw queued intakes')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', '!isPublished && !isDeclined', 'admin detail must hide decline controls for terminal source-run states')

const skillBase = join(homedir(), '.codex/skills/pathforge-seed-iteration')
const skillFiles = [
  join(skillBase, 'SKILL.md'),
  join(skillBase, 'pathforge-seed-iteration/SKILL.md'),
  join(skillBase, 'agents/openai.yaml'),
  join(skillBase, 'pathforge-seed-iteration/agents/openai.yaml'),
  join(skillBase, 'references/pathforge-seed-package.md'),
  join(skillBase, 'pathforge-seed-iteration/references/pathforge-seed-package.md'),
]

for (const path of skillFiles) {
  optionalMustInclude(path, 'source-run', `${path} must keep source-run language`)
  optionalMustNotInclude(path, 'pending review draft', `${path} must not say pending review draft`)
  optionalMustNotInclude(path, 'pending project under a realistic synthetic profile', `${path} must not say importer creates pending projects`)
  optionalMustNotInclude(path, 'Description: what the run produced.', `${path} must not list project-page description as a submission field`)
  optionalMustNotInclude(path, 'Outcome/result: final artifact summary and verification note.', `${path} must not list outcome/result as a submission field`)
  optionalMustNotInclude(path, 'Category: broad domain.', `${path} must not list category as a submission field`)
  optionalMustNotInclude(path, 'Difficulty: usually `beginner`', `${path} must not list difficulty as a submission field`)
  optionalMustNotInclude(path, 'Steps: each prompt/response pair with exact text.', `${path} must not list prompt steps as a submission field`)
  optionalMustNotInclude(path, 'vote_count', `${path} must not carry upvote-page defaults`)
  optionalMustNotInclude(path, 'bookmark_count', `${path} must not carry upvote-page defaults`)
}

if (failures.length > 0) {
  console.error('Source-run intake guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('Source-run intake guard passed.')
