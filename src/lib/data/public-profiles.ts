import 'server-only'

import {
  mockCategories,
  mockProfiles,
  mockPrompts,
  mockSteps,
} from '../mock-data'
import { getPreparedShowcaseProjectById } from '../prepared-showcase-projects'
import type { PreparedShowcaseStep } from '../prepared-showcase-projects'
import { getProjectRouteOverride } from '../project-links'
import type {
  Profile,
  PromptStep,
  PromptWithRelations,
} from '../types'
import { attachExactPublicPromptStepCounts } from './public-prompt-step-counts'
import { readWithFallback } from './shared'

const PUBLIC_PROFILE_PROJECT_LIST_PAGE_SIZE = 300
const PUBLIC_PROFILE_PROJECT_LIST_MAX_PAGES = 10
const PUBLIC_PROFILE_PROJECT_LIST_SELECT =
  '*, category:categories(*), author:profiles!prompts_author_id_fkey(*, provenance:profile_provenance(kind))'
const PUBLIC_LIBRARY_START_AT = '2026-05-28T00:00:00.000Z'

function isPublicLibraryProject(project: { id: string; created_at?: string | null }) {
  if (getProjectRouteOverride(project.id)) return true
  if (!project.created_at) return false
  return Date.parse(project.created_at) >= Date.parse(PUBLIC_LIBRARY_START_AT)
}

function preparedStepToPromptStep(
  step: PreparedShowcaseStep,
  projectId: string,
  createdAt: string,
): PromptStep {
  return {
    id: step.id,
    prompt_id: projectId,
    step_number: step.stepNumber,
    title: step.title,
    content: step.content,
    result_content: step.resultContent,
    description: step.description,
    created_at: createdAt,
  }
}

function normalizeProjectPresentation<T extends PromptWithRelations>(project: T): T {
  const prepared = getPreparedShowcaseProjectById(project.id)
  if (!prepared) return project

  return {
    ...project,
    title: prepared.title,
    description: prepared.description,
    content: prepared.content,
    result_content: prepared.resultContent,
    model_used: prepared.modelUsed,
    model_recommendation: prepared.modelRecommendation,
    tools_used: prepared.toolsUsed,
    tags: prepared.tags,
    steps: prepared.steps.map((step) => (
      preparedStepToPromptStep(step, prepared.id, prepared.createdAt)
    )),
    prompt_step_count: prepared.steps.length,
  }
}

function fallbackProfile(username: string): Profile | null {
  const profile = mockProfiles.find((candidate) => (
    candidate.username.toLowerCase() === username.toLowerCase()
  ))
  if (!profile) return null

  return {
    ...profile,
    provenance: {
      kind: profile.username === 'pathforge_projects' ? 'pathforge_team' : 'pathforge_seed',
    },
  }
}

function fallbackProjects(authorId: string, username?: string): PromptWithRelations[] {
  return mockPrompts
    .filter((project) => {
      if (project.status !== 'approved' || !isPublicLibraryProject(project)) return false
      if (project.author_id === authorId) return true
      if (!username) return false
      const author = mockProfiles.find((profile) => profile.id === project.author_id)
      return author?.username.toLowerCase() === username.toLowerCase()
    })
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    .map((project) => {
      const author = mockProfiles.find((profile) => profile.id === project.author_id)
      return normalizeProjectPresentation({
        ...project,
        category: mockCategories.find((category) => category.id === project.category_id),
        author: author ? {
          ...author,
          provenance: {
            kind: author.username === 'pathforge_projects' ? 'pathforge_team' : 'pathforge_seed',
          },
        } : undefined,
        steps: mockSteps
          .filter((step) => step.prompt_id === project.id)
          .sort((left, right) => left.step_number - right.step_number),
      })
    })
}

export async function getPublicProfileByUsername(username: string): Promise<Profile | null> {
  const fallback = fallbackProfile(username)
  return readWithFallback(fallback, async (signal) => {
    const { createPublicReadClient } = await import('../supabase/server')
    const supabase = await createPublicReadClient()
    const { data } = await supabase
      .from('profiles')
      .select('*, provenance:profile_provenance(kind)')
      .ilike('username', username.replace(/[\\%_]/g, (character) => `\\${character}`))
      .retry(false)
      .abortSignal(signal)
      .throwOnError()
      .single()
    return data ? data as Profile : fallback
  })
}

export async function getPublicProjectsByAuthor(
  authorId: string,
  username?: string,
): Promise<PromptWithRelations[]> {
  const fallback = fallbackProjects(authorId, username)
  return readWithFallback(fallback, async (signal) => {
    const { createPublicReadClient } = await import('../supabase/server')
    const supabase = await createPublicReadClient()
    const databaseProjects: PromptWithRelations[] = []
    const maximumCheckedRows = (
      PUBLIC_PROFILE_PROJECT_LIST_PAGE_SIZE * PUBLIC_PROFILE_PROJECT_LIST_MAX_PAGES
    )
    for (let pageIndex = 0; pageIndex < PUBLIC_PROFILE_PROJECT_LIST_MAX_PAGES; pageIndex += 1) {
      const pageStart = pageIndex * PUBLIC_PROFILE_PROJECT_LIST_PAGE_SIZE
      const pageEnd = pageStart + PUBLIC_PROFILE_PROJECT_LIST_PAGE_SIZE - 1
      const { data: pageData } = await supabase
        .from('prompts')
        .select(PUBLIC_PROFILE_PROJECT_LIST_SELECT)
        .eq('author_id', authorId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(pageStart, pageEnd)
        .retry(false)
        .abortSignal(signal)
        .throwOnError()
      const rawPage = pageData ?? []
      const publicPage = rawPage.filter(isPublicLibraryProject)

      if (publicPage.length > 0) {
        const { data: stepCountRows } = await supabase
          .rpc('read_public_prompt_step_counts', {
            checked_prompt_ids: publicPage.map((project) => project.id),
          })
          .retry(false)
          .abortSignal(signal)
          .throwOnError()
        databaseProjects.push(...attachExactPublicPromptStepCounts(
          publicPage as PromptWithRelations[],
          stepCountRows,
        ).map(normalizeProjectPresentation))
      }

      if (rawPage.length < PUBLIC_PROFILE_PROJECT_LIST_PAGE_SIZE) break
      if (pageIndex === PUBLIC_PROFILE_PROJECT_LIST_MAX_PAGES - 1) {
        throw new Error(`Public profile project list exceeded ${maximumCheckedRows} checked rows.`)
      }
    }

    const seen = new Set(databaseProjects.map((project) => project.id))
    return [...databaseProjects, ...fallback.filter((project) => !seen.has(project.id))]
  })
}
