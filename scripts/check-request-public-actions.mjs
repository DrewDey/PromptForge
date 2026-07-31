#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { registerHooks } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = process.cwd()
const src = path.join(root, 'src')

class RedirectSignal extends Error {
  constructor(location) {
    super(location)
    this.location = location
  }
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') {
      return { url: 'data:text/javascript,export {}', shortCircuit: true }
    }
    if (specifier === 'next/cache') {
      return {
        url: 'data:text/javascript,export function revalidatePath() {}',
        shortCircuit: true,
      }
    }
    if (specifier === 'next/navigation') {
      return {
        url: `data:text/javascript,${encodeURIComponent(`
          export function redirect(location) {
            throw new globalThis.__RequestPublicRedirectSignal(location)
          }
        `)}`,
        shortCircuit: true,
      }
    }
    if (specifier === '@/lib/build-requests/server') {
      return {
        url: `data:text/javascript,${encodeURIComponent(`
          export async function getRequestApplicationService() {
            throw new Error('private service must not be resolved')
          }
          export async function getRequestPublicApplicationService() {
            globalThis.__requestPublicActionFactoryCalls += 1
            return globalThis.__requestPublicActionService
          }
          export function getRequestPublicServerService() {
            globalThis.__requestPublicServerFactoryCalls += 1
            return globalThis.__requestPublicServerService
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
    if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
      const parentDirectory = path.dirname(fileURLToPath(context.parentURL))
      for (const suffix of ['.ts', '.tsx', '/index.ts']) {
        const candidate = path.resolve(parentDirectory, `${specifier}${suffix}`)
        if (candidate.startsWith(src) && existsSync(candidate)) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true }
        }
      }
    }
    return nextResolve(specifier, context)
  },
})

globalThis.__RequestPublicRedirectSignal = RedirectSignal
globalThis.__requestPublicActionFactoryCalls = 0
globalThis.__requestPublicServerFactoryCalls = 0

const publicationCommands = []
const publicationBridgeCommands = []
const operatorCommands = []
const controlCommands = []
const operatorQueries = []
let operatorCandidates = []
globalThis.__requestPublicActionService = {
  async getAvailability() {
    return {
      policyVersions: {
        publicationTerms: 'request-publication-v1',
      },
    }
  },
  async executePublication(input) {
    publicationCommands.push(input)
    return { replayed: false }
  },
  async getOperations() {
    return {}
  },
  async getPublication() {
    return {
      visibility: 'full',
      capabilities: ['publish_outcome'],
      proposal: {
        proposalId: '9d100000-0000-4000-8000-000000000003',
        proposalVersion: 4,
        status: 'in_airlock',
      },
    }
  },
  async listOperators(query) {
    operatorQueries.push(query)
    return { items: operatorCandidates, nextCursor: null }
  },
  async setOperatorMembership(input) {
    operatorCommands.push(input)
    return { replayed: false }
  },
  async setControls(input) {
    controlCommands.push(input)
    return { replayed: false }
  },
}
globalThis.__requestPublicServerService = {
  async publishOutcome(input) {
    publicationBridgeCommands.push(input)
    return { replayed: false }
  },
}

const {
  publishRequestOutcomeAction,
  requestPublicationAction,
} = await import(pathToFileURL(path.join(
  src,
  'app/requests/[id]/actions.ts',
)).href)
const {
  updateRequestOperatorAction,
  updateRequestPublicControlsAction,
} = await import(pathToFileURL(path.join(
  src,
  'app/admin/build-requests/actions.ts',
)).href)

const requestId = '9d100000-0000-4000-8000-000000000001'

function consentForm(kind) {
  const form = new FormData()
  form.set('requestId', requestId)
  form.set('expectedRequestVersion', '9')
  form.set('expectedProposalVersion', '3')
  form.set('command', kind)
  form.set('idempotencyKey', `publication-${kind}-fixture`)
  form.set('publicationTermsVersion', 'request-publication-v1')
  if (kind === 'requester_consent') {
    form.set('requesterAttribution', 'anonymous')
  } else {
    form.set('reusePermission', 'adapt_with_credit')
  }
  form.append('publicationConsent', 'no')
  form.append('publicationConsent', 'yes')
  return form
}

await requestPublicationAction(consentForm('requester_consent'))
await requestPublicationAction(consentForm('builder_consent'))
assert.deepEqual(publicationCommands, [
  {
    requestId,
    expectedRequestVersion: 9,
    expectedProposalVersion: 3,
    idempotencyKey: 'publication-requester_consent-fixture',
    kind: 'requester_consent',
    payload: {
      requesterAttribution: 'anonymous',
      publicationTermsVersion: 'request-publication-v1',
    },
  },
  {
    requestId,
    expectedRequestVersion: 9,
    expectedProposalVersion: 3,
    idempotencyKey: 'publication-builder_consent-fixture',
    kind: 'builder_consent',
    payload: {
      reusePermission: 'adapt_with_credit',
      publicationTermsVersion: 'request-publication-v1',
    },
  },
])

for (const [label, mutate] of [
  ['missing acknowledgement', (form) => form.delete('publicationConsent')],
  ['only checked value', (form) => {
    form.delete('publicationConsent')
    form.append('publicationConsent', 'yes')
  }],
  ['hostile value', (form) => {
    form.delete('publicationConsent')
    form.append('publicationConsent', 'no')
    form.append('publicationConsent', 'publish_anyway')
  }],
  ['reordered envelope', (form) => {
    form.delete('publicationConsent')
    form.append('publicationConsent', 'yes')
    form.append('publicationConsent', 'no')
  }],
]) {
  const form = consentForm('requester_consent')
  mutate(form)
  const beforeFactories = globalThis.__requestPublicActionFactoryCalls
  const beforeCommands = publicationCommands.length
  await assert.rejects(
    requestPublicationAction(form),
    (error) => {
      assert.ok(error instanceof RedirectSignal, `${label} must redirect.`)
      assert.equal(
        error.location,
        `/requests/${requestId}?actionError=confirmation_required`,
      )
      return true
    },
  )
  assert.equal(
    globalThis.__requestPublicActionFactoryCalls,
    beforeFactories,
    `${label} must fail before resolving the application service.`,
  )
  assert.equal(
    publicationCommands.length,
    beforeCommands,
    `${label} must not mutate publication authority.`,
  )
}

const stale = consentForm('builder_consent')
stale.set('publicationTermsVersion', 'request-publication-v0')
const beforeStaleCommands = publicationCommands.length
await assert.rejects(
  requestPublicationAction(stale),
  (error) => {
    assert.ok(error instanceof RedirectSignal)
    assert.equal(
      error.location,
      `/requests/${requestId}?actionError=stale_version`,
    )
    return true
  },
)
assert.equal(
  publicationCommands.length,
  beforeStaleCommands,
  'A stale publication policy must not reach the mutation RPC.',
)

function withdrawalForm(values = []) {
  const form = new FormData()
  form.set('requestId', requestId)
  form.set('expectedRequestVersion', '10')
  form.set('expectedProposalVersion', '3')
  form.set('command', 'withdraw')
  form.set('idempotencyKey', 'publication-withdraw-fixture')
  for (const value of values) form.append('publicationWithdrawal', value)
  return form
}

for (const [label, values] of [
  ['missing withdrawal confirmation', []],
  ['partial withdrawal confirmation', ['yes']],
  ['hostile withdrawal confirmation', ['no', 'withdraw_anyway']],
  ['reordered withdrawal confirmation', ['yes', 'no']],
]) {
  const beforeFactories = globalThis.__requestPublicActionFactoryCalls
  const beforeCommands = publicationCommands.length
  await assert.rejects(
    requestPublicationAction(withdrawalForm(values)),
    (error) => {
      assert.ok(error instanceof RedirectSignal, `${label} must redirect.`)
      assert.equal(
        error.location,
        `/requests/${requestId}?actionError=confirmation_required`,
      )
      return true
    },
  )
  assert.equal(
    globalThis.__requestPublicActionFactoryCalls,
    beforeFactories,
    `${label} must fail before resolving the application service.`,
  )
  assert.equal(
    publicationCommands.length,
    beforeCommands,
    `${label} must not withdraw publication authority.`,
  )
}
await requestPublicationAction(withdrawalForm(['no', 'yes']))
assert.equal(
  publicationCommands.at(-1)?.kind,
  'withdraw',
  'An exact visible withdrawal confirmation must preserve the withdrawal command.',
)

function releaseForm(values = []) {
  const form = new FormData()
  form.set('requestId', requestId)
  form.set('proposalId', '9d100000-0000-4000-8000-000000000003')
  form.set('expectedProposalVersion', '4')
  form.set('publishedProjectId', '9d100000-0000-4000-8000-000000000004')
  form.set('idempotencyKey', 'publication-release-fixture')
  for (const value of values) form.append('publicationRelease', value)
  return form
}

for (const values of [
  [],
  ['yes'],
  ['no', 'publish_anyway'],
  ['yes', 'no'],
]) {
  const beforeApplicationFactories =
    globalThis.__requestPublicActionFactoryCalls
  const beforeServerFactories =
    globalThis.__requestPublicServerFactoryCalls
  await assert.rejects(
    publishRequestOutcomeAction(releaseForm(values)),
    (error) => {
      assert.ok(error instanceof RedirectSignal)
      assert.equal(
        error.location,
        `/admin/build-requests/${requestId}?actionError=confirmation_required`,
      )
      return true
    },
  )
  assert.equal(
    globalThis.__requestPublicActionFactoryCalls,
    beforeApplicationFactories,
    'Malformed publication release must fail before actor verification.',
  )
  assert.equal(
    globalThis.__requestPublicServerFactoryCalls,
    beforeServerFactories,
    'Malformed publication release must fail before service-role resolution.',
  )
}
await publishRequestOutcomeAction(releaseForm(['no', 'yes']))
assert.deepEqual(publicationBridgeCommands, [{
  proposalId: '9d100000-0000-4000-8000-000000000003',
  publishedProjectId: '9d100000-0000-4000-8000-000000000004',
  idempotencyKey: 'publication-release-fixture',
}])

const malformedRelease = releaseForm(['no', 'yes'])
malformedRelease.set('publishedProjectId', 'not-a-project')
const beforeMalformedReleaseApplicationFactories =
  globalThis.__requestPublicActionFactoryCalls
const beforeMalformedReleaseServerFactories =
  globalThis.__requestPublicServerFactoryCalls
await assert.rejects(
  publishRequestOutcomeAction(malformedRelease),
  (error) => {
    assert.ok(error instanceof RedirectSignal)
    assert.equal(
      error.location,
      `/admin/build-requests/${requestId}?actionError=unavailable`,
    )
    return true
  },
)
assert.equal(
  globalThis.__requestPublicActionFactoryCalls,
  beforeMalformedReleaseApplicationFactories,
)
assert.equal(
  globalThis.__requestPublicServerFactoryCalls,
  beforeMalformedReleaseServerFactories,
  'Malformed publication authority must fail before service-role resolution.',
)

function publicControlsForm(confirmation = ['no', 'yes']) {
  const form = new FormData()
  form.set('expectedControlsVersion', '4')
  form.set('idempotencyKey', 'request-public-controls-fixture')
  form.set('intakeAudience', 'invited')
  form.set('activeCaseCapacity', '4')
  form.set('fulfillmentCaseCapacity', '4')
  form.set('actorHourlyIntakeLimit', '5')
  form.set('networkHourlyIntakeLimit', '12')
  form.set('globalDailyIntakeLimit', '250')
  form.set('termsVersion', 'request-terms-v1')
  form.set('privacyVersion', 'request-privacy-v1')
  form.set('acceptableUseVersion', 'request-aup-v1')
  form.set('requesterRightsVersion', 'request-rights-v1')
  form.set('publicationTermsVersion', 'request-publication-v1')
  for (const name of [
    'acceptingRequests',
    'assigningRequests',
    'operatorRosterRequired',
    'publicIntakeRiskScreening',
    'transactionalNotificationsEnabled',
    'publicationConsentEnabled',
    'publicationAirlockEnabled',
    'publicOutcomesEnabled',
  ]) form.append(name, 'no')
  for (const value of confirmation) {
    form.append('controlConfirmation', value)
  }
  return form
}

for (const [label, confirmation] of [
  ['missing control confirmation', []],
  ['unchecked control confirmation', ['no']],
  ['hostile control confirmation', ['no', 'enable_anyway']],
  ['reordered control confirmation', ['yes', 'no']],
]) {
  const beforeFactories = globalThis.__requestPublicActionFactoryCalls
  const beforeCommands = controlCommands.length
  await assert.rejects(
    updateRequestPublicControlsAction(publicControlsForm(confirmation)),
    (error) => {
      assert.ok(error instanceof RedirectSignal, `${label} must redirect.`)
      assert.equal(
        error.location,
        '/admin/build-requests?scope=admin&actionError=unavailable',
      )
      return true
    },
  )
  assert.equal(
    globalThis.__requestPublicActionFactoryCalls,
    beforeFactories,
    `${label} must fail before service resolution.`,
  )
  assert.equal(
    controlCommands.length,
    beforeCommands,
    `${label} must not mutate release controls.`,
  )
}
await updateRequestPublicControlsAction(publicControlsForm())
assert.equal(
  controlCommands.length,
  1,
  'An exact attended control confirmation must reach the canonical authority once.',
)

function operatorForm(version = 0) {
  const form = new FormData()
  form.set(
    'membershipTarget',
    `9d100000-0000-4000-8000-000000000002:builder:${version}`,
  )
  form.set('state', 'active')
  form.set('maxActiveCases', '4')
  form.set('reason', 'Fixture operator readiness.')
  form.set('idempotencyKey', 'request-operator-fixture')
  form.set('operatorQuery', 'Fixture Builder')
  return form
}

const beforeMissingOperatorMutations = operatorCommands.length
await assert.rejects(
  updateRequestOperatorAction(operatorForm()),
  (error) => {
    assert.ok(error instanceof RedirectSignal)
    assert.equal(
      error.location,
      '/admin/build-requests?scope=admin&actionError=stale_version',
    )
    return true
  },
)
assert.equal(
  operatorCommands.length,
  beforeMissingOperatorMutations,
  'A missing roster candidate must remain a stale read and cannot mutate.',
)

const beforeHostileRoleFactories =
  globalThis.__requestPublicActionFactoryCalls
const hostileRole = operatorForm()
hostileRole.set(
  'membershipTarget',
  '9d100000-0000-4000-8000-000000000002:owner:0',
)
await assert.rejects(
  updateRequestOperatorAction(hostileRole),
  (error) => {
    assert.ok(error instanceof RedirectSignal)
    assert.equal(
      error.location,
      '/admin/build-requests?scope=admin&actionError=unavailable',
    )
    return true
  },
)
assert.equal(
  globalThis.__requestPublicActionFactoryCalls,
  beforeHostileRoleFactories,
  'A hostile roster role must fail before service resolution.',
)

operatorCandidates = [{
  accountId: '9d100000-0000-4000-8000-000000000002',
  displayName: 'Fixture Builder',
  isAdmin: false,
  memberships: [{
    membershipId: '9d200000-0000-4000-8000-000000000002',
    role: 'builder',
    version: 2,
    state: 'active',
    maxActiveCases: 4,
    availableFrom: null,
    availableUntil: null,
    currentlyAvailable: true,
  }],
}]
const beforeStaleOperatorMutations = operatorCommands.length
await assert.rejects(
  updateRequestOperatorAction(operatorForm(1)),
  (error) => {
    assert.ok(error instanceof RedirectSignal)
    assert.equal(
      error.location,
      '/admin/build-requests?scope=admin&actionError=stale_version',
    )
    return true
  },
)
assert.equal(
  operatorCommands.length,
  beforeStaleOperatorMutations,
  'A stale roster version must fail before mutation.',
)

await updateRequestOperatorAction(operatorForm(2))
assert.equal(
  operatorCommands.at(-1)?.expectedMembershipVersion,
  2,
  'Roster mutation must preserve the exact browser-reviewed version.',
)
assert.deepEqual(
  operatorQueries.at(-1),
  { query: 'Fixture Builder', limit: 100 },
  'Roster mutation must re-read the exact searched candidate set.',
)

const hostileOperatorQuery = operatorForm(2)
hostileOperatorQuery.set('operatorQuery', 'a'.repeat(81))
const beforeHostileQueryFactories =
  globalThis.__requestPublicActionFactoryCalls
await assert.rejects(
  updateRequestOperatorAction(hostileOperatorQuery),
  (error) => {
    assert.ok(error instanceof RedirectSignal)
    assert.equal(
      error.location,
      '/admin/build-requests?scope=admin&actionError=unavailable',
    )
    return true
  },
)
assert.equal(
  globalThis.__requestPublicActionFactoryCalls,
  beforeHostileQueryFactories,
  'An invalid operator search binding must fail before service resolution.',
)

console.log(
  'Request public action checks passed: consent, withdrawal, and attended-control confirmations use exact fail-before-service envelopes; stale terms and roster candidate/version drift stay fail-closed.',
)
