#!/usr/bin/env node

import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'server-only') {
      return { url: 'data:text/javascript,export {}', shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

const {
  REQUEST_BUILD_MAINTENANCE_BATCH_LIMIT,
  createRequestBuildMaintenanceHttpHandler,
} = await import(pathToFileURL(path.join(
  process.cwd(),
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

console.log(
  'Request maintenance HTTP check passed: secret-first construction, bounded aggregate responses, complete/partial status, and fail-closed result validation.',
)
