#!/usr/bin/env node

import assert from 'node:assert/strict'
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
    if (specifier === '@/lib/build-requests/server') {
      return {
        url: `data:text/javascript,${encodeURIComponent(`
          export async function getRequestViewerState() {
            return globalThis.__requestIntakeViewerState
          }
          export async function getRequestApplicationService() {
            globalThis.__requestIntakeServiceFactoryCalls += 1
            return globalThis.__requestIntakeService
          }
          export function requestAuthorityErrorCode() {
            return 'unknown'
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
  for (const check of checks) form.append('acceptanceChecks', check)
  return form
}

const createInputs = []
globalThis.__requestIntakeViewerState = {
  status: 'signed_in',
  user: { id: '10000000-0000-4000-a000-000000000001' },
}
globalThis.__requestIntakeServiceFactoryCalls = 0
globalThis.__requestIntakeService = {
  async createRequest(input) {
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
    createInputs.at(-1).brief.acceptanceChecks,
    checks,
    `${checks.length} exact acceptance check values must reach createRequest unchanged.`,
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
    `${label} must not call createRequest.`,
  )
}

const hostileReferenceForm = intakeForm(['The exact artifact opens.'])
hostileReferenceForm.set('referenceKind', 'external_url')
const createsBeforeHostileReference = createInputs.length
const factoriesBeforeHostileReference =
  globalThis.__requestIntakeServiceFactoryCalls
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
  'A hostile reference discriminant must not call createRequest.',
)
assert.equal(
  globalThis.__requestIntakeServiceFactoryCalls,
  factoriesBeforeHostileReference,
  'A hostile reference discriminant must fail before resolving the service.',
)

console.log(
  'Request intake Server Action checks passed: exact 1/3-check envelopes persist unchanged; 0/4/mixed/reference-discriminant values fail before createRequest.',
)
