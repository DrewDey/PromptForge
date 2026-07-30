import 'server-only'

import {
  createRequestApplicationService,
  createRequestDeliveryArtifactObjectResolver,
  type RequestApplicationService,
  type RequestDeliveryArtifactObjectResolver,
} from '@/lib/request-service'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  REQUEST_DELIVERY_READER_HEADERS,
  readRequestDeliveryArtifact,
  type RequestDeliveryAuthorityUnavailable,
  type RequestDeliveryDisposition,
  type RequestDeliveryParticipantAuthorityResult,
  type RequestDeliveryReaderResponse,
} from './delivery-reader'
import { createDeliverySupabaseStorage } from './delivery-supabase-storage'

export type RequestDeliveryReaderAdapterInput = {
  artifactId: string
  disposition: RequestDeliveryDisposition
}

const GENERIC_UNAVAILABLE_BODY = new TextEncoder().encode(
  'Private artifact is unavailable.',
)

function adapterUnavailable(): RequestDeliveryReaderResponse {
  return {
    ok: false,
    status: 503,
    internalState: 'storage_error',
    headers: {
      ...REQUEST_DELIVERY_READER_HEADERS,
      'Content-Security-Policy': [
        "default-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
        "frame-ancestors 'none'",
        "object-src 'none'",
      ].join('; '),
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': 'inline',
      'Content-Length': String(GENERIC_UNAVAILABLE_BODY.byteLength),
      'X-Frame-Options': 'DENY',
    },
    body: GENERIC_UNAVAILABLE_BODY.slice(),
  }
}

function mapParticipantUnavailable(
  reason:
    | 'unauthenticated'
    | 'not_found'
    | 'stale_revision'
    | 'held'
    | 'removed'
    | 'withdrawn'
    | 'closed',
): RequestDeliveryAuthorityUnavailable {
  if (reason === 'unauthenticated' || reason === 'not_found') {
    return {
      status: 'unavailable',
      reason,
      disclosure: 'generic',
    }
  }
  return {
    status: 'unavailable',
    reason,
    disclosure: 'participant',
  }
}

async function resolveParticipantArtifact(
  service: RequestApplicationService,
  artifactId: string,
): Promise<RequestDeliveryParticipantAuthorityResult> {
  const result = await service.resolveDeliveryArtifactReader(artifactId)
  if (result.status === 'unavailable') {
    return mapParticipantUnavailable(result.reason)
  }

  return {
    status: 'authorized',
    requestId: result.artifact.requestId,
    deliveryRevisionId: result.artifact.deliveryRevisionId,
    artifactId: result.artifact.deliveryArtifactId,
    normalizedName: result.artifact.normalizedName,
    mediaType: result.artifact.detectedMediaType,
    byteLength: result.artifact.byteLength,
    sha256: result.artifact.sha256,
  }
}

async function resolvePrivateObject(
  resolver: RequestDeliveryArtifactObjectResolver,
  binding: {
    artifactId: string
    deliveryRevisionId: string
  },
) {
  const resolved = await resolver.resolveDeliveryArtifactObject(binding)

  return {
    status: 'authorized' as const,
    artifactId: resolved.artifactId,
    deliveryRevisionId: resolved.deliveryRevisionId,
    manifestDigest: resolved.manifestDigest,
    objectIdentity: resolved.objectIdentity,
  }
}

/**
 * Read one private delivery artifact for the current cookie-scoped actor.
 *
 * The participant resolver runs before and after the private object read. The
 * service-only resolver independently derives the sealed digest and object
 * identity on both passes. Neither value is accepted from the caller or
 * returned by this adapter.
 */
export async function readRequestDeliveryArtifactForCurrentActor(
  input: Readonly<RequestDeliveryReaderAdapterInput>,
): Promise<RequestDeliveryReaderResponse> {
  try {
    const participantService = createRequestApplicationService(await createClient())
    const admin = createAdminClient()
    const objectResolver = createRequestDeliveryArtifactObjectResolver(admin)
    const storage = createDeliverySupabaseStorage(admin)

    return await readRequestDeliveryArtifact(input, {
      resolveParticipantArtifact: (artifactId) => (
        resolveParticipantArtifact(participantService, artifactId)
      ),
      resolveObjectIdentity: (binding) => resolvePrivateObject(objectResolver, binding),
      async downloadPrivateObject(objectIdentity) {
        const object = await storage.read(objectIdentity)
        if (!object) return { status: 'missing' }
        return {
          status: 'available',
          object: {
            bytes: object.bytes,
            byteLength: object.bytes.byteLength,
            mediaType: object.mediaType,
          },
        }
      },
    })
  } catch {
    return adapterUnavailable()
  }
}

/**
 * Web-handler convenience wrapper. Response headers and raw verified bytes are
 * copied directly from the protected reader core.
 */
export async function handleRequestDeliveryArtifactReader(
  input: Readonly<RequestDeliveryReaderAdapterInput>,
): Promise<Response> {
  const result = await readRequestDeliveryArtifactForCurrentActor(input)
  const body = new ArrayBuffer(result.body.byteLength)
  new Uint8Array(body).set(result.body)
  return new Response(body, {
    status: result.status,
    headers: result.headers,
  })
}
