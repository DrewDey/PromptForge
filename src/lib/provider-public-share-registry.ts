import registryData from './provider-public-share-registry.v1.json'

export type ProviderPublicShareAccessState = 'public_exact' | 'public_partial'

export type ProviderPublicShareProviderKey =
  | 'openai'
  | 'anthropic'
  | 'google'

export type ProviderPublicShareRegistryEntry = Readonly<{
  project_id?: string
  public_share_url: string
  provider_key: ProviderPublicShareProviderKey
  consent_obtained_at: string
  anonymous_access_verified_at: string
  access_state: ProviderPublicShareAccessState
}>

type ProviderPublicShareRegistryData = Readonly<{
  schema_version: 1
  registry_version: string
  generated_at: string
  entries_by_source_run_id: Readonly<
    Record<string, ProviderPublicShareRegistryEntry>
  >
}>

const checkedRegistryData = registryData as ProviderPublicShareRegistryData

export const PROVIDER_PUBLIC_SHARE_REGISTRY =
  checkedRegistryData.entries_by_source_run_id

export function getProviderPublicShareRegistryEntry(
  sourceRunId: string,
): ProviderPublicShareRegistryEntry | null {
  return PROVIDER_PUBLIC_SHARE_REGISTRY[sourceRunId] ?? null
}
