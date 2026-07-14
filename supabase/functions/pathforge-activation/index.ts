import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2.103.0'

const EXPECTED_INGEST_DIGEST = 'd550c48c2dd7e815cbaf3389790f2cacd1c7da6875779199dd8c673797114b11'
const MAX_BODY_BYTES = 8_192

type ActorType = 'anonymous' | 'member' | 'seed' | 'team' | 'admin'

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      'x-content-type-options': 'nosniff',
    },
  })
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}

async function authenticatedUser(service: ReturnType<typeof createClient>, request: Request) {
  const authorization = request.headers.get('authorization')
  if (!authorization) return { user: null, invalid: false }
  const [scheme, token, extra] = authorization.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token || extra) return { user: null, invalid: true }
  const { data: { user }, error } = await service.auth.getUser(token)
  return { user: error ? null : user, invalid: Boolean(error || !user) }
}

async function classifyActor(service: ReturnType<typeof createClient>, userId: string | null) {
  if (!userId) return { actorType: 'anonymous' as ActorType, error: false }

  const [profileResult, provenanceResult] = await Promise.all([
    service.from('profiles').select('role').eq('id', userId).maybeSingle(),
    service.from('profile_provenance').select('kind').eq('profile_id', userId).maybeSingle(),
  ])
  if (profileResult.error || provenanceResult.error) {
    return { actorType: 'member' as ActorType, error: true }
  }

  let actorType: ActorType = 'member'
  if (profileResult.data?.role === 'admin') actorType = 'admin'
  else if (provenanceResult.data?.kind === 'pathforge_seed') actorType = 'seed'
  else if (provenanceResult.data?.kind === 'pathforge_team') actorType = 'team'
  return { actorType, error: false }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' })
  const requestBytes = Number.parseInt(request.headers.get('content-length') ?? '0', 10)
  if (Number.isFinite(requestBytes) && requestBytes > MAX_BODY_BYTES) {
    return json(413, { error: 'payload_too_large' })
  }

  const suppliedSecret = request.headers.get('x-pathforge-activation-secret') ?? ''
  if (!timingSafeEqual(await sha256(suppliedSecret), EXPECTED_INGEST_DIGEST)) {
    return json(403, { error: 'invalid_gateway_credential' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) return json(503, { error: 'gateway_not_configured' })
  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'invalid_json' })
  }

  const identity = await authenticatedUser(service, request)
  if (identity.invalid) return json(401, { error: 'invalid_user_session' })

  if (body.operation === 'record') {
    const payload = body.payload as Record<string, unknown> | undefined
    if (!payload) return json(400, { error: 'missing_payload' })
    const actor = await classifyActor(service, identity.user?.id ?? null)
    if (actor.error) return json(503, { error: 'actor_classification_failed' })

    const { data, error } = await service.rpc('pathforge_record_product_event', {
      p_event_id: payload.eventId,
      p_session_id: payload.sessionId,
      p_user_id: identity.user?.id ?? null,
      p_actor_type: actor.actorType,
      p_event_name: payload.eventName,
      p_environment: payload.environment,
      p_path: payload.path,
      p_surface: payload.surface ?? null,
      p_action: payload.action ?? null,
      p_project_id: payload.projectId ?? null,
      p_project_title: payload.projectTitle ?? null,
      p_source_run_id: payload.sourceRunId ?? null,
      p_metric_value: payload.metricValue ?? null,
      p_schema_version: payload.schemaVersion,
    })
    if (error) {
      const rateLimited = error.code === 'P0001' && error.message.includes('rate limit')
      return json(rateLimited ? 429 : 503, { error: rateLimited ? 'rate_limited' : 'database_error' })
    }
    return json(202, { inserted: Boolean(data), actor_type: actor.actorType })
  }

  if (body.operation === 'dashboard') {
    if (!identity.user) return json(401, { error: 'authentication_required' })
    const { data: profile, error: profileError } = await service
      .from('profiles')
      .select('role')
      .eq('id', identity.user.id)
      .maybeSingle()
    if (profileError) return json(503, { error: 'authorization_unavailable' })
    if (profile?.role !== 'admin') return json(403, { error: 'admin_required' })

    const { data, error } = await service.rpc('pathforge_activation_dashboard', {
      p_days: body.days,
      p_environment: body.environment,
    })
    if (error) return json(503, { error: 'dashboard_unavailable' })
    return json(200, { data })
  }

  return json(400, { error: 'unknown_operation' })
})
