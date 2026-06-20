import {
  Category,
  Profile,
  PromptWithRelations,
} from './types'
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
import { getPreparedShowcaseProjectById } from './prepared-showcase-projects'
import type { PreparedShowcaseProject, PreparedShowcaseStep } from './prepared-showcase-projects'
import {
  PROJECT_FORK_MAX_WIDTH,
  projectForkSourceFromSubmissionFields,
  projectForkSourceToSubmissionFields,
  type ProjectForkNetworkItem,
  type ProjectForkSource,
} from './project-forks'
import { forkColumnsMissing, omitForkFields } from './data/fork-column-compat'
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
])
const PUBLIC_LIBRARY_START_AT = '2026-05-28T00:00:00.000Z'
const publicMockPrompts = mockPrompts.filter((prompt) => APPROVED_PROJECT_IDS.has(prompt.id))
const publicMockSteps = mockSteps.filter((step) => APPROVED_PROJECT_IDS.has(step.prompt_id))
const publicMockCategories = mockCategories.map((category) => ({
  ...category,
  prompt_count: publicMockPrompts.filter((prompt) => (
    prompt.status === 'approved' && prompt.category_id === category.id
  )).length,
}))

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

export async function getCategories(): Promise<Category[]> {
  return readWithFallback(publicMockCategories, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data } = await supabase.from('categories').select('*').order('name')
    return data ?? []
  })
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  return readWithFallback(publicMockCategories.find(c => c.slug === slug) ?? null, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data } = await supabase.from('categories').select('*').eq('slug', slug).single()
    return data
  })
}

// ---- Prompts ----

function attachRelations(prompt: typeof mockPrompts[0]): PromptWithRelations {
  return {
    ...prompt,
    category: publicMockCategories.find(c => c.id === prompt.category_id),
    author: mockProfiles.find(p => p.id === prompt.author_id),
    steps: publicMockSteps.filter(s => s.prompt_id === prompt.id).sort((a, b) => a.step_number - b.step_number),
  }
}

function getMockPrompts(options?: {
  categorySlug?: string
  difficulty?: string
  status?: string
  search?: string
  limit?: number
  sort?: 'newest' | 'popular'
}): PromptWithRelations[] {
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

export async function getPrompts(options?: {
  categorySlug?: string
  difficulty?: string
  status?: string
  search?: string
  limit?: number
  sort?: 'newest' | 'popular'
}): Promise<PromptWithRelations[]> {
  return readWithFallback(getMockPrompts(options), async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    let query = supabase
      .from('prompts')
      .select('*, category:categories(*), author:profiles(*), steps:prompt_steps(*)')

    const status = options?.status ?? 'approved'
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    // Category filtering — look up category ID from slug
    if (options?.categorySlug) {
      const { data: cat } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', options.categorySlug)
        .single()
      if (cat) query = query.eq('category_id', cat.id)
    }

    if (options?.difficulty) query = query.eq('difficulty', options.difficulty)

    // Search title, description, and tags
    if (options?.search) {
      const s = options.search
      query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,tags.cs.{${s}}`)
    }

    if (options?.sort === 'popular') {
      query = query.order('vote_count', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }
    const { data } = await query
    const filtered = (data ?? []).filter(isPublicLibraryPrompt).map(normalizeProjectPresentation)
    const merged = mergeWithPublicMockPrompts(filtered, options)
    return options?.limit ? merged.slice(0, options.limit) : merged
  })
}

export async function getAllPromptsForAdmin(): Promise<PromptWithRelations[]> {
  if (!SUPABASE_CONFIGURED) return []

  const { supabase } = await requireAdminAccess()
  const { data, error } = await supabase
    .from('prompts')
    .select('*, category:categories(*), author:profiles(*), steps:prompt_steps(*)')
    .order('created_at', { ascending: false })

  if (error) throw error
  const filtered = (data ?? [])
    .filter(prompt => prompt.status === 'pending' || isPublicLibraryPrompt(prompt))
    .map(normalizeProjectPresentation)
  return mergeWithPublicMockPrompts(filtered, { status: 'all' })
}

export async function getPromptById(id: string): Promise<PromptWithRelations | null> {
  const resolvedId = id === SNAKE_PROJECT_LEGACY_ID ? SNAKE_PROJECT_ID : id
  const mockPrompt = publicMockPrompts.find(p => p.id === resolvedId)
  const fallback = mockPrompt ? attachRelations(mockPrompt) : null
  return readWithFallback(fallback, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data } = await supabase
      .from('prompts')
      .select('*, category:categories(*), author:profiles(*), steps:prompt_steps(*)')
      .eq('id', resolvedId)
      .maybeSingle()

    if (!data) return fallback
    if (data.status === 'approved' && isPublicLibraryPrompt(data)) return normalizeProjectPresentation(data)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fallback
    if (data.author_id === user.id) return normalizeProjectPresentation(data)

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'admin') return normalizeProjectPresentation(data)
    return fallback
  })
}

// ---- Profiles ----

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  return readWithFallback(mockProfiles.find(p => p.username === username) ?? null, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()
    return data
  })
}

function getPublicMockProjectForks(projectId: string): ProjectForkNetworkItem[] {
  return publicMockPrompts
    .filter((prompt) => prompt.status === 'approved')
    .filter((prompt) => (
      prompt.fork_source_project_id === projectId ||
      prompt.fork_parent_submission_id === projectId
    ))
    .filter(isPublicLibraryPrompt)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, PROJECT_FORK_MAX_WIDTH)
    .reduce<ProjectForkNetworkItem[]>((forks, prompt) => {
      const forkSource = projectForkSourceFromSubmissionFields(prompt)
      if (!forkSource) return forks
      const author = mockProfiles.find((profile) => profile.id === prompt.author_id)

      forks.push({
        id: prompt.id,
        title: prompt.title,
        description: prompt.description,
        authorUsername: author?.username ?? null,
        authorDisplayName: author?.display_name ?? null,
        modelUsed: prompt.model_used,
        createdAt: prompt.created_at,
        forkSource,
      })

      return forks
    }, [])
}

export async function getApprovedProjectForks(projectId: string): Promise<ProjectForkNetworkItem[]> {
  if (!projectId) return []
  const fallbackForks = getPublicMockProjectForks(projectId)

  return readWithFallback(fallbackForks, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('prompts')
      .select('id,title,description,model_used,created_at,status,author:profiles(username,display_name),fork_source_project_id,fork_source_project_title,fork_source_step_id,fork_source_step_number,fork_parent_submission_id,prompt_family_id,fork_depth,fork_branch_index')
      .eq('status', 'approved')
      .or(`fork_source_project_id.eq.${projectId},fork_parent_submission_id.eq.${projectId}`)
      .order('created_at', { ascending: false })
      .limit(PROJECT_FORK_MAX_WIDTH)

    if (forkColumnsMissing(error)) return fallbackForks
    if (error) throw error

    const dbForks = (data ?? [])
      .filter(isPublicLibraryPrompt)
      .reduce<ProjectForkNetworkItem[]>((forks, prompt) => {
        const forkSource = projectForkSourceFromSubmissionFields(prompt)
        if (!forkSource) return forks
        const author = Array.isArray(prompt.author) ? prompt.author[0] : prompt.author

        forks.push({
          id: prompt.id,
          title: prompt.title,
          description: prompt.description,
          authorUsername: author?.username ?? null,
          authorDisplayName: author?.display_name ?? null,
          modelUsed: prompt.model_used,
          createdAt: prompt.created_at,
          forkSource,
        })
        return forks
      }, [])

    const seen = new Set(dbForks.map((fork) => fork.id))
    return [
      ...dbForks,
      ...fallbackForks.filter((fork) => !seen.has(fork.id)),
    ].slice(0, PROJECT_FORK_MAX_WIDTH)
  })
}

export async function getProjectsByAuthor(authorId: string, username?: string): Promise<PromptWithRelations[]> {
  const fallback = getPublicMockPromptsForProfile({ id: authorId, username })
    .filter(p => p.status === 'approved')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map(attachRelations)

  return readWithFallback(fallback, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data } = await supabase
      .from('prompts')
      .select('*, category:categories(*), author:profiles(*), steps:prompt_steps(*)')
      .eq('author_id', authorId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
    const dbProjects = (data ?? []).filter(isPublicLibraryPrompt).map(normalizeProjectPresentation)
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

  return readWithFallback(fallback, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data: prompts } = await supabase
      .from('prompts')
      .select('id, created_at, vote_count, bookmark_count, category_id, categories(name, icon)')
      .eq('author_id', authorId)
      .eq('status', 'approved')

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

  return readWithFallback({ votes: new Set<string>(), bookmarks: new Set<string>() }, async () => {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { votes: new Set(), bookmarks: new Set() }

    const [votesRes, bookmarksRes] = await Promise.all([
      supabase.from('votes').select('prompt_id').eq('user_id', user.id).in('prompt_id', persistablePromptIds),
      supabase.from('bookmarks').select('prompt_id').eq('user_id', user.id).in('prompt_id', persistablePromptIds),
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

export async function createProject(project: {
  title: string
  description: string
  content: string
  result_content: string | null
  category_slug: string
  difficulty: string
  model_used: string | null
  model_recommendation: string | null
  tools_used: string[]
  tags: string[]
  steps: { title: string; content: string; result_content: string | null; description: string | null }[]
  fork_source?: ProjectForkSource | null
}) {
  if (!SUPABASE_CONFIGURED) return { id: 'mock-id' }

  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Must be logged in to submit a project')

  // Look up category ID from slug
  const { data: cat } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', project.category_slug)
    .single()
  if (!cat) throw new Error('Invalid category')

  // Insert the project
  const promptPayload = {
    title: project.title,
    description: project.description,
    content: project.content,
    result_content: project.result_content || null,
    category_id: cat.id,
    difficulty: project.difficulty,
    model_used: project.model_used || null,
    model_recommendation: project.model_recommendation || null,
    tools_used: project.tools_used,
    tags: project.tags,
    ...projectForkSourceToSubmissionFields(project.fork_source),
    status: 'pending',
    author_id: user.id,
  }
  let { data: prompt, error: promptError } = await supabase
    .from('prompts')
    .insert(promptPayload)
    .select('id')
    .single()

  if (promptError) {
    if (!forkColumnsMissing(promptError)) throw promptError

    const fallbackResult = await supabase
      .from('prompts')
      .insert(omitForkFields(promptPayload))
      .select('id')
      .single()
    prompt = fallbackResult.data
    promptError = fallbackResult.error
  }

  if (promptError) throw promptError
  if (!prompt) throw new Error('Project submission did not return an id.')

  // Insert steps if any
  if (project.steps.length > 0) {
    const stepsToInsert = project.steps.map((step, idx) => ({
      prompt_id: prompt.id,
      step_number: idx + 1,
      title: step.title,
      content: step.content,
      result_content: step.result_content || null,
      description: step.description || null,
    }))

    const { error: stepsError } = await supabase
      .from('prompt_steps')
      .insert(stepsToInsert)

    if (stepsError) throw stepsError
  }

  return { id: prompt.id }
}

export async function updatePromptStatus(id: string, status: 'approved' | 'rejected') {
  const { supabase } = await requireAdminAccess()
  const { error } = await supabase.from('prompts').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw error
}
