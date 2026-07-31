import 'server-only'

import { timingSafeEqual } from 'node:crypto'
import type {
  RequestNotificationWorkerResult,
} from './request-notification-worker'

function authorized(request: Request, secret: string | undefined) {
  if (!secret || secret.length < 32) return false
  const match = /^Bearer ([^\s]+)$/.exec(
    request.headers.get('authorization') ?? '',
  )
  if (!match) return false
  const expected = Buffer.from(secret)
  const received = Buffer.from(match[1])
  return (
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  )
}

function response(body: object, status: number) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}

function safeResult(result: RequestNotificationWorkerResult) {
  const expectedKeys = [
    'controlEnabled',
    'eventsProjected',
    'reportsProjected',
    'claimed',
    'delivered',
    'retried',
    'dead',
    'failed',
  ] as const
  const actualKeys = Object.keys(result).sort()
  if (
    actualKeys.length !== expectedKeys.length ||
    actualKeys.some(
      (key, index) => key !== [...expectedKeys].sort()[index],
    )
  ) {
    throw new Error('request_notification_result_invalid')
  }
  if (typeof result.controlEnabled !== 'boolean') {
    throw new Error('request_notification_result_invalid')
  }
  for (const key of [
    'eventsProjected',
    'reportsProjected',
    'claimed',
    'delivered',
    'retried',
    'dead',
    'failed',
  ] as const) {
    if (
      !Number.isSafeInteger(result[key]) ||
      result[key] < 0 ||
      result[key] > 500
    ) {
      throw new Error('request_notification_result_invalid')
    }
  }
  if (
    result.delivered + result.retried + result.dead + result.failed !==
    result.claimed
  ) {
    throw new Error('request_notification_result_invalid')
  }
  return {
    controlEnabled: result.controlEnabled,
    eventsProjected: result.eventsProjected,
    reportsProjected: result.reportsProjected,
    claimed: result.claimed,
    delivered: result.delivered,
    retried: result.retried,
    dead: result.dead,
    failed: result.failed,
  }
}

export function createRequestNotificationHttpHandler(dependencies: {
  readCronSecret(): string | undefined
  createWorker(): {
    run(limit?: number): Promise<RequestNotificationWorkerResult>
  }
}) {
  return async function handle(request: Request) {
    if (!authorized(request, dependencies.readCronSecret())) {
      return response({ ok: false, error: 'Unavailable.' }, 404)
    }
    try {
      const result = safeResult(await dependencies.createWorker().run(50))
      const ok =
        result.failed === 0 &&
        result.retried === 0 &&
        result.dead === 0
      return response({ ok, ...result }, ok ? 200 : 503)
    } catch {
      return response(
        { ok: false, error: 'Request notifications are unavailable.' },
        500,
      )
    }
  }
}
