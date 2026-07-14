import { NextRequest, NextResponse } from 'next/server'
import {
  ACTIVATION_SESSION_COOKIE,
  ACTIVATION_SESSION_MAX_AGE,
  resolveActivationSession,
} from '@/lib/activation/session'
import { validateActivationEventPayload } from '@/lib/activation/validation'
import type { ActivationEnvironment } from '@/lib/activation/contract'
import { ActivationGatewayError, callActivationGateway } from '@/lib/activation/gateway'

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

  let cookieValue: string | undefined
  try {
    const session = await resolveActivationSession(request)
    cookieValue = session.cookieValue
    const environment = currentEnvironment()
    let data: { inserted: boolean; actor_type: string }
    try {
      data = await callActivationGateway('record', {
        payload: {
          ...payload,
          sessionId: session.sessionId,
          environment,
        },
      })
    } catch (error) {
      const rateLimited = error instanceof ActivationGatewayError && error.status === 429
      console.warn(JSON.stringify({
        event: 'activation_event_rejected',
        eventName: payload.eventName,
        environment,
        reason: rateLimited ? 'rate_limited' : 'gateway_rejected',
        durationMs: Math.round(performance.now() - startedAt),
      }))
      return analyticsResponse(rateLimited ? 429 : 503, cookieValue)
    }

    console.info(JSON.stringify({
      event: 'activation_event_recorded',
      eventName: payload.eventName,
      environment,
      actorType: data.actor_type,
      inserted: data.inserted,
      durationMs: Math.round(performance.now() - startedAt),
    }))
    return analyticsResponse(202, cookieValue)
  } catch {
    console.error(JSON.stringify({
      event: 'activation_event_failed',
      eventName: payload.eventName,
      durationMs: Math.round(performance.now() - startedAt),
    }))
    return analyticsResponse(503, cookieValue)
  }
}
