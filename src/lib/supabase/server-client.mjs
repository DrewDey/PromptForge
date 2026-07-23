import { createClient } from '@supabase/supabase-js'

const SECRET_KEY_PREFIX = 'sb_secret_'
const PUBLISHABLE_KEY_PREFIX = 'sb_publishable_'

export function isSupabaseSecretKey(value) {
  return typeof value === 'string' && value.startsWith(SECRET_KEY_PREFIX)
}

export function isLegacyServiceRoleKey(value) {
  if (typeof value !== 'string') return false
  const segments = value.split('.')
  if (segments.length !== 3 || segments.some(segment => !segment)) return false

  try {
    const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'))
    return payload?.role === 'service_role'
  } catch {
    return false
  }
}

export function resolveSupabaseServerKey(environment = process.env) {
  const secretKey = environment.SUPABASE_SECRET_KEY?.trim()
  if (secretKey) {
    if (!isSupabaseSecretKey(secretKey)) {
      throw new Error('SUPABASE_SECRET_KEY must contain a current sb_secret_ key.')
    }
    return secretKey
  }

  const serviceRoleKey = environment.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY.')
  }
  if (!isLegacyServiceRoleKey(serviceRoleKey)) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must contain a legacy JWT with the service_role claim.')
  }

  return serviceRoleKey
}

export function createSupabaseSecretKeyFetch(
  secretKey,
  fetchImplementation = globalThis.fetch,
) {
  if (!isSupabaseSecretKey(secretKey)) {
    throw new Error('The opaque-key transport requires an sb_secret_ key.')
  }
  if (typeof fetchImplementation !== 'function') {
    throw new Error('A Fetch implementation is required for the Supabase server client.')
  }

  return async (input, init = {}) => {
    const inheritedHeaders = typeof Request !== 'undefined' && input instanceof Request
      ? input.headers
      : undefined
    const headers = new Headers(init.headers ?? inheritedHeaders)
    const apiKey = headers.get('apikey')
    const authorization = headers.get('authorization')

    // supabase-js currently duplicates its API key into Authorization when no
    // user session exists. Opaque sb_secret_ keys are not JWTs, so keep the
    // gateway credential in apikey and remove only that exact duplicate.
    // Any actual user/session bearer token is preserved.
    if (apiKey === secretKey && authorization === `Bearer ${secretKey}`) {
      headers.delete('authorization')
    }

    return fetchImplementation(input, { ...init, headers })
  }
}

export function createSupabaseServerClient(
  supabaseUrl,
  serverKey,
  { fetchImplementation } = {},
) {
  const normalizedUrl = supabaseUrl?.trim()
  const normalizedKey = serverKey?.trim()
  if (!normalizedUrl) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required.')
  if (!normalizedKey) throw new Error('A Supabase server key is required.')
  if (normalizedKey.startsWith(PUBLISHABLE_KEY_PREFIX)) {
    throw new Error('A publishable Supabase key cannot authorize server administration.')
  }
  if (!isSupabaseSecretKey(normalizedKey) && !isLegacyServiceRoleKey(normalizedKey)) {
    throw new Error('A Supabase server key must be an sb_secret_ key or a legacy service_role JWT.')
  }

  const customFetch = isSupabaseSecretKey(normalizedKey)
    ? createSupabaseSecretKeyFetch(normalizedKey, fetchImplementation)
    : fetchImplementation

  return createClient(normalizedUrl, normalizedKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    ...(customFetch ? { global: { fetch: customFetch } } : {}),
  })
}
