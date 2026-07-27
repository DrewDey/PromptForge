// @ts-check

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/
const REGISTRY_ENTRY_KEYS = new Set([
  'project_id',
  'public_share_url',
  'provider_key',
  'consent_obtained_at',
  'anonymous_access_verified_at',
  'access_state',
])

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** @param {unknown} value */
function timestampMilliseconds(value) {
  if (typeof value !== 'string' || !TIMESTAMP_PATTERN.test(value)) return null
  const milliseconds = Date.parse(value)
  return Number.isFinite(milliseconds) ? milliseconds : null
}

/** @param {unknown} value */
export function isCanonicalProviderPublicShareUuidCore(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

/**
 * Accepts immutable archival evidence from known provider hosts without
 * claiming that the locator is anonymously accessible. This intentionally
 * permits account-private paths and query/fragment data because those values
 * remain server-only evidence and must retain their exact package identity.
 *
 * @param {unknown} value
 */
export function isAllowlistedProviderEvidenceLocatorCore(value) {
  if (
    typeof value !== 'string' ||
    value !== value.trim() ||
    value.length === 0 ||
    value.length > 4000 ||
    /\s/.test(value) ||
    !/^https:\/\/(?:chatgpt\.com|chat\.openai\.com|claude\.ai|share\.gemini\.google|gemini\.google\.com|aistudio\.google\.com|g\.co|openrouter\.ai)\/\S+$/.test(value)
  ) return false

  try {
    const parsed = new URL(value)
    return (
      parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      !parsed.port
    )
  } catch {
    return false
  }
}

/** @param {unknown} value */
export function providerPublicShareProviderKeyCore(value) {
  if (
    typeof value !== 'string' ||
    value !== value.trim() ||
    value.length === 0 ||
    value.length > 2000
  ) return null

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    return null
  }
  if (
    parsed.protocol !== 'https:' ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.search ||
    parsed.hash
  ) return null

  if (
    /^https:\/\/chatgpt\.com\/(?:share|s)\/[A-Za-z0-9_-]+\/?$/.test(value)
  ) return 'openai'
  if (
    /^https:\/\/claude\.ai\/share\/[A-Za-z0-9_-]+\/?$/.test(value)
  ) return 'anthropic'
  if (
    /^https:\/\/share\.gemini\.google\/[A-Za-z0-9_-]+\/?$/.test(value) ||
    /^https:\/\/g\.co\/gemini\/share\/[A-Za-z0-9_-]+\/?$/.test(value) ||
    /^https:\/\/gemini\.google\.com\/share\/[A-Za-z0-9_-]+\/?$/.test(value)
  ) return 'google'
  return null
}

/** @param {unknown} aliases */
export function resolveProviderPublicShareSourceRunIdCore(aliases) {
  if (!isRecord(aliases)) return null
  const values = []
  for (const key of [
    'source_run_id',
    'source_run_submission_id',
    'pathforge_pending_id',
  ]) {
    if (!Object.hasOwn(aliases, key)) continue
    const value = aliases[key]
    if (value === undefined || value === null) continue
    if (typeof value !== 'string') return null
    const normalized = value.trim()
    if (
      !normalized ||
      normalized !== value ||
      !isCanonicalProviderPublicShareUuidCore(normalized)
    ) return null
    values.push(normalized)
  }
  const distinct = new Set(values)
  return distinct.size === 1 ? values[0] : null
}

/**
 * @param {{
 *   sourceRunId: unknown
 *   projectId: unknown
 *   entry: unknown
 *   nowMs?: number
 * }} input
 */
export function normalizeProviderPublicShareRegistryEntryCore({
  sourceRunId,
  projectId,
  entry,
  nowMs = Date.now(),
}) {
  if (
    !isCanonicalProviderPublicShareUuidCore(sourceRunId) ||
    !isCanonicalProviderPublicShareUuidCore(projectId) ||
    !isRecord(entry) ||
    Object.keys(entry).some((key) => !REGISTRY_ENTRY_KEYS.has(key))
  ) return null

  for (const key of [
    'public_share_url',
    'provider_key',
    'consent_obtained_at',
    'anonymous_access_verified_at',
    'access_state',
  ]) {
    if (!Object.hasOwn(entry, key)) return null
  }

  const registryProjectId = entry.project_id
  if (
    registryProjectId !== undefined &&
    (
      !isCanonicalProviderPublicShareUuidCore(registryProjectId) ||
      registryProjectId !== projectId
    )
  ) return null

  const providerKey = providerPublicShareProviderKeyCore(entry.public_share_url)
  if (
    providerKey === null ||
    providerKey !== entry.provider_key ||
    !['public_exact', 'public_partial'].includes(String(entry.access_state))
  ) return null

  const consentMs = timestampMilliseconds(entry.consent_obtained_at)
  const verifiedMs = timestampMilliseconds(entry.anonymous_access_verified_at)
  if (
    consentMs === null ||
    verifiedMs === null ||
    consentMs > verifiedMs ||
    verifiedMs > nowMs
  ) return null

  return {
    source_run_id: sourceRunId,
    project_id: projectId,
    public_share_url: entry.public_share_url,
    provider_key: providerKey,
    consent_obtained_at: entry.consent_obtained_at,
    anonymous_access_verified_at: entry.anonymous_access_verified_at,
    access_state: entry.access_state,
  }
}

/** @param {unknown} resolved @param {unknown} projection */
export function providerPublicShareProjectionMatchesCore(resolved, projection) {
  if (!isRecord(resolved) || !isRecord(projection)) return false
  const normalizedProjection = normalizeProviderPublicShareRegistryEntryCore({
    sourceRunId: projection.source_run_id,
    projectId: projection.project_id,
    nowMs: Number.MAX_SAFE_INTEGER,
    entry: {
      project_id: projection.project_id,
      public_share_url: projection.public_share_url,
      provider_key: projection.provider_key,
      consent_obtained_at: projection.consent_obtained_at,
      anonymous_access_verified_at: projection.anonymous_access_verified_at,
      access_state: projection.access_state,
    },
  })
  if (!normalizedProjection) return false

  return (
    normalizedProjection.source_run_id === resolved.source_run_id &&
    normalizedProjection.project_id === resolved.project_id &&
    normalizedProjection.public_share_url === resolved.public_share_url &&
    normalizedProjection.provider_key === resolved.provider_key &&
    timestampMilliseconds(normalizedProjection.consent_obtained_at) ===
      timestampMilliseconds(resolved.consent_obtained_at) &&
    timestampMilliseconds(normalizedProjection.anonymous_access_verified_at) ===
      timestampMilliseconds(resolved.anonymous_access_verified_at) &&
    normalizedProjection.access_state === resolved.access_state
  )
}
