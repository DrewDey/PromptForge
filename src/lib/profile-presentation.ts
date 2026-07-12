import { getPromptModelLabel } from './prompt-comparisons'
import { projectForkSourceFromSubmissionFields } from './project-forks'
import type { Profile, PromptWithRelations } from './types'

export type ProfileProvenance = {
  label: string
  description: string
  tone: 'team' | 'source-run'
}

export type ProfileFocus = {
  label: string
  count: number
}

export type PublicProfileInsights = {
  publishedCount: number
  forkCount: number
  totalUpvotes: number
  totalSavesReceived: number
  categoryFocus: ProfileFocus[]
  modelFocus: ProfileFocus[]
  forks: PromptWithRelations[]
}

function rankedFocus(counts: Map<string, number>, limit = 3): ProfileFocus[] {
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, limit)
}

/**
 * Public provenance is intentionally conservative. We only render a badge when
 * the profile row itself carries a trustworthy signal. A normal user is never
 * inferred to be a seed account from their name, project category, or model.
 */
export function getProfileProvenance(profile: Profile): ProfileProvenance | null {
  const provenanceKind = profile.provenance?.kind

  if (provenanceKind === 'pathforge_team' || profile.role === 'admin') {
    return {
      label: 'PathForge team',
      description: 'An official PathForge-operated profile.',
      tone: 'team',
    }
  }

  if (provenanceKind === 'pathforge_seed') {
    return {
      label: 'PathForge-operated builder',
      description: 'A clearly labeled PathForge seed profile for reviewed source-run projects.',
      tone: 'source-run',
    }
  }

  return null
}

export function derivePublicProfileInsights(
  projects: PromptWithRelations[],
): PublicProfileInsights {
  const categoryCounts = new Map<string, number>()
  const modelCounts = new Map<string, number>()
  const forks: PromptWithRelations[] = []

  for (const project of projects) {
    if (project.category?.name) {
      const categoryLabel = `${project.category.icon ? `${project.category.icon} ` : ''}${project.category.name}`
      categoryCounts.set(categoryLabel, (categoryCounts.get(categoryLabel) ?? 0) + 1)
    }

    const modelLabel = getPromptModelLabel(project)
    if (modelLabel !== 'Unknown model') {
      modelCounts.set(modelLabel, (modelCounts.get(modelLabel) ?? 0) + 1)
    }

    if (projectForkSourceFromSubmissionFields(project)) forks.push(project)
  }

  return {
    publishedCount: projects.length,
    forkCount: forks.length,
    totalUpvotes: projects.reduce((total, project) => total + project.vote_count, 0),
    totalSavesReceived: projects.reduce((total, project) => total + project.bookmark_count, 0),
    categoryFocus: rankedFocus(categoryCounts),
    modelFocus: rankedFocus(modelCounts),
    forks,
  }
}

export function profileMonogram(profile: Pick<Profile, 'display_name' | 'username'>) {
  const parts = (profile.display_name || profile.username)
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ''}`.toUpperCase()
}

export function profileAvatarClasses(username: string) {
  const palettes = [
    'bg-brand-orange text-white',
    'bg-brand-blue text-white',
    'bg-surface-900 text-white',
    'bg-[#07551f] text-white',
    'bg-[#7c3aed] text-white',
    'bg-[#9a3412] text-white',
  ]
  const hash = [...username.toLowerCase()].reduce(
    (value, character) => ((value * 31) + character.charCodeAt(0)) >>> 0,
    7,
  )

  return palettes[hash % palettes.length]
}
