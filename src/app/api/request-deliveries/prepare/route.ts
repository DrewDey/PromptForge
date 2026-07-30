import { parseSameOriginRequestJson, requestJsonRouteErrorResponse } from '@/lib/build-requests/request-json-route'
import {
  prepareRequestDeliveryRevision,
  parseRequestDeliveryPreparationInput,
  requestDeliveryRouteErrorCode,
  requestDeliveryRouteErrorStatus,
  requireRequestDeliveryViewer,
} from '@/lib/build-requests/delivery-route'
import {
  getRequestApplicationService,
  getRequestViewerState,
} from '@/lib/build-requests/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
        'revisionLabel',
        'summary',
        'builderEvidence',
        'builderAttestation',
      ],
      maxBytes: 32_000,
    })
    const parsed = parseRequestDeliveryPreparationInput(body)
    requireRequestDeliveryViewer(await getRequestViewerState())
    const receipt = await prepareRequestDeliveryRevision(parsed, {
      applicationService: await getRequestApplicationService(),
      serviceRoleClient: createAdminClient(),
    })
    return Response.json(
      { requestVersion: receipt.requestVersion },
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
