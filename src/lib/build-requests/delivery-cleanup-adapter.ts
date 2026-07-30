import 'server-only'

import {
  createRequestDeliveryArtifactCleanupResolver,
  type RequestRpcClient,
} from '@/lib/request-service'
import type { DeliveryMediaType } from '@/lib/request-lifecycle'

export type RequestDeliveryArtifactCleanupInput = {
  requestId: string
  deliveryRevisionId: string
  artifactId: string
}

export type RequestDeliveryArtifactCleanupPlan = {
  disposition: 'retain' | 'preserve' | 'delete_candidate'
  requestId: string
  deliveryRevisionId: string
  artifactId: string
  objectIdentity: string
  sha256: string
  byteLength: number
  mediaType: DeliveryMediaType
  custodyState: 'staged' | 'attested' | 'abandoned'
  accessUntil: string | null
}

/**
 * Resolve one server-only cleanup plan from PM1's dedicated retention
 * authority. This hook intentionally performs no deletion. A bounded cleanup
 * runner must freshly resolve it immediately before any physical removal and
 * confirm that the stored object still matches the returned identity/hash/type.
 */
export async function resolveRequestDeliveryArtifactCleanupPlan(
  serviceRoleClient: RequestRpcClient,
  input: Readonly<RequestDeliveryArtifactCleanupInput>,
): Promise<RequestDeliveryArtifactCleanupPlan> {
  const authority = await createRequestDeliveryArtifactCleanupResolver(
    serviceRoleClient,
  ).resolveDeliveryArtifactCleanup(input)

  return {
    disposition: authority.retentionState === 'cleanup_eligible'
      ? 'delete_candidate'
      : authority.retentionState === 'preserved_by_hold'
        ? 'preserve'
        : 'retain',
    requestId: authority.requestId,
    deliveryRevisionId: authority.deliveryRevisionId,
    artifactId: authority.artifactId,
    objectIdentity: authority.objectIdentity,
    sha256: authority.sha256,
    byteLength: authority.byteLength,
    mediaType: authority.detectedMediaType,
    custodyState: authority.custodyState,
    accessUntil: authority.accessUntil,
  }
}
