import { createAdminClient } from '@/lib/supabase/admin'
import {
  requestDeliveryRouteErrorCode,
  parseRequestDeliverySubmissionInput,
  requestDeliveryRouteErrorStatus,
  requireRequestDeliveryViewer,
  submitRequestDeliveryRevision,
} from '@/lib/build-requests/delivery-route'
import { parseSameOriginRequestJson, requestJsonRouteErrorResponse } from '@/lib/build-requests/request-json-route'
import {
  getRequestApplicationService,
  getRequestViewerState,
} from '@/lib/build-requests/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await parseSameOriginRequestJson(request, {
      keys: [
        'requestId',
        'expectedVersion',
        'deliveryRevisionId',
        'idempotencyKey',
      ],
      maxBytes: 4_096,
    })
    const parsed = parseRequestDeliverySubmissionInput(body)
    requireRequestDeliveryViewer(await getRequestViewerState())
    const receipt = await submitRequestDeliveryRevision(parsed, {
      applicationService: await getRequestApplicationService(),
      serviceRoleClient: createAdminClient(),
    })
    return Response.json(
      {
        requestVersion: receipt.requestVersion,
        submissionStatus: receipt.submissionStatus,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    )
  } catch (error) {
    const routeResponse = requestJsonRouteErrorResponse(error)
    if (routeResponse.status !== 503) return routeResponse
    const code = requestDeliveryRouteErrorCode(error)
    return Response.json(
      { code },
      {
        status: requestDeliveryRouteErrorStatus(code),
        headers: {
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    )
  }
}
