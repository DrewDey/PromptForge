import 'server-only'

import { timingSafeEqual } from 'node:crypto'
import type {
  RequestPublicArchitectureMaintenanceV1,
} from '@/lib/request-public-architecture'

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

export function createRequestPublicMaintenanceHttpHandler(dependencies: {
  readCronSecret(): string | undefined
  createService(): {
    maintain(limit?: number): Promise<RequestPublicArchitectureMaintenanceV1>
  }
}) {
  return async function handle(request: Request) {
    const headers = {
      'Cache-Control': 'private, no-store, max-age=0',
    }
    if (!authorized(request, dependencies.readCronSecret())) {
      return Response.json(
        { ok: false, error: 'Unavailable.' },
        { status: 404, headers },
      )
    }
    try {
      const expectedKeys = [
        'reportsPurged',
        'proposalsPurged',
        'riskGrantsDeleted',
        'notificationDeliveriesDeleted',
        'readinessEvidenceDeleted',
      ] as const
      const service = dependencies.createService()
      const totals: RequestPublicArchitectureMaintenanceV1 = {
        reportsPurged: 0,
        proposalsPurged: 0,
        riskGrantsDeleted: 0,
        notificationDeliveriesDeleted: 0,
        readinessEvidenceDeleted: 0,
      }
      let moreWork = false
      for (let pass = 0; pass < 5; pass += 1) {
        const result = await service.maintain(100)
        const actualKeys = Object.keys(result).sort()
        if (
          actualKeys.length !== expectedKeys.length ||
          actualKeys.some(
            (key, index) => key !== [...expectedKeys].sort()[index],
          ) ||
          expectedKeys.some(
            (key) =>
              !Number.isSafeInteger(result[key]) ||
              result[key] < 0 ||
              result[key] > 100,
          )
        ) throw new Error('request_public_maintenance_result_invalid')
        for (const key of expectedKeys) totals[key] += result[key]
        moreWork = expectedKeys.some((key) => result[key] === 100)
        if (!moreWork) break
      }
      return Response.json({
        ok: !moreWork,
        reportsPurged: totals.reportsPurged,
        proposalsPurged: totals.proposalsPurged,
        riskGrantsDeleted: totals.riskGrantsDeleted,
        notificationDeliveriesDeleted:
          totals.notificationDeliveriesDeleted,
        readinessEvidenceDeleted: totals.readinessEvidenceDeleted,
      }, { status: moreWork ? 503 : 200, headers })
    } catch {
      return Response.json(
        { ok: false, error: 'Request public maintenance is unavailable.' },
        { status: 500, headers },
      )
    }
  }
}
