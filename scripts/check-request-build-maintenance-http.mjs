#!/usr/bin/env node

import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const src = path.join(root, 'src')
const read = relativePath => readFileSync(path.join(root, relativePath), 'utf8')

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') {
      return { url: 'data:text/javascript,export {}', shortCircuit: true }
    }
    if (specifier === '@/lib/supabase/admin') {
      return {
        url: `data:text/javascript,${encodeURIComponent(`
          export function createAdminClient() {
            globalThis.__requestMaintenanceAdminCalls += 1
            return globalThis.__requestMaintenanceAdminClient
          }
        `)}`,
        shortCircuit: true,
      }
    }
    if (specifier === '@/lib/build-requests/delivery-supabase-storage') {
      return {
        url: `data:text/javascript,${encodeURIComponent(`
          export function createDeliverySupabaseStorage(admin) {
            globalThis.__requestMaintenanceStorageCalls += 1
            globalThis.__requestMaintenanceStorageAdmin = admin
            return globalThis.__requestMaintenanceStorage
          }
        `)}`,
        shortCircuit: true,
      }
    }
    if (specifier === '@/lib/build-requests/delivery-retention-runner') {
      return {
        url: `data:text/javascript,${encodeURIComponent(`
          export function createRequestDeliveryMaintenanceRunner(dependencies) {
            globalThis.__requestMaintenanceRunnerCalls += 1
            globalThis.__requestMaintenanceRunnerDependencies = dependencies
            return globalThis.__requestMaintenanceRunner
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

const {
  REQUEST_BUILD_MAINTENANCE_BATCH_LIMIT,
  createRequestBuildMaintenanceHttpHandler,
} = await import(pathToFileURL(path.join(
  root,
  'src/lib/build-requests/request-maintenance-http.ts',
)).href)

const secret = 'request-build-maintenance-secret-0001'
const complete = {
  examined: 3,
  artifactsDeleted: 1,
  artifactsAlreadyMissing: 0,
  rawTextPurged: 1,
  revisionsRetired: 0,
  auditTombstonesExpired: 0,
  deidentificationReceiptsExpired: 0,
  authorityNoOp: 0,
  retained: 1,
  preserved: 0,
  failed: 0,
  hasMore: false,
}

function request(authorization) {
  return new Request('https://pathforge.test/api/cron/request-build-maintenance', {
    headers: authorization === undefined ? {} : { authorization },
  })
}

for (const [configuredSecret, authorization] of [
  [undefined, undefined],
  ['too-short', `Bearer ${secret}`],
  [secret, undefined],
  [secret, 'Basic unavailable'],
  [secret, `Bearer  ${secret}`],
  [secret, `Bearer ${secret} trailing`],
  [secret, 'Bearer wrong-request-build-maintenance-secret'],
]) {
  let factoryCalls = 0
  const handler = createRequestBuildMaintenanceHttpHandler({
    readCronSecret: () => configuredSecret,
    createRunner() {
      factoryCalls += 1
      return { runBatch: async () => complete }
    },
  })
  const response = await handler(request(authorization))
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), { ok: false, error: 'Unavailable.' })
  assert.equal(
    factoryCalls,
    0,
    'service-role maintenance must not be constructed before authorization',
  )
}

let requestedBatch
const completeHandler = createRequestBuildMaintenanceHttpHandler({
  readCronSecret: () => secret,
  createRunner() {
    return {
      async runBatch(input) {
        requestedBatch = input
        return complete
      },
    }
  },
})
const completeResponse = await completeHandler(request(`Bearer ${secret}`))
assert.equal(completeResponse.status, 200)
assert.equal(
  completeResponse.headers.get('cache-control'),
  'private, no-store, max-age=0',
)
assert.deepEqual(requestedBatch, {
  limit: REQUEST_BUILD_MAINTENANCE_BATCH_LIMIT,
})
assert.deepEqual(await completeResponse.json(), { ok: true, ...complete })

const backlogHandler = createRequestBuildMaintenanceHttpHandler({
  readCronSecret: () => secret,
  createRunner: () => ({
    runBatch: async () => ({ ...complete, hasMore: true }),
  }),
})
const backlogResponse = await backlogHandler(request(`Bearer ${secret}`))
assert.equal(backlogResponse.status, 503)
assert.deepEqual(await backlogResponse.json(), {
  ok: false,
  ...complete,
  hasMore: true,
})

const failedHandler = createRequestBuildMaintenanceHttpHandler({
  readCronSecret: () => secret,
  createRunner: () => ({
    runBatch: async () => ({
      ...complete,
      examined: 1,
      artifactsDeleted: 0,
      rawTextPurged: 0,
      retained: 0,
      failed: 1,
    }),
  }),
})
const failedResponse = await failedHandler(request(`Bearer ${secret}`))
assert.equal(failedResponse.status, 503)
assert.equal((await failedResponse.json()).failed, 1)

for (const invalidResult of [
  { ...complete, examined: -1 },
  { ...complete, examined: 4 },
  { ...complete, failed: 0.5 },
  { ...complete, hasMore: 'false' },
]) {
  const invalidHandler = createRequestBuildMaintenanceHttpHandler({
    readCronSecret: () => secret,
    createRunner: () => ({ runBatch: async () => invalidResult }),
  })
  const invalidResponse = await invalidHandler(request(`Bearer ${secret}`))
  assert.equal(invalidResponse.status, 500)
  assert.deepEqual(await invalidResponse.json(), {
    ok: false,
    error: 'Request maintenance is unavailable.',
  })
}

let thrownBody
const thrownHandler = createRequestBuildMaintenanceHttpHandler({
  readCronSecret: () => secret,
  createRunner() {
    throw new Error('provider-details-must-not-escape')
  },
})
const thrownResponse = await thrownHandler(request(`Bearer ${secret}`))
assert.equal(thrownResponse.status, 500)
thrownBody = await thrownResponse.text()
assert.doesNotMatch(thrownBody, /provider-details|requestId|artifactId|sha256/i)

const originalCronSecret = process.env.CRON_SECRET
globalThis.__requestMaintenanceAdminCalls = 0
globalThis.__requestMaintenanceStorageCalls = 0
globalThis.__requestMaintenanceRunnerCalls = 0
globalThis.__requestMaintenanceAdminClient = { kind: 'admin' }
globalThis.__requestMaintenanceStorage = { kind: 'storage' }
globalThis.__requestMaintenanceRunner = {
  runBatch: async input => {
    assert.deepEqual(input, { limit: REQUEST_BUILD_MAINTENANCE_BATCH_LIMIT })
    return complete
  },
}

const { GET: maintenanceRoute } = await import(pathToFileURL(path.join(
  root,
  'src/app/api/cron/request-build-maintenance/route.ts',
)).href)

try {
  process.env.CRON_SECRET = secret
  const routeDenied = await maintenanceRoute(request('Bearer incorrect-secret'))
  assert.equal(routeDenied.status, 404)
  assert.equal(globalThis.__requestMaintenanceAdminCalls, 0)
  assert.equal(globalThis.__requestMaintenanceStorageCalls, 0)
  assert.equal(globalThis.__requestMaintenanceRunnerCalls, 0)

  const routeAccepted = await maintenanceRoute(request(`Bearer ${secret}`))
  assert.equal(routeAccepted.status, 200)
  assert.deepEqual(await routeAccepted.json(), { ok: true, ...complete })
  assert.equal(globalThis.__requestMaintenanceAdminCalls, 1)
  assert.equal(globalThis.__requestMaintenanceStorageCalls, 1)
  assert.equal(globalThis.__requestMaintenanceRunnerCalls, 1)
  assert.equal(
    globalThis.__requestMaintenanceStorageAdmin,
    globalThis.__requestMaintenanceAdminClient,
  )
  assert.deepEqual(globalThis.__requestMaintenanceRunnerDependencies, {
    serviceRoleClient: globalThis.__requestMaintenanceAdminClient,
    storage: globalThis.__requestMaintenanceStorage,
  })
} finally {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = originalCronSecret
}

const workflow = read('.github/workflows/request-build-maintenance.yml')
assert.match(workflow, /cron: '37 11 \* \* \*'/)
assert.match(workflow, /PATHFORGE_PRODUCTION_URL/)
assert.match(workflow, /PATHFORGE_CRON_SECRET/)
assert.match(workflow, /--fail-with-body/)
assert.match(workflow, /\/api\/cron\/request-build-maintenance/)
assert.match(workflow, /cancel-in-progress: false/)

const vercelConfig = JSON.parse(read('vercel.json'))
assert.equal(
  vercelConfig.crons.length,
  2,
  'the Request worker must not exceed the two existing Vercel Hobby cron slots',
)
assert.equal(
  vercelConfig.crons.some(
    item => item.path === '/api/cron/request-build-maintenance',
  ),
  false,
)

const runbook = read('docs/request-build-pilot-operations.md')
assert.match(runbook, /accepting_requests=false/)
assert.match(runbook, /assigning_requests=false/)
assert.match(runbook, /active_case_capacity=4/)
assert.match(runbook, /GitHub Actions/)
assert.match(runbook, /forward migration/)
assert.match(runbook, /zero trust incidents/)

console.log(
  'Request maintenance HTTP check passed: secret-first route construction, bounded aggregate responses, complete/partial status, fail-closed validation, and one daily GitHub schedule.',
)
