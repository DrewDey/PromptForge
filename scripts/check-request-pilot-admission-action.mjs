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
}
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
}

const { updatePilotAdmissionAction } = await import(pathToFileURL(path.join(
  src,
  'app/admin/build-requests/actions.ts',
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
  { candidates: 0, invite: 0, revoke: 0 },
  'Missing or hostile admission discriminants must call no admission RPC.',
)

console.log(
  'Pilot admission Server Action checks passed: missing and hostile discriminants fail closed before every admission RPC.',
)
