import 'server-only'

import {
  DELIVERY_ARTIFACT_POLICY_VERSION,
  DeliveryCustodyError,
  type DeliveryArtifactInput,
  type DeliveryArtifactCustodyBinding,
  type DeliveryArtifactObjectMetadata,
  type DeliveryArtifactStorage,
  type DeliveryCustodyAuthority,
  type DeliveryCustodyScope,
  type ValidatedDeliveryArtifact,
} from './delivery-custody-contract'
import { buildDeliveryObjectKeys } from './delivery-object-identity'
import {
  inspectStoredDeliveryArtifact,
  validateDeliveryArtifactSet,
} from './delivery-artifact-scanner'

export type StagedDeliveryArtifact = {
  artifactId: string
  artifact: ValidatedDeliveryArtifact
  artifactIndex: number
  objectIdentity: string
  stagingMetadata: DeliveryArtifactObjectMetadata
  storageOutcome: 'created' | 'exists'
}

export type StagedDeliveryArtifactSet = {
  scope: DeliveryCustodyScope
  stagingPrefixes: string[]
  artifacts: StagedDeliveryArtifact[]
}

export type FinalizedDeliveryArtifactSet = {
  artifacts: readonly {
    artifactId: string
    artifactOrdinal: number
    objectIdentity: string
    artifact: ValidatedDeliveryArtifact
  }[]
  replayed: boolean
}

function assertBuilderWriteAuthority(authority: DeliveryCustodyAuthority) {
  if (
    authority.moderation !== 'clear'
    || authority.workBlocked
    || authority.withdrawn
    || !['building', 'repair_required'].includes(authority.lifecycle)
  ) throw new DeliveryCustodyError('authority_blocked')
}

function objectMetadata(input: {
  scope: DeliveryCustodyScope
  artifactId: string
  artifact: ValidatedDeliveryArtifact
  artifactOrdinal: number
  custodyState: 'staging' | 'final'
}): DeliveryArtifactObjectMetadata {
  return {
    policyVersion: DELIVERY_ARTIFACT_POLICY_VERSION,
    scannerVersion: DELIVERY_ARTIFACT_POLICY_VERSION,
    custodyState: input.custodyState,
    requestId: input.scope.requestId.toLowerCase(),
    deliveryRevisionId: input.scope.deliveryRevisionId.toLowerCase(),
    acceptedBriefRevisionId: input.scope.acceptedBriefRevisionId.toLowerCase(),
    builderAssignmentId: input.scope.builderAssignmentId.toLowerCase(),
    artifactId: input.artifactId.toLowerCase(),
    artifactOrdinal: String(input.artifactOrdinal),
    safeName: input.artifact.safeName,
    sha256: input.artifact.sha256,
    byteLength: String(input.artifact.byteLength),
    mediaType: input.artifact.mediaType,
  }
}

async function putAndVerify(
  storage: DeliveryArtifactStorage,
  input: {
    key: string
    artifact: ValidatedDeliveryArtifact
    metadata: DeliveryArtifactObjectMetadata
  },
) {
  let outcome: 'created' | 'exists'
  try {
    outcome = await storage.putIfAbsent({
      key: input.key,
      bytes: input.artifact.bytes,
      mediaType: input.artifact.mediaType,
      metadata: input.metadata,
    })
  } catch {
    throw new DeliveryCustodyError('storage_unavailable')
  }
  let stored
  try {
    stored = await storage.read(input.key)
  } catch {
    throw new DeliveryCustodyError('storage_unavailable')
  }
  try {
    inspectStoredDeliveryArtifact(stored, {
      sha256: input.artifact.sha256,
      byteLength: input.artifact.byteLength,
      mediaType: input.artifact.mediaType,
      metadata: input.metadata,
    })
  } catch (error) {
    if (outcome === 'exists' && error instanceof DeliveryCustodyError) {
      throw new DeliveryCustodyError('storage_conflict')
    }
    throw error
  }
  return outcome
}

export async function stageDeliveryArtifactSet(input: {
  storage: DeliveryArtifactStorage
  scope: DeliveryCustodyScope
  authority: DeliveryCustodyAuthority
  /**
   * Logical IDs originate in actor-bound stage receipts. The private object
   * identity must come separately from PM1's service-only preparation method.
   * Custody never allocates either authority identity.
   */
  authorityArtifacts: readonly {
    artifactId: string
    stagingIdentity: string
    artifactOrdinal: number
  }[]
  files: readonly DeliveryArtifactInput[]
}): Promise<StagedDeliveryArtifactSet> {
  assertBuilderWriteAuthority(input.authority)
  const artifacts = validateDeliveryArtifactSet(input.files)
  if (input.authorityArtifacts.length !== artifacts.length) {
    throw new DeliveryCustodyError('invalid_input')
  }
  if (
    new Set(input.authorityArtifacts.map(({ artifactOrdinal }) => artifactOrdinal)).size
      !== input.authorityArtifacts.length
    || input.authorityArtifacts.some(({ artifactOrdinal }) => (
      !Number.isInteger(artifactOrdinal)
      || artifactOrdinal < 1
      || artifactOrdinal > 5
    ))
  ) throw new DeliveryCustodyError('invalid_input')
  const staged: StagedDeliveryArtifact[] = []
  for (const [inputIndex, artifact] of artifacts.entries()) {
    const authorityArtifact = input.authorityArtifacts[inputIndex]
    const artifactIndex = authorityArtifact.artifactOrdinal - 1
    const keys = buildDeliveryObjectKeys({
      scope: input.scope,
      artifactId: authorityArtifact.artifactId,
      stagingIdentity: authorityArtifact.stagingIdentity,
    })
    const stagingMetadata = objectMetadata({
      scope: input.scope,
      artifactId: authorityArtifact.artifactId,
      artifact,
      artifactOrdinal: artifactIndex + 1,
      custodyState: 'staging',
    })
    const storageOutcome = await putAndVerify(input.storage, {
      key: keys.objectIdentity,
      artifact,
      metadata: stagingMetadata,
    })
    staged.push({
      artifactId: authorityArtifact.artifactId,
      artifact,
      artifactIndex,
      objectIdentity: keys.objectIdentity,
      stagingMetadata,
      storageOutcome,
    })
  }
  return {
    scope: input.scope,
    stagingPrefixes: staged.map(({ objectIdentity }) => (
      objectIdentity.slice(0, objectIdentity.lastIndexOf('/') + 1)
    )),
    artifacts: staged,
  }
}

export async function finalizeDeliveryArtifactSet(input: {
  storage: DeliveryArtifactStorage
  staged: StagedDeliveryArtifactSet
  authority: DeliveryCustodyAuthority
}): Promise<FinalizedDeliveryArtifactSet> {
  assertBuilderWriteAuthority(input.authority)
  const replayed = input.staged.artifacts.every(({ storageOutcome }) => storageOutcome === 'exists')
  const verifiedArtifacts: FinalizedDeliveryArtifactSet['artifacts'][number][] = []
  const orderedStagedArtifacts = [...input.staged.artifacts]
    .sort((left, right) => left.artifactIndex - right.artifactIndex)
  for (const stagedArtifact of orderedStagedArtifacts) {
    let stagedObject
    try {
      stagedObject = await input.storage.read(stagedArtifact.objectIdentity)
    } catch {
      throw new DeliveryCustodyError('storage_unavailable')
    }
    const verified = inspectStoredDeliveryArtifact(stagedObject, {
      sha256: stagedArtifact.artifact.sha256,
      byteLength: stagedArtifact.artifact.byteLength,
      mediaType: stagedArtifact.artifact.mediaType,
      metadata: stagedArtifact.stagingMetadata,
    })
    verifiedArtifacts.push({
      artifactId: stagedArtifact.artifactId,
      artifactOrdinal: stagedArtifact.artifactIndex + 1,
      objectIdentity: stagedArtifact.objectIdentity,
      artifact: verified,
    })
  }
  return {
    artifacts: verifiedArtifacts,
    replayed,
  }
}

export async function verifyFinalizedDeliveryArtifactSet(input: {
  storage: DeliveryArtifactStorage
  scope: DeliveryCustodyScope
  bindings: readonly DeliveryArtifactCustodyBinding[]
}) {
  const ordered = [...input.bindings].sort(
    (left, right) => left.artifactOrdinal - right.artifactOrdinal,
  )
  if (
    ordered.length < 1
    || ordered.length > 5
    || ordered.some((entry, index) => entry.artifactOrdinal !== index + 1)
    || new Set(ordered.map(({ artifactId }) => artifactId)).size !== ordered.length
  ) throw new DeliveryCustodyError('invalid_input')
  for (const entry of ordered) {
    const keys = buildDeliveryObjectKeys({
      scope: input.scope,
      artifactId: entry.artifactId,
      stagingIdentity: entry.objectIdentity,
    })
    let stored
    try {
      stored = await input.storage.read(keys.objectIdentity)
    } catch {
      throw new DeliveryCustodyError('storage_unavailable')
    }
    const metadata: DeliveryArtifactObjectMetadata = {
      policyVersion: DELIVERY_ARTIFACT_POLICY_VERSION,
      scannerVersion: DELIVERY_ARTIFACT_POLICY_VERSION,
      custodyState: 'staging',
      requestId: input.scope.requestId.toLowerCase(),
      deliveryRevisionId: input.scope.deliveryRevisionId.toLowerCase(),
      acceptedBriefRevisionId: input.scope.acceptedBriefRevisionId.toLowerCase(),
      builderAssignmentId: input.scope.builderAssignmentId.toLowerCase(),
      artifactId: entry.artifactId,
      artifactOrdinal: String(entry.artifactOrdinal),
      safeName: entry.safeName,
      sha256: entry.sha256,
      byteLength: String(entry.byteLength),
      mediaType: entry.mediaType,
    }
    inspectStoredDeliveryArtifact(stored, {
      sha256: entry.sha256,
      byteLength: entry.byteLength,
      mediaType: entry.mediaType,
      metadata,
    })
  }
  return true
}

export async function planDeliveryStagingOrphans(input: {
  storage: DeliveryArtifactStorage
  requestId: string
  authority: DeliveryCustodyAuthority
  referencedObjectPrefixes: ReadonlySet<string>
  olderThan: string
}) {
  if (!input.storage.list || !Number.isFinite(Date.parse(input.olderThan))) {
    throw new DeliveryCustodyError('invalid_input')
  }
  if (
    input.authority.retentionHold
    || input.authority.moderation === 'held'
  ) return []
  const prefix = `requests/${input.requestId.toLowerCase()}/`
  const objects = await input.storage.list(prefix)
  return objects
    .filter(({ key, createdAt }) => (
      key.startsWith(prefix)
      && key.includes('/artifacts/')
      && ![...input.referencedObjectPrefixes].some((active) => key.startsWith(active))
      && Number.isFinite(Date.parse(createdAt))
      && Date.parse(createdAt) < Date.parse(input.olderThan)
    ))
    .map(({ key, createdAt }) => ({
      key,
      createdAt,
      disposition: 'review_only' as const,
      reason: 'unreferenced_staging_candidate' as const,
    }))
}

export function deliveryArtifactRetentionDisposition(input: {
  authority: DeliveryCustodyAuthority
  terminalRetentionElapsed: boolean
}) {
  if (input.authority.retentionHold || input.authority.moderation === 'held') return 'hold'
  if (!['completed', 'closed'].includes(input.authority.lifecycle)) return 'retain_active'
  return input.terminalRetentionElapsed ? 'eligible_for_policy_cleanup' : 'retain_terminal'
}
