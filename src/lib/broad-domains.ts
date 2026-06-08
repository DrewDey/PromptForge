import type { Category, PromptWithRelations } from './types'

export const BROAD_DOMAINS = [
  {
    slug: 'productivity',
    label: 'Productivity',
    eyebrow: 'Work tools',
    description: 'Automations, dashboards, planners, writing systems, analysis tools, and practical work artifacts.',
    categorySlugs: ['finance', 'marketing', 'writing', 'coding', 'design', 'education', 'productivity', 'data', 'strategy'],
    previewLabels: ['Agent brief', 'Task board', 'Report draft', 'Automation'],
  },
  {
    slug: 'games',
    label: 'Games',
    eyebrow: 'Playable builds',
    description: 'Games, experiments, interactive toys, and fun artifacts that are easy to fork and change.',
    categorySlugs: ['personal'],
    previewLabels: ['Snake', 'Arcade loop', 'Touch controls', 'HTML file'],
  },
] as const

export type BroadDomainSlug = typeof BROAD_DOMAINS[number]['slug']

export function formatPathCount(count: number) {
  if (count === 0) return 'New lane'
  return `${count} ${count === 1 ? 'path' : 'paths'}`
}

export function getBroadDomainCategoryIds(categories: Category[], domainSlug: string) {
  const domain = BROAD_DOMAINS.find(item => item.slug === domainSlug)
  if (!domain) return new Set<string>()

  return new Set(
    categories
      .filter(category => domain.categorySlugs.includes(category.slug as never))
      .map(category => category.id)
  )
}

export function getPromptBroadDomain(prompt: PromptWithRelations, categories: Category[]) {
  const categorySlugById = new Map(categories.map(category => [category.id, category.slug]))
  const categorySlug = categorySlugById.get(prompt.category_id)
  return BROAD_DOMAINS.find(domain => domain.categorySlugs.includes(categorySlug as never))
}

export function getBroadDomainPromptCounts(prompts: PromptWithRelations[], categories: Category[]) {
  const countsByDomain: Record<string, number> = {}

  for (const domain of BROAD_DOMAINS) {
    const categoryIds = getBroadDomainCategoryIds(categories, domain.slug)
    countsByDomain[domain.slug] = prompts.filter(prompt => categoryIds.has(prompt.category_id)).length
  }

  return countsByDomain
}
