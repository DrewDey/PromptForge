'use server'

import {
  REQUEST_CONTRACT_VERSION,
  RequestContractError,
  validateSubmitBuildRequestV1,
  type PathForgeRequestReference,
} from '@/lib/request-lifecycle'
import { createHmac, randomUUID } from 'node:crypto'
import { isIP } from 'node:net'
import { headers } from 'next/headers'
import {
  getRequestPublicApplicationService,
  getRequestPublicServerService,
  getRequestViewerState,
  requestAuthorityErrorCode,
} from '@/lib/build-requests/server'
import {
  readRequestIntakeAcceptanceChecks,
  RequestIntakeEnvelopeError,
} from '@/lib/build-requests/intake-envelope'
import type {
  RequestIntakeError,
  RequestIntakeValues,
  RequestIntakeWorkflowAction,
  RequestIntakeWorkflowState,
} from '@/components/requests/intake'
import type {
  RequestPublicPolicyVersionsV1,
} from '@/lib/request-public-architecture'

function text(formData: FormData, name: string) {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

function exactAttestation(formData: FormData, name: string) {
  const values = formData.getAll(name)
  if (
    values.length === 2 &&
    values[0] === 'no' &&
    values[1] === 'yes'
  ) return true as const
  throw new RequestContractError('Every Request intake acknowledgement is required.')
}

function canonicalNetworkAddress(value: string) {
  const version = isIP(value)
  if (version === 4) return value
  if (version === 6) {
    const hostname = new URL(`http://[${value}]/`).hostname
    return hostname.slice(1, -1)
  }
  return null
}

async function trustedNetworkDigest() {
  const secret = process.env.REQUEST_BUILD_RATE_LIMIT_SECRET
  if (!secret || secret.length < 32 || /[\0\r\n]/.test(secret)) {
    throw new Error('request_build_rate_limit_secret_unavailable')
  }
  const requestHeaders = await headers()
  const vercelForwarded = requestHeaders
    .get('x-vercel-forwarded-for')
    ?.split(',')[0]
    ?.trim()
  let networkAddress = vercelForwarded
    ? canonicalNetworkAddress(vercelForwarded)
    : null
  if (process.env.VERCEL === '1') {
    if (!networkAddress) {
      throw new Error('request_build_trusted_network_unavailable')
    }
  } else if (!networkAddress) {
    const forwarded = requestHeaders
      .get('x-forwarded-for')
      ?.split(',')[0]
      ?.trim()
    networkAddress = forwarded ? canonicalNetworkAddress(forwarded) : null
    if (!networkAddress && process.env.NODE_ENV !== 'production') {
      networkAddress = '127.0.0.1'
    }
  }
  if (!networkAddress) {
    throw new Error('request_build_trusted_network_unavailable')
  }
  return createHmac('sha256', secret)
    .update(`request-intake-network-v1\0${networkAddress}`)
    .digest('hex')
}

function valuesFromForm(formData: FormData): RequestIntakeValues {
  const referenceKind = text(formData, 'referenceKind')
  if (
    referenceKind !== '' &&
    referenceKind !== 'project' &&
    referenceKind !== 'response'
  ) {
    throw new RequestContractError(
      'PathForge reference type must be empty, project, or response.',
    )
  }
  let pathforgeReference: PathForgeRequestReference | undefined
  if (referenceKind === 'project') {
    pathforgeReference = {
      kind: 'project',
      projectId: text(formData, 'referenceProjectId'),
    }
  } else if (referenceKind === 'response') {
    pathforgeReference = {
      kind: 'response',
      projectId: text(formData, 'referenceProjectId'),
      modelVariantId: text(formData, 'referenceModelVariantId'),
      responseStepNumber: Number(text(formData, 'referenceResponseStepNumber')),
    }
  }
  return {
    title: text(formData, 'title'),
    outcome: text(formData, 'outcome'),
    intendedUser: text(formData, 'intendedUser'),
    mustWorkScenario: text(formData, 'mustWorkScenario'),
    acceptanceChecks: [],
    constraints: text(formData, 'constraints'),
    pathforgeReference,
  }
}

function validationError(error: unknown): RequestIntakeError[] {
  return [{
    field: 'form',
    message: error instanceof RequestContractError ||
      error instanceof RequestIntakeEnvelopeError
      ? error.message
      : 'The brief did not match the authoritative Request contract.',
  }]
}

export const submitRequestAction: RequestIntakeWorkflowAction = async (
  previousState,
  formData,
) => {
  let values: RequestIntakeValues = {
    title: text(formData, 'title'),
    outcome: text(formData, 'outcome'),
    intendedUser: text(formData, 'intendedUser'),
    mustWorkScenario: text(formData, 'mustWorkScenario'),
    acceptanceChecks: [],
    constraints: text(formData, 'constraints'),
  }
  const idempotencyKey = text(formData, 'idempotencyKey')
  const analyticsAttempt = previousState.analyticsAttempt + 1
  let currentPolicyVersions: RequestPublicPolicyVersionsV1 | undefined
  try {
    values = valuesFromForm(formData)
    const acceptanceChecks = readRequestIntakeAcceptanceChecks(formData)
    values = { ...values, acceptanceChecks: [...acceptanceChecks] }
    const viewer = await getRequestViewerState()
    if (viewer.status === 'signed_out') {
      return {
        status: 'ready',
        idempotencyKey,
        analyticsAttempt,
        values,
        errors: [],
        serviceError: 'auth_required',
      }
    }
    if (viewer.status === 'unavailable') {
      return {
        status: 'ready',
        idempotencyKey,
        analyticsAttempt,
        values,
        errors: [],
        serviceError: 'unavailable',
      }
    }
    const input = validateSubmitBuildRequestV1({
      contractVersion: REQUEST_CONTRACT_VERSION,
      idempotencyKey,
      brief: {
        ...values,
        acceptanceChecks,
      },
    })
    const attestation = {
      termsVersion: text(formData, 'termsVersion'),
      privacyVersion: text(formData, 'privacyVersion'),
      acceptableUseVersion: text(formData, 'acceptableUseVersion'),
      requesterRightsVersion: text(formData, 'requesterRightsVersion'),
      termsAccepted: exactAttestation(formData, 'termsAccepted'),
      privacyAcknowledged: exactAttestation(formData, 'privacyAcknowledged'),
      acceptableUseAccepted: exactAttestation(
        formData,
        'acceptableUseAccepted',
      ),
      requesterRightsAccepted: exactAttestation(
        formData,
        'requesterRightsAccepted',
      ),
    }
    const service = await getRequestPublicApplicationService()
    const availability = await service.getAvailability()
    currentPolicyVersions = availability.policyVersions
    if (
      attestation.termsVersion !== availability.policyVersions.terms ||
      attestation.privacyVersion !== availability.policyVersions.privacy ||
      attestation.acceptableUseVersion !==
        availability.policyVersions.acceptableUse ||
      attestation.requesterRightsVersion !==
        availability.policyVersions.requesterRights
    ) {
      return {
        status: 'ready',
        idempotencyKey,
        analyticsAttempt,
        values,
        errors: [],
        serviceError: 'stale_version',
        policyVersions: currentPolicyVersions,
      }
    }
    let riskGrantId: string | null = null
    if (availability.intakeAudience === 'authenticated') {
      const networkDigest = await trustedNetworkDigest()
      const risk = await getRequestPublicServerService().issueRiskGrant({
        actorId: viewer.user.id,
        intakeIdempotencyKey: input.idempotencyKey,
        networkDigest,
        riskEngineVersion: 'request-intake-edge-v1',
      })
      if (risk.status === 'denied') {
        return {
          status: 'ready',
          idempotencyKey,
          analyticsAttempt,
          values,
          errors: [],
          serviceError: 'rate_limited',
        }
      }
      riskGrantId = risk.grantId
    }
    const receipt = await service.submitRequest({
      request: input,
      riskGrantId,
      attestation,
    })
    return {
      status: 'submitted',
      idempotencyKey,
      analyticsAttempt,
      receipt: {
        commandId: receipt.commandId,
        requestId: receipt.requestId,
        version: receipt.requestVersion,
        eventId: receipt.eventId,
        occurredAt: receipt.occurredAt,
        lifecycle: receipt.lifecycleState,
        moderation: receipt.moderationState,
        publication: receipt.publicationState,
        replayed: receipt.replayed,
      },
      requestHref: `/requests/${encodeURIComponent(receipt.requestId)}`,
    }
  } catch (error) {
    const code = requestAuthorityErrorCode(error)
    const serviceError = code === 'not_admitted' ||
      code === 'controls_off' ||
      code === 'capacity_full' ||
      code === 'unavailable' ||
      code === 'rate_limited' ||
      code === 'duplicate' ||
      code === 'stale_version' ||
      code === 'readiness_incomplete' ||
      code === 'risk_grant_required'
      ? code
      : error instanceof RequestContractError
        || error instanceof RequestIntakeEnvelopeError
        ? null
        : 'unavailable'
    return {
      status: 'ready',
      idempotencyKey: code === 'risk_grant_required'
        ? `request-intake-${randomUUID()}`
        : idempotencyKey,
      analyticsAttempt,
      values,
      errors: serviceError ? [] : validationError(error),
      serviceError,
      policyVersions: currentPolicyVersions,
    } satisfies RequestIntakeWorkflowState
  }
}
