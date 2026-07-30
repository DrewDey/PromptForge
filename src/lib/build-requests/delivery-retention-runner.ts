import 'server-only'

import { createHash } from 'node:crypto'
import {
  DELIVERY_ARTIFACT_POLICY_VERSION,
  type DeliveryArtifactStorage,
} from './delivery-custody-contract'
import type {
  RequestDeliveryArtifactCleanupInput,
  RequestDeliveryArtifactCleanupPlan,
} from './delivery-cleanup-adapter'

export const REQUEST_DELIVERY_CLEANUP_MAX_BATCH = 25

export type RequestDeliveryCleanupEnumerationPage = {
  items: readonly RequestDeliveryArtifactCleanupInput[]
  nextCursor: string | null
}

export interface RequestDeliveryCleanupAuthority {
  /**
   * Must be backed only by PM1's service-role eligible-work enumerator.
   * A storage listing or participant projection is never an authority source.
   */
  enumerateEligible(input: {
    limit: number
    cursor: string | null
  }): Promise<RequestDeliveryCleanupEnumerationPage>
  resolveFresh(
    input: RequestDeliveryArtifactCleanupInput,
  ): Promise<RequestDeliveryArtifactCleanupPlan>
  confirmRemoved(input: {
    candidate: RequestDeliveryArtifactCleanupInput
    idempotencyKey: string
  }): Promise<void>
  runIdempotentRawAuthorityCleanup(): Promise<void>
}

export type RequestDeliveryCleanupBatchResult = {
  examined: number
  deleted: number
  retained: number
  preserved: number
  failed: number
  authorityCleanup: 'completed' | 'failed'
  hasMore: boolean
}

const UTF8 = new TextDecoder('utf-8', { fatal: true })

function samePlan(
  first: RequestDeliveryArtifactCleanupPlan,
  second: RequestDeliveryArtifactCleanupPlan,
) {
  return (
    first.disposition === second.disposition
    && first.requestId === second.requestId
    && first.deliveryRevisionId === second.deliveryRevisionId
    && first.artifactId === second.artifactId
    && first.objectIdentity === second.objectIdentity
    && first.sha256 === second.sha256
    && first.byteLength === second.byteLength
    && first.mediaType === second.mediaType
    && first.custodyState === second.custodyState
  )
}

function verifyCleanupObject(
  plan: RequestDeliveryArtifactCleanupPlan,
  stored: Awaited<ReturnType<DeliveryArtifactStorage['read']>>,
) {
  if (
    !stored
    || stored.bytes.byteLength !== plan.byteLength
    || stored.mediaType !== plan.mediaType
    || createHash('sha256').update(stored.bytes).digest('hex') !== plan.sha256
    || stored.metadata.policyVersion !== DELIVERY_ARTIFACT_POLICY_VERSION
    || stored.metadata.scannerVersion !== DELIVERY_ARTIFACT_POLICY_VERSION
    || stored.metadata.custodyState !== 'staging'
    || stored.metadata.requestId !== plan.requestId
    || stored.metadata.deliveryRevisionId !== plan.deliveryRevisionId
    || stored.metadata.artifactId !== plan.artifactId
    || stored.metadata.sha256 !== plan.sha256
    || stored.metadata.byteLength !== String(plan.byteLength)
    || stored.metadata.mediaType !== plan.mediaType
  ) throw new Error('private_delivery_cleanup_integrity_failed')

  if (plan.mediaType === 'image/png') {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    if (
      stored.bytes.byteLength < signature.length
      || !signature.every((byte, index) => stored.bytes[index] === byte)
    ) throw new Error('private_delivery_cleanup_integrity_failed')
    return
  }
  if (plan.mediaType === 'image/jpeg') {
    if (
      stored.bytes.byteLength < 4
      || stored.bytes[0] !== 0xff
      || stored.bytes[1] !== 0xd8
      || stored.bytes.at(-2) !== 0xff
      || stored.bytes.at(-1) !== 0xd9
    ) throw new Error('private_delivery_cleanup_integrity_failed')
    return
  }
  let text: string
  try {
    text = UTF8.decode(stored.bytes)
  } catch {
    throw new Error('private_delivery_cleanup_integrity_failed')
  }
  if (text.includes('\0')) throw new Error('private_delivery_cleanup_integrity_failed')
  if (plan.mediaType === 'application/json') {
    try {
      JSON.parse(text)
    } catch {
      throw new Error('private_delivery_cleanup_integrity_failed')
    }
  }
}

function removalIdempotencyKey(candidate: RequestDeliveryArtifactCleanupInput) {
  return `cleanup:${createHash('sha256')
    .update([
      candidate.requestId,
      candidate.deliveryRevisionId,
      candidate.artifactId,
    ].join(':'), 'utf8')
    .digest('hex')}`
}

/**
 * Execute one bounded private-artifact cleanup batch.
 *
 * No IDs, object identities, storage errors, or provider messages are returned
 * or logged. Each item is isolated, and retain/preserve decisions are no-ops.
 * The route shell must authenticate its scheduler secret before constructing
 * these service-role dependencies; this runner is not itself an HTTP route.
 */
export async function runRequestDeliveryCleanupBatch(input: {
  limit: number
  cursor?: string | null
  authority: RequestDeliveryCleanupAuthority
  storage: DeliveryArtifactStorage
}): Promise<RequestDeliveryCleanupBatchResult> {
  if (
    !Number.isSafeInteger(input.limit)
    || input.limit < 1
    || input.limit > REQUEST_DELIVERY_CLEANUP_MAX_BATCH
    || !input.storage.remove
  ) throw new Error('private_delivery_cleanup_configuration_invalid')

  const page = await input.authority.enumerateEligible({
    limit: input.limit,
    cursor: input.cursor ?? null,
  })
  if (page.items.length > input.limit) {
    throw new Error('private_delivery_cleanup_enumeration_invalid')
  }

  const result: RequestDeliveryCleanupBatchResult = {
    examined: page.items.length,
    deleted: 0,
    retained: 0,
    preserved: 0,
    failed: 0,
    authorityCleanup: 'completed',
    hasMore: page.nextCursor !== null,
  }

  for (const candidate of page.items) {
    try {
      const first = await input.authority.resolveFresh(candidate)
      if (first.disposition === 'retain') {
        result.retained += 1
        continue
      }
      if (first.disposition === 'preserve') {
        result.preserved += 1
        continue
      }

      const stored = await input.storage.read(first.objectIdentity)
      if (!stored) {
        // A prior run may have removed the exact object and crashed before its
        // authority receipt was recorded. Only a second fresh, unchanged
        // cleanup-eligible resolution may converge that state.
        const currentMissing = await input.authority.resolveFresh(candidate)
        if (
          currentMissing.disposition !== 'delete_candidate'
          || !samePlan(first, currentMissing)
        ) {
          if (currentMissing.disposition === 'preserve') result.preserved += 1
          else if (currentMissing.disposition === 'retain') result.retained += 1
          else result.failed += 1
          continue
        }
        await input.authority.confirmRemoved({
          candidate,
          idempotencyKey: removalIdempotencyKey(candidate),
        })
        result.deleted += 1
        continue
      }
      verifyCleanupObject(first, stored)

      // Re-resolve after the potentially slow private-object read. A new hold,
      // retention change, object rebinding, or revision change must stop removal.
      const current = await input.authority.resolveFresh(candidate)
      if (current.disposition !== 'delete_candidate' || !samePlan(first, current)) {
        if (current.disposition === 'preserve') result.preserved += 1
        else if (current.disposition === 'retain') result.retained += 1
        else result.failed += 1
        continue
      }

      await input.storage.remove(current.objectIdentity)
      if (await input.storage.read(current.objectIdentity)) {
        throw new Error('private_delivery_cleanup_remove_unconfirmed')
      }
      await input.authority.confirmRemoved({
        candidate,
        idempotencyKey: removalIdempotencyKey(candidate),
      })
      result.deleted += 1
    } catch {
      result.failed += 1
    }
  }

  try {
    await input.authority.runIdempotentRawAuthorityCleanup()
  } catch {
    result.authorityCleanup = 'failed'
  }
  return result
}
