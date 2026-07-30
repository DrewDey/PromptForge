import 'server-only'

import { createHash, randomUUID } from 'node:crypto'
import {
  createRequestAccountDeidentificationReceiptCleanupService,
  createRequestAuditTombstoneCleanupService,
  createRequestDeliveryArtifactCleanupClaimService,
  createRequestDeliveryArtifactCleanupConfirmationService,
  createRequestDeliveryArtifactCleanupResolver,
  createRequestDeliveryRevisionRetirementService,
  createRequestMaintenanceWorkService,
  createRequestRawTextPurgeService,
  type ClaimDeliveryArtifactCleanupReceiptV1,
  type RequestDeliveryArtifactCleanupAuthorityV1,
  type RequestMaintenanceWorkItemV1,
  type RequestRpcClient,
} from '@/lib/request-service'
import {
  DELIVERY_ARTIFACT_POLICY_VERSION,
  type DeliveryArtifactStorage,
} from './delivery-custody-contract'

export const REQUEST_DELIVERY_MAINTENANCE_MAX_BATCH = 25

export type RequestDeliveryMaintenanceBatchResult = {
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

export interface RequestDeliveryMaintenanceRunner {
  runBatch(input?: {
    cursor?: string
    limit?: number
  }): Promise<RequestDeliveryMaintenanceBatchResult>
}

export type RequestDeliveryMaintenanceRunnerDependencies = {
  serviceRoleClient: RequestRpcClient
  storage: DeliveryArtifactStorage
}

const UTF8 = new TextDecoder('utf-8', { fatal: true })

function sameObjectBinding(
  first: RequestDeliveryArtifactCleanupAuthorityV1,
  second: RequestDeliveryArtifactCleanupAuthorityV1,
) {
  return (
    first.requestId === second.requestId
    && first.deliveryRevisionId === second.deliveryRevisionId
    && first.artifactId === second.artifactId
    && first.objectIdentity === second.objectIdentity
    && first.sha256 === second.sha256
    && first.byteLength === second.byteLength
    && first.detectedMediaType === second.detectedMediaType
    && first.custodyState === second.custodyState
  )
}

function verifyCleanupObject(
  authority: RequestDeliveryArtifactCleanupAuthorityV1,
  stored: Awaited<ReturnType<DeliveryArtifactStorage['read']>>,
) {
  if (
    !stored
    || stored.bytes.byteLength !== authority.byteLength
    || stored.mediaType !== authority.detectedMediaType
    || createHash('sha256').update(stored.bytes).digest('hex') !== authority.sha256
    || stored.metadata.policyVersion !== DELIVERY_ARTIFACT_POLICY_VERSION
    || stored.metadata.scannerVersion !== DELIVERY_ARTIFACT_POLICY_VERSION
    || stored.metadata.custodyState !== 'staging'
    || stored.metadata.requestId !== authority.requestId
    || stored.metadata.deliveryRevisionId !== authority.deliveryRevisionId
    || stored.metadata.artifactId !== authority.artifactId
    || stored.metadata.sha256 !== authority.sha256
    || stored.metadata.byteLength !== String(authority.byteLength)
    || stored.metadata.mediaType !== authority.detectedMediaType
  ) throw new Error('private_delivery_cleanup_integrity_failed')

  if (authority.detectedMediaType === 'image/png') {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
    if (
      stored.bytes.byteLength < signature.length
      || !signature.every((byte, index) => stored.bytes[index] === byte)
    ) throw new Error('private_delivery_cleanup_integrity_failed')
    return
  }
  if (authority.detectedMediaType === 'image/jpeg') {
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
  if (authority.detectedMediaType === 'application/json') {
    try {
      JSON.parse(text)
    } catch {
      throw new Error('private_delivery_cleanup_integrity_failed')
    }
  }
}

function privateKey(
  attemptOwner: string,
  purpose: string,
  bindings: readonly (string | number)[],
) {
  return `maint:${purpose}:${createHash('sha256')
    .update([attemptOwner, ...bindings.map(String)].join(':'), 'utf8')
    .digest('hex')}`
}

function classifyRetention(
  authority: RequestDeliveryArtifactCleanupAuthorityV1,
  result: RequestDeliveryMaintenanceBatchResult,
) {
  if (authority.retentionState === 'preserved_by_hold') result.preserved += 1
  else result.retained += 1
}

/**
 * Construct a bounded, server-only maintenance runner. The caller must enforce
 * its scheduler secret before creating the service-role client. This module
 * installs no route or schedule and returns aggregate categories only.
 */
export function createRequestDeliveryMaintenanceRunner(
  dependencies: RequestDeliveryMaintenanceRunnerDependencies,
): RequestDeliveryMaintenanceRunner {
  if (!dependencies.storage.remove) {
    throw new Error('private_delivery_cleanup_configuration_invalid')
  }
  const removeObject = dependencies.storage.remove.bind(dependencies.storage)
  const maintenance = createRequestMaintenanceWorkService(
    dependencies.serviceRoleClient,
  )
  const cleanupResolver = createRequestDeliveryArtifactCleanupResolver(
    dependencies.serviceRoleClient,
  )
  const cleanupClaims = createRequestDeliveryArtifactCleanupClaimService(
    dependencies.serviceRoleClient,
  )
  const cleanupConfirmation =
    createRequestDeliveryArtifactCleanupConfirmationService(
      dependencies.serviceRoleClient,
    )
  const rawText = createRequestRawTextPurgeService(
    dependencies.serviceRoleClient,
  )
  const retirement = createRequestDeliveryRevisionRetirementService(
    dependencies.serviceRoleClient,
  )
  const audit = createRequestAuditTombstoneCleanupService(
    dependencies.serviceRoleClient,
  )
  const deidentification =
    createRequestAccountDeidentificationReceiptCleanupService(
      dependencies.serviceRoleClient,
    )

  async function runArtifact(
    item: Extract<RequestMaintenanceWorkItemV1, { category: 'artifact_cleanup' }>,
    itemIndex: number,
    attemptOwner: string,
    result: RequestDeliveryMaintenanceBatchResult,
  ) {
    const binding = {
      requestId: item.requestId,
      deliveryRevisionId: item.deliveryRevisionId,
      artifactId: item.artifactId,
    }
    let claim: ClaimDeliveryArtifactCleanupReceiptV1 | null = null
    let deleteMayHaveStarted = false
    try {
      claim = await cleanupClaims.claimDeliveryArtifactCleanup({
        ...binding,
        idempotencyKey: privateKey(
          attemptOwner,
          'claim',
          [itemIndex, item.requestId, item.deliveryRevisionId, item.artifactId],
        ),
      })
      deleteMayHaveStarted = claim.deletionStarted

      // The claim is acquired before treating retention as a stop decision.
      // PM1 may enumerate a held artifact only to let a new fenced owner
      // converge an irreversible deletion that an earlier worker began.
      const first = await cleanupResolver.resolveDeliveryArtifactCleanup(binding)
      const stored = await dependencies.storage.read(first.objectIdentity)
      if (stored) verifyCleanupObject(first, stored)

      const current = await cleanupResolver.resolveDeliveryArtifactCleanup(binding)
      if (!sameObjectBinding(first, current)) {
        throw new Error('private_delivery_cleanup_binding_changed')
      }

      if (!stored) {
        const receipt =
          await cleanupConfirmation.confirmDeliveryArtifactCleanup({
            ...binding,
            cleanupClaimId: claim.cleanupClaimId,
            claimVersion: claim.claimVersion,
            idempotencyKey: privateKey(
              attemptOwner,
              'confirm',
              [claim.cleanupClaimId, claim.claimVersion],
            ),
          })
        if (
          receipt.cleanupDisposition
          !== (claim.deletionStarted ? 'worker_removed' : 'preexisting_missing')
        ) throw new Error('private_delivery_cleanup_disposition_invalid')
        if (receipt.cleanupDisposition === 'worker_removed') {
          result.artifactsDeleted += 1
        } else {
          result.artifactsAlreadyMissing += 1
        }
        return
      }

      if (
        !claim.deletionStarted
        && current.retentionState !== 'cleanup_eligible'
      ) {
        const proof = await dependencies.storage.read(current.objectIdentity)
        verifyCleanupObject(current, proof)
        await cleanupClaims.abortDeliveryArtifactCleanup({
          cleanupClaimId: claim.cleanupClaimId,
          claimVersion: claim.claimVersion,
          idempotencyKey: privateKey(
            attemptOwner,
            'abort',
            [claim.cleanupClaimId, claim.claimVersion],
          ),
        })
        classifyRetention(current, result)
        return
      }

      // Calling begin for both a new claim and a takeover binds the current
      // fenced version before any external remove. Once attempted, abort is
      // forbidden because the transition may have committed despite a network
      // failure.
      deleteMayHaveStarted = true
      await cleanupClaims.beginDeliveryArtifactCleanupDelete({
        cleanupClaimId: claim.cleanupClaimId,
        claimVersion: claim.claimVersion,
        idempotencyKey: privateKey(
          attemptOwner,
          'begin',
          [claim.cleanupClaimId, claim.claimVersion],
        ),
      })
      await removeObject(current.objectIdentity)
      if (await dependencies.storage.read(current.objectIdentity)) {
        throw new Error('private_delivery_cleanup_remove_unconfirmed')
      }
      const receipt =
        await cleanupConfirmation.confirmDeliveryArtifactCleanup({
          ...binding,
          cleanupClaimId: claim.cleanupClaimId,
          claimVersion: claim.claimVersion,
          idempotencyKey: privateKey(
            attemptOwner,
            'confirm',
            [claim.cleanupClaimId, claim.claimVersion],
          ),
        })
      if (receipt.cleanupDisposition !== 'worker_removed') {
        throw new Error('private_delivery_cleanup_disposition_invalid')
      }
      result.artifactsDeleted += 1
    } catch (error) {
      if (claim && !deleteMayHaveStarted) {
        try {
          const current = await cleanupResolver.resolveDeliveryArtifactCleanup(
            binding,
          )
          const proof = await dependencies.storage.read(current.objectIdentity)
          verifyCleanupObject(current, proof)
          await cleanupClaims.abortDeliveryArtifactCleanup({
            cleanupClaimId: claim.cleanupClaimId,
            claimVersion: claim.claimVersion,
            idempotencyKey: privateKey(
              attemptOwner,
              'abort',
              [claim.cleanupClaimId, claim.claimVersion],
            ),
          })
        } catch {
          // The item remains failed and the authority claim stays fenced.
        }
      }
      throw error
    }
  }

  async function runItem(
    item: RequestMaintenanceWorkItemV1,
    itemIndex: number,
    attemptOwner: string,
    result: RequestDeliveryMaintenanceBatchResult,
  ) {
    switch (item.category) {
      case 'artifact_cleanup':
        await runArtifact(item, itemIndex, attemptOwner, result)
        return
      case 'raw_text_purge':
        await rawText.purgeBuildRequestRawText({ requestId: item.requestId })
        result.rawTextPurged += 1
        return
      case 'delivery_revision_retirement':
        await retirement.retireBuildRequestDeliveryRevision({
          requestId: item.requestId,
          deliveryRevisionId: item.deliveryRevisionId,
          expectedVersion: item.expectedVersion,
          idempotencyKey: privateKey(
            attemptOwner,
            'retire',
            [itemIndex, item.requestId, item.deliveryRevisionId],
          ),
        })
        result.revisionsRetired += 1
        return
      case 'audit_tombstone_expiry':
        if ((await audit.expireBuildRequestAuditTombstone({
          requestId: item.requestId,
          idempotencyKey: privateKey(
            attemptOwner,
            'audit',
            [itemIndex, item.requestId],
          ),
        })).cleaned) result.auditTombstonesExpired += 1
        else result.authorityNoOp += 1
        return
      case 'account_deidentification_receipt_expiry':
        if ((await deidentification.expireRequestAccountDeidentificationReceipt({
          receiptId: item.receiptId,
        })).expired) result.deidentificationReceiptsExpired += 1
        else result.authorityNoOp += 1
    }
  }

  return {
    async runBatch(input = {}) {
      const limit = input.limit ?? REQUEST_DELIVERY_MAINTENANCE_MAX_BATCH
      if (
        !Number.isSafeInteger(limit)
        || limit < 1
        || limit > REQUEST_DELIVERY_MAINTENANCE_MAX_BATCH
      ) throw new Error('private_delivery_cleanup_configuration_invalid')

      const attemptOwner = randomUUID()
      const page = await maintenance.listEligibleMaintenanceWork({
        ...(input.cursor === undefined ? {} : { cursor: input.cursor }),
        limit,
      })
      if (page.items.length > limit) {
        throw new Error('private_delivery_cleanup_enumeration_invalid')
      }
      const result: RequestDeliveryMaintenanceBatchResult = {
        examined: page.items.length,
        artifactsDeleted: 0,
        artifactsAlreadyMissing: 0,
        rawTextPurged: 0,
        revisionsRetired: 0,
        auditTombstonesExpired: 0,
        deidentificationReceiptsExpired: 0,
        authorityNoOp: 0,
        retained: 0,
        preserved: 0,
        failed: 0,
        hasMore: page.nextCursor !== null,
      }
      for (const [index, item] of page.items.entries()) {
        try {
          await runItem(item, index, attemptOwner, result)
        } catch {
          result.failed += 1
        }
      }
      return result
    },
  }
}
