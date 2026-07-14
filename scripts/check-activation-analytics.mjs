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
const gateway = read('src/lib/activation/gateway.ts')
const edgeGateway = read('supabase/functions/pathforge-activation/index.ts')
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

const gatewayMigration = read('supabase/migrations/20260714024500_activation_app_gateway.sql')
requireText(gatewayMigration, 'expected_digest CONSTANT TEXT', 'hashed app credential')
requireText(gatewayMigration, 'current_user_id UUID := auth.uid()', 'database-derived identity')
requireText(gatewayMigration, "WHEN provenance_kind = 'pathforge_seed' THEN 'seed'", 'seed traffic separation')
requireText(gatewayMigration, "WHEN provenance_kind = 'pathforge_team' THEN 'team'", 'team traffic separation')
requireText(gatewayMigration, 'TO anon, authenticated', 'secret-gated app ingestion')
requireText(gatewayMigration, 'pathforge_activation_dashboard_for_admin', 'admin dashboard gateway')
requireText(gatewayMigration, "profile.role = 'admin'", 'database admin authorization')
rejectText(gatewayMigration, 'GRANT SELECT ON TABLE public.product_events TO authenticated', 'dashboard table access')

const edgeMigration = read('supabase/migrations/20260714030000_move_activation_gateway_to_edge.sql')
requireText(edgeMigration, 'DROP FUNCTION public.pathforge_record_product_event_from_app', 'retired Data API ingestion gateway')
requireText(edgeMigration, 'DROP FUNCTION public.pathforge_activation_dashboard_for_admin', 'retired Data API dashboard gateway')

requireText(route, 'requestIsSameOrigin', 'same-origin ingestion')
requireText(route, 'if (!origin) return false', 'required browser origin')
requireText(route, 'MAX_REQUEST_BYTES', 'payload limit')
requireText(route, 'resolveActivationSession', 'signed event session')
requireText(route, "callActivationGateway('record'", 'Edge ingestion gateway')
requireText(route, 'actorType: data.actor_type', 'diagnostic actor class')
rejectText(route, 'createAdminClient', 'web runtime service role')
rejectText(route, 'projectTitle: payload.projectTitle', 'structured logs')
requireText(gateway, 'x-pathforge-activation-secret', 'server-only Edge credential')
requireText(gateway, '/functions/v1/pathforge-activation', 'Supabase Edge gateway')
requireText(edgeGateway, 'EXPECTED_INGEST_DIGEST', 'digest-only Edge credential')
requireText(edgeGateway, "service.rpc('pathforge_record_product_event'", 'service-only ingestion RPC')
requireText(edgeGateway, "service.rpc('pathforge_activation_dashboard'", 'service-only dashboard RPC')
requireText(edgeGateway, "profile?.role !== 'admin'", 'Edge admin authorization')
requireText(edgeGateway, "provenanceResult.data?.kind === 'pathforge_seed'", 'seed traffic separation')
requireText(edgeGateway, "provenanceResult.data?.kind === 'pathforge_team'", 'team traffic separation')
rejectText(edgeGateway, 'console.log', 'Edge sensitive logging')
requireText(tracker, 'DELIVERY_TIMEOUT_MS', 'best-effort delivery timeout')
requireText(tracker, 'new AbortController()', 'abortable event delivery')
requireText(session, 'issuedAt < now - ACTIVATION_SESSION_MAX_AGE', 'cryptographic session expiry')
requireText(session, 'sessionPayload(sessionId, issuedAt)', 'timestamp-bound session signature')
requireText(session, 'process.env.ACTIVATION_INGEST_SECRET', 'least-privilege signing fallback')

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
