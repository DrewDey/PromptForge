#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'

const failures = []

function read(path) {
  if (!existsSync(path)) {
    failures.push(`${path}: missing`)
    return ''
  }
  return readFileSync(path, 'utf8')
}

function requireText(path, source, text, message) {
  if (!source.includes(text)) failures.push(`${path}: ${message}`)
}

function forbidText(path, source, text, message) {
  if (source.includes(text)) failures.push(`${path}: ${message}`)
}

const migrationPath = 'supabase/migrations/20260712020049_my_forge_owner_state.sql'
const migration = read(migrationPath)
const hardeningMigrationPath = 'supabase/migrations/20260712024130_my_forge_advisor_hardening.sql'
const hardeningMigration = read(hardeningMigrationPath)
const dataPath = 'src/lib/data/my-forge.ts'
const data = read(dataPath)
const actionsPath = 'src/lib/my-forge-actions.ts'
const actions = read(actionsPath)
const dashboardPath = 'src/app/my-forge/page.tsx'
const dashboard = read(dashboardPath)
const buildDetailPath = 'src/app/my-forge/builds/[id]/page.tsx'
const buildDetail = read(buildDetailPath)
const profileReadinessPath = 'src/lib/profile-readiness.ts'
const profileReadiness = read(profileReadinessPath)
const profileSettingsFormPath = 'src/components/ProfileSettingsForm.tsx'
const profileSettingsForm = read(profileSettingsFormPath)
const trackerPath = 'src/components/MyForgeResumeTracker.tsx'
const tracker = read(trackerPath)
const preparedPagePath = 'src/components/PreparedSourceRunPage.tsx'
const preparedPage = read(preparedPagePath)
const sourceRunPath = 'src/lib/data/source-runs.ts'
const sourceRun = read(sourceRunPath)
const buildPath = 'src/app/build/LegacySourceRunRepairClient.tsx'
const build = read(buildPath)
const profileDataPath = 'src/lib/data.ts'
const profileData = read(profileDataPath)
const profilePagePath = 'src/app/user/[username]/page.tsx'
const profilePage = read(profilePagePath)
const headerPath = 'src/components/HeaderClient.tsx'
const header = read(headerPath)
const engagementPath = 'src/lib/project-engagement.ts'
const engagement = read(engagementPath)
const adminSourceRunPath = 'src/app/admin/source-runs/[id]/page.tsx'
const adminSourceRun = read(adminSourceRunPath)
const repairLifecycleMigrationPath = 'supabase/migrations/20260712025410_source_run_repair_lifecycle.sql'
const repairLifecycleMigration = read(repairLifecycleMigrationPath)
const repairLineageMigrationPath = 'supabase/migrations/20260712030720_source_run_repair_lineage_hardening.sql'
const repairLineageMigration = read(repairLineageMigrationPath)
const communityPilotMigrationPath = 'supabase/migrations/20260723054558_community_project_pilot.sql'
const communityPilotMigration = read(communityPilotMigrationPath)
const reservedHandlesMigrationPath = 'supabase/migrations/20260712032100_reserve_legacy_builder_handles.sql'
const reservedHandlesMigration = read(reservedHandlesMigrationPath)
const unfinishedForksMigrationPath = 'supabase/migrations/20260712033440_my_forge_unfinished_forks.sql'
const unfinishedForksMigration = read(unfinishedForksMigrationPath)
const secureProvenanceMigrationPath = 'supabase/migrations/20260712034250_secure_profile_operator_provenance.sql'
const secureProvenanceMigration = read(secureProvenanceMigrationPath)
const profileHandleMigrationPath = 'supabase/migrations/20260712035520_profile_handle_invariant.sql'
const profileHandleMigration = read(profileHandleMigrationPath)
const returnLoopMigrationPath = 'supabase/migrations/20260712040800_my_forge_return_loop_hardening.sql'
const returnLoopMigration = read(returnLoopMigrationPath)
const releaseTimeMigrationPath = 'supabase/migrations/20260712041900_my_forge_model_update_release_time.sql'
const releaseTimeMigration = read(releaseTimeMigrationPath)
const modelUpdateInvokerMigrationPath = 'supabase/migrations/20260712042500_my_forge_model_update_invoker.sql'
const modelUpdateInvokerMigration = read(modelUpdateInvokerMigrationPath)

for (const table of ['profile_provenance', 'user_project_states']) {
  requireText(migrationPath, migration, `CREATE TABLE IF NOT EXISTS public.${table}`, `${table} must be created additively`)
  requireText(migrationPath, migration, `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`, `${table} must enforce RLS`)
}
for (const policy of [
  'Owners read project state',
  'Owners create project state',
  'Owners update project state',
  'Owners delete project state',
]) {
  requireText(migrationPath, migration, policy, `missing owner-state policy ${policy}`)
}
for (const field of [
  'selected_model_variant_id',
  'selected_source_run_id',
  'selected_step_id',
  'selected_step_number',
  'selected_artifact_path',
  'selected_artifact_sha256',
  'model_updates_seen_at',
  'last_opened_at',
  'fork_started_at',
]) {
  requireText(migrationPath, migration, field, `owner state must persist ${field}`)
}
requireText(migrationPath, migration, 'idx_profiles_username_casefold_unique', 'public handles need case-insensitive uniqueness')
requireText(migrationPath, migration, 'resubmission_of_id', 'repair submissions need durable prior-submission lineage')
requireText(migrationPath, migration, 'validate_source_run_resubmission_owner', 'repair lineage must enforce a shared owner')
requireText(migrationPath, migration, 'prevent_source_run_intake_evidence_mutation', 'source evidence and repair lineage must stay immutable')
requireText(migrationPath, migration, "kind IN ('member', 'pathforge_seed', 'pathforge_team')", 'profile provenance must be a closed vocabulary')
requireText(migrationPath, migration, "LIKE '%@pathforge-seed.example.com'", 'seed provenance must come from the controlled auth domain')
requireText(hardeningMigrationPath, hardeningMigration, 'TO authenticated', 'source-run owner reads must not target the public role')
requireText(hardeningMigrationPath, hardeningMigration, 'author_id = (SELECT auth.uid())', 'source-run owner reads must use one auth initialization plan')
requireText(hardeningMigrationPath, hardeningMigration, 'idx_source_run_submissions_extracted_prompt', 'dashboard publication joins need a covering index')
requireText(hardeningMigrationPath, hardeningMigration, 'idx_source_run_submissions_exact_variant_artifact', 'exact fork evidence needs a covering index')

requireText(dataPath, data, "import 'server-only'", 'private workspace reads must stay server-only')
forbidText(dataPath, data, 'admin_notes', 'owner-facing data must never select admin notes')
requireText(dataPath, data, 'canonicalResumeSelection', 'resume writes must validate the local canonical manifest')
requireText(dataPath, data, "from('project_model_variants')", 'resume writes must validate persisted model-run evidence')
requireText(dataPath, data, ".eq('author_id', userId)", 'source-run history must be owner-scoped')
requireText(dataPath, data, ".eq('author_id', viewer.userId)", 'repair reads must be owner-scoped')

requireText(actionsPath, actions, "'use server'", 'workspace mutations must be server actions')
requireText(actionsPath, actions, "revalidatePath('/my-forge')", 'workspace mutations must refresh the canonical dashboard')
requireText(trackerPath, tracker, 'saveProjectResumeState', 'artifact selection must persist exact resume state')
requireText(trackerPath, tracker, 'artifactSha256', 'resume tracking must keep immutable artifact identity')
requireText(trackerPath, tracker, 'markProjectModelUpdatesSeen', 'current model runs must acknowledge updates with a server action')
forbidText(trackerPath, tracker, 'modelUpdatesSeenAt: new Date()', 'clients must never choose model-update timestamps')
requireText(preparedPagePath, preparedPage, 'getCurrentUserProjectContext', 'prepared pages must restore signed-in state')
requireText(preparedPagePath, preparedPage, 'initialArtifactPath={resumeArtifactPath}', 'prepared pages must restore the exact artifact')
requireText(preparedPagePath, preparedPage, 'Built by', 'prepared pages must show their public owner')

for (const section of ['Active builds', 'Saved paths', 'Updated models', 'Your public Vault']) {
  requireText(dashboardPath, dashboard, section, `dashboard must include ${section}`)
}
requireText(dashboardPath, dashboard, 'Unfinished forks', 'My Forge must expose the durable fork return loop')
requireText(dashboardPath, dashboard, 'order-2 self-start', 'mobile My Forge must put the work queue before the identity rail')
requireText(dashboardPath, dashboard, 'lg:order-1', 'desktop My Forge must retain the identity rail before the work queue')
requireText(dataPath, data, 'readUnfinishedForks', 'the dashboard must derive unfinished forks from owner state')
requireText(dashboardPath, dashboard, 'LoggedOutForge', 'My Forge must have an intentional signed-out state')
forbidText(dashboardPath, dashboard, 'adminNotes', 'dashboard must not expose admin-only review text')
requireText(buildDetailPath, buildDetail, 'Private build record', 'owners need a durable submission detail view')
requireText(buildDetailPath, buildDetail, 'Source evidence', 'submission detail must preserve source access')
for (const terminalState of ['Needs attention', 'Could not process', 'Declined', 'Live']) {
  requireText(buildDetailPath, buildDetail, terminalState, `submission progress must name the ${terminalState} state in text`)
}
for (const progressMeaning of ['Complete', 'Current status', 'Not reached', 'Processing stopped']) {
  requireText(buildDetailPath, buildDetail, progressMeaning, `submission progress must explain ${progressMeaning} without relying on color`)
}
requireText(profileReadinessPath, profileReadiness, 'deriveProfileIdentityReadiness', 'profile identity needs one shared readiness contract')
requireText(profileReadinessPath, profileReadiness, 'Published work is portfolio progress', 'identity readiness must stay separate from portfolio progress')
requireText(dataPath, data, "from '../profile-readiness'", 'My Forge must use the shared identity-readiness contract')
requireText(profileSettingsFormPath, profileSettingsForm, "from '@/lib/profile-readiness'", 'profile settings must use the shared identity-readiness contract')
requireText(profileSettingsFormPath, profileSettingsForm, 'Portfolio progress', 'profile settings must present portfolio progress separately')
forbidText(profileSettingsFormPath, profileSettingsForm, "label: 'At least one published project'", 'published work must not gate identity readiness')
requireText(dataPath, data, 'sourceRunProviderLabel', 'legacy submissions need a stable provider-aware fallback label')
requireText(dataPath, data, 'stableToken', 'legacy submission labels must remain distinguishable')
for (const authLayoutPath of ['src/app/auth/login/layout.tsx', 'src/app/auth/signup/layout.tsx']) {
  const authLayout = read(authLayoutPath)
  requireText(authLayoutPath, authLayout, 'getAuthenticatedUserId', 'signed-in visitors should not see an auth form')
  requireText(authLayoutPath, authLayout, "redirect('/my-forge')", 'signed-in auth routes should return to My Forge')
}

requireText(sourceRunPath, sourceRun, 'if (!resubmissionOfId)', 'legacy source-run action must require a repair parent')
requireText(sourceRunPath, sourceRun, "rpc('create_legacy_source_run_repair'", 'legacy source-run repairs must use the checked database RPC')
forbidText(sourceRunPath, sourceRun, '.insert(', 'legacy source-run code must not directly insert repair or new intake rows')
requireText(communityPilotMigrationPath, communityPilotMigration, 'REVOKE INSERT ON TABLE public.source_run_submissions FROM authenticated', 'authenticated direct URL-only inserts must be retired')
requireText(communityPilotMigrationPath, communityPilotMigration, 'prior.fork_source_project_id', 'the repair RPC must derive lineage from the locked prior record')
requireText(adminSourceRunPath, adminSourceRun, 'requestSourceRunRepair', 'admin review must be able to request an actionable repair')
requireText(adminSourceRunPath, adminSourceRun, 'user_status_note', 'repair requests need a builder-facing note')
requireText(repairLifecycleMigrationPath, repairLifecycleMigration, "status = 'declined'", 'historical dismissals must not appear as processing failures')
requireText(repairLifecycleMigrationPath, repairLifecycleMigration, "status NOT IN ('failed', 'declined')", 'terminal declines must not hold the active source URL uniqueness slot')
requireText(repairLineageMigrationPath, repairLineageMigration, 'idx_source_run_submissions_one_active_repair', 'each repair request may have only one active repair submission')
requireText(repairLineageMigrationPath, repairLineageMigration, 'must preserve the exact fork lineage', 'repair submissions must not retarget fork identity')
requireText(repairLineageMigrationPath, repairLineageMigration, "prior_submission.status NOT IN ('needs_repair', 'failed')", 'repair parents must be eligible for repair')
requireText(buildPath, build, 'loadMyForgeRepairContext', 'Build must support owner-safe repair handoff')
forbidText(buildPath, build, 'fork_source:', 'legacy repair must not send browser-derived lineage; the checked RPC restores the prior tuple')
requireText(buildPath, build, "router.push(`/my-forge?submitted=", 'successful submission must return to durable account history')
requireText(profileDataPath, profileData, 'provenance:profile_provenance(kind)', 'public profiles must read protected provenance')
requireText(profileDataPath, profileData, "replace(/[\\\\%_]/g", 'profile routes must escape LIKE wildcard characters in handles')
requireText(profileDataPath, profileData, 'provenance:', 'legacy code-owned profiles must carry explicit provenance')
requireText(reservedHandlesMigrationPath, reservedHandlesMigration, "'jordanwells', 'rowanpierce'", 'blocked legacy builder handles must be reserved')
requireText(reservedHandlesMigrationPath, reservedHandlesMigration, "app_metadata->>'pathforge_seed'", 'reserved handles must require protected auth app metadata')
requireText(unfinishedForksMigrationPath, unfinishedForksMigration, 'fork_started_at DESC', 'unfinished forks need an owner-scoped resume index')
requireText(unfinishedForksMigrationPath, unfinishedForksMigration, 'fork_prompt_family_id', 'unfinished forks must preserve their prompt family')
for (const field of [
  'fork_source_model_variant_id',
  'fork_source_run_id',
  'fork_source_step_id',
  'fork_source_step_number',
  'fork_source_artifact_path',
  'fork_source_artifact_sha256',
]) {
  requireText(returnLoopMigrationPath, returnLoopMigration, field, `unfinished forks must preserve ${field} independently from resume state`)
}
requireText(returnLoopMigrationPath, returnLoopMigration, 'validate_user_project_fork_source', 'unfinished fork lineage needs database validation')
requireText(returnLoopMigrationPath, returnLoopMigration, 'initialize_project_state_on_bookmark', 'bookmark creation must establish the model-update baseline')
requireText(returnLoopMigrationPath, returnLoopMigration, 'mark_project_model_update_seen', 'model updates need a server-owned acknowledgement function')
requireText(returnLoopMigrationPath, returnLoopMigration, 'GREATEST(', 'model-update acknowledgements must move monotonically')
requireText(releaseTimeMigrationPath, releaseTimeMigration, 'SELECT variant.created_at', 'model updates must acknowledge PathForge release time')
forbidText(releaseTimeMigrationPath, releaseTimeMigration, 'run_finished_at', 'upstream session time must not stand in for PathForge release time')
requireText(modelUpdateInvokerMigrationPath, modelUpdateInvokerMigration, 'SECURITY INVOKER', 'model acknowledgements should stay inside owner RLS')
requireText(secureProvenanceMigrationPath, secureProvenanceMigration, 'private.pathforge_profile_operators', 'operator trust must live outside the public API schema')
requireText(secureProvenanceMigrationPath, secureProvenanceMigration, "raw_app_meta_data", 'future operator trust must use service-only app metadata')
requireText(profileHandleMigrationPath, profileHandleMigration, "^[A-Za-z0-9_]{3,30}$", 'profile handles need a database route-format invariant')
requireText('src/app/auth/signup/page.tsx', read('src/app/auth/signup/page.tsx'), '/^[A-Za-z0-9_]{3,30}$/', 'signup must mirror the database handle invariant')
const repairContextStart = data.indexOf('export async function getMyForgeRepairContext')
const repairContext = repairContextStart >= 0 ? data.slice(repairContextStart) : ''
requireText(dataPath, repairContext, "'status'", 'repair context must select the parent lifecycle status')
requireText(buildPath, build, 'repairId && !repairContextReady', 'repair submissions must fail closed while context is unavailable')
requireText(buildPath, build, 'repairSubmissionId === repairId', 'repair state must be bound to the current repair route id')
requireText(trackerPath, tracker, 'retryServerAction', 'resume and acknowledgement writes need bounded transient retries')
requireText(trackerPath, tracker, 'const projectResumeQueues = new Map', 'resume writes must serialize across model-driven component remounts')
requireText(buildPath, build, 'resubmission_of_id: repairContextReady ? repairSubmissionId : null', 'ordinary builds must never inherit stale repair lineage')
requireText(dataPath, data, ".rpc('mark_project_model_update_seen'", 'model acknowledgements must use the atomic server function')
requireText(dataPath, data, 'Date.parse(variant.created_at) > seenAt', 'unseen models must compare PathForge release time to the save baseline')
requireText('scripts/create-pathforge-seed-profile.mjs', read('scripts/create-pathforge-seed-profile.mjs'), 'pathforge_seed: true', 'the seed provisioner must stamp protected app metadata')
forbidText('src/lib/profile-presentation.ts', read('src/lib/profile-presentation.ts'), 'SOURCE_RUN_BIO_SIGNALS', 'self-editable bios must never award reviewed provenance')
requireText(profilePagePath, profilePage, '<BuilderIdentity', 'public profile must render the stronger identity header')
requireText(headerPath, header, 'My Forge', 'signed-in navigation must expose the private workspace')

for (const codeOnlyId of [
  'POMODORO_TIMER_PROJECT_ID',
  'WEEKEND_CHECKLIST_REAL_FORK_PROJECT_ID',
  'SCHOOL_DESK_HP_CALCULATOR_FORK_PROJECT_ID',
]) {
  requireText(engagementPath, engagement, codeOnlyId, `${codeOnlyId} must remain read-only until canonical evidence exists`)
}

if (failures.length) {
  console.error('My Forge guard failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log('My Forge ownership, resume, repair, provenance, and return-loop guard passed.')
