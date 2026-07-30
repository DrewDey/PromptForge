import 'server-only'

import { createHash } from 'node:crypto'
import {
  REQUEST_CONTRACT_VERSION,
  type RequestBuilderWorkspaceV1,
  type RequestCaseDetailV1,
  type RequestDeliveryArtifactV1,
} from '../request-lifecycle'
import {
  createRequestStagedArtifactCustodyService,
  type RequestApplicationService,
  type RequestDeliveryArtifactCustodyBindingV1,
  type RequestRpcClient,
  type RequestStagedArtifactCustodyService,
  type RequestStagedArtifactObjectV1,
} from '../request-service'
import {
  type DeliveryArtifactInput,
  type DeliveryArtifactStorage,
  DeliveryCustodyError,
  type DeliveryCustodyAuthority,
  type DeliveryCustodyScope,
  type ValidatedDeliveryArtifact,
} from './delivery-custody-contract'
import {
  finalizeDeliveryArtifactSet,
  stageDeliveryArtifactSet,
  verifyFinalizedDeliveryArtifactSet,
} from './delivery-custody-service'
import { validateDeliveryArtifact } from './delivery-artifact-scanner'
import {
  assertDeliveryUploadRequestEnvelope,
  DeliveryUploadRequestError,
  readSingleDeliveryArtifact,
} from './delivery-upload-request'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/
const CLIENT_FILE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/
const UPLOAD_FIELDS = [
  'requestId',
  'deliveryRevisionId',
  'expectedVersion',
  'artifactOrdinal',
  'clientFileId',
  'idempotencyKey',
  'artifact',
] as const

export type ParsedRequestDeliveryArtifactUpload = {
  requestId: string
  deliveryRevisionId: string
  expectedVersion: number
  artifactOrdinal: number
  clientFileId: string
  idempotencyKey: string
  artifact: DeliveryArtifactInput
}

export type RequestDeliveryArtifactUploadResult = {
  artifactId: string
  requestVersion: number
}

export type RequestDeliveryArtifactUploadDependencies = {
  applicationService: RequestApplicationService
  serviceRoleClient: RequestRpcClient
  storage: DeliveryArtifactStorage
}

type FullBuilderUploadDetail = RequestCaseDetailV1 & {
  builderWorkspace: RequestBuilderWorkspaceV1
}

type BuilderUploadContext = {
  detail: RequestCaseDetailV1
  workspace: RequestBuilderWorkspaceV1
}

function formString(formData: FormData, name: string) {
  const values = formData.getAll(name)
  if (values.length !== 1 || typeof values[0] !== 'string') {
    throw new DeliveryUploadRequestError('invalid_form_fields')
  }
  return values[0]
}

/**
 * Parse only logical browser input. Digests, scan results, custody identities,
 * and assignment/brief authority are always derived again on the server.
 */
export async function parseRequestDeliveryArtifactUpload(
  request: Request,
): Promise<ParsedRequestDeliveryArtifactUpload> {
  assertDeliveryUploadRequestEnvelope(request)
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    throw new DeliveryUploadRequestError('invalid_form_fields')
  }
  const keys = [...formData.keys()]
  if (
    keys.length !== UPLOAD_FIELDS.length
    || keys.some((key) => !UPLOAD_FIELDS.includes(key as (typeof UPLOAD_FIELDS)[number]))
    || new Set(keys).size !== keys.length
  ) throw new DeliveryUploadRequestError('invalid_form_fields')

  const file = readSingleDeliveryArtifact(formData)
  const requestId = formString(formData, 'requestId')
  const deliveryRevisionId = formString(formData, 'deliveryRevisionId')
  const expectedVersionText = formString(formData, 'expectedVersion')
  const artifactOrdinalText = formString(formData, 'artifactOrdinal')
  const clientFileId = formString(formData, 'clientFileId')
  const idempotencyKey = formString(formData, 'idempotencyKey')
  if (
    !UUID.test(requestId)
    || !UUID.test(deliveryRevisionId)
    || !/^(?:0|[1-9]\d{0,7})$/.test(expectedVersionText)
    || !/^[1-5]$/.test(artifactOrdinalText)
    || !CLIENT_FILE_ID.test(clientFileId)
    || !IDEMPOTENCY_KEY.test(idempotencyKey)
  ) throw new DeliveryUploadRequestError('invalid_form_fields')

  return {
    requestId: requestId.toLowerCase(),
    deliveryRevisionId: deliveryRevisionId.toLowerCase(),
    expectedVersion: Number(expectedVersionText),
    artifactOrdinal: Number(artifactOrdinalText),
    clientFileId,
    idempotencyKey,
    artifact: {
      name: file.name,
      mediaType: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    },
  }
}

function derivedIdempotencyKey(purpose: 'attest' | 'abandon', inputKey: string) {
  return `${purpose}:${createHash('sha256').update(inputKey, 'utf8').digest('hex')}`
}

function fullBuilderDetail(
  detail: Awaited<ReturnType<RequestApplicationService['getRequest']>>,
  upload: ParsedRequestDeliveryArtifactUpload,
  requireStageCapability: boolean,
): FullBuilderUploadDetail {
  if (
    detail.visibility !== 'full'
    || detail.requestId !== upload.requestId
    || detail.moderationState !== 'clear'
    || !['building', 'repair_required'].includes(detail.lifecycleState)
    || !detail.actor.roles.includes('builder')
    || (requireStageCapability && !detail.actor.capabilities.includes('stage_delivery_artifact'))
    || detail.builderWorkspace === null
    || detail.builderWorkspace.deliveryRevisionId !== upload.deliveryRevisionId
    || detail.builderWorkspace.acceptedBriefRevisionId !== detail.briefRevisionId
    || detail.builderWorkspace.revisionState !== 'staging'
  ) throw new DeliveryCustodyError('authority_blocked')
  return detail as FullBuilderUploadDetail
}

function initialBuilderContext(
  detail: Awaited<ReturnType<RequestApplicationService['getRequest']>>,
  upload: ParsedRequestDeliveryArtifactUpload,
): BuilderUploadContext {
  if (
    detail.visibility !== 'full'
    || detail.requestId !== upload.requestId
    || detail.moderationState !== 'clear'
    || !['building', 'repair_required'].includes(detail.lifecycleState)
    || !detail.actor.roles.includes('builder')
  ) throw new DeliveryCustodyError('authority_blocked')

  if (detail.builderWorkspace) {
    if (
      detail.builderWorkspace.deliveryRevisionId !== upload.deliveryRevisionId
      || detail.builderWorkspace.acceptedBriefRevisionId !== detail.briefRevisionId
      || detail.builderWorkspace.revisionState !== 'staging'
    ) throw new DeliveryCustodyError('authority_blocked')
    return { detail, workspace: detail.builderWorkspace }
  }

  const activeBuilders = detail.assignments.filter(
    assignment => assignment.role === 'builder' && assignment.active,
  )
  if (
    !detail.actor.capabilities.includes('stage_delivery_artifact')
    || activeBuilders.length !== 1
  ) throw new DeliveryCustodyError('authority_blocked')

  // This is only a server-side command proposal. PM1's actor-derived
  // stage_delivery_artifact transaction atomically validates the exact brief
  // and active assignment and creates/claims this revision before any object
  // identity is prepared or any bytes are uploaded.
  return {
    detail,
    workspace: {
      deliveryRevisionId: upload.deliveryRevisionId,
      acceptedBriefRevisionId: detail.briefRevisionId,
      activeBuilderAssignmentId: activeBuilders[0].assignmentId,
      revisionState: 'staging',
      revisionLabel: null,
      summary: null,
      builderEvidence: [],
      approvedPathForgeReference: null,
      artifacts: [],
      sealReceiptId: null,
    },
  }
}

function custodyScope(
  detail: RequestCaseDetailV1,
  workspace: RequestBuilderWorkspaceV1,
): DeliveryCustodyScope {
  return {
    requestId: detail.requestId,
    deliveryRevisionId: workspace.deliveryRevisionId,
    acceptedBriefRevisionId: workspace.acceptedBriefRevisionId,
    builderAssignmentId: workspace.activeBuilderAssignmentId,
  }
}

function custodyAuthority(detail: RequestCaseDetailV1): DeliveryCustodyAuthority {
  return {
    moderation: detail.moderationState,
    lifecycle: detail.lifecycleState,
    workBlocked: (
      detail.moderationState !== 'clear'
      || !detail.actor.roles.includes('builder')
    ),
    retentionState: 'retained',
    withdrawn: detail.closeReason === 'withdrawn',
  }
}

function exactArtifactMatch(
  artifact: RequestDeliveryArtifactV1,
  upload: ParsedRequestDeliveryArtifactUpload,
  validated: ValidatedDeliveryArtifact,
) {
  return (
    artifact.artifactOrdinal === upload.artifactOrdinal
    && artifact.normalizedName === validated.safeName
    && artifact.detectedMediaType === validated.mediaType
    && artifact.byteLength === validated.byteLength
    && artifact.sha256 === validated.sha256
  )
}

function matchingWorkspaceArtifact(
  workspace: RequestBuilderWorkspaceV1,
  upload: ParsedRequestDeliveryArtifactUpload,
  validated: ValidatedDeliveryArtifact,
) {
  const ordinalArtifact = workspace.artifacts.find(
    ({ artifactOrdinal }) => artifactOrdinal === upload.artifactOrdinal,
  )
  if (!ordinalArtifact) return null
  if (!exactArtifactMatch(ordinalArtifact, upload, validated)) {
    throw new DeliveryCustodyError('storage_conflict')
  }
  return ordinalArtifact
}

function assertPreparedBinding(
  prepared: RequestStagedArtifactObjectV1,
  input: {
    upload: ParsedRequestDeliveryArtifactUpload
    validated: ValidatedDeliveryArtifact
    workspace: RequestBuilderWorkspaceV1
    artifactId: string
    stageReceiptId: string
    stageRequestVersion: number
  },
) {
  if (
    prepared.requestId !== input.upload.requestId
    || prepared.deliveryRevisionId !== input.upload.deliveryRevisionId
    || prepared.artifactId !== input.artifactId
    || prepared.stageReceiptId !== input.stageReceiptId
    || prepared.expectedRequestVersion !== input.stageRequestVersion
    || prepared.acceptedBriefRevisionId !== input.workspace.acceptedBriefRevisionId
    || prepared.activeBuilderAssignmentId !== input.workspace.activeBuilderAssignmentId
    || prepared.artifactOrdinal !== input.upload.artifactOrdinal
    || prepared.sha256 !== input.validated.sha256
    || prepared.byteLength !== input.validated.byteLength
    || prepared.detectedMediaType !== input.validated.mediaType
    || prepared.scannerVersion !== input.validated.policyVersion
  ) throw new DeliveryCustodyError('integrity_mismatch')
}

function assertCustodyBinding(
  binding: RequestDeliveryArtifactCustodyBindingV1,
  input: {
    upload: ParsedRequestDeliveryArtifactUpload
    validated: ValidatedDeliveryArtifact
    workspace: RequestBuilderWorkspaceV1
    artifactId: string
    prepared?: RequestStagedArtifactObjectV1
  },
) {
  if (
    binding.requestId !== input.upload.requestId
    || binding.deliveryRevisionId !== input.upload.deliveryRevisionId
    || binding.artifactId !== input.artifactId
    || binding.acceptedBriefRevisionId !== input.workspace.acceptedBriefRevisionId
    || binding.activeBuilderAssignmentId !== input.workspace.activeBuilderAssignmentId
    || binding.artifactOrdinal !== input.upload.artifactOrdinal
    || binding.sha256 !== input.validated.sha256
    || binding.byteLength !== input.validated.byteLength
    || binding.detectedMediaType !== input.validated.mediaType
    || binding.scannerVersion !== input.validated.policyVersion
    || (
      input.prepared
      && (
        binding.stageReceiptId !== input.prepared.stageReceiptId
        || binding.objectIdentity !== input.prepared.objectIdentity
      )
    )
  ) throw new DeliveryCustodyError('integrity_mismatch')
}

async function verifyFreshAttestedArtifact(input: {
  upload: ParsedRequestDeliveryArtifactUpload
  validated: ValidatedDeliveryArtifact
  artifactId: string
  applicationService: RequestApplicationService
  custodyService: RequestStagedArtifactCustodyService
  storage: DeliveryArtifactStorage
  prepared?: RequestStagedArtifactObjectV1
}): Promise<RequestDeliveryArtifactUploadResult> {
  const binding = await input.custodyService.resolveDeliveryArtifactCustody({
    requestId: input.upload.requestId,
    deliveryRevisionId: input.upload.deliveryRevisionId,
    artifactId: input.artifactId,
  })
  const fresh = fullBuilderDetail(
    await input.applicationService.getRequest(input.upload.requestId),
    input.upload,
    false,
  )
  const workspace = fresh.builderWorkspace
  const artifact = matchingWorkspaceArtifact(workspace, input.upload, input.validated)
  if (
    !artifact
    || artifact.artifactId !== input.artifactId
    || artifact.integrityStatus !== 'verified'
    || artifact.scanState !== 'complete'
    || artifact.scanVerdict !== 'clean'
    || binding.requestVersion !== fresh.requestVersion
  ) throw new DeliveryCustodyError('integrity_mismatch')
  assertCustodyBinding(binding, {
    upload: input.upload,
    validated: input.validated,
    workspace,
    artifactId: input.artifactId,
    prepared: input.prepared,
  })
  await verifyFinalizedDeliveryArtifactSet({
    storage: input.storage,
    scope: custodyScope(fresh, workspace),
    bindings: [{
      artifactId: binding.artifactId,
      artifactOrdinal: binding.artifactOrdinal,
      safeName: input.validated.safeName,
      objectIdentity: binding.objectIdentity,
      sha256: binding.sha256,
      byteLength: binding.byteLength,
      mediaType: binding.detectedMediaType,
    }],
  })
  return {
    artifactId: input.artifactId,
    requestVersion: fresh.requestVersion,
  }
}

async function bestEffortAbandon(input: {
  upload: ParsedRequestDeliveryArtifactUpload
  artifactId: string
  applicationService: RequestApplicationService
}) {
  try {
    const detail = await input.applicationService.getRequest(input.upload.requestId)
    if (
      detail.visibility !== 'full'
      || detail.moderationState !== 'clear'
      || !detail.actor.roles.includes('builder')
      || !detail.actor.capabilities.includes('abandon_delivery_artifact')
      || detail.builderWorkspace?.deliveryRevisionId !== input.upload.deliveryRevisionId
    ) return
    await input.applicationService.executeCommand({
      contractVersion: REQUEST_CONTRACT_VERSION,
      kind: 'abandon_delivery_artifact',
      requestId: input.upload.requestId,
      expectedVersion: detail.requestVersion,
      idempotencyKey: derivedIdempotencyKey('abandon', input.upload.idempotencyKey),
      payload: {
        deliveryRevisionId: input.upload.deliveryRevisionId,
        artifactId: input.artifactId,
      },
    })
  } catch {
    // A cleanup command is optional and actor-authorized. Raw storage is never
    // destructively cleaned here, and the original safe failure is preserved.
  }
}

export async function orchestrateRequestDeliveryArtifactUpload(
  upload: ParsedRequestDeliveryArtifactUpload,
  dependencies: RequestDeliveryArtifactUploadDependencies,
): Promise<RequestDeliveryArtifactUploadResult> {
  const validated = validateDeliveryArtifact(upload.artifact)
  const custodyService = createRequestStagedArtifactCustodyService(
    dependencies.serviceRoleClient,
  )
  const initialContext = initialBuilderContext(
    await dependencies.applicationService.getRequest(upload.requestId),
    upload,
  )
  const initial = initialContext.detail
  const workspace = initialContext.workspace
  const existing = matchingWorkspaceArtifact(workspace, upload, validated)

  if (
    existing
    && existing.integrityStatus === 'verified'
    && existing.scanState === 'complete'
    && existing.scanVerdict === 'clean'
  ) {
    return verifyFreshAttestedArtifact({
      upload,
      validated,
      artifactId: existing.artifactId,
      applicationService: dependencies.applicationService,
      custodyService,
      storage: dependencies.storage,
    })
  }
  if (!initial.actor.capabilities.includes('stage_delivery_artifact')) {
    throw new DeliveryCustodyError('authority_blocked')
  }
  if (
    initial.requestVersion !== upload.expectedVersion
    && !existing
  ) throw new DeliveryCustodyError('authority_blocked')
  if (
    !existing
    && upload.artifactOrdinal !== workspace.artifacts.length + 1
  ) throw new DeliveryCustodyError('authority_blocked')

  const stageReceipt = await dependencies.applicationService.executeCommand({
    contractVersion: REQUEST_CONTRACT_VERSION,
    kind: 'stage_delivery_artifact',
    requestId: upload.requestId,
    expectedVersion: upload.expectedVersion,
    idempotencyKey: upload.idempotencyKey,
    payload: {
      deliveryRevisionId: upload.deliveryRevisionId,
      acceptedBriefRevisionId: workspace.acceptedBriefRevisionId,
      activeBuilderAssignmentId: workspace.activeBuilderAssignmentId,
      artifactOrdinal: upload.artifactOrdinal,
      clientFileId: upload.clientFileId,
      normalizedName: validated.safeName,
      byteLength: validated.byteLength,
      sha256: validated.sha256,
      detectedMediaType: validated.mediaType,
      scannerVersion: validated.policyVersion,
    },
  })
  const artifactId = stageReceipt.authorityResult?.artifactId
  if (
    !artifactId
    || stageReceipt.requestId !== upload.requestId
    || stageReceipt.moderationState !== 'clear'
    || !['building', 'repair_required'].includes(stageReceipt.lifecycleState)
  ) throw new DeliveryCustodyError('authority_blocked')

  let attested = false
  try {
    const prepared = await custodyService.prepareStagedArtifactObject({
      requestId: upload.requestId,
      deliveryRevisionId: upload.deliveryRevisionId,
      artifactId,
      stageReceiptId: stageReceipt.commandId,
    })
    assertPreparedBinding(prepared, {
      upload,
      validated,
      workspace,
      artifactId,
      stageReceiptId: stageReceipt.commandId,
      stageRequestVersion: stageReceipt.requestVersion,
    })
    const staged = await stageDeliveryArtifactSet({
      storage: dependencies.storage,
      scope: custodyScope(initial, workspace),
      authority: custodyAuthority(initial),
      authorityArtifacts: [{
        artifactId,
        stagingIdentity: prepared.objectIdentity,
        artifactOrdinal: upload.artifactOrdinal,
      }],
      files: [upload.artifact],
    })
    await finalizeDeliveryArtifactSet({
      storage: dependencies.storage,
      staged,
      authority: custodyAuthority(initial),
    })
    await custodyService.attestStagedArtifactObject({
      ...prepared,
      idempotencyKey: derivedIdempotencyKey('attest', upload.idempotencyKey),
      scanVerdict: 'clean',
    })
    attested = true
    return await verifyFreshAttestedArtifact({
      upload,
      validated,
      artifactId,
      applicationService: dependencies.applicationService,
      custodyService,
      storage: dependencies.storage,
      prepared,
    })
  } catch (error) {
    if (!stageReceipt.replayed && !attested) {
      await bestEffortAbandon({
        upload,
        artifactId,
        applicationService: dependencies.applicationService,
      })
    }
    throw error
  }
}
