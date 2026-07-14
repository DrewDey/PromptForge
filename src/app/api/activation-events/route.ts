import { NextRequest, NextResponse } from 'next/server'
import {
  ACTIVATION_SESSION_COOKIE,
  ACTIVATION_SESSION_MAX_AGE,
  resolveActivationSession,
} from '@/lib/activation/session'
import { validateActivationEventPayload } from '@/lib/activation/validation'
import type { ActivationActorType, ActivationEnvironment } from '@/lib/activation/contract'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const MAX_REQUEST_BYTES = 4_096

function currentEnvironment(): ActivationEnvironment {
  if (process.env.VERCEL_ENV === 'production') return 'production'
  if (process.env.VERCEL_ENV === 'preview') return 'preview'
  return 'development'
}

function requestIsSameOrigin(request: NextRequest) {
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite === 'cross-site') return false
  const origin = request.headers.get('origin')
  if (!origin) return false
  try {
    const originUrl = new URL(origin)
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    const requestHosts = [forwardedHost, request.headers.get('host')?.trim()]
      .filter((host): host is string => Boolean(host))
    const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
    const requestProtocol = (forwardedProtocol || request.nextUrl.protocol.replace(':', '')).toLowerCase()

    if (requestHosts.length === 0) return originUrl.origin === request.nextUrl.origin
    return requestHosts.some((host) => (
      originUrl.origin === new URL(`${requestProtocol}://${host}`).origin
    ))
  } catch {
    return false
  }
}

async function actorContext(admin: ReturnType<typeof createAdminClient>) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError && userError.name !== 'AuthSessionMissingError') return null
    if (!user) return { userId: null, actorType: 'anonymous' as const }

    const [profileResult, provenanceResult] = await Promise.all([
      admin.from('profiles').select('role').eq('id', user.id).maybeSingle(),
      admin.from('profile_provenance').select('kind').eq('profile_id', user.id).maybeSingle(),
    ])
    if (profileResult.error || provenanceResult.error) return null
    const profile = profileResult.data
    const provenance = provenanceResult.data

    let actorType: ActivationActorType = 'member'
    if (profile?.role === 'admin') actorType = 'admin'
    else if (provenance?.kind === 'pathforge_seed') actorType = 'seed'
    else if (provenance?.kind === 'pathforge_team') actorType = 'team'

    return { userId: user.id, actorType }
  } catch {
    // An auth outage must not break the product journey. Drop the measurement
    // instead of misclassifying a signed-in internal account as real traffic.
    return null
  }
}

function analyticsResponse(status: number, cookieValue?: string) {
  const response = new NextResponse(null, {
    status,
    headers: {
      'cache-control': 'no-store, max-age=0',
      'x-content-type-options': 'nosniff',
    },
  })
  if (cookieValue) {
    response.cookies.set(ACTIVATION_SESSION_COOKIE, cookieValue, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview',
      path: '/',
      maxAge: ACTIVATION_SESSION_MAX_AGE,
      priority: 'low',
    })
  }
  return response
}

export async function POST(request: NextRequest) {
  const startedAt = performance.now()
  const requestBytes = Number.parseInt(request.headers.get('content-length') ?? '0', 10)
  if (!requestIsSameOrigin(request)) return analyticsResponse(403)
  if (Number.isFinite(requestBytes) && requestBytes > MAX_REQUEST_BYTES) return analyticsResponse(413)

  let payload
  try {
    payload = validateActivationEventPayload(await request.json())
  } catch {
    return analyticsResponse(400)
  }

  try {
    // Initialize the admin client before starting async session work. If local
    // server credentials are missing, the request can fail quietly without
    // leaving an orphaned signing promise behind.
    const admin = createAdminClient()
    const session = await resolveActivationSession(request)
    const actor = await actorContext(admin)
    if (!actor) return analyticsResponse(503, session.cookieValue)
    const environment = currentEnvironment()
    const { data: inserted, error } = await admin.rpc('pathforge_record_product_event', {
      p_event_id: payload.eventId,
      p_session_id: session.sessionId,
      p_user_id: actor.userId,
      p_actor_type: actor.actorType,
      p_event_name: payload.eventName,
      p_environment: environment,
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
      console.warn(JSON.stringify({
        event: 'activation_event_rejected',
        eventName: payload.eventName,
        environment,
        reason: rateLimited ? 'rate_limited' : 'database_error',
        durationMs: Math.round(performance.now() - startedAt),
      }))
      return analyticsResponse(rateLimited ? 429 : 503, session.cookieValue)
    }

    console.info(JSON.stringify({
      event: 'activation_event_recorded',
      eventName: payload.eventName,
      environment,
      actorType: actor.actorType,
      inserted: Boolean(inserted),
      durationMs: Math.round(performance.now() - startedAt),
    }))
    return analyticsResponse(202, session.cookieValue)
  } catch {
    console.error(JSON.stringify({
      event: 'activation_event_failed',
      eventName: payload.eventName,
      durationMs: Math.round(performance.now() - startedAt),
    }))
    return analyticsResponse(503)
  }
}
