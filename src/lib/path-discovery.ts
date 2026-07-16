import { getPreparedShowcaseProjectById } from './prepared-showcase-projects'
import { getProjectHref } from './project-links'
import { getPromptModelLabel } from './prompt-comparisons'
import { getProjectModelProfileSummary } from './project-model-profile-summaries'
import {
  calculateDiscoveryActivity,
  compareActiveDiscoveryItems,
  compareForkDiscoveryItems,
  compareModelRunDiscoveryItems,
} from './discovery-activity.mjs'
import type { Category, PromptWithRelations } from './types'

export type DiscoveryIntent =
  | 'organize'
  | 'decide'
  | 'learn'
  | 'create'
  | 'play'
  | 'one-prompt'

export type DiscoveryPreview =
  | 'board'
  | 'calculator'
  | 'checklist'
  | 'game'
  | 'matrix'
  | 'mixer'
  | 'studio'
  | 'utility'

export type BuildPathDiscoveryItem = {
  prompt: PromptWithRelations
  id: string
  href: string
  title: string
  description: string
  outcome: string | null
  categoryLabel: string
  difficulty: PromptWithRelations['difficulty']
  modelLabel: string
  modelLabels: string[]
  authorName: string
  authorUsername: string | null
  promptCount: number
  comparisonCount: number
  modelRunCount: number
  artifactPath: string | null
  hasWorkingArtifact: boolean
  hasFork: boolean
  isFork: boolean
  forkCount: number
  createdAt: string
  latestActivityAt: string | null
  activityScore: number
  isActive: boolean
  recommendationScore: number
  preview: DiscoveryPreview
}

export const DISCOVERY_INTENTS: Array<{
  value: DiscoveryIntent
  label: string
  shortLabel: string
  description: string
}> = [
  {
    value: 'organize',
    label: 'Get organized',
    shortLabel: 'Organize',
    description: 'Planners, trackers, checklists, and useful boards.',
  },
  {
    value: 'decide',
    label: 'Make a decision',
    shortLabel: 'Decide',
    description: 'Scorers, calculators, comparisons, and trade-off tools.',
  },
  {
    value: 'learn',
    label: 'Learn something',
    shortLabel: 'Learn',
    description: 'Practice tools, explainers, drills, and study aids.',
  },
  {
    value: 'create',
    label: 'Create and design',
    shortLabel: 'Create',
    description: 'Studios, editors, generators, and visual builders.',
  },
  {
    value: 'play',
    label: 'Play something',
    shortLabel: 'Play',
    description: 'Games, puzzles, and interactive experiments.',
  },
  {
    value: 'one-prompt',
    label: 'Start with one prompt',
    shortLabel: 'One prompt',
    description: 'Small projects that worked without a long conversation.',
  },
]

export const START_HERE_PROJECT_IDS = [
  'dc5e67c3-42d0-4823-ae23-586b7d3985cb', // Calming Sleep-Sound Mixer
  '069d354a-ec99-4ee4-aed4-aa1baaec8b29', // Decision Matrix
  '22bcc36b-497f-43f7-824f-3ccba9690da6', // Rental Walkthrough Scorecard
  '31faf192-93d1-41d0-a74c-4402d4223937', // Airlock Zero
  'aa456f6a-80fd-4530-b3d2-9647ddbf1530', // Puzzle Box Escape
]

export const USEFUL_NOW_PROJECT_IDS = [
  '0ddfc7cf-37bf-47ae-8fe0-d8d445ba1bee', // Booking handoff
  'b715f7ff-5675-4df1-bac2-063406bada78', // Trip packing
  '56e1646d-0dad-40d3-a194-682691e27eb1', // Follow-up CRM
  '1df01e0a-b61e-494d-be73-5b6153509810', // Meeting cost
  '5c12cf80-6586-484a-b3c8-51bc94269508', // Flashcard cram
  '340c795a-5ce1-402d-a5f5-cdfd5a934aea', // Clinic callback board
]

export const PLAY_PROJECT_IDS = [
  '384ebd4d-88af-400b-b230-4eb771bb2194', // Security-cam anomaly game
  '85e4b36b-3236-495e-b8d0-b94ea168a645', // Pocket Rally
  'a60a806f-b289-4bc7-9430-20342279f3ff', // Swish City
  'f47235e3-28d5-4a25-9057-f9665e30acdf', // Neon Block Patrol
  '3afad9bf-1fa4-484d-a694-aca0d19faa3f', // Word Ladder Sprint
  'd80dffab-ffd6-46b2-9643-4f8521766f9b', // Lane Defense
]

export const MODEL_COMPARISON_PROJECT_IDS = [
  'dc5e67c3-42d0-4823-ae23-586b7d3985cb',
  '0ddfc7cf-37bf-47ae-8fe0-d8d445ba1bee',
  'e0e4e2b7-082e-4db1-9468-484fc3fd3a69',
  'a7201847-c8d6-4e09-814b-0a382f8f8080',
  '22bcc36b-497f-43f7-824f-3ccba9690da6',
  'ca0c2e08-9e02-4725-90f5-58ef248fe4c7',
  '384ebd4d-88af-400b-b230-4eb771bb2194',
  '17c42c87-3709-4d5e-9ae3-d4ac4807bc4c',
  '31faf192-93d1-41d0-a74c-4402d4223937',
]

const EDITORIAL_PRIORITY = new Map<string, number>([
  ...START_HERE_PROJECT_IDS.map((id, index) => [id, 35 - index] as const),
  ...USEFUL_NOW_PROJECT_IDS.map((id, index) => [id, 28 - index] as const),
  ...PLAY_PROJECT_IDS.map((id, index) => [id, 24 - index] as const),
  ...MODEL_COMPARISON_PROJECT_IDS.map((id, index) => [id, 22 - index] as const),
])

function normalizedText(prompt: PromptWithRelations) {
  return [
    prompt.title,
    prompt.description,
    prompt.result_content ?? '',
    prompt.category?.name ?? '',
    ...prompt.tags,
    ...prompt.tools_used,
  ].join(' ').toLocaleLowerCase()
}

function previewForPrompt(prompt: PromptWithRelations): DiscoveryPreview {
  const text = normalizedText(prompt)
  if (/sleep|sound|mixer|audio|volume|sequencer/.test(text)) return 'mixer'
  if (/decision|matrix|scorecard|compare|balanc/.test(text)) return 'matrix'
  if (/calculator|margin|cost|finance|invoice|change rush/.test(text)) return 'calculator'
  if (/checklist|packing|planner|roster|schedule|restock|label/.test(text)) return 'checklist'
  if (/studio|editor|builder|progress shot|map/.test(text)) return 'studio'
  if (/crm|board|queue|handoff|timeline|tracker/.test(text)) return 'board'
  if (/game|puzzle|arcade|rally|patrol|defense|trainer|sprint|simulator/.test(text)) return 'game'
  return 'utility'
}

function broadUsefulnessScore(preview: DiscoveryPreview) {
  if (preview === 'calculator' || preview === 'checklist' || preview === 'board') return 15
  if (preview === 'matrix' || preview === 'studio' || preview === 'mixer') return 13
  return 10
}

function intentTerms(intent: Exclude<DiscoveryIntent, 'one-prompt'>) {
  const terms: Record<Exclude<DiscoveryIntent, 'one-prompt'>, RegExp> = {
    organize: /planner|planning|tracker|checklist|board|queue|roster|schedule|packing|restock|label|route|crm|organize/,
    decide: /decision|matrix|score|compare|calculator|cost|margin|balance|priority|trade-off|red flag|finance/,
    learn: /learn|study|flashcard|trainer|practice|first-principles|ladder|drill|quiz|skill/,
    create: /studio|editor|builder|generator|mixer|sequencer|map|design|print|creative/,
    play: /game|puzzle|arcade|rally|patrol|defense|escape|sprint|simulator|timing|courier/,
  }
  return terms[intent]
}

export function itemMatchesIntent(item: BuildPathDiscoveryItem, intent: DiscoveryIntent) {
  if (intent === 'one-prompt') return item.promptCount === 1
  return intentTerms(intent).test(normalizedText(item.prompt))
}

export function buildPathDiscoveryCatalog(
  prompts: PromptWithRelations[],
  categories: Category[],
): BuildPathDiscoveryItem[] {
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const catalogIds = new Set(prompts.map((prompt) => prompt.id))
  const forkActivityByProject = new Map<string, { count: number; latestAt: string | null }>()

  for (const prompt of prompts) {
    const sourceProjectIds = new Set([
      prompt.fork_source_project_id,
      prompt.fork_parent_submission_id,
    ].filter((value): value is string => Boolean(value && catalogIds.has(value))))

    for (const sourceProjectId of sourceProjectIds) {
      const current = forkActivityByProject.get(sourceProjectId) ?? { count: 0, latestAt: null }
      const nextCreatedAt = Number.isFinite(Date.parse(prompt.created_at)) ? prompt.created_at : null
      const latestAt = !current.latestAt || (
        nextCreatedAt && Date.parse(nextCreatedAt) > Date.parse(current.latestAt)
      )
        ? nextCreatedAt
        : current.latestAt
      forkActivityByProject.set(sourceProjectId, {
        count: current.count + 1,
        latestAt,
      })
    }
  }

  return prompts.map((prompt) => {
    const prepared = getPreparedShowcaseProjectById(prompt.id)
    const promptCount = prepared?.steps.length ?? prompt.steps?.length ?? 0
    const modelLabel = getPromptModelLabel(prompt)
    const variantSummary = getProjectModelProfileSummary(prompt.id)
    const modelLabels = [...new Set([
      modelLabel,
      ...variantSummary.map((variant) => variant.modelLabel),
    ].filter((label) => label !== 'Unknown model'))]
    const comparisonCount = Math.max(1, modelLabels.length)
    const modelRunCount = variantSummary.length
    const preview = previewForPrompt(prompt)
    const artifactPath = prepared?.artifactPath ?? null
    const hasWorkingArtifact = Boolean(artifactPath)
    const isFork = Boolean(
      prepared?.forkSource ||
      prompt.fork_source_project_id ||
      prompt.fork_parent_submission_id,
    )
    const forkActivity = forkActivityByProject.get(prompt.id) ?? { count: 0, latestAt: null }
    const forkCount = forkActivity.count
    const hasFork = forkCount > 0
    const latestModelRunAt = variantSummary.reduce<string | null>((latest, variant) => {
      if (!Number.isFinite(Date.parse(variant.capturedAt))) return latest
      if (!latest || Date.parse(variant.capturedAt) > Date.parse(latest)) return variant.capturedAt
      return latest
    }, null)
    const latestActivityAt = [latestModelRunAt, forkActivity.latestAt]
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null
    const activity = calculateDiscoveryActivity({
      modelRunCount,
      forkCount,
      voteCount: prompt.vote_count,
      bookmarkCount: prompt.bookmark_count,
    })
    const richnessScore = Math.min(
      15,
      Math.min(promptCount, 4) * 2 +
      (comparisonCount > 1 ? 7 : 0) +
      (hasFork ? 4 : 0),
    )
    const engagementTieBreak = Math.min(5, prompt.vote_count + prompt.bookmark_count * 2)
    const recommendationScore =
      (EDITORIAL_PRIORITY.get(prompt.id) ?? 12) +
      (hasWorkingArtifact ? 20 : 0) +
      broadUsefulnessScore(preview) +
      richnessScore +
      engagementTieBreak

    return {
      prompt,
      id: prompt.id,
      href: getProjectHref(prompt),
      title: prompt.title,
      description: prompt.description,
      outcome: prompt.result_content,
      categoryLabel: prompt.category?.name ?? categoryById.get(prompt.category_id)?.name ?? 'Build path',
      difficulty: prompt.difficulty,
      modelLabel,
      modelLabels,
      authorName: prompt.author?.display_name || prompt.author?.username || 'PathForge builder',
      authorUsername: prompt.author?.username ?? null,
      promptCount,
      comparisonCount,
      modelRunCount,
      artifactPath,
      hasWorkingArtifact,
      hasFork,
      isFork,
      forkCount,
      createdAt: prompt.created_at,
      latestActivityAt,
      activityScore: activity.score,
      isActive: activity.isActive,
      recommendationScore,
      preview,
    }
  })
}

export function recommendedOrder(items: BuildPathDiscoveryItem[]) {
  return [...items].sort((left, right) => (
    right.recommendationScore - left.recommendationScore ||
    Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
    left.title.localeCompare(right.title) ||
    left.id.localeCompare(right.id)
  ))
}

export function newestOrder(items: BuildPathDiscoveryItem[]) {
  return [...items].sort((left, right) => (
    Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
    left.title.localeCompare(right.title) ||
    left.id.localeCompare(right.id)
  ))
}

export function activeOrder(items: BuildPathDiscoveryItem[]) {
  return [...items].sort(compareActiveDiscoveryItems)
}

export function forkCountOrder(items: BuildPathDiscoveryItem[]) {
  return [...items].sort(compareForkDiscoveryItems)
}

export function modelRunCountOrder(items: BuildPathDiscoveryItem[]) {
  return [...items].sort(compareModelRunDiscoveryItems)
}

export function selectCuratedItems(
  catalog: BuildPathDiscoveryItem[],
  preferredIds: string[],
  count: number,
  excludedIds: Set<string> = new Set(),
) {
  const byId = new Map(catalog.map((item) => [item.id, item]))
  const selected: BuildPathDiscoveryItem[] = []
  const authorCounts = new Map<string, number>()

  const candidates = [
    ...preferredIds.map((id) => byId.get(id)).filter((item): item is BuildPathDiscoveryItem => Boolean(item)),
    ...recommendedOrder(catalog),
  ]

  for (const item of candidates) {
    if (selected.length >= count) break
    if (excludedIds.has(item.id) || selected.some((selectedItem) => selectedItem.id === item.id)) continue
    const authorCount = authorCounts.get(item.authorName) ?? 0
    if (authorCount >= 2) continue
    selected.push(item)
    authorCounts.set(item.authorName, authorCount + 1)
  }

  return selected
}
