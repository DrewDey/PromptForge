import 'server-only'

import type { RequestReportCursorV1 } from '@/lib/request-public-architecture'

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function decodeRequestReportCursor(
  value: string | undefined,
): RequestReportCursorV1 | undefined {
  if (!value || value.length > 500 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    return undefined
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(value, 'base64url').toString('utf8'),
    ) as Record<string, unknown>
    if (
      Object.keys(parsed).sort().join(',') !==
        'createdAt,priority,reportId' ||
      (parsed.priority !== 0 && parsed.priority !== 1) ||
      typeof parsed.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(parsed.createdAt)) ||
      typeof parsed.reportId !== 'string' ||
      !UUID.test(parsed.reportId)
    ) return undefined
    return {
      priority: parsed.priority,
      createdAt: parsed.createdAt,
      reportId: parsed.reportId,
    }
  } catch {
    return undefined
  }
}

export function encodeRequestReportCursor(
  cursor: RequestReportCursorV1,
) {
  return Buffer.from(JSON.stringify({
    priority: cursor.priority,
    createdAt: cursor.createdAt,
    reportId: cursor.reportId,
  }), 'utf8').toString('base64url')
}
