import {
  Category,
  Profile,
  PromptWithRelations,
} from './types'
import type { PublicCommunityProject } from './community-project-contract'
import {
  mockCategories,
  mockPrompts,
  mockProfiles,
  mockSteps,
} from './mock-data'
import { isPersistableProjectId } from './project-engagement'
import {
  BAKE_SALE_MARGIN_PROJECT_ID,
  BREAKROOM_SNACK_RESTOCK_PROJECT_ID,
  DECISION_MATRIX_PROJECT_ID,
  FLASHCARD_CRAM_PROJECT_ID,
  FOLLOW_UP_CRM_PROJECT_ID,
  GARAGE_SALE_TAGS_PROJECT_ID,
  HP_10BII_PROJECT_ID,
  LANE_DEFENSE_PROJECT_ID,
  LEFTOVER_DINNER_BOARD_PROJECT_ID,
  LUNCHBOX_CONVEYOR_SORTER_PROJECT_ID,
  MEETING_COST_PROJECT_ID,
  MICRO_DUNGEON_ROUTE_PROJECT_ID,
  MINI_GOLF_WINDMILL_PROJECT_ID,
  MINI_HARBOR_TUGBOAT_PROJECT_ID,
  NEON_BLOCK_PATROL_PROJECT_ID,
  PANTRY_SHELF_LIFE_RESCUE_PROJECT_ID,
  POCKET_PIRATE_MAP_PROJECT_ID,
  POCKET_RALLY_PROJECT_ID,
  POMODORO_TIMER_PROJECT_ID,
  PORCH_LIGHT_MOTH_MAZE_PROJECT_ID,
  PORCH_PLANT_WATERING_PROJECT_ID,
  POTLUCK_TABLE_PLANNER_PROJECT_ID,
  PUZZLE_BOX_ESCAPE_PROJECT_ID,
  RAINY_WINDOW_CAFE_RUSH_PROJECT_ID,
  REACTION_TRAINER_PROJECT_ID,
  SCHOOL_DESK_HP_CALCULATOR_FORK_PROJECT_ID,
  ROOMMATE_CHORE_DRAFT_PROJECT_ID,
  SHARED_ERRAND_ROUTE_PROJECT_ID,
  SNAKE_PROJECT_ID,
  SNAKE_PROJECT_LEGACY_ID,
  STAR_MAP_SCAVENGER_PROJECT_ID,
  SWISH_CITY_PROJECT_ID,
  TIC_TAC_TOE_PROJECT_ID,
  TINY_FARMERS_MARKET_PROJECT_ID,
  TINY_LOOP_SEQUENCER_PROJECT_ID,
  TINY_TRAIN_DISPATCHER_PROJECT_ID,
  TRIP_PACKING_PROJECT_ID,
  WEEKEND_CHECKLIST_REAL_FORK_PROJECT_ID,
  WEEKEND_CHECKLIST_PROJECT_ID,
  WORD_LADDER_SPRINT_PROJECT_ID,
  NEIGHBORHOOD_LOST_AND_FOUND_PROJECT_ID,
  TINY_DINER_TICKET_PROJECT_ID,
  SMALL_CLINIC_CALLBACK_PROJECT_ID,
  TINY_BIRTHDAY_RSVP_PROJECT_ID,
  TINY_AIRPORT_GATE_PROJECT_ID,
  TINY_FERRY_LOADING_PROJECT_ID,
  AFTER_SCHOOL_PICKUP_PROJECT_ID,
  FRIDGE_LEFTOVER_LABEL_PROJECT_ID,
  TINY_PARKING_LOT_PROJECT_ID,
  TINY_WINDOW_HERB_PROJECT_ID,
  POPUP_DINNER_SEATING_PROJECT_ID,
  TINY_CROSSWALK_TIMING_PROJECT_ID,
  TINY_INVOICE_NUDGE_PROJECT_ID,
  MAILROOM_CART_ROUTE_PROJECT_ID,
  NEIGHBORHOOD_POTLUCK_BALANCER_PROJECT_ID,
  LAUNDROMAT_SOCK_SORTER_PROJECT_ID,
  CORNER_STORE_CHANGE_PROJECT_ID,
  WEEKEND_YARD_SALE_PROJECT_ID,
  MINI_METRO_SIGNAL_PROJECT_ID,
  MOVING_DAY_BOX_LABELER_PROJECT_ID,
  ROOFTOP_COURIER_SWITCHBACKS_PROJECT_ID,
  NEIGHBORHOOD_SNOW_ROUTE_PROJECT_ID,
  ROOMMATE_FREEZER_BOARD_PROJECT_ID,
  UTILITY_BILL_BALANCE_PROJECT_ID,
  BLOCK_BIKE_COURIER_PROJECT_ID,
} from './featured-projects'
import { CURATED_SOURCE_RUN_SHOWCASE_PROJECTS } from './curated-source-run-showcases'
import {
  getPreparedShowcaseProjectById,
  PREPARED_SHOWCASE_PROJECTS,
} from './prepared-showcase-projects'
import type { PreparedShowcaseProject, PreparedShowcaseStep } from './prepared-showcase-projects'
import { inspectablePreparedForkFallbacks } from './prepared-release-gates-core.mjs'
import { getProjectRouteOverride } from './project-links'
import { resolveProviderPublicShareSourceRunId } from './provider-public-share'
import { getPublicModelIdentityLabel } from './public-model-labels'
import {
  getProjectModelVariantKnownIssueExplanation,
  getProjectModelVariantSet,
} from './project-model-variants'
import {
  loadSourceRunPackage,
  type SourceRunPackage,
} from './source-run-package'
import {
  sourceRunCanonicalArtifactPath,
  sourceRunDisplayArtifactFiles,
  sourceRunResponseCapturePresentation,
} from './source-run-presentation'
import {
  PROJECT_FORK_MAX_LEVELS,
  PROJECT_FORK_MAX_WIDTH,
  communityProjectContinuationSteps,
  filterProjectForkNetworkBySourceRun,
  markProjectForkNetworkLineageUnavailable,
  projectForkSourceFromSubmissionFields,
  selectProjectForkLocalSteps,
  toProjectForkSourceSteps,
  type BuildProjectForkLineageTruthInput,
  type ProjectForkContinuationStep,
  type ProjectForkLineageCandidateNode,
  type ProjectForkNetworkItem,
  type ProjectForkSource,
} from './project-forks'
import { forkColumnsMissing } from './data/fork-column-compat'
import { attachExactPublicPromptStepCounts } from './data/public-prompt-step-counts'
export { sourceRunForkColumnsMissing } from './data/fork-column-compat'
import {
  readWithFallback,
  requireAdminAccess,
  SUPABASE_CONFIGURED,
} from './data/shared'
export {
  createSourceRunSubmission,
  getAllSourceRunSubmissionsForAdmin,
  getSourceRunSubmissionByPromptIdForAdmin,
  getSourceRunSubmissionForAdmin,
  publishPreparedShowcaseProjectFromSourceRun,
  updateSourceRunStatusById,
} from './data/source-runs'
export {
  getProjectModelVariantsForAdmin,
  getPublishedProjectModelVariants,
} from './data/model-variants'
export {
  approveSuggestionById,
  createSuggestion,
  createSuggestionResponse,
  declineSuggestionById,
  getAllSuggestionsForAdmin,
  getMySuggestions,
  getPublicSuggestions,
  getSuggestionStats,
  getUserSuggestionVotes,
  keepSuggestionPrivateById,
  SUGGESTION_PUBLIC_DELAY_HOURS,
  toggleSuggestionVote,
  updateSuggestionPublicStatusById,
} from './data/suggestions'
export {
  createBuildRequest,
  createBuildRequestResponse,
  getPublicBuildRequests,
  getUserBuildRequestVotes,
  toggleBuildRequestVote,
} from './data/build-requests'

const APPROVED_PROJECT_IDS = new Set([
  TINY_TRAIN_DISPATCHER_PROJECT_ID,
  BREAKROOM_SNACK_RESTOCK_PROJECT_ID,
  PORCH_LIGHT_MOTH_MAZE_PROJECT_ID,
  PANTRY_SHELF_LIFE_RESCUE_PROJECT_ID,
  MINI_HARBOR_TUGBOAT_PROJECT_ID,
  TINY_FARMERS_MARKET_PROJECT_ID,
  ROOMMATE_CHORE_DRAFT_PROJECT_ID,
  POCKET_PIRATE_MAP_PROJECT_ID,
  POTLUCK_TABLE_PLANNER_PROJECT_ID,
  RAINY_WINDOW_CAFE_RUSH_PROJECT_ID,
  LUNCHBOX_CONVEYOR_SORTER_PROJECT_ID,
  PORCH_PLANT_WATERING_PROJECT_ID,
  SHARED_ERRAND_ROUTE_PROJECT_ID,
  MINI_GOLF_WINDMILL_PROJECT_ID,
  LEFTOVER_DINNER_BOARD_PROJECT_ID,
  TINY_LOOP_SEQUENCER_PROJECT_ID,
  GARAGE_SALE_TAGS_PROJECT_ID,
  MICRO_DUNGEON_ROUTE_PROJECT_ID,
  BAKE_SALE_MARGIN_PROJECT_ID,
  STAR_MAP_SCAVENGER_PROJECT_ID,
  DECISION_MATRIX_PROJECT_ID,
  SNAKE_PROJECT_ID,
  HP_10BII_PROJECT_ID,
  SCHOOL_DESK_HP_CALCULATOR_FORK_PROJECT_ID,
  TIC_TAC_TOE_PROJECT_ID,
  POMODORO_TIMER_PROJECT_ID,
  WEEKEND_CHECKLIST_PROJECT_ID,
  WEEKEND_CHECKLIST_REAL_FORK_PROJECT_ID,
  NEON_BLOCK_PATROL_PROJECT_ID,
  SWISH_CITY_PROJECT_ID,
  MEETING_COST_PROJECT_ID,
  WORD_LADDER_SPRINT_PROJECT_ID,
  PUZZLE_BOX_ESCAPE_PROJECT_ID,
  POCKET_RALLY_PROJECT_ID,
  TRIP_PACKING_PROJECT_ID,
  FLASHCARD_CRAM_PROJECT_ID,
  FOLLOW_UP_CRM_PROJECT_ID,
  REACTION_TRAINER_PROJECT_ID,
  LANE_DEFENSE_PROJECT_ID,
  NEIGHBORHOOD_LOST_AND_FOUND_PROJECT_ID,
  TINY_DINER_TICKET_PROJECT_ID,
  SMALL_CLINIC_CALLBACK_PROJECT_ID,
  TINY_BIRTHDAY_RSVP_PROJECT_ID,
  TINY_AIRPORT_GATE_PROJECT_ID,
  TINY_FERRY_LOADING_PROJECT_ID,
  AFTER_SCHOOL_PICKUP_PROJECT_ID,
  FRIDGE_LEFTOVER_LABEL_PROJECT_ID,
  TINY_PARKING_LOT_PROJECT_ID,
  TINY_WINDOW_HERB_PROJECT_ID,
  POPUP_DINNER_SEATING_PROJECT_ID,
  TINY_CROSSWALK_TIMING_PROJECT_ID,
  TINY_INVOICE_NUDGE_PROJECT_ID,
  MAILROOM_CART_ROUTE_PROJECT_ID,
  NEIGHBORHOOD_POTLUCK_BALANCER_PROJECT_ID,
  LAUNDROMAT_SOCK_SORTER_PROJECT_ID,
  CORNER_STORE_CHANGE_PROJECT_ID,
  WEEKEND_YARD_SALE_PROJECT_ID,
  MINI_METRO_SIGNAL_PROJECT_ID,
  MOVING_DAY_BOX_LABELER_PROJECT_ID,
  ROOFTOP_COURIER_SWITCHBACKS_PROJECT_ID,
  NEIGHBORHOOD_SNOW_ROUTE_PROJECT_ID,
  ROOMMATE_FREEZER_BOARD_PROJECT_ID,
  UTILITY_BILL_BALANCE_PROJECT_ID,
  BLOCK_BIKE_COURIER_PROJECT_ID,
  ...CURATED_SOURCE_RUN_SHOWCASE_PROJECTS.map((project) => project.id),
])
const PREPARED_SHOWCASE_PROJECT_IDS = new Set(
  PREPARED_SHOWCASE_PROJECTS.map((project) => project.id),
)
const PUBLIC_LIBRARY_START_AT = '2026-05-28T00:00:00.000Z'
const PUBLIC_PROMPT_LIST_PAGE_SIZE = 300
const PUBLIC_PROMPT_LIST_MAX_PAGES = 10
const PUBLIC_PROMPT_LIST_SELECT =
  '*, category:categories(*), author:profiles!prompts_author_id_fkey(*, provenance:profile_provenance(kind))'
const publicMockPrompts = mockPrompts.filter((prompt) => APPROVED_PROJECT_IDS.has(prompt.id))
const publicMockSteps = mockSteps.filter((step) => APPROVED_PROJECT_IDS.has(step.prompt_id))
const publicMockCategories = mockCategories.map((category) => ({
  ...category,
  prompt_count: publicMockPrompts.filter((prompt) => (
    prompt.status === 'approved' && prompt.category_id === category.id
  )).length,
}))

export type PublicCatalogPromptOptions = {
  categorySlug?: string
  difficulty?: string
  status?: string
  search?: string
  limit?: number
  sort?: 'newest' | 'popular'
}

function isPublicLibraryPrompt(prompt: { id: string; created_at?: string | null }) {
  if (APPROVED_PROJECT_IDS.has(prompt.id)) return true
  if (!prompt.created_at) return false
  return new Date(prompt.created_at).getTime() >= new Date(PUBLIC_LIBRARY_START_AT).getTime()
}

function normalizeProjectPresentation<T extends PromptWithRelations>(prompt: T): T {
  const preparedProject = getPreparedShowcaseProjectById(prompt.id)
  if (preparedProject) {
    return {
      ...prompt,
      title: preparedProject.title,
      description: preparedProject.description,
      content: preparedProject.content,
      result_content: preparedProject.resultContent,
      model_used: preparedProject.modelUsed,
      model_recommendation: preparedProject.modelRecommendation,
      tools_used: preparedProject.toolsUsed,
      tags: preparedProject.tags,
      steps: preparedProject.steps.map((step) => preparedStepToPromptStep(step, preparedProject)),
      prompt_step_count: preparedProject.steps.length,
    }
  }

  return prompt
}

function preparedStepToPromptStep(step: PreparedShowcaseStep, project: PreparedShowcaseProject) {
  return {
    id: step.id,
    prompt_id: project.id,
    step_number: step.stepNumber,
    title: step.title,
    content: step.content,
    result_content: step.resultContent,
    description: step.description,
    created_at: project.createdAt,
  }
}

// ---- Categories ----

export function getPublicCatalogFallbackCategories(): Category[] {
  return publicMockCategories.map((category) => ({ ...category }))
}

export async function getCategories(): Promise<Category[]> {
  return readWithFallback(getPublicCatalogFallbackCategories(), async (signal) => {
    const { createPublicReadClient } = await import('./supabase/server')
    const supabase = await createPublicReadClient({ anonymous: true })
    const { data } = await supabase
      .from('categories')
      .select('*')
      .order('name')
      .retry(false)
      .abortSignal(signal)
      .throwOnError()
    return data ?? []
  })
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return readWithFallback(publicMockCategories.find(c => c.slug === slug) ?? null, async (signal) => {
    const { createPublicReadClient } = await import('./supabase/server')
    const supabase = await createPublicReadClient()
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .retry(false)
      .abortSignal(signal)
      .throwOnError()
      .single()
    return data
  })
}

// ---- Prompts ----

function attachRelations(prompt: typeof mockPrompts[0]): PromptWithRelations {
  const author = mockProfiles.find(p => p.id === prompt.author_id)
  return {
    ...prompt,
    category: publicMockCategories.find(c => c.id === prompt.category_id),
    author: author ? {
      ...author,
      provenance: {
        kind: author.username === 'pathforge_projects' ? 'pathforge_team' : 'pathforge_seed',
      },
    } : undefined,
    steps: publicMockSteps.filter(s => s.prompt_id === prompt.id).sort((a, b) => a.step_number - b.step_number),
  }
}

function getMockPrompts(options?: PublicCatalogPromptOptions): PromptWithRelations[] {
  let prompts = [...publicMockPrompts]

  // Default to approved only
  const status = options?.status ?? 'approved'
  if (status !== 'all') {
    prompts = prompts.filter(p => p.status === status)
  }

  if (options?.categorySlug) {
    const cat = publicMockCategories.find(c => c.slug === options.categorySlug)
    if (cat) prompts = prompts.filter(p => p.category_id === cat.id)
  }
  if (options?.difficulty) {
    prompts = prompts.filter(p => p.difficulty === options.difficulty)
  }
  if (options?.search) {
    const q = options.search.toLowerCase()
    prompts = prompts.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    )
  }

  // Sort
  if (options?.sort === 'popular') {
    prompts.sort((a, b) => b.vote_count - a.vote_count)
  } else {
    prompts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  if (options?.limit) prompts = prompts.slice(0, options.limit)

  return prompts.map(attachRelations)
}

function validatePublicCatalogPromptOptions(options?: PublicCatalogPromptOptions) {
  const requestedLimit = options?.limit
  const maximumCheckedRows = PUBLIC_PROMPT_LIST_PAGE_SIZE * PUBLIC_PROMPT_LIST_MAX_PAGES
  if (
    requestedLimit !== undefined &&
    (!Number.isInteger(requestedLimit) || requestedLimit <= 0 || requestedLimit > maximumCheckedRows)
  ) {
    throw new RangeError(`Public prompt limits must be between 1 and ${maximumCheckedRows}.`)
  }
}

export function getPublicCatalogFallbackPrompts(
  options?: PublicCatalogPromptOptions,
): PromptWithRelations[] {
  validatePublicCatalogPromptOptions(options)
  return getMockPrompts(options)
}

function mergeWithPublicMockPrompts(prompts: PromptWithRelations[], options?: Parameters<typeof getMockPrompts>[0]) {
  const seen = new Set(prompts.map(prompt => prompt.id))
  const mockPrompts = getMockPrompts(options).filter(prompt => !seen.has(prompt.id))
  return [...prompts, ...mockPrompts]
}

function getPublicMockPromptsForProfile(profile: Pick<Profile, 'id'> & { username?: string | null }) {
  return publicMockPrompts.filter((prompt) => {
    if (prompt.author_id === profile.id) return true
    if (!profile.username) return false

    const mockAuthor = mockProfiles.find(author => author.id === prompt.author_id)
    return mockAuthor?.username === profile.username
  })
}

export async function getPrompts(
  options?: PublicCatalogPromptOptions,
): Promise<PromptWithRelations[]> {
  validatePublicCatalogPromptOptions(options)
  const requestedLimit = options?.limit
  const maximumCheckedRows = PUBLIC_PROMPT_LIST_PAGE_SIZE * PUBLIC_PROMPT_LIST_MAX_PAGES

  return readWithFallback(getPublicCatalogFallbackPrompts(options), async (signal) => {
    const { createPublicReadClient } = await import('./supabase/server')
    const supabase = await createPublicReadClient({ anonymous: true })
    const status = options?.status ?? 'approved'
    let categoryId: string | undefined

    // Category filtering — look up category ID from slug
    if (options?.categorySlug) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', options.categorySlug)
        .retry(false)
        .abortSignal(signal)
        .throwOnError()
        .single()
      categoryId = cat?.id
    }

    const databaseProjects: PromptWithRelations[] = []
    for (let pageIndex = 0; pageIndex < PUBLIC_PROMPT_LIST_MAX_PAGES; pageIndex += 1) {
      const pageStart = pageIndex * PUBLIC_PROMPT_LIST_PAGE_SIZE
      const pageEnd = pageStart + PUBLIC_PROMPT_LIST_PAGE_SIZE - 1
      let query = supabase
        .from('prompts')
        .select(PUBLIC_PROMPT_LIST_SELECT)

      if (status !== 'all') query = query.eq('status', status)
      if (categoryId) query = query.eq('category_id', categoryId)
      if (options?.difficulty) query = query.eq('difficulty', options.difficulty)
      if (options?.search) {
        const s = options.search
        query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,tags.cs.{${s}}`)
      }
      query = options?.sort === 'popular'
        ? query.order('vote_count', { ascending: false })
        : query.order('created_at', { ascending: false })
      query = query.order('id', { ascending: true })

      const { data: pageData } = await query
        .range(pageStart, pageEnd)
        .retry(false)
        .abortSignal(signal)
        .throwOnError()
      const rawPage = pageData ?? []
      const remaining = requestedLimit === undefined
        ? Number.POSITIVE_INFINITY
        : requestedLimit - databaseProjects.length
      const publicPage = rawPage
        .filter(isPublicLibraryPrompt)
        .slice(0, remaining)

      if (publicPage.length > 0) {
        const promptIds = publicPage.map((project) => project.id)
        const [{ data: stepCountRows }, { data: communityRows }] = await Promise.all([
          supabase
            .rpc('read_public_prompt_step_counts', { checked_prompt_ids: promptIds })
            .retry(false)
            .abortSignal(signal)
            .throwOnError(),
          supabase
            .rpc('get_public_community_projects', { target_prompts: promptIds })
            .retry(false)
            .abortSignal(signal)
            .throwOnError(),
        ])
        const communityByPrompt = new Map(
          ((communityRows ?? []) as PublicCommunityProject[]).map((capsule) => [capsule.prompt_id, capsule]),
        )
        databaseProjects.push(...attachExactPublicPromptStepCounts(
          publicPage as PromptWithRelations[],
          stepCountRows,
        ).map((project) => normalizeProjectPresentation({
          ...project,
          community_project: communityByPrompt.get(project.id) ?? null,
        })))
      }

      if (
        rawPage.length < PUBLIC_PROMPT_LIST_PAGE_SIZE ||
        (requestedLimit !== undefined && databaseProjects.length >= requestedLimit)
      ) {
        break
      }
      if (pageIndex === PUBLIC_PROMPT_LIST_MAX_PAGES - 1) {
        throw new Error(`Public prompt list exceeded ${maximumCheckedRows} checked rows.`)
      }
    }

    const merged = mergeWithPublicMockPrompts(databaseProjects, options)
    return options?.limit ? merged.slice(0, options.limit) : merged
  })
}

export async function getAllPromptsForAdmin(): Promise<PromptWithRelations[]> {
  if (!SUPABASE_CONFIGURED) return []

  const { supabase } = await requireAdminAccess()
  const { data, error } = await supabase
    .from('prompts')
    .select('*, category:categories(*), author:profiles!prompts_author_id_fkey(*, provenance:profile_provenance(kind)), steps:prompt_steps(*)')
    .order('created_at', { ascending: false })

  if (error) throw error
  const filtered = (data ?? [])
    .filter((prompt) => (
      (prompt.status === 'pending' || isPublicLibraryPrompt(prompt)) &&
      !prompt.tags?.some((tag: string) => tag.trim().toLowerCase() === 'community-project')
    ))
    .map(normalizeProjectPresentation)
  return mergeWithPublicMockPrompts(filtered, { status: 'all' })
}

export async function getPromptById(id: string): Promise<PromptWithRelations | null> {
  const resolvedId = id === SNAKE_PROJECT_LEGACY_ID ? SNAKE_PROJECT_ID : id
  const mockPrompt = publicMockPrompts.find(p => p.id === resolvedId)
  const fallback = mockPrompt ? attachRelations(mockPrompt) : null
  return readWithFallback(fallback, async (signal) => {
    const { createPublicReadClient } = await import('./supabase/server')
    const supabase = await createPublicReadClient()
    const { data } = await supabase
      .from('prompts')
      .select('*, category:categories(*), author:profiles!prompts_author_id_fkey(*, provenance:profile_provenance(kind)), steps:prompt_steps(*)')
      .eq('id', resolvedId)
      .retry(false)
      .abortSignal(signal)
      .throwOnError()
      .maybeSingle()

    if (!data) return fallback
    if (data.status === 'approved' && isPublicLibraryPrompt(data)) return normalizeProjectPresentation(data)

    signal.throwIfAborted()
    const { data: { user } } = await supabase.auth.getUser()
    signal.throwIfAborted()
    if (!user) return fallback
    if (data.author_id === user.id) return normalizeProjectPresentation(data)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .retry(false)
      .abortSignal(signal)
      .throwOnError()
      .maybeSingle()

    if (profile?.role === 'admin') return normalizeProjectPresentation(data)
    return fallback
  })
}

// ---- Profiles ----

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const mockProfile = mockProfiles.find((profile) => (
    profile.username.toLowerCase() === username.toLowerCase()
  ))
  const fallback = mockProfile
    ? {
        ...mockProfile,
        provenance: {
          kind: mockProfile.username === 'pathforge_projects'
            ? 'pathforge_team' as const
            : 'pathforge_seed' as const,
        },
      }
    : null
  return readWithFallback(fallback, async (signal) => {
    const { createPublicReadClient } = await import('./supabase/server')
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

function publicForkArtifactPath(filePath?: string | null) {
  return filePath?.startsWith('public/artifacts/')
    ? `/${filePath.replace(/^public\//, '')}`
    : null
}

function preparedForkContinuationSteps(
  project: PreparedShowcaseProject,
  forkSource: ProjectForkSource,
  sourceRunOverride?: SourceRunPackage | null,
): ProjectForkContinuationStep[] {
  const forkPoint = forkSource.sourceStepNumber ?? 0

  if (sourceRunOverride || project.sourceRunPackageFile) {
    const sourceRun = sourceRunOverride
      ?? loadSourceRunPackage(project.sourceRunPackageFile!)
    const sourceRunId = sourceRun.source_run_id ?? project.sourceRunId
    const preparedArtifactPath = project.artifactPath.startsWith('/artifacts/')
      ? `public${project.artifactPath}`
      : null
    const canonicalArtifactPath = sourceRunCanonicalArtifactPath(
      sourceRun,
      preparedArtifactPath,
    )
    const localSteps = sourceRun.steps
      .map((step) => {
        const preparedStep = project.steps.find((candidate) => candidate.stepNumber === step.step_number)
        const responseCapture = sourceRunResponseCapturePresentation(sourceRun, step)
        const artifactVersions = sourceRunDisplayArtifactFiles(
          sourceRun,
          step,
          preparedArtifactPath,
        ).flatMap((filePath, index) => {
          const artifactPath = publicForkArtifactPath(filePath)
          if (!artifactPath) return []
          const sourceStepId = `${project.id}:${sourceRunId}:step:${step.step_number}`
          return [{
            id: `${project.id}:${sourceRunId}:step:${step.step_number}:artifact:${index + 1}`,
            artifactPath,
            sourceArtifactPath: filePath,
            artifactTitle: filePath === canonicalArtifactPath
              ? `${project.title} final`
              : `${project.title} step ${step.step_number}`,
            artifactSha256: step.artifact_sha256,
            sourceRunId,
            sourceStepId,
            sourceStepNumber: step.step_number,
            isDefault: filePath === canonicalArtifactPath,
          }]
        })

        return {
          id: `${project.id}:${sourceRunId}:step:${step.step_number}`,
          stepNumber: step.step_number,
          promptTitle: preparedStep?.title ?? `Prompt ${step.step_number}`,
          promptText: step.prompt_exact,
          responseText: step.response_exact,
          responseLabel: responseCapture.label,
          responseDisclosure: responseCapture.disclosure,
          responsePackageId: `${project.id}:${sourceRunId}:response:${step.step_number}`,
          sourceRunId,
          artifactPath: artifactVersions.find((artifact) => artifact.isDefault)?.artifactPath
            ?? artifactVersions.at(-1)?.artifactPath
            ?? null,
          artifactSha256: artifactVersions.find((artifact) => artifact.isDefault)?.artifactSha256
            ?? artifactVersions.at(-1)?.artifactSha256
            ?? null,
          artifactVersions,
        }
      })
    return selectProjectForkLocalSteps(localSteps, forkPoint)
  }

  const localSteps = project.steps
    .map((step) => ({
      id: step.id,
      stepNumber: step.stepNumber,
      promptTitle: step.title,
      promptText: step.content,
      responseText: step.resultContent,
      responsePackageId: step.id,
      artifactPath: step.stepNumber === project.steps.at(-1)?.stepNumber ? project.artifactPath : null,
      artifactVersions: step.stepNumber === project.steps.at(-1)?.stepNumber
        ? [{
          id: `${step.id}:artifact:1`,
          artifactPath: project.artifactPath,
          artifactTitle: `${project.title} final`,
          isDefault: true,
        }]
        : [],
    }))
  return selectProjectForkLocalSteps(localSteps, forkPoint)
}

function hydratePreparedForkItem(item: ProjectForkNetworkItem): ProjectForkNetworkItem {
  const project = getPreparedShowcaseProjectById(item.id)
  if (!project) return item

  let childProviderName: string | null = null
  let childSourceRunId: string | null = null
  let modelUsed = item.modelUsed
  if (project.sourceRunPackageFile) {
    const sourceRun = loadSourceRunPackage(project.sourceRunPackageFile)
    childProviderName = sourceRun.provider ?? null
    childSourceRunId = resolveProviderPublicShareSourceRunId(sourceRun)
    modelUsed = getPublicModelIdentityLabel({
      provider: sourceRun.provider,
      model: sourceRun.model ?? item.modelUsed,
      modelSettings: sourceRun.model_settings,
    }) || item.modelUsed
  }
  const childVariantSet = getProjectModelVariantSet(project.id)
  const checkedChildVariant = childVariantSet?.variants.find((variant) => (
    variant.sourceRunId === childSourceRunId
  )) ?? null

  return {
    ...item,
    childRoute: getProjectRouteOverride(project.id) ?? project.href,
    childSourceRunId,
    childSourceUrl: null,
    childProviderName,
    modelUsed,
    childArtifactQualityStatus: checkedChildVariant?.qualityStatus ?? 'recorded',
    childArtifactKnownIssueExplanation: checkedChildVariant
      ? getProjectModelVariantKnownIssueExplanation(checkedChildVariant)
      : null,
    continuationSteps: preparedForkContinuationSteps(project, item.forkSource),
  }
}

function projectForkResponseSocketKey(item: ProjectForkNetworkItem) {
  const source = item.forkSource
  const runScope = source.sourceRunId
    ? `run:${source.sourceRunId}`
    : source.sourceModelVariantId
      ? `variant:${source.sourceModelVariantId}`
      : 'legacy'
  const stepScope = source.sourceStepId
    ? `id:${source.sourceStepId}`
    : source.sourceStepNumber
      ? `number:${source.sourceStepNumber}`
      : 'project'
  return `${source.sourceProjectId}|${runScope}|${stepScope}`
}

function limitProjectForksPerResponseSocket(forks: ProjectForkNetworkItem[]) {
  const socketCounts = new Map<string, number>()
  return forks.filter((fork) => {
    const socket = projectForkResponseSocketKey(fork)
    const count = socketCounts.get(socket) ?? 0
    if (count >= PROJECT_FORK_MAX_WIDTH) return false
    socketCounts.set(socket, count + 1)
    return true
  })
}

function getPublicMockProjectForks(
  projectId: string,
  sourceRunId?: string | null,
): ProjectForkNetworkItem[] {
  const preparedForks = PREPARED_SHOWCASE_PROJECTS
    .filter((project) => project.forkSource?.sourceProjectId === projectId)
    .map((project) => hydratePreparedForkItem({
      id: project.id,
      title: project.title,
      description: project.description,
      authorUsername: project.authorUsername,
      authorDisplayName: project.authorDisplayName,
      modelUsed: project.modelUsed,
      createdAt: project.createdAt,
      forkSource: project.forkSource!,
    }))
  const preparedForkIds = new Set(preparedForks.map((fork) => fork.id))
  const promptForks = publicMockPrompts
    .filter((prompt) => prompt.status === 'approved')
    .filter((prompt) => (
      prompt.fork_source_project_id === projectId ||
      prompt.fork_parent_submission_id === projectId
    ))
    .filter(isPublicLibraryPrompt)
    .reduce<ProjectForkNetworkItem[]>((forks, prompt) => {
      const forkSource = projectForkSourceFromSubmissionFields(prompt)
      if (!forkSource) return forks
      const author = mockProfiles.find((profile) => profile.id === prompt.author_id)

      forks.push(hydratePreparedForkItem({
        id: prompt.id,
        title: prompt.title,
        description: prompt.description,
        authorUsername: author?.username ?? null,
        authorDisplayName: author?.display_name ?? null,
        modelUsed: prompt.model_used,
        createdAt: prompt.created_at,
        forkSource,
      }))

      return forks
    }, [])
  const forks = [
    ...preparedForks,
    ...promptForks.filter((fork) => !preparedForkIds.has(fork.id)),
  ]

  return limitProjectForksPerResponseSocket(
    filterProjectForkNetworkBySourceRun(forks, sourceRunId)
      .sort((left, right) => (
      left.forkSource.branchIndex - right.forkSource.branchIndex ||
      Date.parse(left.createdAt) - Date.parse(right.createdAt)
      )),
  )
}

type CodeBackedLineageProject = PromptWithRelations | PreparedShowcaseProject

function withPreparedLineageRun(href: string, sourceRunId?: string | null) {
  if (!sourceRunId) return href
  return `${href}?${new URLSearchParams({ run: sourceRunId }).toString()}`
}

function resolvePreparedLineageSourceRun(
  project: PreparedShowcaseProject,
  outgoingChildForkSource?: ProjectForkSource | null,
) {
  const requestedSourceRunId = outgoingChildForkSource?.sourceRunId ?? null
  const variantSet = getProjectModelVariantSet(project.id)

  if (requestedSourceRunId) {
    const variant = variantSet?.variants.find((candidate) => (
      candidate.sourceRunId === requestedSourceRunId
    ))
    if (variant) {
      return {
        sourceRun: variant.sourceRunPackage,
        sourceRunId: variant.sourceRunId,
      }
    }
    if (
      project.sourceRunPackageFile &&
      project.sourceRunId === requestedSourceRunId
    ) {
      return {
        sourceRun: loadSourceRunPackage(project.sourceRunPackageFile),
        sourceRunId: requestedSourceRunId,
      }
    }
    return null
  }

  if (project.sourceRunPackageFile) {
    const sourceRun = loadSourceRunPackage(project.sourceRunPackageFile)
    return {
      sourceRun,
      sourceRunId: sourceRun.source_run_id ?? project.sourceRunId,
    }
  }

  const defaultVariant = variantSet?.variants.find((candidate) => (
    candidate.sourceRunId === variantSet.defaultSourceRunId
  ))
  return defaultVariant
    ? {
        sourceRun: defaultVariant.sourceRunPackage,
        sourceRunId: defaultVariant.sourceRunId,
      }
    : null
}

function getCodeBackedLineageNode(
  projectId: string,
  outgoingChildForkSource?: ProjectForkSource | null,
  preparedOnly = false,
): ProjectForkLineageCandidateNode<CodeBackedLineageProject> | null {
  const prepared = getPreparedShowcaseProjectById(projectId)
  if (prepared) {
    const forkSource = prepared.forkSource ?? null
    const selectedSourceRun = resolvePreparedLineageSourceRun(
      prepared,
      outgoingChildForkSource,
    )
    const sourceRun = selectedSourceRun?.sourceRun ?? null
    const baseHref = getProjectRouteOverride(prepared.id) ?? prepared.href
    return {
      projectId: prepared.id,
      title: prepared.title,
      project: prepared,
      promptFamilyId: forkSource?.promptFamilyId ?? null,
      presentation: {
        href: withPreparedLineageRun(
          baseHref,
          outgoingChildForkSource?.sourceRunId
            ? selectedSourceRun?.sourceRunId
            : null,
        ),
        modelLabel: sourceRun
          ? getPublicModelIdentityLabel({
              provider: sourceRun.provider,
              model: sourceRun.model ?? prepared.modelUsed,
              modelSettings: sourceRun.model_settings,
            }) || prepared.modelUsed
          : prepared.modelUsed,
        providerName: sourceRun?.provider ?? null,
        localSteps: sourceRun
          ? preparedForkContinuationSteps(
              prepared,
              forkSource ?? {
                sourceProjectId: prepared.id,
                depth: 0,
                branchIndex: 0,
              },
              sourceRun,
            )
          : [],
      },
      forkSource,
    }
  }

  if (preparedOnly) return null
  const rawPrompt = publicMockPrompts.find((prompt) => prompt.id === projectId)
  if (!rawPrompt) return null
  const prompt = normalizeProjectPresentation(attachRelations(rawPrompt))
  const forkSource = projectForkSourceFromSubmissionFields(prompt)
  return {
    projectId: prompt.id,
    title: prompt.title,
    project: prompt,
    promptFamilyId: prompt.prompt_family_id ?? null,
    presentation: {
      href: getProjectRouteOverride(prompt.id) ?? `/prompt/${prompt.id}`,
      modelLabel: prompt.model_used,
      localSteps: toProjectForkSourceSteps(prompt),
    },
    forkSource,
  }
}

function getCodeBackedLineage(
  currentProjectId: string,
  options: {
    preparedOnly?: boolean
    currentSourceRunId?: string | null
  } = {},
): Omit<BuildProjectForkLineageTruthInput<CodeBackedLineageProject>, 'readSource'> | null {
  const currentToRoot: ProjectForkLineageCandidateNode<CodeBackedLineageProject>[] = []
  const seen = new Set<string>()
  let projectId = currentProjectId
  let integrity: NonNullable<
    BuildProjectForkLineageTruthInput<CodeBackedLineageProject>['integrity']
  > = { kind: 'complete' }

  for (let index = 0; index < PROJECT_FORK_MAX_LEVELS; index += 1) {
    if (seen.has(projectId)) {
      integrity = {
        kind: 'cycle',
        affectedProjectId: projectId,
        issues: [{ kind: 'cycle', projectId }],
      }
      break
    }
    seen.add(projectId)

    const outgoingChildForkSource = currentToRoot.at(-1)?.forkSource
      ?? (
        currentToRoot.length === 0 && options.currentSourceRunId
          ? {
              sourceProjectId: currentProjectId,
              sourceRunId: options.currentSourceRunId,
              depth: 0,
              branchIndex: 0,
            }
          : null
      )
    const node = getCodeBackedLineageNode(
      projectId,
      outgoingChildForkSource,
      options.preparedOnly,
    )
    if (!node) {
      integrity = {
        kind: 'missing-parent',
        affectedProjectId: projectId,
        issues: [{ kind: 'missing-parent', projectId }],
      }
      break
    }
    if (
      currentToRoot.length === 0 &&
      options.currentSourceRunId &&
      node.presentation?.localSteps?.length === 0
    ) {
      integrity = {
        kind: 'invalid',
        affectedProjectId: currentProjectId,
        issues: [{
          kind: 'source-run-mismatch',
          projectId: currentProjectId,
          expected: 'registered-prepared-current-source-run',
          observed: options.currentSourceRunId,
        }],
      }
    }
    currentToRoot.push(node)
    if (!node.forkSource) break

    if (index === PROJECT_FORK_MAX_LEVELS - 1) {
      integrity = {
        kind: 'truncated',
        affectedProjectId: node.forkSource.sourceProjectId,
        issues: [{
          kind: 'truncated',
          projectId: node.forkSource.sourceProjectId,
          expected: PROJECT_FORK_MAX_LEVELS,
          observed: PROJECT_FORK_MAX_LEVELS + 1,
        }],
      }
      break
    }
    projectId = node.forkSource.sourceProjectId
  }

  if (currentToRoot.length === 0) return null
  return {
    nodes: currentToRoot.reverse(),
    currentProjectId,
    integrity,
  }
}

/**
 * Public presentation seam for one current project. Database truth is the
 * default even when a same-ID local registry entry exists. Prepared static
 * routes may explicitly opt into a labeled code-backed authority projection.
 * Neither path derives authority from route/query hints.
 */
export async function getProjectForkLineageTruth(
  projectId: string,
  options: {
    codeBackedAuthority?: boolean
    currentSourceRunId?: string | null
  } = {},
) {
  if (options.currentSourceRunId && !options.codeBackedAuthority) {
    throw new Error('A current source run requires explicit code-backed authority.')
  }
  const codeBackedLineage = options.codeBackedAuthority
    ? getCodeBackedLineage(projectId, {
        currentSourceRunId: options.currentSourceRunId,
      })
    : null
  const codeBacked = new Map<string, NonNullable<typeof codeBackedLineage>>()
  if (codeBackedLineage) codeBacked.set(projectId, codeBackedLineage)
  const { getAuthoritativeProjectForkLineages } = await import(
    './data/project-fork-lineage'
  )
  const truths = await getAuthoritativeProjectForkLineages(
    [projectId],
    {
      codeBacked,
      codeBackedAuthorityIds: options.codeBackedAuthority
        ? new Set([projectId])
        : undefined,
    },
  )
  return truths.get(projectId) ?? null
}

export async function getApprovedProjectForks(
  projectId: string,
  sourceRunId?: string | null,
): Promise<ProjectForkNetworkItem[]> {
  if (!projectId) return []
  const fallbackForks = markProjectForkNetworkLineageUnavailable(inspectablePreparedForkFallbacks(
    filterProjectForkNetworkBySourceRun(
      getPublicMockProjectForks(projectId, sourceRunId),
      sourceRunId,
    ),
    PREPARED_SHOWCASE_PROJECT_IDS,
    process.env.VERCEL_ENV,
  ))

  return readWithFallback(fallbackForks, async (signal) => {
    const { createPublicReadClient } = await import('./supabase/server')
    const supabase = await createPublicReadClient()
    let query = supabase
      .from('prompts')
      .select('id,title,description,model_used,created_at,status,author:profiles!prompts_author_id_fkey(username,display_name),steps:prompt_steps(id,step_number,title,content,result_content),fork_source_project_id,fork_source_project_title,fork_source_model_variant_id,fork_source_run_id,fork_source_step_id,fork_source_step_number,fork_source_artifact_path,fork_source_artifact_sha256,fork_parent_submission_id,prompt_family_id,fork_depth,fork_branch_index')
      .eq('status', 'approved')
      .or(`fork_source_project_id.eq.${projectId},fork_parent_submission_id.eq.${projectId}`)
    if (sourceRunId) query = query.eq('fork_source_run_id', sourceRunId)
    const { data, error } = await query
      .order('fork_branch_index', { ascending: true })
      .order('created_at', { ascending: true })
      .retry(false)
      .abortSignal(signal)

    if (forkColumnsMissing(error)) return fallbackForks
    if (error) throw error

    const dbForks = filterProjectForkNetworkBySourceRun((data ?? [])
      .filter(isPublicLibraryPrompt)
      .reduce<ProjectForkNetworkItem[]>((forks, prompt) => {
        const forkSource = projectForkSourceFromSubmissionFields(prompt)
        if (!forkSource) return forks
        const author = Array.isArray(prompt.author) ? prompt.author[0] : prompt.author

        const preparedItem = hydratePreparedForkItem({
          id: prompt.id,
          title: prompt.title,
          description: prompt.description,
          authorUsername: author?.username ?? null,
          authorDisplayName: author?.display_name ?? null,
          modelUsed: prompt.model_used,
          createdAt: prompt.created_at,
          forkSource,
          continuationSteps: communityProjectContinuationSteps(
            [...(prompt.steps ?? [])]
              .map((step) => ({
                id: step.id,
                stepNumber: step.step_number,
                promptTitle: step.title || `Prompt ${step.step_number}`,
                promptText: step.content,
                responseText: step.result_content,
                responsePackageId: step.id,
              })),
          ),
          childRoute: getProjectRouteOverride(prompt.id) ?? `/prompt/${prompt.id}`,
        })
        forks.push(preparedItem)
        return forks
      }, []), sourceRunId)

    const seen = new Set(dbForks.map((fork) => fork.id))
    const mergedForks = limitProjectForksPerResponseSocket([
      ...dbForks,
      ...fallbackForks.filter((fork) => !seen.has(fork.id)),
    ].sort((left, right) => (
        left.forkSource.branchIndex - right.forkSource.branchIndex ||
        Date.parse(left.createdAt) - Date.parse(right.createdAt)
      )))
    signal.throwIfAborted()
    const codeBacked = new Map<string, NonNullable<ReturnType<typeof getCodeBackedLineage>>>()
    for (const fork of mergedForks) {
      const lineage = getCodeBackedLineage(fork.id, {
        // Successful DB children may receive presentation bytes only from the
        // registered prepared corpus, never from the generic mock registry.
        preparedOnly: seen.has(fork.id),
      })
      if (lineage) codeBacked.set(fork.id, lineage)
    }
    const { getAuthoritativeProjectForkLineages } = await import(
      './data/project-fork-lineage'
    )
    const truths = await getAuthoritativeProjectForkLineages(
      mergedForks.map((fork) => fork.id),
      { codeBacked },
    )
    return mergedForks.map((fork) => ({
      ...fork,
      lineageTruth: truths.get(fork.id) ?? null,
    }))
  })
}

export async function getProjectsByAuthor(authorId: string, username?: string): Promise<PromptWithRelations[]> {
  const fallback = getPublicMockPromptsForProfile({ id: authorId, username })
    .filter(p => p.status === 'approved')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(attachRelations)

  return readWithFallback(fallback, async (signal) => {
    const { createPublicReadClient } = await import('./supabase/server')
    const supabase = await createPublicReadClient()
    const dbProjects: PromptWithRelations[] = []
    const maximumCheckedRows = PUBLIC_PROMPT_LIST_PAGE_SIZE * PUBLIC_PROMPT_LIST_MAX_PAGES
    for (let pageIndex = 0; pageIndex < PUBLIC_PROMPT_LIST_MAX_PAGES; pageIndex += 1) {
      const pageStart = pageIndex * PUBLIC_PROMPT_LIST_PAGE_SIZE
      const pageEnd = pageStart + PUBLIC_PROMPT_LIST_PAGE_SIZE - 1
      const { data: pageData } = await supabase
        .from('prompts')
        .select(PUBLIC_PROMPT_LIST_SELECT)
        .eq('author_id', authorId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })
        .range(pageStart, pageEnd)
        .retry(false)
        .abortSignal(signal)
        .throwOnError()
      const rawPage = pageData ?? []
      const publicPage = rawPage.filter(isPublicLibraryPrompt)

      if (publicPage.length > 0) {
        const promptIds = publicPage.map((project) => project.id)
        const [{ data: stepCountRows }, { data: communityRows }] = await Promise.all([
          supabase
            .rpc('read_public_prompt_step_counts', { checked_prompt_ids: promptIds })
            .retry(false)
            .abortSignal(signal)
            .throwOnError(),
          supabase
            .rpc('get_public_community_projects', { target_prompts: promptIds })
            .retry(false)
            .abortSignal(signal)
            .throwOnError(),
        ])
        const communityByPrompt = new Map(
          ((communityRows ?? []) as PublicCommunityProject[]).map((capsule) => [capsule.prompt_id, capsule]),
        )
        dbProjects.push(...attachExactPublicPromptStepCounts(
          publicPage as PromptWithRelations[],
          stepCountRows,
        ).map((project) => normalizeProjectPresentation({
          ...project,
          community_project: communityByPrompt.get(project.id) ?? null,
        })))
      }

      if (rawPage.length < PUBLIC_PROMPT_LIST_PAGE_SIZE) break
      if (pageIndex === PUBLIC_PROMPT_LIST_MAX_PAGES - 1) {
        throw new Error(`Public author project list exceeded ${maximumCheckedRows} checked rows.`)
      }
    }

    const seen = new Set(dbProjects.map(prompt => prompt.id))
    return [...dbProjects, ...fallback.filter(prompt => !seen.has(prompt.id))]
  })
}

export async function getAuthorStats(authorId: string, username?: string) {
  const authorPrompts = getPublicMockPromptsForProfile({ id: authorId, username })
    .filter(p => p.status === 'approved')
  const fallback = {
    totalProjects: authorPrompts.length,
    totalUpvotes: authorPrompts.reduce((sum, p) => sum + p.vote_count, 0),
    totalBookmarks: authorPrompts.reduce((sum, p) => sum + p.bookmark_count, 0),
    topCategory: getTopCategory(authorPrompts),
    memberSince: mockProfiles.find(p => p.id === authorId || p.username === username)?.created_at ?? '',
  }

  return readWithFallback(fallback, async (signal) => {
    const { createPublicReadClient } = await import('./supabase/server')
    const supabase = await createPublicReadClient()
    const { data: prompts } = await supabase
      .from('prompts')
      .select('id, created_at, vote_count, bookmark_count, category_id, categories(name, icon)')
      .eq('author_id', authorId)
      .eq('status', 'approved')
      .retry(false)
      .abortSignal(signal)
      .throwOnError()

    const dbItems = (prompts ?? []).filter(isPublicLibraryPrompt)
    const seen = new Set(dbItems.map(prompt => prompt.id))
    const mockItems = authorPrompts.filter(prompt => !seen.has(prompt.id))
    const items = [...dbItems, ...mockItems]
    return {
      totalProjects: items.length,
      totalUpvotes: items.reduce((sum: number, p: { vote_count: number }) => sum + p.vote_count, 0),
      totalBookmarks: items.reduce((sum: number, p: { bookmark_count: number }) => sum + p.bookmark_count, 0),
      topCategory: getTopCategoryFromDb(items),
      memberSince: '',
    }
  })
}

function getTopCategory(prompts: typeof mockPrompts) {
  const counts: Record<string, number> = {}
  for (const p of prompts) {
    counts[p.category_id] = (counts[p.category_id] || 0) + 1
  }
  const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (!topId) return null
  const cat = publicMockCategories.find(c => c.id === topId)
  return cat ? { name: cat.name, icon: cat.icon } : null
}

function getTopCategoryFromDb(prompts: { category_id: string; categories?: unknown }[]) {
  const counts: Record<string, { count: number; name: string; icon: string }> = {}
  for (const p of prompts) {
    const cat = p.categories as { name: string; icon: string } | null
    const category = cat ?? publicMockCategories.find(item => item.id === p.category_id)
    if (!category) continue
    if (!counts[p.category_id]) counts[p.category_id] = { count: 0, name: category.name, icon: category.icon }
    counts[p.category_id].count++
  }
  const top = Object.values(counts).sort((a, b) => b.count - a.count)[0]
  return top ? { name: top.name, icon: top.icon } : null
}

// ---- Votes & Bookmarks ----

export async function toggleVote(promptId: string): Promise<{ voted: boolean; newCount: number }> {
  if (!SUPABASE_CONFIGURED) return { voted: false, newCount: 0 }
  if (!isPersistableProjectId(promptId)) throw new Error('This project is not connected to voting yet.')

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in')

  // Check if already voted
  const { data: existing, error: existingError } = await supabase
    .from('votes')
    .select('id')
    .eq('user_id', user.id)
    .eq('prompt_id', promptId)
    .maybeSingle()
  if (existingError) throw existingError

  if (existing) {
    // Remove vote
    const { error } = await supabase.from('votes').delete().eq('id', existing.id)
    if (error) throw error
    const { count, error: countError } = await supabase.from('votes').select('id', { count: 'exact', head: true }).eq('prompt_id', promptId)
    if (countError) throw countError
    return { voted: false, newCount: count ?? 0 }
  } else {
    // Add vote
    const { error } = await supabase.from('votes').insert({ user_id: user.id, prompt_id: promptId })
    if (error) throw error
    const { count, error: countError } = await supabase.from('votes').select('id', { count: 'exact', head: true }).eq('prompt_id', promptId)
    if (countError) throw countError
    return { voted: true, newCount: count ?? 0 }
  }
}

export async function toggleBookmark(promptId: string): Promise<{ bookmarked: boolean; newCount: number }> {
  if (!SUPABASE_CONFIGURED) return { bookmarked: false, newCount: 0 }
  if (!isPersistableProjectId(promptId)) throw new Error('This project is not connected to bookmarks yet.')

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in')

  const { data: existing, error: existingError } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', user.id)
    .eq('prompt_id', promptId)
    .maybeSingle()
  if (existingError) throw existingError

  if (existing) {
    const { error } = await supabase.from('bookmarks').delete().eq('id', existing.id)
    if (error) throw error
    const { data: updated, error: countError } = await supabase.from('prompts').select('bookmark_count').eq('id', promptId).single()
    if (countError) throw countError
    return { bookmarked: false, newCount: updated?.bookmark_count ?? 0 }
  } else {
    const { error } = await supabase.from('bookmarks').insert({ user_id: user.id, prompt_id: promptId })
    if (error) throw error
    const { data: updated, error: countError } = await supabase.from('prompts').select('bookmark_count').eq('id', promptId).single()
    if (countError) throw countError
    return { bookmarked: true, newCount: updated?.bookmark_count ?? 0 }
  }
}

export async function getUserVotesAndBookmarks(promptIds: string[]): Promise<{ votes: Set<string>; bookmarks: Set<string> }> {
  if (!SUPABASE_CONFIGURED) return { votes: new Set(), bookmarks: new Set() }
  const persistablePromptIds = promptIds.filter(isPersistableProjectId)
  if (persistablePromptIds.length === 0) return { votes: new Set(), bookmarks: new Set() }

  return readWithFallback({ votes: new Set<string>(), bookmarks: new Set<string>() }, async (signal) => {
    const { createPublicReadClient } = await import('./supabase/server')
    const supabase = await createPublicReadClient()
    signal.throwIfAborted()
    const { data: { user } } = await supabase.auth.getUser()
    signal.throwIfAborted()
    if (!user) return { votes: new Set(), bookmarks: new Set() }

    const [votesRes, bookmarksRes] = await Promise.all([
      supabase
        .from('votes')
        .select('prompt_id')
        .eq('user_id', user.id)
        .in('prompt_id', persistablePromptIds)
        .retry(false)
        .abortSignal(signal)
        .throwOnError(),
      supabase
        .from('bookmarks')
        .select('prompt_id')
        .eq('user_id', user.id)
        .in('prompt_id', persistablePromptIds)
        .retry(false)
        .abortSignal(signal)
        .throwOnError(),
    ])

    return {
      votes: new Set((votesRes.data ?? []).map(v => v.prompt_id)),
      bookmarks: new Set((bookmarksRes.data ?? []).map(b => b.prompt_id)),
    }
  })
}

// ---- Admin ----

export async function getPromptStats() {
  if (!SUPABASE_CONFIGURED) {
    return { total: 0, pending: 0, approved: 0, rejected: 0, categories: 0 }
  }

  const { supabase } = await requireAdminAccess()
  const [total, pending, approved, rejected, categories] = await Promise.all([
    supabase.from('prompts').select('*', { count: 'exact', head: true }),
    supabase.from('prompts').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('prompts').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('prompts').select('*', { count: 'exact', head: true }).eq('status', 'rejected'),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
  ])

  return {
    total: total.count ?? 0,
    pending: pending.count ?? 0,
    approved: approved.count ?? 0,
    rejected: rejected.count ?? 0,
    categories: categories.count ?? 0,
  }
}

export async function updatePromptStatus(id: string, status: 'approved' | 'rejected') {
  const { supabase } = await requireAdminAccess()
  const { createAdminClient } = await import('./supabase/admin')
  const { data: linkedCommunityProject, error: communityProjectError } = await createAdminClient()
    .from('community_project_submissions')
    .select('id,status')
    .or(`prompt_id.eq.${id},former_prompt_id.eq.${id}`)
    .limit(1)
    .maybeSingle()
  if (communityProjectError) {
    throw new Error(`Generic moderation is blocked because PathForge could not verify community-project ownership for ${id}.`)
  }
  if (linkedCommunityProject) {
    throw new Error(
      `Generic moderation is blocked for community projects. Review /admin/community-projects/${linkedCommunityProject.id} and use its publication or removal controls.`,
    )
  }

  if (status === 'approved') {
    const { data: linkedSourceRun, error: sourceRunError } = await supabase
      .from('source_run_submissions')
      .select('id')
      .eq('extracted_prompt_id', id)
      .limit(1)
      .maybeSingle()

    if (sourceRunError) {
      throw new Error(
        `Generic approval is blocked because PathForge could not verify source-run links for project ${id}. Review the source-run queue and publish only through the prepared showcase flow.`,
      )
    }
    if (linkedSourceRun) {
      throw new Error(
        `Generic approval is blocked for source-run projects. Review /admin/source-runs/${linkedSourceRun.id} and publish its prepared showcase from there.`,
      )
    }

    const { data: promptForApproval, error: promptLookupError } = await supabase
      .from('prompts')
      .select('tags')
      .eq('id', id)
      .maybeSingle()

    if (promptLookupError) {
      throw new Error(
        `Generic approval is blocked because PathForge could not verify provenance tags for project ${id}. Review the source-run queue and publish only through the prepared showcase flow.`,
      )
    }
    const isSourceRunTagged = Array.isArray(promptForApproval?.tags) && promptForApproval.tags.some(
      tag => typeof tag === 'string' && tag.trim().toLowerCase() === 'source-run',
    )
    if (isSourceRunTagged) {
      throw new Error(
        `Generic approval is blocked because project ${id} is tagged source-run but has no linked source-run review. Restore its source-run link before publishing a prepared showcase.`,
      )
    }
  }

  const { error } = await supabase.from('prompts').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
