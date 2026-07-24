import { unstable_cache } from 'next/cache'
import { getCategories, getPrompts } from './data'
import { createPublicCatalogSingleFlight } from './public-catalog-single-flight.mjs'

export const PUBLIC_CATALOG_CACHE_TAG = 'public-catalog-v1'
export const PUBLIC_CATALOG_REVALIDATE_SECONDS = 300

const readCachedPublicCategories = unstable_cache(
  getCategories,
  ['public-categories-v1'],
  {
    revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS,
    tags: [PUBLIC_CATALOG_CACHE_TAG],
  },
)

const readCachedPublicPrompts = unstable_cache(
  getPrompts,
  ['public-prompts-v1'],
  {
    revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS,
    tags: [PUBLIC_CATALOG_CACHE_TAG],
  },
)

const runPublicCatalogRead = createPublicCatalogSingleFlight()

export function getCachedPublicCategories(): ReturnType<typeof getCategories> {
  return runPublicCatalogRead('categories', () => readCachedPublicCategories())
}

export function getCachedPublicPrompts(
  options?: Parameters<typeof getPrompts>[0],
): ReturnType<typeof getPrompts> {
  const key = JSON.stringify([
    'prompts',
    options?.categorySlug ?? null,
    options?.difficulty ?? null,
    options?.status ?? null,
    options?.search ?? null,
    options?.limit ?? null,
    options?.sort ?? null,
  ])
  return runPublicCatalogRead(key, () => readCachedPublicPrompts(options))
}
