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
    if (specifier === '@/lib/site-url') {
      return {
        url: `data:text/javascript,${encodeURIComponent(`
          export function getAbsoluteSiteUrl(path) {
            return 'https://pathforge.test' + path
          }
        `)}`,
        shortCircuit: true,
      }
    }
    if (specifier === '@/lib/build-requests/server') {
      return {
        url: `data:text/javascript,${encodeURIComponent(`
          export function getRequestPublicServerService() {
            globalThis.__requestPublicWorkerServiceFactories += 1
            return globalThis.__requestPublicWorkerRouteService
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
  createRequestNotificationWorker,
  createResendRequestNotificationTransport,
} = await import(pathToFileURL(path.join(
  src,
  'lib/build-requests/request-notification-worker.ts',
)).href)
const {
  createRequestNotificationHttpHandler,
} = await import(pathToFileURL(path.join(
  src,
  'lib/build-requests/request-notification-http.ts',
)).href)
const {
  createRequestPublicMaintenanceHttpHandler,
} = await import(pathToFileURL(path.join(
  src,
  'lib/build-requests/request-public-maintenance-http.ts',
)).href)

const requestId = '9c100000-0000-4000-8000-000000000001'
const claims = [
  {
    deliveryId: '9c100000-0000-4000-8000-000000000002',
    claimToken: '9c100000-0000-4000-8000-000000000003',
    templateKey: 'request_action_needed',
    requestPath: `/requests/${requestId}`,
    attempt: 1,
  },
  {
    deliveryId: '9c100000-0000-4000-8000-000000000004',
    claimToken: '9c100000-0000-4000-8000-000000000005',
    templateKey: 'request_delivery_ready',
    requestPath: `/requests/${requestId}`,
    attempt: 2,
  },
  {
    deliveryId: '9c100000-0000-4000-8000-000000000006',
    claimToken: '9c100000-0000-4000-8000-000000000007',
    templateKey: 'request_report_received',
    requestPath: `/requests/${requestId}`,
    attempt: 1,
  },
]
const claimRecipients = new Map([
  [claims[0].deliveryId, 'one@example.test'],
  [claims[1].deliveryId, 'two@example.test'],
  [claims[2].deliveryId, 'three@example.test'],
])

let claimCalls = 0
let transportCalls = 0
const controlOffWorker = createRequestNotificationWorker({
  service: {
    async projectNotifications(limit) {
      assert.equal(limit, 50)
      return {
        controlEnabled: false,
        eventsProjected: 0,
        reportsProjected: 0,
      }
    },
    async claimNotifications() {
      claimCalls += 1
      return { items: [] }
    },
  },
  transport: {
    async send() {
      transportCalls += 1
      return { ok: true }
    },
  },
})
assert.deepEqual(await controlOffWorker.run(Number.NaN), {
  controlEnabled: false,
  eventsProjected: 0,
  reportsProjected: 0,
  claimed: 0,
  delivered: 0,
  suppressed: 0,
  retried: 0,
  dead: 0,
  failed: 0,
})
assert.equal(claimCalls, 0)
assert.equal(transportCalls, 0)

const finishes = []
const messages = []
let activeSends = 0
let maximumActiveSends = 0
const worker = createRequestNotificationWorker({
  concurrency: 2,
  service: {
    async projectNotifications(limit) {
      assert.equal(limit, 3)
      return {
        controlEnabled: true,
        eventsProjected: 2,
        reportsProjected: 1,
      }
    },
    async claimNotifications(limit) {
      assert.equal(limit, 3)
      return { items: claims }
    },
    async resolveNotificationSend(input) {
      const claim = claims.find(
        (candidate) => candidate.deliveryId === input.deliveryId,
      )
      assert(claim)
      assert.equal(input.claimToken, claim.claimToken)
      if (input.deliveryId === claims[2].deliveryId) {
        return { status: 'suppressed', reason: 'preference_off' }
      }
      return {
        status: 'authorized',
        deliveryId: claim.deliveryId,
        claimToken: claim.claimToken,
        recipient: claimRecipients.get(claim.deliveryId),
        templateKey: claim.templateKey,
        requestPath: claim.requestPath,
      }
    },
    async finishNotification(input) {
      finishes.push(input)
      return {
        deliveryState: input.succeeded ? 'delivered' : 'retry',
        attempts: input.succeeded ? 1 : 2,
      }
    },
  },
  transport: {
    async send(input) {
      activeSends += 1
      maximumActiveSends = Math.max(maximumActiveSends, activeSends)
      messages.push(input)
      await new Promise((resolve) => setTimeout(resolve, 2))
      activeSends -= 1
      if (input.recipient === 'two@example.test') {
        return { ok: false, code: 'provider_unavailable' }
      }
      return { ok: true }
    },
  },
})
assert.deepEqual(await worker.run(3), {
  controlEnabled: true,
  eventsProjected: 2,
  reportsProjected: 1,
  claimed: 3,
  delivered: 1,
  suppressed: 1,
  retried: 1,
  dead: 0,
  failed: 0,
})
assert.equal(maximumActiveSends, 2)
assert.equal(finishes.length, 2)
assert.equal(messages.length, 2)
for (const message of messages) {
  assert.match(message.text, /https:\/\/pathforge\.test\/requests\//)
  assert.match(message.text, /contains no brief or delivery content/i)
  assert.doesNotMatch(
    message.text,
    /manifest|artifact sha|acceptance check|private-provider-state/i,
  )
  assert.equal(
    claimRecipients.get(message.idempotencyKey),
    message.recipient,
  )
}

const originalFetch = globalThis.fetch
const fetches = []
globalThis.fetch = async (url, init) => {
  fetches.push({ url, init })
  return new Response(null, { status: 202 })
}
try {
  const unconfigured = createResendRequestNotificationTransport(
    'short',
    'invalid',
  )
  assert.deepEqual(await unconfigured.send({
    idempotencyKey: claims[0].deliveryId,
    recipient: claimRecipients.get(claims[0].deliveryId),
    subject: 'Fixture',
    text: 'Fixture',
  }), { ok: false, code: 'transport_unconfigured' })
  assert.equal(fetches.length, 0)
  const hostileSender = createResendRequestNotificationTransport(
    're_fixture_api_key_1234567890',
    'PathForge <requests@pathforge.test>\nBcc: leak@example.test',
  )
  assert.deepEqual(await hostileSender.send({
    idempotencyKey: claims[0].deliveryId,
    recipient: claimRecipients.get(claims[0].deliveryId),
    subject: 'Fixture',
    text: 'Fixture',
  }), { ok: false, code: 'transport_unconfigured' })
  assert.equal(fetches.length, 0)

  const resend = createResendRequestNotificationTransport(
    're_fixture_api_key_1234567890',
    'PathForge <requests@pathforge.test>',
  )
  assert.deepEqual(await resend.send({
    idempotencyKey: claims[0].deliveryId,
    recipient: claimRecipients.get(claims[0].deliveryId),
    subject: 'Fixture subject',
    text: 'Fixture text',
  }), { ok: true })
  assert.equal(fetches.length, 1)
  assert.equal(
    fetches[0].init.headers['Idempotency-Key'],
    claims[0].deliveryId,
  )
  assert.ok(
    fetches[0].init.signal instanceof AbortSignal,
    'The external mail request must carry a bounded abort signal.',
  )
  assert.deepEqual(JSON.parse(fetches[0].init.body), {
    from: 'PathForge <requests@pathforge.test>',
    to: ['one@example.test'],
    subject: 'Fixture subject',
    text: 'Fixture text',
  })
} finally {
  globalThis.fetch = originalFetch
}

const secret = 'request-public-worker-secret-0000000001'
const authorizedRequest = (path) => new Request(
  `https://pathforge.test${path}`,
  { headers: { authorization: `Bearer ${secret}` } },
)
const unauthorizedRequest = (path) => new Request(
  `https://pathforge.test${path}`,
)

for (const handlerFactory of [
  () => createRequestNotificationHttpHandler({
    readCronSecret: () => secret,
    createWorker() {
      throw new Error('must-not-construct')
    },
  }),
  () => createRequestPublicMaintenanceHttpHandler({
    readCronSecret: () => secret,
    createService() {
      throw new Error('must-not-construct')
    },
  }),
]) {
  const response = await handlerFactory()(unauthorizedRequest('/private'))
  assert.equal(response.status, 404)
  assert.deepEqual(await response.json(), {
    ok: false,
    error: 'Unavailable.',
  })
}

const notificationHandler = createRequestNotificationHttpHandler({
  readCronSecret: () => secret,
  createWorker: () => ({
    async run() {
      return {
        controlEnabled: true,
        eventsProjected: 0,
        reportsProjected: 0,
        claimed: 0,
        delivered: 0,
        suppressed: 0,
        retried: 0,
        dead: 0,
        failed: 0,
      }
    },
  }),
})
const notificationResponse = await notificationHandler(
  authorizedRequest('/api/cron/request-build-notifications'),
)
assert.equal(notificationResponse.status, 200)
assert.equal(
  notificationResponse.headers.get('cache-control'),
  'private, no-store, max-age=0',
)
assert.deepEqual(await notificationResponse.json(), {
  ok: true,
  controlEnabled: true,
  eventsProjected: 0,
  reportsProjected: 0,
  claimed: 0,
  delivered: 0,
  suppressed: 0,
  retried: 0,
  dead: 0,
  failed: 0,
})

for (const failureState of [
  { retried: 1, dead: 0, failed: 0 },
  { retried: 0, dead: 1, failed: 0 },
  { retried: 0, dead: 0, failed: 1 },
]) {
  const unhealthyNotificationHandler =
    createRequestNotificationHttpHandler({
      readCronSecret: () => secret,
      createWorker: () => ({
        async run() {
          return {
            controlEnabled: true,
            eventsProjected: 1,
            reportsProjected: 0,
            claimed: 1,
            delivered: 0,
            suppressed: 0,
            ...failureState,
          }
        },
      }),
    })
  const unhealthyResponse = await unhealthyNotificationHandler(
    authorizedRequest('/api/cron/request-build-notifications'),
  )
  assert.equal(unhealthyResponse.status, 503)
  assert.equal((await unhealthyResponse.json()).ok, false)
}

const leakingNotificationHandler = createRequestNotificationHttpHandler({
  readCronSecret: () => secret,
  createWorker: () => ({
    async run() {
      return {
        controlEnabled: true,
        eventsProjected: 0,
        reportsProjected: 0,
        claimed: 0,
        delivered: 0,
        suppressed: 0,
        retried: 0,
        dead: 0,
        failed: 0,
        requestId,
      }
    },
  }),
})
const leakingNotificationResponse = await leakingNotificationHandler(
  authorizedRequest('/api/cron/request-build-notifications'),
)
assert.equal(leakingNotificationResponse.status, 500)
assert.doesNotMatch(await leakingNotificationResponse.text(), /requestId|9c100/)

const maintenanceResult = {
  reportsPurged: 1,
  proposalsPurged: 1,
  riskGrantsDeleted: 2,
  notificationDeliveriesDeleted: 3,
  readinessEvidenceDeleted: 0,
}
const maintenanceHandler = createRequestPublicMaintenanceHttpHandler({
  readCronSecret: () => secret,
  createService: () => ({
    async maintain(limit) {
      assert.equal(limit, 100)
      return maintenanceResult
    },
  }),
})
const maintenanceResponse = await maintenanceHandler(
  authorizedRequest('/api/cron/request-build-public-maintenance'),
)
assert.equal(maintenanceResponse.status, 200)
assert.deepEqual(await maintenanceResponse.json(), {
  ok: true,
  ...maintenanceResult,
})

let maintenancePasses = 0
const pagedMaintenanceHandler =
  createRequestPublicMaintenanceHttpHandler({
    readCronSecret: () => secret,
    createService: () => ({
      async maintain(limit) {
        assert.equal(limit, 100)
        maintenancePasses += 1
        return maintenancePasses === 1
          ? {
              reportsPurged: 100,
              proposalsPurged: 0,
              riskGrantsDeleted: 0,
              notificationDeliveriesDeleted: 0,
              readinessEvidenceDeleted: 0,
            }
          : {
              reportsPurged: 2,
              proposalsPurged: 0,
              riskGrantsDeleted: 0,
              notificationDeliveriesDeleted: 0,
              readinessEvidenceDeleted: 0,
            }
      },
    }),
  })
const pagedMaintenanceResponse = await pagedMaintenanceHandler(
  authorizedRequest('/api/cron/request-build-public-maintenance'),
)
assert.equal(pagedMaintenanceResponse.status, 200)
assert.equal(maintenancePasses, 2)
assert.deepEqual(await pagedMaintenanceResponse.json(), {
  ok: true,
  reportsPurged: 102,
  proposalsPurged: 0,
  riskGrantsDeleted: 0,
  notificationDeliveriesDeleted: 0,
  readinessEvidenceDeleted: 0,
})

let saturatedMaintenancePasses = 0
const saturatedMaintenanceHandler =
  createRequestPublicMaintenanceHttpHandler({
    readCronSecret: () => secret,
    createService: () => ({
      async maintain() {
        saturatedMaintenancePasses += 1
        return {
          reportsPurged: 100,
          proposalsPurged: 0,
          riskGrantsDeleted: 0,
          notificationDeliveriesDeleted: 0,
          readinessEvidenceDeleted: 0,
        }
      },
    }),
  })
const saturatedMaintenanceResponse = await saturatedMaintenanceHandler(
  authorizedRequest('/api/cron/request-build-public-maintenance'),
)
assert.equal(saturatedMaintenanceResponse.status, 503)
assert.equal(saturatedMaintenancePasses, 5)
assert.deepEqual(await saturatedMaintenanceResponse.json(), {
  ok: false,
  reportsPurged: 500,
  proposalsPurged: 0,
  riskGrantsDeleted: 0,
  notificationDeliveriesDeleted: 0,
  readinessEvidenceDeleted: 0,
})

const leakingMaintenanceHandler = createRequestPublicMaintenanceHttpHandler({
  readCronSecret: () => secret,
  createService: () => ({
    async maintain() {
      return {
        ...maintenanceResult,
        requestId,
      }
    },
  }),
})
const leakingMaintenanceResponse = await leakingMaintenanceHandler(
  authorizedRequest('/api/cron/request-build-public-maintenance'),
)
assert.equal(leakingMaintenanceResponse.status, 500)
assert.doesNotMatch(await leakingMaintenanceResponse.text(), /requestId|9c100/)

const priorCronSecret = process.env.CRON_SECRET
const priorResendKey = process.env.RESEND_API_KEY
const priorNotificationFrom = process.env.REQUEST_BUILD_NOTIFICATION_FROM
process.env.CRON_SECRET = secret
process.env.RESEND_API_KEY = ''
process.env.REQUEST_BUILD_NOTIFICATION_FROM = ''
globalThis.__requestPublicWorkerServiceFactories = 0
globalThis.__requestPublicWorkerRouteService = {
  async projectNotifications() {
    return {
      controlEnabled: false,
      eventsProjected: 0,
      reportsProjected: 0,
    }
  },
  async claimNotifications() {
    throw new Error('control-off worker must not claim')
  },
  async maintain() {
    return maintenanceResult
  },
}
try {
  const { GET: notificationRoute } = await import(pathToFileURL(path.join(
    src,
    'app/api/cron/request-build-notifications/route.ts',
  )).href)
  const { GET: maintenanceRoute } = await import(pathToFileURL(path.join(
    src,
    'app/api/cron/request-build-public-maintenance/route.ts',
  )).href)
  assert.equal(
    (await notificationRoute(unauthorizedRequest(
      '/api/cron/request-build-notifications',
    ))).status,
    404,
  )
  assert.equal(
    (await maintenanceRoute(unauthorizedRequest(
      '/api/cron/request-build-public-maintenance',
    ))).status,
    404,
  )
  assert.equal(
    globalThis.__requestPublicWorkerServiceFactories,
    0,
    'Route shells must not construct service-role clients before authorization.',
  )
  assert.equal(
    (await notificationRoute(authorizedRequest(
      '/api/cron/request-build-notifications',
    ))).status,
    200,
  )
  assert.equal(
    (await maintenanceRoute(authorizedRequest(
      '/api/cron/request-build-public-maintenance',
    ))).status,
    200,
  )
  assert.equal(globalThis.__requestPublicWorkerServiceFactories, 2)
} finally {
  if (priorCronSecret === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = priorCronSecret
  if (priorResendKey === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = priorResendKey
  if (priorNotificationFrom === undefined) {
    delete process.env.REQUEST_BUILD_NOTIFICATION_FROM
  } else {
    process.env.REQUEST_BUILD_NOTIFICATION_FROM = priorNotificationFrom
  }
}

console.log(
  'Request public workers passed: controls-off no-op, bounded concurrency and provider timeout, content-free templates, Resend idempotency, aggregate-only HTTP, secret-first service construction, and notification/public-retention route shells are green.',
)
