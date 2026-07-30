import 'server-only'

export type RequestJsonRouteErrorCode =
  | 'forbidden'
  | 'unsupported_media_type'
  | 'invalid_length'
  | 'payload_too_large'
  | 'invalid_json'
  | 'invalid_fields'
  | 'unavailable'

export class RequestJsonRouteError extends Error {
  readonly code: RequestJsonRouteErrorCode

  constructor(code: RequestJsonRouteErrorCode) {
    super(code)
    this.name = 'RequestJsonRouteError'
    this.code = code
  }
}

function exactKeys(value: unknown, keys: readonly string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestJsonRouteError('invalid_json')
  }
  const actual = Object.keys(value).sort()
  const expected = [...keys].sort()
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    throw new RequestJsonRouteError('invalid_fields')
  }
  return value as Record<string, unknown>
}

export async function parseSameOriginRequestJson(
  request: Request,
  options: {
    keys: readonly string[]
    maxBytes: number
  },
) {
  const url = new URL(request.url)
  if (
    request.headers.get('origin') !== url.origin ||
    request.headers.get('sec-fetch-site') !== 'same-origin'
  ) {
    throw new RequestJsonRouteError('forbidden')
  }
  if (request.headers.get('content-type') !== 'application/json') {
    throw new RequestJsonRouteError('unsupported_media_type')
  }
  const rawLength = request.headers.get('content-length')
  if (!rawLength || !/^[1-9]\d*$/.test(rawLength)) {
    throw new RequestJsonRouteError('invalid_length')
  }
  const declaredLength = Number(rawLength)
  if (!Number.isSafeInteger(declaredLength) || declaredLength > options.maxBytes) {
    throw new RequestJsonRouteError('payload_too_large')
  }
  const body = await request.text()
  const actualLength = new TextEncoder().encode(body).byteLength
  if (actualLength !== declaredLength || actualLength > options.maxBytes) {
    throw new RequestJsonRouteError('invalid_length')
  }
  let value: unknown
  try {
    value = JSON.parse(body)
  } catch {
    throw new RequestJsonRouteError('invalid_json')
  }
  return exactKeys(value, options.keys)
}

export function requestJsonRouteErrorResponse(error: unknown) {
  const code = error instanceof RequestJsonRouteError ? error.code : 'unavailable'
  const status = code === 'forbidden'
    ? 403
    : code === 'unsupported_media_type'
      ? 415
      : code === 'payload_too_large'
        ? 413
        : code === 'unavailable'
          ? 503
          : 400
  return Response.json(
    { code },
    {
      status,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    },
  )
}
