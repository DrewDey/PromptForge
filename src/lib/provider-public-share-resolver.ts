import 'server-only'
import { readWithFallback } from './data/shared'
import {
  getProviderPublicShareRegistryEntry,
} from './provider-public-share-registry'
import {
  normalizeProviderPublicShareRegistryEntry,
  providerPublicShareProjectionMatches,
  resolveProviderPublicShareSourceRunId,
  type ProviderPublicShareSourceAliases,
  type ResolvedProviderPublicShare,
} from './provider-public-share'

async function readProductionProjection(
  projectId: string,
  sourceRunId: string,
): Promise<unknown | null> {
  return readWithFallback<unknown | null>(null, async (signal) => {
    const { createPublicReadClient } = await import('./supabase/server')
    const supabase = await createPublicReadClient({ anonymous: true })
    const { data } = await supabase
      .rpc('read_public_source_run_share_link', {
        checked_project_id: projectId,
        checked_source_run_id: sourceRunId,
      })
      .retry(false)
      .abortSignal(signal)
      .throwOnError()
    return Array.isArray(data) ? data[0] ?? null : data
  })
}

/**
 * Resolves only the separately consented public-share projection. Package and
 * project source URLs are intentionally not accepted by this interface.
 */
export async function resolveProviderPublicShare(input: {
  projectId: string
  aliases: ProviderPublicShareSourceAliases
}): Promise<ResolvedProviderPublicShare | null> {
  const sourceRunId = resolveProviderPublicShareSourceRunId(input.aliases)
  if (!sourceRunId) return null

  const registryEntry = getProviderPublicShareRegistryEntry(sourceRunId)
  const resolved = normalizeProviderPublicShareRegistryEntry({
    sourceRunId,
    projectId: input.projectId,
    entry: registryEntry,
  })
  if (!resolved) return null

  if (process.env.VERCEL_ENV !== 'production') return resolved

  const projection = await readProductionProjection(input.projectId, sourceRunId)
  return providerPublicShareProjectionMatches(resolved, projection)
    ? resolved
    : null
}
