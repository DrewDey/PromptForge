#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const src = path.join(root, 'src')

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') {
      return { url: 'data:text/javascript,export {}', shortCircuit: true }
    }
    if (specifier === 'next/headers') {
      return {
        url: `data:text/javascript,${encodeURIComponent(`
          export async function headers() {
            return globalThis.__requestIntakeHeaders
          }
        `)}`,
        shortCircuit: true,
      }
    }
    if (specifier === '@/lib/build-requests/server') {
      return {
        url: `data:text/javascript,${encodeURIComponent(`
          export async function getRequestViewerState() {
            return globalThis.__requestIntakeViewerState
          }
          export async function getRequestPublicApplicationService() {
            globalThis.__requestIntakeApplicationFactoryCalls += 1
            return globalThis.__requestIntakeApplicationService
          }
          export function getRequestPublicServerService() {
            globalThis.__requestIntakeServerFactoryCalls += 1
            return globalThis.__requestIntakeServerService
          }
          export function requestAuthorityErrorCode(error) {
            return error?.authorityCode ?? 'unknown'
          }
        `)}`,
        shortCircuit: true,
      }
    }
    if (specifier.startsWith('@/')) {
      for (const suffix of ['.ts', '.tsx', '/index.ts']) {
        const candidate = path.join(src, `${specifier.slice(2)}${suffix}`)
        if (existsSync(candidate)) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true }
        }
      }
    }
    return nextResolve(specifier, context)
  },
})

const { submitRequestAction } = await import(pathToFileURL(path.join(
  src,
  'app/requests/new/actions.ts',
)).href)

const previousState = {
  status: 'ready',
  idempotencyKey: 'intake-fixture-key',
  analyticsAttempt: 0,
  values: {},
  errors: [],
  serviceError: null,
}

function intakeForm(checks) {
  const form = new FormData()
  form.set('idempotencyKey', 'intake-fixture-key')
  form.set('title', 'Exact private build')
  form.set('outcome', 'Produce one finite private artifact for the requester.')
  form.set('intendedUser', 'Requester')
  form.set('mustWorkScenario', 'The requester verifies the exact reviewed result.')
  form.set('constraints', 'Keep the delivery private.')
  form.set('termsVersion', 'request-terms-v1')
  form.set('privacyVersion', 'request-privacy-v1')
  form.set('acceptableUseVersion', 'request-aup-v1')
  form.set('requesterRightsVersion', 'request-rights-v1')
  for (const acknowledgement of [
    'termsAccepted',
    'privacyAcknowledged',
    'acceptableUseAccepted',
    'requesterRightsAccepted',
  ]) {
    form.append(acknowledgement, 'no')
    form.append(acknowledgement, 'yes')
  }
  for (const check of checks) form.append('acceptanceChecks', check)
  return form
}

const createInputs = []
const riskInputs = []
globalThis.__requestIntakeViewerState = {
  status: 'signed_in',
  user: { id: '10000000-0000-4000-a000-000000000001' },
}
process.env.REQUEST_BUILD_RATE_LIMIT_SECRET =
  'fixture-request-build-rate-limit-secret-0001'
globalThis.__requestIntakeHeaders = new Headers({
  'x-vercel-forwarded-for': '203.0.113.10',
})
globalThis.__requestIntakeApplicationFactoryCalls = 0
globalThis.__requestIntakeServerFactoryCalls = 0
globalThis.__requestIntakeApplicationService = {
  async getAvailability() {
    return {
      intakeAudience: 'authenticated',
      policyVersions: {
        terms: 'request-terms-v1',
        privacy: 'request-privacy-v1',
        acceptableUse: 'request-aup-v1',
        requesterRights: 'request-rights-v1',
        publicationTerms: 'request-publication-v1',
      },
    }
  },
  async submitRequest(input) {
    createInputs.push(input)
    return {
      commandId: '10000000-0000-4000-a000-000000000002',
      requestId: '10000000-0000-4000-a000-000000000003',
      requestVersion: 1,
      eventId: '10000000-0000-4000-a000-000000000004',
      occurredAt: '2026-07-30T12:00:00.000Z',
      lifecycleState: 'submitted',
      moderationState: 'clear',
      publicationState: 'private',
      replayed: false,
    }
  },
}
globalThis.__requestIntakeServerService = {
  async issueRiskGrant(input) {
    riskInputs.push(input)
    return {
      status: 'clear',
      grantId: '10000000-0000-4000-a000-000000000005',
      expiresAt: '2026-07-30T12:10:00.000Z',
      reason: null,
      replayed: false,
    }
  },
}

for (const checks of [
  ['The exact artifact opens.'],
  [
    'The exact artifact opens.',
    'The acceptance evidence is visible.',
    'The reviewed result remains private.',
  ],
]) {
  const before = createInputs.length
  const result = await submitRequestAction(previousState, intakeForm(checks))
  assert.equal(result.status, 'submitted')
  assert.equal(createInputs.length, before + 1)
  assert.deepEqual(
    createInputs.at(-1).request.brief.acceptanceChecks,
    checks,
    `${checks.length} exact acceptance check values must reach submitRequest unchanged.`,
  )
  assert.deepEqual(
    createInputs.at(-1).attestation,
    {
      termsVersion: 'request-terms-v1',
      privacyVersion: 'request-privacy-v1',
      acceptableUseVersion: 'request-aup-v1',
      requesterRightsVersion: 'request-rights-v1',
      termsAccepted: true,
      privacyAcknowledged: true,
      acceptableUseAccepted: true,
      requesterRightsAccepted: true,
    },
    'The exact policy attestation must reach the public application service.',
  )
}

for (const [label, form] of [
  ['zero checks', intakeForm([])],
  [
    'four checks',
    intakeForm([
      'The exact artifact opens.',
      'The acceptance evidence is visible.',
      'The reviewed result remains private.',
      'A fourth value must be rejected.',
    ]),
  ],
  [
    'mixed File and string checks',
    intakeForm([
      'The exact artifact opens.',
      new File(['not a text check'], 'check.txt', { type: 'text/plain' }),
    ]),
  ],
]) {
  const before = createInputs.length
  const result = await submitRequestAction(previousState, form)
  assert.equal(result.status, 'ready', `${label} must return bounded recovery.`)
  assert.equal(result.serviceError, null, `${label} must remain a validation error.`)
  assert.equal(result.errors.length, 1, `${label} must expose one safe error summary.`)
  assert.equal(
    createInputs.length,
    before,
    `${label} must not call submitRequest.`,
  )
}

const hostileReferenceForm = intakeForm(['The exact artifact opens.'])
hostileReferenceForm.set('referenceKind', 'external_url')
const createsBeforeHostileReference = createInputs.length
const factoriesBeforeHostileReference =
  globalThis.__requestIntakeApplicationFactoryCalls
const hostileReferenceResult = await submitRequestAction(
  previousState,
  hostileReferenceForm,
)
assert.equal(hostileReferenceResult.status, 'ready')
assert.equal(hostileReferenceResult.serviceError, null)
assert.equal(hostileReferenceResult.errors.length, 1)
assert.match(
  hostileReferenceResult.errors[0].message,
  /reference type must be empty, project, or response/i,
)
assert.equal(
  createInputs.length,
  createsBeforeHostileReference,
  'A hostile reference discriminant must not call submitRequest.',
)
assert.equal(
  globalThis.__requestIntakeApplicationFactoryCalls,
  factoriesBeforeHostileReference,
  'A hostile reference discriminant must fail before resolving the service.',
)

const malformedAttestation = intakeForm(['The exact artifact opens.'])
malformedAttestation.delete('requesterRightsAccepted')
const createsBeforeMalformedAttestation = createInputs.length
const applicationFactoriesBeforeMalformedAttestation =
  globalThis.__requestIntakeApplicationFactoryCalls
const serverFactoriesBeforeMalformedAttestation =
  globalThis.__requestIntakeServerFactoryCalls
const malformedAttestationResult = await submitRequestAction(
  previousState,
  malformedAttestation,
)
assert.equal(malformedAttestationResult.status, 'ready')
assert.equal(malformedAttestationResult.serviceError, null)
assert.match(
  malformedAttestationResult.errors[0].message,
  /every request intake acknowledgement is required/i,
)
assert.equal(createInputs.length, createsBeforeMalformedAttestation)
assert.equal(
  globalThis.__requestIntakeApplicationFactoryCalls,
  applicationFactoriesBeforeMalformedAttestation,
  'Malformed attestations must fail before application-service resolution.',
)
assert.equal(
  globalThis.__requestIntakeServerFactoryCalls,
  serverFactoriesBeforeMalformedAttestation,
  'Malformed attestations must fail before risk-service resolution.',
)

assert.equal(
  riskInputs.length,
  2,
  'Each valid authenticated intake must receive one server-only risk grant.',
)
assert.deepEqual(
  riskInputs[0],
  {
    actorId: '10000000-0000-4000-a000-000000000001',
    intakeIdempotencyKey: 'intake-fixture-key',
    networkDigest: createHmac(
      'sha256',
      process.env.REQUEST_BUILD_RATE_LIMIT_SECRET,
    )
      .update('request-intake-network-v1' + '\0' + '203.0.113.10')
      .digest('hex'),
    riskEngineVersion: 'request-intake-edge-v1',
  },
  'Risk screening must use the authenticated actor and trusted Vercel network.',
)

const originalAvailability =
  globalThis.__requestIntakeApplicationService.getAvailability
globalThis.__requestIntakeApplicationService.getAvailability = async () => ({
  intakeAudience: 'authenticated',
  policyVersions: {
    terms: 'request-terms-v2',
    privacy: 'request-privacy-v2',
    acceptableUse: 'request-aup-v2',
    requesterRights: 'request-rights-v2',
    publicationTerms: 'request-publication-v2',
  },
})
const riskCallsBeforePolicyDrift = riskInputs.length
const policyDriftResult = await submitRequestAction(
  previousState,
  intakeForm(['The exact artifact opens.']),
)
assert.equal(policyDriftResult.status, 'ready')
assert.equal(policyDriftResult.serviceError, 'stale_version')
assert.equal(policyDriftResult.policyVersions.terms, 'request-terms-v2')
assert.equal(
  riskInputs.length,
  riskCallsBeforePolicyDrift,
  'Stale policy attestations must refresh before risk-service resolution.',
)
globalThis.__requestIntakeApplicationService.getAvailability =
  originalAvailability

const originalSubmit =
  globalThis.__requestIntakeApplicationService.submitRequest
globalThis.__requestIntakeApplicationService.submitRequest = async () => {
  const error = new Error('expired risk grant')
  error.authorityCode = 'risk_grant_required'
  throw error
}
const expiredGrantResult = await submitRequestAction(
  previousState,
  intakeForm(['The exact artifact opens.']),
)
assert.equal(expiredGrantResult.status, 'ready')
assert.equal(expiredGrantResult.serviceError, 'risk_grant_required')
assert.notEqual(expiredGrantResult.idempotencyKey, 'intake-fixture-key')
assert.match(
  expiredGrantResult.idempotencyKey,
  /^request-intake-[0-9a-f-]{36}$/,
)
globalThis.__requestIntakeApplicationService.submitRequest = originalSubmit

const configuredRateLimitSecret =
  process.env.REQUEST_BUILD_RATE_LIMIT_SECRET
delete process.env.REQUEST_BUILD_RATE_LIMIT_SECRET
const riskCallsBeforeMissingSecret = riskInputs.length
const createsBeforeMissingSecret = createInputs.length
const serverFactoriesBeforeMissingSecret =
  globalThis.__requestIntakeServerFactoryCalls
const missingSecretResult = await submitRequestAction(
  previousState,
  intakeForm(['The exact artifact opens.']),
)
assert.equal(missingSecretResult.status, 'ready')
assert.equal(missingSecretResult.serviceError, 'unavailable')
assert.equal(riskInputs.length, riskCallsBeforeMissingSecret)
assert.equal(createInputs.length, createsBeforeMissingSecret)
assert.equal(
  globalThis.__requestIntakeServerFactoryCalls,
  serverFactoriesBeforeMissingSecret,
  'A missing network HMAC secret must fail before service-role construction.',
)
process.env.REQUEST_BUILD_RATE_LIMIT_SECRET = configuredRateLimitSecret

console.log(
  'Request intake Server Action checks passed: exact 1/3-check and four-attestation envelopes persist through server-only pseudonymous risk screening; stale policies refresh, expired grants rotate safely, and 0/4/mixed/reference/attestation hostility plus missing HMAC authority fail before mutation.',
)
