import type { MetadataRoute } from 'next'
import { mockPrompts } from '@/lib/mock-data'
import { getProjectHref, getProjectRouteOverrideEntries } from '@/lib/project-links'
import { getAbsoluteSiteUrl } from '@/lib/site-url'

const STATIC_PUBLIC_ROUTES = [
  '/',
  '/paths',
  '/what-to-build',
  '/requests',
  '/suggestion-box',
  '/about',
  '/build',
  '/guide',
]

function sitemapEntry(
  path: string,
  options: Omit<MetadataRoute.Sitemap[number], 'url'> = {}
): MetadataRoute.Sitemap[number] {
  return {
    url: getAbsoluteSiteUrl(path),
    ...options,
  }
}

export default function sitemap(): MetadataRoute.Sitemap {
  const approvedPromptsById = new Map(
    mockPrompts
      .filter((prompt) => prompt.status === 'approved')
      .map((prompt) => [prompt.id, prompt])
  )

  const staticRoutes = STATIC_PUBLIC_ROUTES.map((path) =>
    sitemapEntry(path, {
      changeFrequency: path === '/' || path === '/paths' ? 'daily' : 'weekly',
      priority: path === '/' ? 1 : path === '/paths' ? 0.9 : 0.7,
    })
  )

  const promptRoutes = Array.from(approvedPromptsById.values()).map((prompt) =>
    sitemapEntry(getProjectHref(prompt), {
      lastModified: new Date(prompt.updated_at ?? prompt.created_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  )

  const overrideRoutes = getProjectRouteOverrideEntries().map(([projectId, href]) => {
    const prompt = approvedPromptsById.get(projectId)

    return sitemapEntry(href, {
      ...(prompt ? { lastModified: new Date(prompt.updated_at ?? prompt.created_at) } : {}),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  })

  const projectRoutes = [...promptRoutes, ...overrideRoutes].filter((route) => {
    const path = new URL(route.url).pathname
    return !path.startsWith('/artifacts/')
  })

  const routesByUrl = new Map<string, MetadataRoute.Sitemap[number]>()

  for (const route of [...staticRoutes, ...projectRoutes]) {
    routesByUrl.set(route.url, route)
  }

  return Array.from(routesByUrl.values())
}
