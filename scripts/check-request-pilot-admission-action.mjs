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
          export async function getRequestPublicApplicationService() {
            globalThis.__pilotPublicServiceFactoryCalls += 1
            return globalThis.__pilotPublicService
          }
          export function getRequestPublicServerService() {
            globalThis.__pilotPublicServerFactoryCalls += 1
            return globalThis.__pilotPublicServerService
          }
          export function requestAuthorityErrorCode() {
            return 'unknown'
          }
        `)}`,
        shortCircuit: true,
      }
    }
    if (specifier === '@/lib/request-public-architecture') {
      return {
        url: `data:text/javascript,${encodeURIComponent(`
          export const REQUEST_INTAKE_AUDIENCES = ['invited', 'authenticated']
          export const REQUEST_READINESS_GATES = [
            'legal',
            'incident_owner',
            'waf',
            'responsive_qa',
            'attended_lifecycle',
            'notification_transport',
          ]
          export const REQUEST_REPORT_CATEGORIES = [
            'safety',
            'privacy',
            'integrity',
            'rights',
            'service',
          ]
          export const requestPublicPatterns = {
            uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
            key: /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/,
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
}
const executedCommands = []
globalThis.__pilotAdmissionServiceFactoryCalls = 0
globalThis.__pilotPublicServiceFactoryCalls = 0
globalThis.__pilotPublicServerFactoryCalls = 0
globalThis.__pilotPublicService = {}
globalThis.__pilotPublicServerService = {}
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
}

const {
  adminRequestCommandAction,
  updatePilotAdmissionAction,
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
  { candidates: 0, invite: 0, revoke: 0, execute: 0 },
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
  { candidates: 1, invite: 0, revoke: 0, execute: 0 },
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

console.log(
  'Request command Server Action checks passed: admission, participant, and reassignment envelopes fail closed with zero unintended mutation.',
)
