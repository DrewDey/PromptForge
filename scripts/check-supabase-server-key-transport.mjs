#!/usr/bin/env node

import assert from 'node:assert/strict'
import {
  createSupabaseSecretKeyFetch,
  createSupabaseServerClient,
  resolveSupabaseServerKey,
} from '../src/lib/supabase/server-client.mjs'

const SECRET_KEY = ['sb', 'secret', 'transport-regression-not-a-credential'].join('_')
const LEGACY_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature'
const LEGACY_ANON_KEY = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.signature'
const USER_ACCESS_TOKEN = 'user.header.signature'
const SUPABASE_URL = 'https://transport-regression.supabase.co'

function jsonResponse(value, headers = {}) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  })
}

function createRecorder(records) {
  return async (input, init = {}) => {
    const url = typeof input === 'string' || input instanceof URL
      ? String(input)
      : input.url
    const headers = new Headers(init.headers)
    records.push({
      url,
      method: init.method ?? 'GET',
      headers,
    })

    if (url.includes('/auth/v1/admin/users')) {
      return jsonResponse(
        { users: [], aud: 'authenticated' },
        { 'x-total-count': '0' },
      )
    }
    if (url.includes('/functions/v1/')) return jsonResponse({ ok: true })
    return jsonResponse([])
  }
}

async function exerciseServerSurfaces(serverKey) {
  const records = []
  const client = createSupabaseServerClient(SUPABASE_URL, serverKey, {
    fetchImplementation: createRecorder(records),
  })

  await client.from('transport_probe').select('id').limit(1)
  await client.rpc('transport_probe_rpc', {})
  await client.auth.admin.listUsers({ page: 1, perPage: 1 })
  await client.storage.from('transport-probe').list('', { limit: 1 })
  await client.functions.invoke('transport-probe', { body: { ok: true } })

  return records
}

assert.equal(
  resolveSupabaseServerKey({ SUPABASE_SECRET_KEY: `  ${SECRET_KEY}  ` }),
  SECRET_KEY,
)
assert.equal(
  resolveSupabaseServerKey({ SUPABASE_SERVICE_ROLE_KEY: `  ${LEGACY_SERVICE_ROLE_KEY}  ` }),
  LEGACY_SERVICE_ROLE_KEY,
)
assert.throws(
  () => resolveSupabaseServerKey({ SUPABASE_SECRET_KEY: LEGACY_SERVICE_ROLE_KEY }),
  /must contain a current sb_secret_ key/,
)
assert.throws(
  () => resolveSupabaseServerKey({ SUPABASE_SERVICE_ROLE_KEY: SECRET_KEY }),
  /must contain a legacy JWT with the service_role claim/,
)
assert.throws(
  () => resolveSupabaseServerKey({ SUPABASE_SERVICE_ROLE_KEY: LEGACY_ANON_KEY }),
  /must contain a legacy JWT with the service_role claim/,
)
assert.throws(
  () => resolveSupabaseServerKey({}),
  /Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY/,
)

const secretRecords = await exerciseServerSurfaces(SECRET_KEY)
assert.equal(secretRecords.length, 5)
for (const record of secretRecords) {
  assert.equal(record.headers.get('apikey'), SECRET_KEY, `${record.url} must carry the opaque key in apikey.`)
  assert.equal(record.headers.has('authorization'), false, `${record.url} must not send the opaque key as a bearer token.`)
}
for (const requiredPath of [
  '/rest/v1/transport_probe',
  '/rest/v1/rpc/transport_probe_rpc',
  '/auth/v1/admin/users',
  '/storage/v1/object/list/transport-probe',
  '/functions/v1/transport-probe',
]) {
  assert.ok(
    secretRecords.some(record => record.url.includes(requiredPath)),
    `The transport regression must exercise ${requiredPath}.`,
  )
}

const legacyRecords = await exerciseServerSurfaces(LEGACY_SERVICE_ROLE_KEY)
assert.equal(legacyRecords.length, 5)
for (const record of legacyRecords) {
  assert.equal(record.headers.get('apikey'), LEGACY_SERVICE_ROLE_KEY)
  assert.equal(
    record.headers.get('authorization'),
    `Bearer ${LEGACY_SERVICE_ROLE_KEY}`,
    `${record.url} must preserve the legacy JWT bearer transport.`,
  )
}

const directRecords = []
const protectedFetch = createSupabaseSecretKeyFetch(SECRET_KEY, createRecorder(directRecords))
await protectedFetch(`${SUPABASE_URL}/rest/v1/user_probe`, {
  headers: {
    apikey: SECRET_KEY,
    Authorization: `Bearer ${USER_ACCESS_TOKEN}`,
  },
})
assert.equal(
  directRecords[0].headers.get('authorization'),
  `Bearer ${USER_ACCESS_TOKEN}`,
  'The opaque-key transport must preserve a real user/session bearer token.',
)

await protectedFetch(`${SUPABASE_URL}/rest/v1/duplicate_probe`, {
  headers: {
    apikey: SECRET_KEY,
    Authorization: `Bearer ${SECRET_KEY}`,
  },
})
assert.equal(
  directRecords[1].headers.has('authorization'),
  false,
  'The opaque-key transport must remove only the duplicated secret-key bearer token.',
)

console.log('Supabase server-key transport checks passed.')
