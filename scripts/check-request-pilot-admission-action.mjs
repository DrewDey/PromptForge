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
    if (specifier === 'next/cache') {
      return {
        url: 'data:text/javascript,export function revalidatePath() {}',
        shortCircuit: true,
      }
    }
    if (specifier === 'next/navigation') {
      return {
        url: `data:text/javascript,${encodeURIComponent(`
          export function redirect(path) {
            const error = new Error('redirect')
            error.destination = path
            throw error
          }
        `)}`,
        shortCircuit: true,
      }
    }
    if (specifier === '@/lib/build-requests/server') {
      return {
        url: `data:text/javascript,${encodeURIComponent(`
          export async function getRequestApplicationService() {
            globalThis.__pilotAdmissionServiceFactoryCalls += 1
            return globalThis.__pilotAdmissionService
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

const calls = {
  candidates: 0,
  invite: 0,
  revoke: 0,
  execute: 0,
  controls: 0,
}
const controlInputs = []
const executedCommands = []
globalThis.__pilotAdmissionServiceFactoryCalls = 0
globalThis.__pilotAdmissionService = {
  async listPilotAdmissionCandidates() {
    calls.candidates += 1
    return { items: [], nextCursor: null }
  },
  async inviteRequestPilotParticipant() {
    calls.invite += 1
  },
  async revokeRequestPilotParticipant() {
    calls.revoke += 1
  },
  async executeCommand(command) {
    calls.execute += 1
    executedCommands.push(command)
  },
  async updateControls(input) {
    calls.controls += 1
    controlInputs.push(input)
  },
}

const {
  adminRequestCommandAction,
  updatePilotAdmissionAction,
  updateRequestControlsAction,
} = await import(pathToFileURL(path.join(
  src,
  'app/admin/build-requests/actions.ts',
)).href)
const { requestCaseCommandAction } = await import(pathToFileURL(path.join(
  src,
  'app/requests/[id]/actions.ts',
)).href)

for (const [label, admissionAction] of [
  ['missing action', undefined],
  ['hostile action', 'replace_everyone'],
]) {
  const formData = new FormData()
  formData.set('accountId', '10000000-0000-4000-a000-000000000001')
  if (admissionAction) formData.set('admissionAction', admissionAction)
  let destination = null
  try {
    await updatePilotAdmissionAction(formData)
  } catch (error) {
    destination = error?.destination ?? null
  }
  assert.equal(
    destination,
    '/admin/build-requests?scope=admin&actionError=unavailable',
    `${label} must take the bounded operator recovery path.`,
  )
}

assert.equal(
  globalThis.__pilotAdmissionServiceFactoryCalls,
  0,
  'Invalid admission discriminants must fail before resolving the service.',
)
assert.deepEqual(
  calls,
  { candidates: 0, invite: 0, revoke: 0, execute: 0, controls: 0 },
  'Missing or hostile admission discriminants must call no admission RPC.',
)

const staleCandidateForm = new FormData()
staleCandidateForm.set(
  'accountId',
  '10000000-0000-4000-a000-000000000001',
)
staleCandidateForm.set('admissionAction', 'invite')
staleCandidateForm.set('reason', 'Bounded pilot admission reason.')
let staleDestination = null
try {
  await updatePilotAdmissionAction(staleCandidateForm)
} catch (error) {
  staleDestination = error?.destination ?? null
}
assert.equal(
  staleDestination,
  '/admin/build-requests?scope=admin&actionError=stale_version',
  'A missing eligible candidate must preserve the truthful stale-version branch.',
)
assert.equal(globalThis.__pilotAdmissionServiceFactoryCalls, 1)
assert.deepEqual(
  calls,
  { candidates: 1, invite: 0, revoke: 0, execute: 0, controls: 0 },
  'A stale candidate may be re-read but must call neither admission mutation.',
)

const requestId = '10000000-0000-4000-a000-000000000010'
const invalidParticipantForm = new FormData()
invalidParticipantForm.set('requestId', requestId)
invalidParticipantForm.set('expectedVersion', '3')
invalidParticipantForm.set('idempotencyKey', 'participant-invalid-action')
invalidParticipantForm.set('command', 'publish_private_case')
const factoryBeforeParticipant = globalThis.__pilotAdmissionServiceFactoryCalls
let participantDestination = null
try {
  await requestCaseCommandAction(invalidParticipantForm)
} catch (error) {
  participantDestination = error?.destination ?? null
}
assert.equal(
  participantDestination,
  `/requests/${requestId}?actionError=unavailable`,
  'An unsupported participant command must take bounded recovery.',
)
assert.equal(
  globalThis.__pilotAdmissionServiceFactoryCalls,
  factoryBeforeParticipant,
  'An unsupported participant command must not resolve the service.',
)
assert.equal(calls.execute, 0)

const unconfirmedReassignment = new FormData()
unconfirmedReassignment.set('requestId', requestId)
unconfirmedReassignment.set('expectedVersion', '3')
unconfirmedReassignment.set('idempotencyKey', 'admin-reassign-unconfirmed')
unconfirmedReassignment.set('command', 'reassign_builder')
unconfirmedReassignment.set(
  'builderUserId',
  '10000000-0000-4000-a000-000000000011',
)
unconfirmedReassignment.set('reason', 'Accountable recovery.')
const factoryBeforeReassignment = globalThis.__pilotAdmissionServiceFactoryCalls
let reassignmentDestination = null
try {
  await adminRequestCommandAction(unconfirmedReassignment)
} catch (error) {
  reassignmentDestination = error?.destination ?? null
}
assert.equal(
  reassignmentDestination,
  `/admin/build-requests/${requestId}?actionError=confirmation_required`,
  'An unconfirmed reassignment must take bounded confirmation recovery.',
)
assert.equal(
  globalThis.__pilotAdmissionServiceFactoryCalls,
  factoryBeforeReassignment,
  'An unconfirmed reassignment must not resolve the service.',
)
assert.equal(calls.execute, 0)

const unconfirmedWithdrawal = new FormData()
unconfirmedWithdrawal.set('requestId', requestId)
unconfirmedWithdrawal.set('expectedVersion', '3')
unconfirmedWithdrawal.set('idempotencyKey', 'participant-withdraw-unconfirmed')
unconfirmedWithdrawal.set('command', 'withdraw')
unconfirmedWithdrawal.set('reason', 'Requester withdrew this private case.')
const factoryBeforeWithdrawal = globalThis.__pilotAdmissionServiceFactoryCalls
let withdrawalDestination = null
try {
  await requestCaseCommandAction(unconfirmedWithdrawal)
} catch (error) {
  withdrawalDestination = error?.destination ?? null
}
assert.equal(
  withdrawalDestination,
  `/requests/${requestId}?actionError=confirmation_required`,
  'An unconfirmed withdrawal must take bounded confirmation recovery.',
)
assert.equal(
  globalThis.__pilotAdmissionServiceFactoryCalls,
  factoryBeforeWithdrawal,
  'An unconfirmed withdrawal must fail before resolving the service.',
)
assert.equal(calls.execute, 0)

const confirmedWithdrawal = new FormData()
for (const [name, value] of unconfirmedWithdrawal.entries()) {
  confirmedWithdrawal.append(name, value)
}
confirmedWithdrawal.set('idempotencyKey', 'participant-withdraw-confirmed')
confirmedWithdrawal.set('confirmation', 'confirmed')
const executeBeforeConfirmedWithdrawal = calls.execute
await requestCaseCommandAction(confirmedWithdrawal)
assert.equal(
  calls.execute,
  executeBeforeConfirmedWithdrawal + 1,
  'A confirmed withdrawal must reach exactly one executeCommand call.',
)
assert.equal(executedCommands.at(-1)?.kind, 'withdraw')
assert.deepEqual(
  executedCommands.at(-1)?.payload,
  { reason: 'Requester withdrew this private case.' },
  'Confirmed withdrawal must preserve the bounded reason.',
)

for (const [command, field, value] of [
  ['release_moderation_hold', 'resolution', 'Safety review completed.'],
  ['remove_for_moderation', 'reason', 'Safety review requires removal.'],
]) {
  const formData = new FormData()
  formData.set('requestId', requestId)
  formData.set('expectedVersion', '4')
  formData.set('idempotencyKey', `admin-${command}`)
  formData.set('command', command)
  formData.set(field, value)
  const executeBeforeHeldCommand = calls.execute
  await adminRequestCommandAction(formData)
  assert.equal(
    calls.execute,
    executeBeforeHeldCommand + 1,
    `A valid ${command} envelope must reach exactly one executeCommand call.`,
  )
  assert.equal(
    executedCommands.at(-1)?.kind,
    command,
    `Held operator action must serialize exact ${command}.`,
  )
  assert.deepEqual(executedCommands.at(-1)?.payload, { [field]: value })
}

const hostileHeldCommand = new FormData()
hostileHeldCommand.set('requestId', requestId)
hostileHeldCommand.set('expectedVersion', '4')
hostileHeldCommand.set('idempotencyKey', 'admin-hostile-held-command')
hostileHeldCommand.set('command', 'clear')
const factoryBeforeHostileHeldCommand = globalThis.__pilotAdmissionServiceFactoryCalls
const executeBeforeHostileHeldCommand = calls.execute
let hostileHeldDestination = null
try {
  await adminRequestCommandAction(hostileHeldCommand)
} catch (error) {
  hostileHeldDestination = error?.destination ?? null
}
assert.equal(
  hostileHeldDestination,
  `/admin/build-requests/${requestId}?actionError=unavailable`,
)
assert.equal(
  globalThis.__pilotAdmissionServiceFactoryCalls,
  factoryBeforeHostileHeldCommand,
  'An unsupported moderation setter must fail before resolving the service.',
)
assert.equal(
  calls.execute,
  executeBeforeHostileHeldCommand,
  'An unsupported moderation setter must not execute a command.',
)

function controlsForm({
  accepting = ['no'],
  assigning = ['no'],
} = {}) {
  const formData = new FormData()
  formData.set('expectedControlsVersion', '4')
  formData.set('idempotencyKey', 'request-controls-v4')
  formData.set('activeCaseCapacity', '4')
  for (const value of accepting) formData.append('acceptingRequests', value)
  for (const value of assigning) formData.append('assigningRequests', value)
  return formData
}

for (const [label, formData] of [
  ['missing sentinel', controlsForm({ accepting: [] })],
  ['novel value', controlsForm({ accepting: ['no', 'maybe'] })],
  ['duplicate checkbox value', controlsForm({ accepting: ['no', 'yes', 'yes'] })],
  ['reordered values', controlsForm({ accepting: ['yes', 'no'] })],
]) {
  const factoryBefore = globalThis.__pilotAdmissionServiceFactoryCalls
  const updatesBefore = calls.controls
  let destination = null
  try {
    await updateRequestControlsAction(formData)
  } catch (error) {
    destination = error?.destination ?? null
  }
  assert.equal(
    destination,
    '/admin/build-requests?scope=admin&actionError=unavailable',
    `${label} must take bounded controls recovery.`,
  )
  assert.equal(
    globalThis.__pilotAdmissionServiceFactoryCalls,
    factoryBefore,
    `${label} must fail before resolving the service.`,
  )
  assert.equal(calls.controls, updatesBefore, `${label} must not update controls.`)
}

await updateRequestControlsAction(controlsForm())
await updateRequestControlsAction(controlsForm({
  accepting: ['no', 'yes'],
  assigning: ['no', 'yes'],
}))
assert.deepEqual(
  controlInputs.map((input) => ({
    acceptingRequests: input.acceptingRequests,
    assigningRequests: input.assigningRequests,
  })),
  [
    { acceptingRequests: false, assigningRequests: false },
    { acceptingRequests: true, assigningRequests: true },
  ],
  'Valid hidden-sentinel envelopes must preserve exact false and true values.',
)

console.log(
  'Request command Server Action checks passed: admission, participant, reassignment, and service-control envelopes fail closed with zero unintended mutation.',
)
