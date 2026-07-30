import { createAdminClient } from '@/lib/supabase/admin'
import {
  DeliveryCustodyError,
} from '@/lib/build-requests/delivery-custody-contract'
import {
  createRequestDeliveryActions,
} from '@/lib/build-requests/delivery-actions'
import {
  createDeliverySupabaseStorage,
} from '@/lib/build-requests/delivery-supabase-storage'
import {
  orchestrateRequestDeliveryArtifactUpload,
  parseRequestDeliveryArtifactUpload,
} from '@/lib/build-requests/delivery-upload-orchestrator'
import {
  DeliveryUploadRequestError,
} from '@/lib/build-requests/delivery-upload-request'
import {
  parseSameOriginRequestJson,
  requestJsonRouteErrorResponse,
} from '@/lib/build-requests/request-json-route'
import {
  getRequestApplicationService,
  getRequestViewerState,
  requestAuthorityErrorCode,
} from '@/lib/build-requests/server'
import {
  parseRequestDeliveryAbandonInput,
  requestDeliveryRouteErrorCode,
  requireRequestDeliveryViewer,
} from '@/lib/build-requests/delivery-route'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NO_STORE = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

function safeCode(error: unknown) {
  const routeCode = requestDeliveryRouteErrorCode(error)
  if (routeCode !== 'unavailable') return routeCode
  const authority = requestAuthorityErrorCode(error)
  if (
    authority === 'stale_version'
    || authority === 'rate_limited'
    || authority === 'artifact_staging_limit'
  ) return authority
  if (error instanceof DeliveryCustodyError) {
    if (error.code === 'integrity_mismatch') return 'integrity_failed'
    if (error.code === 'invalid_input' || error.code === 'policy_rejected') {
      return 'invalid_upload'
    }
    if (error.code === 'authority_blocked') return 'forbidden'
  }
  if (error instanceof DeliveryUploadRequestError) {
    return error.code === 'invalid_origin' ? 'forbidden' : 'invalid_upload'
  }
  return 'unavailable'
}

function safeStatus(code: string) {
  if (code === 'auth_required') return 401
  if (code === 'forbidden' || code === 'held' || code === 'removed') return 403
  if (code === 'rate_limited') return 429
  if (code === 'stale_version' || code === 'artifact_staging_limit') return 409
  if (code === 'unavailable') return 503
  return 400
}

export async function POST(request: Request) {
  try {
    const upload = await parseRequestDeliveryArtifactUpload(request)
    requireRequestDeliveryViewer(await getRequestViewerState())
    const applicationService = await getRequestApplicationService()
    const serviceRoleClient = createAdminClient()
    const result = await orchestrateRequestDeliveryArtifactUpload(upload, {
      applicationService,
      serviceRoleClient,
      storage: createDeliverySupabaseStorage(serviceRoleClient),
    })
    return Response.json(
      { artifactId: result.artifactId, requestVersion: result.requestVersion },
      { status: 200, headers: NO_STORE },
    )
  } catch (error) {
    const code = safeCode(error)
    return Response.json(
      { code },
      { status: safeStatus(code), headers: NO_STORE },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await parseSameOriginRequestJson(request, {
      keys: [
        'requestId',
        'deliveryRevisionId',
        'artifactId',
        'idempotencyKey',
      ],
      maxBytes: 4_096,
    })
    const parsed = parseRequestDeliveryAbandonInput(body)
    requireRequestDeliveryViewer(await getRequestViewerState())
    const applicationService = await getRequestApplicationService()
    const actions = createRequestDeliveryActions({
      applicationService,
      serviceRoleClient: createAdminClient(),
    })
    const receipt = await actions.abandonArtifact(parsed)
    return Response.json(
      { requestVersion: receipt.requestVersion },
      { status: 200, headers: NO_STORE },
    )
  } catch (error) {
    const routeResponse = requestJsonRouteErrorResponse(error)
    if (routeResponse.status !== 503) return routeResponse
    const code = safeCode(error)
    return Response.json(
      { code },
      { status: safeStatus(code), headers: NO_STORE },
    )
  }
}
