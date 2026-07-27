import {
  isAllowlistedProviderEvidenceLocatorCore,
  isCanonicalProviderPublicShareUuidCore,
  normalizeProviderPublicShareRegistryEntryCore,
  providerPublicShareProjectionMatchesCore,
  providerPublicShareProviderKeyCore,
  resolveProviderPublicShareSourceRunIdCore,
} from './provider-public-share-core.mjs'

export type ProviderPublicShareKey = 'openai' | 'anthropic' | 'google'
export type ProviderPublicShareAccessState = 'public_exact' | 'public_partial'

export type ProviderPublicShareSourceAliases = Readonly<{
  source_run_id?: unknown
  source_run_submission_id?: unknown
  pathforge_pending_id?: unknown
}>

export type ResolvedProviderPublicShare = Readonly<{
  source_run_id: string
  project_id: string
  public_share_url: string
  provider_key: ProviderPublicShareKey
  consent_obtained_at: string
  anonymous_access_verified_at: string
  access_state: ProviderPublicShareAccessState
}>

export function isCanonicalProviderPublicShareUuid(value: unknown): value is string {
  return isCanonicalProviderPublicShareUuidCore(value)
}

export function isAllowlistedProviderEvidenceLocator(
  value: unknown,
): value is string {
  return isAllowlistedProviderEvidenceLocatorCore(value)
}

export function providerPublicShareProviderKey(
  value: unknown,
): ProviderPublicShareKey | null {
  return providerPublicShareProviderKeyCore(value) as ProviderPublicShareKey | null
}

export function providerPublicShareHref(
  value: unknown,
  accessState: unknown,
): string | null {
  if (
    typeof value !== 'string' ||
    !['public_exact', 'public_partial'].includes(String(accessState)) ||
    providerPublicShareProviderKey(value) === null
  ) return null
  return value
}

export function resolveProviderPublicShareSourceRunId(
  aliases: ProviderPublicShareSourceAliases,
): string | null {
  return resolveProviderPublicShareSourceRunIdCore(aliases)
}

export function normalizeProviderPublicShareRegistryEntry(input: {
  sourceRunId: string
  projectId: string
  entry: unknown
  nowMs?: number
}): ResolvedProviderPublicShare | null {
  return normalizeProviderPublicShareRegistryEntryCore(input) as
    | ResolvedProviderPublicShare
    | null
}

export function providerPublicShareProjectionMatches(
  resolved: ResolvedProviderPublicShare,
  projection: unknown,
): boolean {
  return providerPublicShareProjectionMatchesCore(resolved, projection)
}
