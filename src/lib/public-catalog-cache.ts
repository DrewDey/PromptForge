import { unstable_cache } from 'next/cache'
import { getCategories, getPrompts } from './data'

export const PUBLIC_CATALOG_CACHE_TAG = 'public-catalog-v1'
export const PUBLIC_CATALOG_REVALIDATE_SECONDS = 300

export const getCachedPublicCategories = unstable_cache(
  getCategories,
  ['public-categories-v1'],
  {
    revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS,
    tags: [PUBLIC_CATALOG_CACHE_TAG],
  },
)

export const getCachedPublicPrompts = unstable_cache(
  getPrompts,
  ['public-prompts-v1'],
  {
    revalidate: PUBLIC_CATALOG_REVALIDATE_SECONDS,
    tags: [PUBLIC_CATALOG_CACHE_TAG],
  },
)
