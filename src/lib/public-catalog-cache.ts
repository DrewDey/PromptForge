import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { getCategories, getPrompts } from './data'
import { readWithFallback } from './data/shared'
import { createPublicCatalogSingleFlight } from './public-catalog-single-flight.mjs'

export const PUBLIC_CATALOG_CACHE_TAG = 'public-catalog-v1'
export const PUBLIC_CATALOG_REVALIDATE_SECONDS = 300

const getPublicCatalogRevision = cache(async (): Promise<string | null> => {
  return readWithFallback<string | null>(null, async (signal) => {
    const { createPublicReadClient } = await import('./supabase/server')
    const supabase = await createPublicReadClient({ anonymous: true })
    const { data } = await supabase
      .rpc('get_public_catalog_revision')
      .retry(false)
      .abortSignal(signal)
      .throwOnError()
    return typeof data === 'string' && /^\d+$/.test(data) ? data : null
  })
})

const readCachedPublicCategories = unstable_cache(
  async (catalogRevision: string) => {
    void catalogRevision
    return getCategories()
  },
  ['public-categories-v2'],
  {
    revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS,
    tags: [PUBLIC_CATALOG_CACHE_TAG],
  },
)

const readCachedPublicPrompts = unstable_cache(
  async (
    catalogRevision: string,
    options?: Parameters<typeof getPrompts>[0],
  ) => {
    void catalogRevision
    return getPrompts(options)
  },
  ['public-prompts-v2'],
  {
    revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS,
    tags: [PUBLIC_CATALOG_CACHE_TAG],
  },
)

const runPublicCatalogRead = createPublicCatalogSingleFlight()

export async function getCachedPublicCategories(): ReturnType<typeof getCategories> {
  const catalogRevision = await getPublicCatalogRevision()
  if (catalogRevision === null) return getCategories()
  return runPublicCatalogRead(
    `categories:${catalogRevision}`,
    () => readCachedPublicCategories(catalogRevision),
  )
}

export async function getCachedPublicPrompts(
  options?: Parameters<typeof getPrompts>[0],
): ReturnType<typeof getPrompts> {
  const catalogRevision = await getPublicCatalogRevision()
  if (catalogRevision === null) return getPrompts(options)
  const key = JSON.stringify([
    'prompts',
    catalogRevision,
    options?.categorySlug ?? null,
    options?.difficulty ?? null,
    options?.status ?? null,
    options?.search ?? null,
    options?.limit ?? null,
    options?.sort ?? null,
  ])
  return runPublicCatalogRead(
    key,
    () => readCachedPublicPrompts(catalogRevision, options),
  )
}
