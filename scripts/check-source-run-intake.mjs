#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, relative } from 'node:path'
import {
  assertAuthoritativePreparedLegacyProfileBinding,
  assertPreparedLegacyPackageBinding,
  assertPreparedLegacyProfileBinding,
  preparedLegacySourceRunBindings,
} from '../src/lib/prepared-legacy-source-runs.mjs'

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
mustInclude(importer, 'POSTGRES_UUID_PATTERN.test(sourceRunId)', 'importer must validate checked identities using PostgreSQL UUID acceptance')
mustInclude(importer, 'POSTGRES_UUID_PATTERN.test(args.profileId)', 'connector handoff must accept exact PostgreSQL UUID profile identities, including seeded non-versioned values')
mustInclude(importer, ".eq('id', checkedSourceRunId)", 'checked source-run imports must be idempotent by immutable identity')
mustInclude(importer, 'different intake evidence', 'checked source-run identity collisions must fail closed')
mustInclude(importer, 'immutablePayloadDifferences', 'checked source-run identity must compare the full normalized immutable payload')
mustInclude(importer, 'canonical_source_url', 'package imports must persist canonical source URL identity')
mustInclude(importer, "new URL(requireString(value, 'source_url').toLowerCase())", 'connector intake canonicalization must match the database lowercase identity contract')
mustInclude('src/lib/source-run-package.ts', 'new URL(value.trim().toLowerCase())', 'prepared publication canonicalization must match the database lowercase identity contract')
for (const trackingKey of ['utm_', 'fbclid', 'gclid', 'mc_cid', 'mc_eid']) {
  mustInclude(importer, trackingKey, `connector intake canonicalization must remove ${trackingKey}`)
  mustInclude('src/lib/source-run-package.ts', trackingKey, `prepared publication canonicalization must remove ${trackingKey}`)
}
mustInclude(importer, 'source_package_file', 'package imports must persist normalized source package file identity')
mustInclude(importer, 'source_package_sha256', 'package imports must persist the exact package SHA-256')
mustInclude(importer, 'intake_evidence', 'package imports must persist canonical immutable intake evidence')
mustInclude(importer, "if (arg === '--emit-intake-json')", 'importer must expose the checked connector handoff mode')
mustInclude(importer, '--emit-intake-json requires --profile-id with the exact non-admin profile UUID.', 'connector handoff must require an exact author profile UUID')
mustInclude(importer, 'Use either --dry-run or --emit-intake-json, not both.', 'dry-run and connector handoff modes must be mutually exclusive')
mustInclude(importer, 'legacyImportHandoff(preparedBinding, payload, validatedForkFields)', 'prepared connector handoff must emit the exact service-only RPC call')
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
mustInclude(importer, 'if (!preparedBinding) requirePublicProviderShareUrl(pkg.source_url)', 'ordinary imports must remain public-share-only while exact prepared legacy packages preserve private evidence')
mustInclude(importer, "'import_legacy_prepared_source_run'", 'prepared legacy import must call PM1\'s service-only RPC')
mustInclude(importer, 'immutable_intake: immutableLegacyIntake(payload)', 'legacy RPC must receive only the immutable review intake')
mustInclude(importer, 'immutable_fork: canonicalForkEvidence(forkFields)', 'legacy RPC must receive the exact immutable fork tuple')
mustInclude(importer, 'Prepared legacy imports require SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY', 'prepared legacy import must refuse public-signup fallback')
mustInclude(importer, "select('id, username, display_name, role')", 'prepared author lookup must verify public identity and non-admin role')
mustInclude(importer, "'check_prepared_legacy_seed_profile_binding'", 'prepared author lookup must verify protected Auth/operator authority')
mustInclude(importer, 'assertAuthoritativePreparedLegacyProfileBinding(binding, verified)', 'prepared author lookup must enforce its authoritative package profile binding')
mustInclude('supabase/migrations/20260727014500_enforce_prepared_legacy_import_profile_binding.sql', 'CREATE TABLE private.prepared_legacy_seed_profile_bindings', 'offline prepared handoff must have a database-owned exact profile registry')
mustInclude('supabase/migrations/20260727014500_enforce_prepared_legacy_import_profile_binding.sql', 'CREATE TRIGGER enforce_prepared_legacy_import_profile_binding', 'offline prepared handoff must be checked when immutable import evidence is recorded')
mustInclude('supabase/migrations/20260727014500_enforce_prepared_legacy_import_profile_binding.sql', 'Protected legacy import author lacks its exact confirmed seed-profile binding.', 'offline prepared handoff must fail closed on an arbitrary author UUID')
mustInclude('supabase/migrations/20260727024500_allow_curated_legacy_intake_evidence.sql', "'evidence_scope'", 'curated legacy evidence must retain its disclosed scope')
mustInclude('supabase/migrations/20260727024500_allow_curated_legacy_intake_evidence.sql', "'source_access'", 'curated legacy evidence must retain its private-source access boundary')
mustInclude('supabase/migrations/20260727024500_allow_curated_legacy_intake_evidence.sql', "'response_capture_normalization'", 'curated legacy evidence must retain response normalization disclosure')
mustInclude('supabase/migrations/20260727024500_allow_curated_legacy_intake_evidence.sql', "'omitted_provider_turns'", 'curated legacy evidence must retain omitted-turn disclosure')
mustInclude('supabase/migrations/20260727024500_allow_curated_legacy_intake_evidence.sql', "(NEW.intake_evidence->'source_access') - ARRAY[", 'curated source access must reject unknown keys')
mustInclude('supabase/migrations/20260727024500_allow_curated_legacy_intake_evidence.sql', "IS DISTINCT FROM 'boolean'", 'curated source-access flags must remain typed booleans')
mustInclude(importer, "profileRegistryId.startsWith('prepared-showcase-mock-')", 'importer must reject prepared showcase mock profile identities')
mustInclude(importer, "pkg.provider = requireString(pkg.provider, 'provider')", 'importer must require provider metadata')
mustInclude(importer, "pkg.model = requireString(pkg.model || pkg.model_used, 'model')", 'importer must require model metadata')
mustInclude(importer, 'Array.isArray(value)', 'importer must preserve array-style package notes instead of dropping them')
mustInclude(importer, '`Provider: ${provider || \'Not specified\'}`', 'importer notes must include stable provider metadata')
mustInclude(importer, '`Model used: ${modelUsed || \'Not specified\'}`', 'importer notes must include stable model metadata')
mustInclude(importer, ": 'source-run-intake'", 'importer result must identify source-run intake mode')
mustInclude(importer, 'No prompt/upvote page is created by this importer.', 'importer output must state that it does not create a prompt page')
mustNotMatch(importer, /\.from\(['"`]prompts['"`]\)/, 'importer must not insert into prompts')
mustNotMatch(importer, /\.from\(['"`]prompt_steps['"`]\)/, 'importer must not insert into prompt_steps')
mustNotMatch(importer, /args\.submitDraft\s*=\s*true|submitDraft:\s*true|mode:\s*['"`]draft['"`]/, 'importer must not support direct pending draft mode')
mustNotMatch(importer, /vote_count|bookmark_count|category_id:\s*category\.id|result_content:\s*pkg/, 'importer must not populate public/upvote-page fields')
mustInclude('src/lib/source-run-package.ts', 'isAllowlistedProviderEvidenceLocator(sourceUrl)', 'prepared publication must preserve allowlisted private legacy locators as immutable package evidence')
mustNotInclude('src/lib/source-run-package.ts', 'isSupportedCommunitySourceUrl(sourceUrl)', 'prepared publication must not confuse immutable package evidence with a public provider share')
mustInclude('src/lib/data/source-runs.ts', 'isSupportedCommunitySourceUrl(sourceUrl)', 'ordinary source-run intake must remain public-share-only')
mustInclude('supabase/migrations/20260726203000_legacy_public_source_grandfathering.sql', 'check_source_run_public_share_for_publication', 'prepared publication must expose the exact project/source-run share gate to the application layer')
mustInclude('supabase/migrations/20260726203000_legacy_public_source_grandfathering.sql', "'review_only'", 'the service-only legacy import must retain private evidence without legacy public-link consent')
mustInclude('src/lib/source-run-package.ts', "profileRegistryId.startsWith('prepared-showcase-mock-')", 'prepared publication must reject mock profile provenance')
mustInclude('src/lib/source-run-package.ts', 'public_share_managed_separately', 'package parser must preserve the separate public-link registry boundary')
mustInclude('src/lib/source-run-package.ts', 'publicShareManagedSeparately === undefined', 'runtime evidence must omit absent source-access keys just like JSON intake')
mustInclude('src/lib/source-run-package.ts', 'response_capture_normalization', 'package parser must preserve curated transcript normalization')
mustInclude('src/lib/source-run-package.ts', 'omitted_provider_turns', 'package parser must preserve omitted-turn disclosure')
mustInclude('scripts/create-pathforge-seed-profile.mjs', 'findAuthUsersByPreparedUsername(', 'prepared provisioning must reconcile Auth-only partial identities before creating a duplicate')
mustInclude('scripts/create-pathforge-seed-profile.mjs', 'Repair that partial account before provisioning; no duplicate was created.', 'prepared provisioning must stop on an Auth-only partial identity')
for (const required of [
  'CREATE OR REPLACE FUNCTION public.check_prepared_legacy_seed_profile_binding(',
  'INNER JOIN auth.users AS auth_user',
  'INNER JOIN private.pathforge_profile_operators AS operator',
  "operator.kind = 'pathforge_seed'",
  'auth_user.email_confirmed_at IS NOT NULL',
  "auth_user.raw_app_meta_data->>'pathforge_seed'",
]) {
  mustInclude(
    'supabase/migrations/20260726210000_prepared_legacy_seed_profile_binding.sql',
    required,
    `prepared author authority migration must include ${required}`,
  )
}

const preparedPackagesByRunId = new Map([
  ['d9fa40e7-7725-4387-ad5b-14f25cf744ce', 'school-desk-hp-10bii-calculator-claude-5-fable-max-fork.json'],
  ['6a1f9bc4-c390-832f-88a5-d978d2e42577', 'pomodoro-focus-timer-chatgpt-gpt55-instant-source-run.json'],
  ['80b083bb-4f94-4411-b071-a5da731d3e2d', 'weekend-plan-checklist-chatgpt-family-road-trip-fork.json'],
  ['6a122064-6094-832a-9228-e239ce31e79b', 'snake-gpt55-pro-oneshot-source-run.json'],
])
for (const binding of preparedLegacySourceRunBindings()) {
  const packageFile = preparedPackagesByRunId.get(binding.sourceRunId)
  if (!packageFile) {
    failures.push(`missing exact prepared package fixture for ${binding.sourceRunId}`)
    continue
  }
  const packagePath = join('seed-runs', packageFile)
  const pkg = JSON.parse(read(packagePath))
  try {
    assertPreparedLegacyPackageBinding(pkg)
    assertPreparedLegacyProfileBinding(
      binding,
      {
        username: binding.username,
        display_name: binding.displayName,
        role: 'user',
      },
      binding.provenanceKind,
    )
    assertAuthoritativePreparedLegacyProfileBinding(
      binding,
      {
        username: binding.username,
        display_name: binding.displayName,
        role: 'user',
        provenance_kind: binding.provenanceKind,
        operator_kind: binding.operatorKind,
        email_confirmed: true,
        auth_seed_marker: true,
      },
    )
  } catch (error) {
    failures.push(`${packagePath}: ${error instanceof Error ? error.message : String(error)}`)
  }

  for (const [label, mutate] of [
    ['Drew reassignment', (value) => {
      value.recommended_seed_profile.username = 'Drew'
    }],
    ['wrong registry id', (value) => {
      value.submitted_by_profile_registry_id = 'pathforge-seed-001'
    }],
    ['wrong display name', (value) => {
      value.recommended_seed_profile.display_name = 'Jordan Lee'
    }],
    ['wrong project id', (value) => {
      value.prepared_project_id = '00000000-0000-4000-8000-000000000000'
    }],
    ['missing protected project id', (value) => {
      delete value.prepared_project_id
    }],
    ['missing protected source-run id', (value) => {
      delete value.source_run_id
    }],
    ['all protected identity fields removed', (value) => {
      delete value.prepared_project_id
      delete value.source_run_id
      delete value.source_run_submission_id
    }],
    ...(binding.authSeedMarkerRequired
      ? [[
          'identity, title, and artifact markers removed',
          (value) => {
            delete value.prepared_project_id
            delete value.source_run_id
            delete value.source_run_submission_id
            value.title = 'Changed title'
            value.final_artifact_path = 'public/artifacts/changed.html'
          },
        ]]
      : []),
  ]) {
    const invalid = structuredClone(pkg)
    mutate(invalid)
    try {
      assertPreparedLegacyPackageBinding(invalid)
      failures.push(`${packagePath}: ${label} fixture was accepted`)
    } catch {
      // Expected fail-closed result.
    }
  }
  for (const [label, profile, provenance] of [
    ['admin profile', { username: binding.username, display_name: binding.displayName, role: 'admin' }, 'pathforge_seed'],
    ['member provenance', { username: binding.username, display_name: binding.displayName, role: 'user' }, 'member'],
    ['wrong runtime handle', { username: 'Drew', display_name: binding.displayName, role: 'user' }, 'pathforge_seed'],
  ]) {
    try {
      assertPreparedLegacyProfileBinding(binding, profile, provenance)
      failures.push(`${packagePath}: ${label} fixture was accepted`)
    } catch {
      // Expected fail-closed result.
    }
  }
  for (const [label, profile] of [
    [
      'missing private operator',
      {
        username: binding.username,
        display_name: binding.displayName,
        role: 'user',
        provenance_kind: 'pathforge_seed',
        operator_kind: 'member',
        email_confirmed: true,
        auth_seed_marker: true,
      },
    ],
    [
      'unconfirmed Auth identity',
      {
        username: binding.username,
        display_name: binding.displayName,
        role: 'user',
        provenance_kind: 'pathforge_seed',
        operator_kind: 'pathforge_seed',
        email_confirmed: false,
        auth_seed_marker: true,
      },
    ],
    ...(binding.authSeedMarkerRequired
      ? [[
          'missing protected Auth seed marker',
          {
            username: binding.username,
            display_name: binding.displayName,
            role: 'user',
            provenance_kind: 'pathforge_seed',
            operator_kind: 'pathforge_seed',
            email_confirmed: true,
            auth_seed_marker: false,
          },
        ]]
      : []),
  ]) {
    try {
      assertAuthoritativePreparedLegacyProfileBinding(binding, profile)
      failures.push(`${packagePath}: ${label} fixture was accepted`)
    } catch {
      // Expected fail-closed result.
    }
  }
}

const reusableNoraParent = JSON.parse(
  read('seed-runs/weekend-plan-checklist-chatgpt-6prompt-fixed.json'),
)
try {
  if (assertPreparedLegacyPackageBinding(reusableNoraParent) !== null) {
    failures.push(
      'Nora parent package must not inherit the protected Road-Trip project/run binding',
    )
  }
} catch (error) {
  failures.push(
    `Nora parent package must remain a valid non-target seed package: ${
      error instanceof Error ? error.message : String(error)
    }`,
  )
}

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

const legacyBuildPage = 'src/app/prompt/new/page.tsx'
mustInclude(legacyBuildPage, 'searchParams', 'the compatibility route must preserve historical fork query state')
mustInclude(legacyBuildPage, 'parseProjectForkSearchParams(query)', 'the compatibility route must restore the exact fork tuple')
mustInclude(legacyBuildPage, 'LegacySourceRunIntakeClient', 'the compatibility route must render the queue-only source-run intake')
mustInclude(legacyBuildPage, '/auth/signup?next=${next}', 'the compatibility route must preserve an exact signup return target')

const legacyIntakeClient = 'src/app/prompt/new/LegacySourceRunIntakeClient.tsx'
mustInclude(legacyIntakeClient, 'Queue-only source-run handoff', 'compatibility intake must name its private queue boundary')
mustInclude(legacyIntakeClient, 'does not publish the conversation or create a public project automatically', 'compatibility intake must state that submission is not publication')
mustInclude(legacyIntakeClient, 'submitSourceRun', 'compatibility intake must use the checked source-run server action')
mustInclude(legacyIntakeClient, 'privacy_attested: true', 'compatibility intake must capture privacy attestation')
mustInclude(legacyIntakeClient, 'queue_only_attested: true', 'compatibility intake must capture queue-only acknowledgement')
mustInclude(legacyIntakeClient, 'source_publication_attested: true', 'compatibility intake must capture explicit public-link permission')
mustInclude(legacyIntakeClient, 'data-detected-source-provider', 'compatibility intake must derive the provider from the public link')

const buildPage = 'src/app/build/ProjectSubmissionClient.tsx'
mustInclude(buildPage, 'Self-contained HTML artifact', 'project submission must lead with a concrete inspectable result')
mustInclude(buildPage, 'AI service', 'project submission must capture the provider separately from the model')
mustInclude(buildPage, 'Model shown', 'project submission must capture the visible model claim')
mustInclude(buildPage, "provider === 'Other'", 'project submission must support a named Other provider')
mustInclude(buildPage, 'How complete is this evidence?', 'project submission must publish an explicit evidence scope')
mustInclude(buildPage, 'Public provider share link', 'provider links must remain optional supporting evidence')
mustInclude(buildPage, 'Review team only', 'provider links must support a private review-only choice')
mustInclude(buildPage, 'Public after verification', 'public provider links must require a separate verified choice')
mustInclude(buildPage, 'Nothing publishes on submit.', 'the new flow must preserve the human publication boundary')
mustInclude(buildPage, "formData.set('fork_json'", 'project submission must preserve structured fork metadata')
mustInclude(buildPage, 'rights_attested', 'project submission must collect rights attestation')
mustInclude(buildPage, 'privacy_attested', 'project submission must collect privacy attestation')
mustInclude(buildPage, 'publication_consent', 'project submission must collect explicit publication consent')
mustInclude(buildPage, 'Pre-publication consent preview', 'project submission must preview its public disclosure boundary before consent')
mustInclude(buildPage, 'data-community-submission-progress', 'project submission must expose a compact guided progress control')
mustInclude(buildPage, 'data-active-community-submission-step={activeStep}', 'project submission must expose the current guided step for browser verification')
mustInclude(buildPage, 'validateActiveStep', 'project submission must validate each visible step before advancing')
mustInclude(buildPage, 'hidden={activeStep !== 6}', 'project consent must remain mounted but progressively disclosed at the final step')
mustNotInclude(buildPage, 'submitSourceRun', 'the canonical upload flow must not reuse the obsolete URL-only browser mutation')

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
mustInclude('src/lib/data/source-runs.ts', 'The AI service must match the submitted public share link.', 'server action must enforce exact provider metadata for user source-run uploads')
mustInclude('src/lib/data/source-runs.ts', 'provider !== detectedProvider', 'server action must reject provider labels that disagree with the public link')
mustInclude('src/lib/data/source-runs.ts', "rpc('create_legacy_source_run_repair'", 'legacy repairs must use the service-only database boundary')
mustInclude('src/lib/data/source-runs.ts', ".from('source_run_submissions')", 'compatibility intake must write only to the private source-run queue')
mustInclude('src/lib/data/source-runs.ts', '.insert({', 'compatibility intake must create a strict queued owner row')
mustInclude('src/lib/data/source-runs.ts', 'privacy_attested', 'compatibility intake must enforce privacy attestation server-side')
mustInclude('src/lib/data/source-runs.ts', 'queue_only_attested', 'compatibility intake must enforce no-publication acknowledgement server-side')
mustInclude('src/lib/data/source-runs.ts', 'source_publication_attested', 'compatibility intake must enforce public-link publication permission server-side')
mustInclude('src/lib/data/source-runs.ts', 'sourceRunForkColumnsMissing', 'server action must keep source-run intake working before fork SQL is applied')
mustInclude('src/lib/data/source-runs.ts', 'assertExactForkTuple', 'prepared publish must compare intake, prepared, and package fork tuples')
mustInclude('src/lib/data/source-runs.ts', "'publish_prepared_showcase_source_run'", 'prepared publish must prefer the atomic database RPC')
mustInclude('src/lib/data/source-runs.ts', 'source_package_sha256', 'prepared publish must verify the immutable package digest')
mustInclude('src/lib/data/source-runs.ts', 'intake_evidence', 'prepared publish must verify canonical immutable intake evidence')
mustInclude('src/lib/data/source-runs.ts', 'canonical_source_url', 'prepared publish must exact-compare canonical source URL identity')
mustInclude('src/lib/data/source-runs.ts', 'source_package_file', 'prepared publish must exact-compare source package file identity')
mustInclude('src/lib/data/source-runs.ts', 'public_href: project.href', 'atomic project payload must use the finalized public_href key')
mustNotInclude('src/lib/data/source-runs.ts', 'const insertPayload = {', 'prepared publish must not retain a non-atomic public prompt fallback')
mustInclude('src/lib/actions.ts', 'getSourceRunSubmissionByPromptIdForAdmin(id)', 'generic approval action must resolve source-run ownership before changing prompt status')
mustInclude('src/lib/actions.ts', 'Generic approval is blocked for source-run projects.', 'generic approval action must fail closed for source-run projects')
mustNotMatch('src/lib/actions.ts', /await updatePromptStatus\(id, 'approved'\)[\s\S]*?const sourceRun = await getSourceRunSubmissionByPromptIdForAdmin\(id\)/, 'generic approval must not change status before checking source-run ownership')
mustInclude('src/lib/data.ts', "if (status === 'approved')", 'data-layer generic approval guard must apply to approval transitions')
mustInclude('src/lib/data.ts', ".from('source_run_submissions')", 'data-layer generic approval must query source-run ownership')
mustInclude('src/lib/data.ts', ".eq('extracted_prompt_id', id)", 'data-layer generic approval must match the linked project exactly')
mustInclude('src/lib/data.ts', 'Generic approval is blocked because PathForge could not verify source-run links', 'data-layer generic approval must fail closed on lookup errors')
mustInclude('src/lib/data.ts', 'Generic approval is blocked for source-run projects.', 'data-layer generic approval must reject linked source-run projects')
mustInclude('src/lib/data.ts', ".select('tags')", 'data-layer generic approval must inspect prompt provenance tags when no source-run link exists')
mustInclude('src/lib/data.ts', "tag.trim().toLowerCase() === 'source-run'", 'data-layer generic approval must recognize orphaned source-run prompts by tag')
mustInclude('src/lib/data.ts', 'could not verify provenance tags', 'data-layer generic approval must fail closed when prompt tag lookup fails')
mustInclude('src/lib/data.ts', 'is tagged source-run but has no linked source-run review', 'data-layer generic approval must reject orphaned source-run prompts')
mustInclude('src/app/admin/AdminPromptRow.tsx', "sourceRunHref ? 'Review source run' : 'View'", 'admin rows must direct source-run projects into their dedicated review')
mustInclude('src/app/admin/AdminPromptRow.tsx', "const hasMissingSourceRunLink = isSourceRunTagged && !sourceRunHref", 'admin rows must detect orphaned source-run prompts')
mustInclude('src/app/admin/AdminPromptRow.tsx', "const requiresSourceRunReview = Boolean(sourceRunHref) || isSourceRunTagged", 'admin rows must treat linked and orphaned source-run prompts as source-run reviews')
mustInclude('src/app/admin/AdminPromptRow.tsx', 'const requiresSpecialReview = requiresSourceRunReview || isCommunityProject', 'admin rows must combine source-run and community workflow boundaries')
mustInclude('src/app/admin/AdminPromptRow.tsx', 'Source-run link missing', 'admin rows must surface a non-actionable missing-link state')
mustInclude('src/app/admin/AdminPromptRow.tsx', '!requiresSpecialReview && (', 'admin rows must hide generic approval for all source-run projects')
mustInclude('src/app/admin/AdminPromptRow.tsx', "prompt.status === 'rejected' && !requiresSpecialReview", 'admin rows must hide generic reapproval for rejected source-run projects')
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
mustInclude('src/app/admin/source-runs/[id]/page.tsx', 'const isPublished = hasApprovedLinkedPrompt && Boolean(preparedProject)', 'admin detail must require a prepared registry entry before treating an approved source-run project as published')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', 'const hasInconsistentApprovedPrompt = hasApprovedLinkedPrompt && !isPublished', 'admin detail must identify approved prompts that lack prepared publication')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', 'const publishedHref = isPublished ? preparedProject?.href ?? null : null', 'admin detail must never fall back to a generic prompt href for source-run publication')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', 'Blocked inconsistent publication', 'admin detail must surface inconsistent approved source-run states')
mustInclude('src/app/admin/source-runs/[id]/page.tsx', 'const canModerateUnpublished = !isPublished && !isDeclined && !hasApprovedLinkedPrompt', 'admin detail must hide generic moderation controls for approved inconsistent states')

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
