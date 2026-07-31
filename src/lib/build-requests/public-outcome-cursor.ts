import 'server-only'

import {
  requestPublicPatterns,
  type RequestPublicOutcomePageV1,
} from '@/lib/request-public-architecture'

export type RequestPublicOutcomeCursorV1 =
  NonNullable<RequestPublicOutcomePageV1['nextCursor']>

export function decodeRequestPublicOutcomeCursor(
  value: string | undefined,
): RequestPublicOutcomeCursorV1 | undefined {
  if (!value || value.length > 500 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    return undefined
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as Record<string, unknown>
    if (
      Object.keys(parsed).sort().join(',') !== 'publishedAt,slug' ||
      typeof parsed.publishedAt !== 'string' ||
      !Number.isFinite(Date.parse(parsed.publishedAt)) ||
      typeof parsed.slug !== 'string' ||
      !requestPublicPatterns.slug.test(parsed.slug)
    ) {
      return undefined
    }
    return {
      publishedAt: parsed.publishedAt,
      slug: parsed.slug,
    }
  } catch {
    return undefined
  }
}

export function encodeRequestPublicOutcomeCursor(
  cursor: RequestPublicOutcomeCursorV1,
) {
  return Buffer.from(
    JSON.stringify({
      publishedAt: cursor.publishedAt,
      slug: cursor.slug,
    }),
    'utf8',
  ).toString('base64url')
}
