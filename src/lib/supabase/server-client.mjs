import { createClient } from '@supabase/supabase-js'

const SECRET_KEY_PREFIX = 'sb_secret_'
const PUBLISHABLE_KEY_PREFIX = 'sb_publishable_'
const TRANSIENT_AUTH_KEY_REJECTION = /invalid JWT[\s\S]*unrecognized JWT kid <nil> for algorithm ES256/i
const MAX_TRANSIENT_AUTH_ATTEMPTS = 8

function isReplayableFetchBody(body) {
  if (body == null || typeof body === 'string') return true
  if (typeof ArrayBuffer !== 'undefined' && (body instanceof ArrayBuffer || ArrayBuffer.isView(body))) {
    return true
  }
  if (typeof Blob !== 'undefined' && body instanceof Blob) return true
  if (typeof FormData !== 'undefined' && body instanceof FormData) return true
  if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return true
  return false
}

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
    const headers = new Headers(inheritedHeaders)
    for (const [name, value] of new Headers(init.headers)) headers.set(name, value)
    const apiKey = headers.get('apikey')
    const authorization = headers.get('authorization')

    // supabase-js currently duplicates its API key into Authorization when no
    // user session exists. Opaque sb_secret_ keys are not JWTs, so keep the
    // gateway credential in apikey and remove only that exact duplicate.
    // Any actual user/session bearer token is preserved.
    if (apiKey === secretKey && authorization === `Bearer ${secretKey}`) {
      headers.delete('authorization')
    }

    const inputHasBody = typeof Request !== 'undefined' && input instanceof Request && input.body !== null
    const canReplayBody = !inputHasBody && isReplayableFetchBody(init.body)
    const attempts = canReplayBody ? MAX_TRANSIENT_AUTH_ATTEMPTS : 1

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const response = await fetchImplementation(input, { ...init, headers })
      if (attempt === attempts || response.status !== 403) return response

      let retryable = false
      try {
        const rejectionBody = await response.clone().text()
        let rejectionMessage = rejectionBody
        try {
          const rejection = JSON.parse(rejectionBody)
          rejectionMessage = [
            rejection?.message,
            rejection?.msg,
            rejection?.error_description,
          ].filter((value) => typeof value === 'string').join('\n') || rejectionBody
        } catch {
          // Some gateway responses are plain text; match that body directly.
        }
        retryable = TRANSIENT_AUTH_KEY_REJECTION.test(rejectionMessage)
      } catch {
        return response
      }
      if (!retryable) return response

      // The gateway rejected the credential before the Supabase operation ran, so
      // the exact JSON request is safe to replay. Keep the retry narrow and
      // bounded; every other response returns immediately to the caller.
      await new Promise((resolve) => setTimeout(resolve, 50 * attempt))
    }

    throw new Error('Supabase Auth transport exhausted without a response.')
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
