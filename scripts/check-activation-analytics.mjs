import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8')
const failures = []
const requireText = (source, needle, label) => {
  if (!source.includes(needle)) failures.push(`${label}: missing ${JSON.stringify(needle)}`)
}
const rejectText = (source, needle, label) => {
  if (source.includes(needle)) failures.push(`${label}: forbidden ${JSON.stringify(needle)}`)
}

const contract = read('src/lib/activation/contract.ts')
const migration = read('supabase/migrations/20260714013000_pathforge_activation_analytics.sql')
const route = read('src/app/api/activation-events/route.ts')
const tracker = read('src/lib/activation/track.ts')
const session = read('src/lib/activation/session.ts')
const layout = read('src/app/layout.tsx')
const projectPage = read('src/components/PreparedSourceRunPage.tsx')
const buildPage = read('src/app/prompt/new/page.tsx')
const dashboard = read('src/app/admin/analytics/page.tsx')
const packageJson = JSON.parse(read('package.json'))

const eventNames = [
  'discovery_viewed',
  'discovery_searched',
  'project_opened',
  'build_path_reached',
  'artifact_opened',
  'model_run_compared',
  'builder_action_started',
  'account_created',
  'source_run_submitted',
  'my_forge_returned',
]

for (const eventName of eventNames) {
  requireText(contract, `'${eventName}'`, 'event contract')
  requireText(migration, `'${eventName}'`, 'database event allowlist')
}

requireText(migration, 'ALTER TABLE public.product_events ENABLE ROW LEVEL SECURITY', 'database RLS')
requireText(migration, 'REVOKE ALL ON TABLE public.product_events FROM PUBLIC, anon, authenticated, service_role', 'table grants')
requireText(migration, 'GRANT SELECT ON TABLE public.product_events TO service_role', 'service read grant')
requireText(migration, 'GRANT EXECUTE ON FUNCTION public.pathforge_record_product_event', 'ingestion RPC grant')
requireText(migration, "actor_type IN ('anonymous', 'member', 'seed', 'team', 'admin')", 'internal traffic separation')
requireText(migration, "occurred_at < now_at - INTERVAL '400 days'", 'event retention')
rejectText(migration, 'GRANT INSERT ON TABLE public.product_events TO anon', 'anonymous table write')
rejectText(migration, 'GRANT SELECT ON TABLE public.product_events TO authenticated', 'authenticated table read')

const hardeningMigration = read('supabase/migrations/20260714022000_harden_product_event_contract.sql')
requireText(hardeningMigration, 'product_events_safe_path', 'safe analytics paths')
requireText(hardeningMigration, 'product_events_builder_action', 'event classification constraints')

requireText(route, 'requestIsSameOrigin', 'same-origin ingestion')
requireText(route, 'if (!origin) return false', 'required browser origin')
requireText(route, 'MAX_REQUEST_BYTES', 'payload limit')
requireText(route, 'resolveActivationSession', 'signed event session')
requireText(route, 'actorType: actor.actorType', 'diagnostic actor class')
rejectText(route, 'userId: actor.userId', 'structured logs')
rejectText(route, 'projectTitle: payload.projectTitle', 'structured logs')
requireText(tracker, 'DELIVERY_TIMEOUT_MS', 'best-effort delivery timeout')
requireText(tracker, 'new AbortController()', 'abortable event delivery')
requireText(session, 'issuedAt < now - ACTIVATION_SESSION_MAX_AGE', 'cryptographic session expiry')
requireText(session, 'sessionPayload(sessionId, issuedAt)', 'timestamp-bound session signature')

requireText(layout, '<ActivationPageTracker />', 'global journey instrumentation')
requireText(layout, '<Analytics />', 'Vercel Web Analytics')
requireText(layout, '<SpeedInsights />', 'Vercel Speed Insights')
requireText(projectPage, '<ProjectActivationTracker', 'project evidence instrumentation')
requireText(buildPage, "eventName: 'source_run_submitted'", 'submission completion instrumentation')
requireText(dashboard, 'Evidence-qualified activation', 'admin activation dashboard')

if (packageJson.dependencies?.['@vercel/analytics'] !== '^2.0.1') {
  failures.push('package.json: @vercel/analytics must remain on the reviewed ^2.0.1 range')
}
if (packageJson.dependencies?.['@vercel/speed-insights'] !== '^2.0.0') {
  failures.push('package.json: @vercel/speed-insights must remain on the reviewed ^2.0.0 range')
}

if (failures.length > 0) {
  console.error(`Activation analytics checks failed:\n- ${failures.join('\n- ')}`)
  process.exit(1)
}

console.log('Activation analytics checks passed: KPI contract, privacy boundary, grants, retention, and journey instrumentation are aligned.')
