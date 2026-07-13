import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

function read(file) {
  return readFileSync(file, 'utf8')
}

function requireText(file, source, expected, reason) {
  if (!source.includes(expected)) {
    throw new Error(`${file}: ${reason}`)
  }
}

function rejectText(file, source, unexpected, reason) {
  if (source.includes(unexpected)) {
    throw new Error(`${file}: ${reason}`)
  }
}

const migrations = readdirSync('supabase/migrations')
  .filter((file) => file.endsWith('_harden_privileged_function_execution.sql'))
if (migrations.length !== 1) {
  throw new Error('Expected exactly one privileged-function hardening migration.')
}

const migrationFile = path.join('supabase/migrations', migrations[0])
const migration = read(migrationFile)

for (const signature of [
  'public.handle_new_user()',
  'public.pathforge_is_admin_request()',
  'public.publish_prepared_source_run_project(',
  'public.replace_prepared_source_run_prompt_steps(UUID[], JSONB)',
  'public.publish_prepared_showcase_source_run(UUID, JSONB, JSONB, JSONB)',
  'public.set_project_model_variant_default(UUID, UUID)',
  'public.touch_build_request_on_response()',
  'public.update_build_request_vote_count()',
  'public.update_prompt_bookmark_count()',
  'public.update_prompt_vote_count()',
  'public.update_suggestion_vote_count()',
]) {
  requireText(
    migrationFile,
    migration,
    `REVOKE ALL ON FUNCTION ${signature}`,
    `missing explicit execution revocation for ${signature}`,
  )
}

requireText(
  migrationFile,
  migration,
  "ALTER FUNCTION public.handle_new_user()\n  SET search_path = '';",
  'signup trigger must use an immutable empty search_path',
)
requireText(
  migrationFile,
  migration,
  'GRANT EXECUTE ON FUNCTION public.handle_new_user()\n  TO supabase_auth_admin;',
  'signup trigger must remain available to the auth service',
)
requireText(
  migrationFile,
  migration,
  'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public',
  'future postgres-owned public functions must default to private execution',
)
requireText(
  migrationFile,
  migration,
  'REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;',
  'future public-schema functions must be opt-in for API roles',
)

const sourceRunsFile = 'src/lib/data/source-runs.ts'
const sourceRuns = read(sourceRunsFile)
requireText(
  sourceRunsFile,
  sourceRuns,
  "await supabase.rpc(\n    'publish_prepared_showcase_source_run'",
  'prepared publication must preserve the authenticated admin RPC contract',
)
rejectText(
  sourceRunsFile,
  sourceRuns,
  'adminSupabase.rpc(',
  'prepared publication must not depend on an unconfigured service-role environment key',
)

const sourceRunSqlFile = 'supabase/source-run-submissions.sql'
const sourceRunSql = read(sourceRunSqlFile)
for (const [expected, reason] of [
  [
    'ALTER FUNCTION public.publish_prepared_showcase_source_run(UUID, JSONB, JSONB, JSONB)\n  SET SCHEMA private;',
    'privileged prepared publication must live outside the exposed API schema',
  ],
  [
    'LANGUAGE SQL\nSECURITY INVOKER\nSET search_path = \'\'',
    'the public prepared-publication contract must be a non-privileged wrapper',
  ],
  [
    'SELECT private.publish_prepared_showcase_source_run($1, $2, $3, $4);',
    'the public wrapper must delegate to the private checked transaction',
  ],
  [
    'GRANT EXECUTE ON FUNCTION public.publish_prepared_showcase_source_run(UUID, JSONB, JSONB, JSONB)\n  TO authenticated, service_role;',
    'authenticated administrators and service automation must retain the stable RPC contract',
  ],
]) {
  requireText(sourceRunSqlFile, sourceRunSql, expected, reason)
  requireText(migrationFile, migration, expected, reason)
}

for (const file of ['supabase/schema.sql', 'supabase/project-model-variants.sql']) {
  const source = read(file)
  requireText(
    file,
    source,
    'GRANT EXECUTE ON FUNCTION set_project_model_variant_default(UUID, UUID)\n  TO service_role;',
    'model-variant default selection must be service-role only',
  )
}

const schemaFile = 'supabase/schema.sql'
const schema = read(schemaFile)
requireText(
  schemaFile,
  schema,
  "$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';",
  'fresh-install signup trigger must set an empty search_path',
)
requireText(
  schemaFile,
  schema,
  'REVOKE ALL ON FUNCTION public.handle_new_user()',
  'fresh-install signup trigger must not be a public RPC',
)
requireText(
  schemaFile,
  schema,
  'GRANT EXECUTE ON FUNCTION public.handle_new_user()\n  TO supabase_auth_admin;',
  'fresh-install signup trigger must remain available to the auth service',
)

for (const [file, signature] of [
  ['supabase/build-requests.sql', 'touch_build_request_on_response()'],
  ['supabase/build-requests.sql', 'update_build_request_vote_count()'],
  ['supabase/prompt-engagement.sql', 'update_prompt_bookmark_count()'],
  ['supabase/prompt-engagement.sql', 'update_prompt_vote_count()'],
  ['supabase/suggestion-box.sql', 'update_suggestion_vote_count()'],
]) {
  const source = read(file)
  requireText(
    file,
    source,
    `REVOKE ALL ON FUNCTION ${signature}`,
    `${signature} must remain trigger-only in fresh installs`,
  )
}

console.log('Supabase privileged-function security guard passed.')
