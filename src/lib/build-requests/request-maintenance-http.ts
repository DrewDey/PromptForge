import 'server-only'

import { timingSafeEqual } from 'node:crypto'

export const REQUEST_BUILD_MAINTENANCE_BATCH_LIMIT = 25

export type RequestBuildMaintenanceBatchResult = {
  examined: number
  artifactsDeleted: number
  artifactsAlreadyMissing: number
  rawTextPurged: number
  revisionsRetired: number
  auditTombstonesExpired: number
  deidentificationReceiptsExpired: number
  authorityNoOp: number
  retained: number
  preserved: number
  failed: number
  hasMore: boolean
}

export interface RequestBuildMaintenanceRunner {
  runBatch(input: {
    limit: number
  }): Promise<RequestBuildMaintenanceBatchResult>
}

export type RequestBuildMaintenanceHttpDependencies = {
  readCronSecret: () => string | undefined
  createRunner: () => RequestBuildMaintenanceRunner
}

const NO_STORE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
}

const COUNT_FIELDS = [
  'examined',
  'artifactsDeleted',
  'artifactsAlreadyMissing',
  'rawTextPurged',
  'revisionsRetired',
  'auditTombstonesExpired',
  'deidentificationReceiptsExpired',
  'authorityNoOp',
  'retained',
  'preserved',
  'failed',
] as const satisfies readonly (keyof RequestBuildMaintenanceBatchResult)[]

function json(body: object, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: NO_STORE_HEADERS,
  })
}

function authorized(request: Request, expected: string | undefined) {
  if (!expected || expected.length < 32) return false
  const match = /^Bearer ([^\s]+)$/.exec(
    request.headers.get('authorization') ?? '',
  )
  if (!match) return false

  const expectedBytes = Buffer.from(expected, 'utf8')
  const suppliedBytes = Buffer.from(match[1], 'utf8')
  return (
    expectedBytes.length === suppliedBytes.length
    && timingSafeEqual(expectedBytes, suppliedBytes)
  )
}

function safeResult(
  result: RequestBuildMaintenanceBatchResult,
): RequestBuildMaintenanceBatchResult {
  if (!result || typeof result !== 'object' || result.hasMore === undefined) {
    throw new Error('request_build_maintenance_result_invalid')
  }
  if (typeof result.hasMore !== 'boolean') {
    throw new Error('request_build_maintenance_result_invalid')
  }

  const counts = Object.fromEntries(COUNT_FIELDS.map((field) => {
    const value = result[field]
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error('request_build_maintenance_result_invalid')
    }
    return [field, value]
  })) as Pick<RequestBuildMaintenanceBatchResult, typeof COUNT_FIELDS[number]>

  const classified = COUNT_FIELDS
    .filter(field => field !== 'examined')
    .reduce((total, field) => total + counts[field], 0)
  if (classified !== counts.examined) {
    throw new Error('request_build_maintenance_result_invalid')
  }

  return {
    ...counts,
    hasMore: result.hasMore,
  }
}

/**
 * Secret-first HTTP boundary for private Request maintenance.
 *
 * The service-role client is constructed only through `createRunner`, after a
 * valid scheduler secret. Responses contain bounded aggregate categories and
 * never logical identifiers, object identities, digests, or provider errors.
 */
export function createRequestBuildMaintenanceHttpHandler(
  dependencies: RequestBuildMaintenanceHttpDependencies,
) {
  return async function handleRequestBuildMaintenance(request: Request) {
    if (!authorized(request, dependencies.readCronSecret())) {
      return json({ ok: false, error: 'Unavailable.' }, 404)
    }

    try {
      const result = safeResult(await dependencies.createRunner().runBatch({
        limit: REQUEST_BUILD_MAINTENANCE_BATCH_LIMIT,
      }))
      const ok = result.failed === 0 && result.hasMore === false
      return json({ ok, ...result }, ok ? 200 : 503)
    } catch {
      return json(
        { ok: false, error: 'Request maintenance is unavailable.' },
        500,
      )
    }
  }
}
