import 'server-only'

import {
  PROJECT_FORK_MAX_STORED_DEPTH,
  type ProjectForkSource,
} from '../project-forks'
import { getProjectModelVariantSet } from '../project-model-variants'
import { deriveProfileIdentityReadiness } from '../profile-readiness'
import { createClient } from '../supabase/server'
import { SUPABASE_CONFIGURED } from './shared'
import type {
  MyForgeDashboard,
  MyForgeOwnedProject,
  MyForgeProfile,
  MyForgeProjectContext,
  MyForgeProjectState,
  MyForgeProjectSummary,
  MyForgeRepairContext,
  MyForgeSavedProject,
  MyForgeSourceRun,
  MyForgeSourceRunDatabaseStatus,
  MyForgeSourceRunLifecycle,
  MyForgeUnfinishedFork,
  ProfileProvenance,
  ProfileProvenanceKind,
  SaveMyForgeResumeStateInput,
  UpdateMyForgeProfileInput,
} from '../my-forge-types'

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>

type ViewerContext = {
  supabase: ServerSupabaseClient
  userId: string
}

type RawCategory = {
  name: string
  slug: string
  icon: string
}

type RawProject = {
  id: string
  title: string
  description: string
  status: 'pending' | 'approved' | 'rejected'
  model_used: string | null
  vote_count: number
  bookmark_count: number
  fork_source_project_id: string | null
  fork_source_step_number: number | null
  created_at: string
  updated_at: string
  category?: RawCategory | RawCategory[] | null
}

type RawProjectState = {
  user_id: string
  project_id: string
  selected_model_variant_id: string | null
  selected_source_run_id: string | null
  selected_step_id: string | null
  selected_step_number: number | null
  selected_artifact_path: string | null
  selected_artifact_sha256: string | null
  model_updates_seen_at: string
  last_opened_at: string
  fork_started_at: string | null
  fork_source_model_variant_id: string | null
  fork_source_run_id: string | null
  fork_source_step_id: string | null
  fork_source_step_number: number | null
  fork_source_artifact_path: string | null
  fork_source_artifact_sha256: string | null
  fork_parent_submission_id: string | null
  fork_depth: number
  fork_branch_index: number
  fork_prompt_family_id: string | null
  created_at: string
  updated_at: string
}

type RawProfileProvenance = {
  profile_id: string
  kind: ProfileProvenanceKind
  created_at: string
  updated_at: string
}

type RawProfile = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
  provenance?: RawProfileProvenance | RawProfileProvenance[] | null
}

type RawBookmark = {
  id: string
  prompt_id: string
  created_at: string
  project?: RawProject | RawProject[] | null
}

type RawModelVariant = {
  id: string
  project_id: string
  source_run_id: string
  artifact_version_paths: string[]
  status: 'published' | 'historical'
  is_current: boolean
  created_at: string
  run_finished_at: string | null
  updated_at: string
}

type RawSourceRun = {
  id: string
  title: string | null
  source_url: string | null
  file_name: string | null
  status: MyForgeSourceRunDatabaseStatus
  user_status_note: string | null
  resubmission_of_id: string | null
  extracted_prompt_id: string | null
  fork_source_project_id: string | null
  fork_source_project_title: string | null
  fork_source_model_variant_id: string | null
  fork_source_run_id: string | null
  fork_source_step_id: string | null
  fork_source_step_number: number | null
  fork_source_artifact_path: string | null
  fork_source_artifact_sha256: string | null
  fork_parent_submission_id: string | null
  prompt_family_id: string | null
  fork_depth: number | null
  fork_branch_index: number | null
  created_at: string
  updated_at: string
  extracted_project?: RawProject | RawProject[] | null
}

type CanonicalResumeSelection = {
  sourceRunId: string
  stepId: string
  stepNumber: number
  artifactPath: string
  artifactSha256: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const PROJECT_SELECT = [
  'id',
  'title',
  'description',
  'status',
  'model_used',
  'vote_count',
  'bookmark_count',
  'fork_source_project_id',
  'fork_source_step_number',
  'created_at',
  'updated_at',
  'category:categories(name,slug,icon)',
].join(',')
const PROJECT_STATE_SELECT = [
  'user_id',
  'project_id',
  'selected_model_variant_id',
  'selected_source_run_id',
  'selected_step_id',
  'selected_step_number',
  'selected_artifact_path',
  'selected_artifact_sha256',
  'model_updates_seen_at',
  'last_opened_at',
  'fork_started_at',
  'fork_source_model_variant_id',
  'fork_source_run_id',
  'fork_source_step_id',
  'fork_source_step_number',
  'fork_source_artifact_path',
  'fork_source_artifact_sha256',
  'fork_parent_submission_id',
  'fork_depth',
  'fork_branch_index',
  'fork_prompt_family_id',
  'created_at',
  'updated_at',
].join(',')

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function meaningfulSourceRunTitle(value: string | null | undefined) {
  const title = value?.trim().replace(/\s+/g, ' ')
  if (!title) return null
  const comparable = title.toLowerCase().replace(/[-_]+/g, ' ')
  if (/^(?:untitled(?:\s+(?:build|project|source\s+run|submission))?|source\s+run|new\s+build|build\s+submission)$/.test(comparable)) {
    return null
  }
  return title
}

function sourceRunDisplayTitle(raw: RawSourceRun, extractedProject?: RawProject | null) {
  const explicitTitle = meaningfulSourceRunTitle(raw.title)
  if (explicitTitle) return explicitTitle

  const date = sourceRunDateLabel(raw.created_at)
  const provider = sourceRunProviderLabel(raw.source_url)
  const stableToken = raw.id.replace(/-/g, '').slice(0, 8) || 'legacy'
  const fallbackContext = `${provider} · ${date} · ${stableToken}`
  const projectTitle = meaningfulSourceRunTitle(extractedProject?.title)
  if (projectTitle) return `${projectTitle} · ${fallbackContext}`

  const forkSourceTitle = meaningfulSourceRunTitle(raw.fork_source_project_title)
  if (forkSourceTitle) return `Fork of ${forkSourceTitle} · ${fallbackContext}`

  const fileName = raw.file_name?.trim().split(/[\\/]/).at(-1)
  const cleanedFileName = fileName
    ?.replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const meaningfulFileName = meaningfulSourceRunTitle(cleanedFileName)
  if (
    meaningfulFileName &&
    !/^(?:submission|upload|package)$/i.test(meaningfulFileName)
  ) return `${meaningfulFileName} · ${fallbackContext}`

  return `${provider} run · ${date} · ${stableToken}`
}

function sourceRunDateLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'date unknown'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function sourceRunProviderLabel(sourceUrl: string | null) {
  if (!sourceUrl) return 'Imported source'
  try {
    const hostname = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, '')
    if (hostname === 'chatgpt.com' || hostname === 'chat.openai.com') return 'ChatGPT'
    if (hostname === 'claude.ai') return 'Claude'
    if (hostname === 'gemini.google.com' || hostname === 'aistudio.google.com') return 'Gemini'
    if (hostname === 'openrouter.ai') return 'OpenRouter'
    if (hostname === 'kimi.com' || hostname.endsWith('.moonshot.cn')) return 'Kimi'
    if (hostname === 'chat.qwen.ai' || hostname.endsWith('.qwen.ai')) return 'Qwen'
    if (hostname === 'chat.z.ai' || hostname === 'z.ai') return 'Z.ai'
    if (hostname === 'chat.deepseek.com' || hostname === 'deepseek.com') return 'DeepSeek'
    return hostname || 'Linked source'
  } catch {
    return 'Linked source'
  }
}

function assertUuid(value: string, label: string) {
  if (!UUID_PATTERN.test(value)) throw new Error(`${label} is not a valid project id.`)
  return value
}

function normalizedArtifactPath(value: string) {
  const trimmed = value.trim()
  const normalized = trimmed.startsWith('/artifacts/')
    ? `public${trimmed}`
    : trimmed
  if (
    !normalized.startsWith('public/artifacts/') ||
    normalized.includes('..') ||
    normalized.includes('\\')
  ) {
    throw new Error('Resume artifact must be a production PathForge artifact.')
  }
  return normalized
}

function mapProject(raw: RawProject): MyForgeProjectSummary {
  const category = firstRelation(raw.category)
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    status: raw.status,
    modelUsed: raw.model_used,
    voteCount: raw.vote_count ?? 0,
    bookmarkCount: raw.bookmark_count ?? 0,
    forkSourceProjectId: raw.fork_source_project_id,
    forkSourceStepNumber: raw.fork_source_step_number,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    category: category ? {
      name: category.name,
      slug: category.slug,
      icon: category.icon,
    } : null,
  }
}

function mapProvenance(raw: RawProfileProvenance | null): ProfileProvenance | null {
  if (!raw) return null
  return {
    profileId: raw.profile_id,
    kind: raw.kind,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  }
}

function mapProfile(raw: RawProfile): MyForgeProfile {
  const username = raw.username?.trim() || null
  const displayName = raw.display_name?.trim() || null
  const provenance = mapProvenance(firstRelation(raw.provenance))
  return {
    id: raw.id,
    username,
    displayName,
    avatarUrl: raw.avatar_url,
    bio: raw.bio,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    provenance,
    isComplete: deriveProfileIdentityReadiness({
      username,
      displayName,
      bio: raw.bio,
    }).isComplete,
  }
}

function canonicalResumeSelection(input: {
  projectId: string
  sourceRunId: string
  stepId?: string | null
  stepNumber: number
  artifactPath: string
  artifactSha256?: string | null
}): CanonicalResumeSelection {
  const variantSet = getProjectModelVariantSet(input.projectId)
  if (!variantSet) {
    throw new Error('This project does not have a canonical model-run history.')
  }

  const variant = variantSet.variants.find((entry) => entry.sourceRunId === input.sourceRunId)
  if (!variant) throw new Error('Selected source run is not registered for this project.')
  if (!Number.isInteger(input.stepNumber) || input.stepNumber < 1) {
    throw new Error('Selected response number is invalid.')
  }

  const step = variant.sourceRunPackage.steps.find((entry) => entry.step_number === input.stepNumber)
  if (!step) throw new Error('Selected response is not part of this model run.')

  const artifactPath = normalizedArtifactPath(input.artifactPath)
  if (!variant.artifactVersionPaths.includes(artifactPath)) {
    throw new Error('Selected artifact is not registered in this model run.')
  }

  const ownsArtifact =
    step.artifact_version_path === artifactPath ||
    step.generated_files?.includes(artifactPath) === true ||
    (
      variant.sourceRunPackage.final_artifact_path === artifactPath &&
      (
        step.artifact_version_path === variant.sourceRunPackage.final_artifact_path ||
        step.generated_files?.includes(variant.sourceRunPackage.final_artifact_path) === true
      )
    )
  if (!ownsArtifact) throw new Error('Selected artifact does not belong to the selected response.')

  const stepId = `${input.projectId}:${input.sourceRunId}:step:${input.stepNumber}`
  if (input.stepId && input.stepId !== stepId) {
    throw new Error('Selected response identity does not match the canonical model run.')
  }

  const declaredSha256 = (
    step.artifact_version_path === artifactPath && step.artifact_sha256
      ? step.artifact_sha256
      : variant.sourceRunPackage.final_artifact_path === artifactPath && variant.sourceRunPackage.artifact_sha256
        ? variant.sourceRunPackage.artifact_sha256
        : null
  )?.toLowerCase()
  const expectedSha256 = declaredSha256 ?? input.artifactSha256?.toLowerCase() ?? ''
  if (!SHA256_PATTERN.test(expectedSha256)) {
    throw new Error('Canonical artifact evidence is missing a valid SHA-256.')
  }
  if (declaredSha256 && input.artifactSha256?.toLowerCase() !== expectedSha256) {
    throw new Error('Selected artifact SHA-256 differs from the canonical model run.')
  }

  return {
    sourceRunId: input.sourceRunId,
    stepId,
    stepNumber: input.stepNumber,
    artifactPath,
    artifactSha256: expectedSha256,
  }
}

function storedStateIsValid(raw: RawProjectState) {
  const hasSelection = Boolean(raw.selected_model_variant_id)
  if (!hasSelection) {
    return !(
      raw.selected_source_run_id ||
      raw.selected_step_id ||
      raw.selected_step_number ||
      raw.selected_artifact_path ||
      raw.selected_artifact_sha256
    )
  }
  if (
    !raw.selected_source_run_id ||
    !raw.selected_step_id ||
    !raw.selected_step_number ||
    !raw.selected_artifact_path ||
    !raw.selected_artifact_sha256
  ) return false

  try {
    canonicalResumeSelection({
      projectId: raw.project_id,
      sourceRunId: raw.selected_source_run_id,
      stepId: raw.selected_step_id,
      stepNumber: raw.selected_step_number,
      artifactPath: raw.selected_artifact_path,
      artifactSha256: raw.selected_artifact_sha256,
    })
    return true
  } catch {
    return false
  }
}

function mapProjectState(raw: RawProjectState): MyForgeProjectState {
  return {
    userId: raw.user_id,
    projectId: raw.project_id,
    selectedModelVariantId: raw.selected_model_variant_id,
    selectedSourceRunId: raw.selected_source_run_id,
    selectedStepId: raw.selected_step_id,
    selectedStepNumber: raw.selected_step_number,
    selectedArtifactPath: raw.selected_artifact_path,
    selectedArtifactSha256: raw.selected_artifact_sha256,
    modelUpdatesSeenAt: raw.model_updates_seen_at,
    lastOpenedAt: raw.last_opened_at,
    forkStartedAt: raw.fork_started_at,
    forkSourceModelVariantId: raw.fork_source_model_variant_id,
    forkSourceRunId: raw.fork_source_run_id,
    forkSourceStepId: raw.fork_source_step_id,
    forkSourceStepNumber: raw.fork_source_step_number,
    forkSourceArtifactPath: raw.fork_source_artifact_path,
    forkSourceArtifactSha256: raw.fork_source_artifact_sha256,
    forkParentSubmissionId: raw.fork_parent_submission_id,
    forkDepth: raw.fork_depth ?? 0,
    forkBranchIndex: raw.fork_branch_index ?? 0,
    forkPromptFamilyId: raw.fork_prompt_family_id,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    resumeIsValid: storedStateIsValid(raw),
  }
}

function sourceRunLifecycle(
  status: MyForgeSourceRunDatabaseStatus,
  extractedProjectStatus?: RawProject['status'] | null,
): MyForgeSourceRunLifecycle {
  if (extractedProjectStatus === 'rejected') return 'declined'
  if (
    status === 'published' ||
    (status === 'draft_created' && extractedProjectStatus === 'approved')
  ) return 'live'
  if (status === 'queued') return 'received'
  if (status === 'extracting') return 'extracting'
  if (status === 'in_review' || status === 'draft_created') return 'in_review'
  if (status === 'needs_repair') return 'needs_repair'
  if (status === 'declined') return 'declined'
  return 'failed'
}

async function currentViewer(): Promise<ViewerContext | null> {
  if (!SUPABASE_CONFIGURED) return null
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return { supabase, userId: user.id }
}

async function requireViewer(): Promise<ViewerContext> {
  const viewer = await currentViewer()
  if (!viewer) throw new Error('Log in to open My Forge.')
  return viewer
}

async function readProfile({ supabase, userId }: ViewerContext): Promise<MyForgeProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,username,display_name,avatar_url,bio,created_at,updated_at,provenance:profile_provenance(profile_id,kind,created_at,updated_at)')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Your PathForge profile is missing.')
  return mapProfile(data as unknown as RawProfile)
}

async function readStates(
  { supabase, userId }: ViewerContext,
  projectIds?: string[],
): Promise<MyForgeProjectState[]> {
  let query = supabase
    .from('user_project_states')
    .select(PROJECT_STATE_SELECT)
    .eq('user_id', userId)
  if (projectIds) {
    if (projectIds.length === 0) return []
    query = query.in('project_id', projectIds)
  }
  const { data, error } = await query.order('last_opened_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as unknown as RawProjectState[]).map(mapProjectState)
}

async function readSavedProjects(viewer: ViewerContext): Promise<MyForgeSavedProject[]> {
  const { supabase, userId } = viewer
  const { data, error } = await supabase
    .from('bookmarks')
    .select(`id,prompt_id,created_at,project:prompts(${PROJECT_SELECT})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const bookmarks = (data ?? []) as unknown as RawBookmark[]
  const projectIds = bookmarks.flatMap((bookmark) => {
    const project = firstRelation(bookmark.project)
    return project ? [project.id] : []
  })
  const [states, variantResult] = await Promise.all([
    readStates(viewer, projectIds),
    projectIds.length > 0
      ? supabase
          .from('project_model_variants')
          .select('id,project_id,source_run_id,artifact_version_paths,status,is_current,created_at,run_finished_at,updated_at')
          .in('project_id', projectIds)
          .in('status', ['published', 'historical'])
      : Promise.resolve({ data: [], error: null }),
  ])
  if (variantResult.error) throw variantResult.error

  const statesByProject = new Map(states.map((state) => [state.projectId, state]))
  const variantsByProject = new Map<string, RawModelVariant[]>()
  for (const variant of (variantResult.data ?? []) as unknown as RawModelVariant[]) {
    const projectVariants = variantsByProject.get(variant.project_id) ?? []
    projectVariants.push(variant)
    variantsByProject.set(variant.project_id, projectVariants)
  }

  return bookmarks.flatMap((bookmark) => {
    const rawProject = firstRelation(bookmark.project)
    if (!rawProject || rawProject.status !== 'approved') return []
    const state = statesByProject.get(rawProject.id) ?? null
    const seenAt = Date.parse(state?.modelUpdatesSeenAt ?? bookmark.created_at)
    const currentVariants = (variantsByProject.get(rawProject.id) ?? [])
      .filter((variant) => variant.status === 'published' && variant.is_current)
    const updateTimes = currentVariants
      .map((variant) => variant.created_at)
      .filter(Boolean)
    const latestModelUpdateAt = updateTimes.sort((left, right) => (
      Date.parse(right) - Date.parse(left)
    ))[0] ?? null
    const unseenVariants = currentVariants
      .filter((variant) => Date.parse(variant.created_at) > seenAt)
      .sort((left, right) => (
        Date.parse(right.created_at) - Date.parse(left.created_at)
      ))

    return [{
      bookmarkId: bookmark.id,
      savedAt: bookmark.created_at,
      project: mapProject(rawProject),
      state,
      latestModelUpdateAt,
      latestUnseenSourceRunId: unseenVariants[0]?.source_run_id ?? null,
      unseenModelUpdateCount: unseenVariants.length,
    }]
  })
}

async function readSourceRuns({ supabase, userId }: ViewerContext): Promise<MyForgeSourceRun[]> {
  const { data, error } = await supabase
    .from('source_run_submissions')
    .select([
      'id',
      'title',
      'status',
      'source_url',
      'file_name',
      'status',
      'user_status_note',
      'resubmission_of_id',
      'extracted_prompt_id',
      'fork_source_project_id',
      'fork_source_project_title',
      'fork_source_model_variant_id',
      'fork_source_run_id',
      'fork_source_step_id',
      'fork_source_step_number',
      'fork_source_artifact_path',
      'fork_source_artifact_sha256',
      'fork_parent_submission_id',
      'prompt_family_id',
      'fork_depth',
      'fork_branch_index',
      'created_at',
      'updated_at',
      `extracted_project:prompts(${PROJECT_SELECT})`,
    ].join(','))
    .eq('author_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error

  const rows = (data ?? []) as unknown as RawSourceRun[]
  const titlesById = new Map(rows.map((row) => [
    row.id,
    sourceRunDisplayTitle(row, firstRelation(row.extracted_project)),
  ]))
  const repairByPriorId = new Map<string, RawSourceRun>()
  for (const row of rows) {
    if (row.resubmission_of_id && !repairByPriorId.has(row.resubmission_of_id)) {
      repairByPriorId.set(row.resubmission_of_id, row)
    }
  }
  return rows.map((row) => {
    const extractedProject = firstRelation(row.extracted_project)
    const repairSubmission = repairByPriorId.get(row.id)
    return {
      id: row.id,
      title: sourceRunDisplayTitle(row, extractedProject),
      sourceUrl: row.source_url,
      fileName: row.file_name,
      status: row.status,
      lifecycle: sourceRunLifecycle(row.status, extractedProject?.status),
      userStatusNote: row.user_status_note,
      resubmissionOfId: row.resubmission_of_id,
      priorSubmissionTitle: row.resubmission_of_id
        ? titlesById.get(row.resubmission_of_id) ?? null
        : null,
      repairSubmissionId: repairSubmission?.id ?? null,
      repairSubmissionTitle: repairSubmission
        ? sourceRunDisplayTitle(repairSubmission, firstRelation(repairSubmission.extracted_project))
        : null,
      extractedPromptId: row.extracted_prompt_id,
      extractedProject: extractedProject ? mapProject(extractedProject) : null,
      forkSourceProjectId: row.fork_source_project_id,
      forkSourceProjectTitle: row.fork_source_project_title,
      forkSourceRunId: row.fork_source_run_id,
      forkSourceStepId: row.fork_source_step_id,
      forkSourceStepNumber: row.fork_source_step_number,
      forkSourceArtifactPath: row.fork_source_artifact_path,
      forkSourceArtifactSha256: row.fork_source_artifact_sha256,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })
}

async function readOwnedProjects({ supabase, userId }: ViewerContext): Promise<MyForgeOwnedProject[]> {
  const { data, error } = await supabase
    .from('prompts')
    .select(PROJECT_SELECT)
    .eq('author_id', userId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as unknown as RawProject[]).map((project) => ({
    ...mapProject(project),
    isFork: Boolean(project.fork_source_project_id),
  }))
}

async function readUnfinishedForks(
  viewer: ViewerContext,
  sourceRuns: MyForgeSourceRun[],
): Promise<MyForgeUnfinishedFork[]> {
  const states = (await readStates(viewer)).filter((state) => state.forkStartedAt)
  if (states.length === 0) return []

  const { data, error } = await viewer.supabase
    .from('prompts')
    .select(PROJECT_SELECT)
    .in('id', states.map((state) => state.projectId))
    .eq('status', 'approved')
  if (error) throw error
  const projectsById = new Map(
    ((data ?? []) as unknown as RawProject[]).map((project) => [project.id, mapProject(project)]),
  )

  return states.flatMap((state) => {
    const project = projectsById.get(state.projectId)
    if (!project || !state.forkStartedAt) return []
    const forkStartedAt = Date.parse(state.forkStartedAt)
    const alreadySubmitted = sourceRuns.some((run) => (
      run.forkSourceProjectId === state.projectId &&
      Date.parse(run.createdAt) >= forkStartedAt &&
      (
        (!state.forkSourceRunId && !state.forkSourceStepId) ||
        (
          run.forkSourceRunId === state.forkSourceRunId &&
          (!state.forkSourceStepId || run.forkSourceStepId === state.forkSourceStepId)
        ) ||
        (
          !state.forkSourceRunId &&
          run.forkSourceStepId === state.forkSourceStepId &&
          run.forkSourceStepNumber === state.forkSourceStepNumber
        )
      )
    ))
    return alreadySubmitted ? [] : [{ project, state }]
  })
}

async function readRawState(viewer: ViewerContext, projectId: string) {
  const { data, error } = await viewer.supabase
    .from('user_project_states')
    .select(PROJECT_STATE_SELECT)
    .eq('user_id', viewer.userId)
    .eq('project_id', projectId)
    .maybeSingle()
  if (error) throw error
  return data as unknown as RawProjectState | null
}

async function modelUpdatesBaseline(
  viewer: ViewerContext,
  projectId: string,
  existing?: RawProjectState | null,
) {
  if (existing?.model_updates_seen_at) return existing.model_updates_seen_at
  const { data: bookmark, error } = await viewer.supabase
    .from('bookmarks')
    .select('created_at')
    .eq('user_id', viewer.userId)
    .eq('prompt_id', projectId)
    .maybeSingle()
  if (error) throw error
  return bookmark?.created_at ?? new Date().toISOString()
}

async function assertApprovedProject(viewer: ViewerContext, projectId: string) {
  const { data, error } = await viewer.supabase
    .from('prompts')
    .select('id')
    .eq('id', projectId)
    .eq('status', 'approved')
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('Resume state can only be saved for a public project.')
}

export async function getMyForgeProfile() {
  return readProfile(await requireViewer())
}

export async function updateMyForgeProfile(input: UpdateMyForgeProfileInput) {
  const viewer = await requireViewer()
  const displayName = input.displayName.trim()
  if (displayName.length < 2 || displayName.length > 80) {
    throw new Error('Display name must be between 2 and 80 characters.')
  }
  const bio = input.bio?.trim() || null
  if (bio && bio.length > 500) throw new Error('Bio must be 500 characters or fewer.')
  const avatarUrl = input.avatarUrl?.trim() || null
  if (avatarUrl) {
    if (avatarUrl.length > 2048) throw new Error('Avatar URL is too long.')
    if (!avatarUrl.startsWith('/') && !/^https:\/\/[^\s]+$/i.test(avatarUrl)) {
      throw new Error('Avatar URL must be a secure URL or PathForge path.')
    }
  }

  const { error } = await viewer.supabase
    .from('profiles')
    .update({
      display_name: displayName,
      bio,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', viewer.userId)
  if (error) throw error
  return readProfile(viewer)
}

export async function getMyForgeSavedProjects() {
  return readSavedProjects(await requireViewer())
}

export async function getMyForgeSourceRuns() {
  return readSourceRuns(await requireViewer())
}

export async function getMyForgeOwnedProjects() {
  return readOwnedProjects(await requireViewer())
}

export async function getMyForgeDashboard(): Promise<MyForgeDashboard | null> {
  const viewer = await currentViewer()
  if (!viewer) return null
  const [profile, savedProjects, sourceRuns, ownedProjects] = await Promise.all([
    readProfile(viewer),
    readSavedProjects(viewer),
    readSourceRuns(viewer),
    readOwnedProjects(viewer),
  ])
  const unfinishedForks = await readUnfinishedForks(viewer, sourceRuns)
  return { profile, savedProjects, sourceRuns, ownedProjects, unfinishedForks }
}

export async function getCurrentUserProjectContext(
  projectId: string,
): Promise<MyForgeProjectContext> {
  assertUuid(projectId, 'Project')
  const viewer = await currentViewer()
  if (!viewer) return { isAuthenticated: false, state: null }
  const rawState = await readRawState(viewer, projectId)
  return {
    isAuthenticated: true,
    state: rawState ? mapProjectState(rawState) : null,
  }
}

export async function getMyForgeResumeState(projectId: string) {
  assertUuid(projectId, 'Project')
  const viewer = await requireViewer()
  const rawState = await readRawState(viewer, projectId)
  return rawState ? mapProjectState(rawState) : null
}

export async function saveMyForgeResumeState(
  input: SaveMyForgeResumeStateInput,
): Promise<MyForgeProjectState> {
  const projectId = assertUuid(input.projectId, 'Project')
  const viewer = await requireViewer()
  await assertApprovedProject(viewer, projectId)
  const existing = await readRawState(viewer, projectId)
  const now = new Date().toISOString()
  const seenAt = await modelUpdatesBaseline(viewer, projectId, existing)

  let selection: CanonicalResumeSelection | null = null
  let modelVariantId: string | null = null
  const hasSelection = Boolean(
    input.sourceRunId || input.stepId || input.stepNumber || input.artifactPath || input.artifactSha256,
  )
  if (hasSelection) {
    if (!input.sourceRunId || !input.stepNumber || !input.artifactPath || !input.artifactSha256) {
      throw new Error('Resume state needs a source run, response number, artifact, and SHA-256.')
    }
    selection = canonicalResumeSelection({
      projectId,
      sourceRunId: input.sourceRunId,
      stepId: input.stepId,
      stepNumber: input.stepNumber,
      artifactPath: input.artifactPath,
      artifactSha256: input.artifactSha256,
    })

    const { data: variant, error: variantError } = await viewer.supabase
      .from('project_model_variants')
      .select('id,project_id,source_run_id,artifact_version_paths,status')
      .eq('project_id', projectId)
      .eq('source_run_id', selection.sourceRunId)
      .in('status', ['published', 'historical'])
      .maybeSingle()
    if (variantError) throw variantError
    if (!variant || !(variant.artifact_version_paths ?? []).includes(selection.artifactPath)) {
      throw new Error('The selected model run is not published in the canonical registry.')
    }
    modelVariantId = variant.id
  }

  const payload = {
    user_id: viewer.userId,
    project_id: projectId,
    selected_model_variant_id: modelVariantId,
    selected_source_run_id: selection?.sourceRunId ?? null,
    selected_step_id: selection?.stepId ?? null,
    selected_step_number: selection?.stepNumber ?? null,
    selected_artifact_path: selection?.artifactPath ?? null,
    selected_artifact_sha256: selection?.artifactSha256 ?? null,
    model_updates_seen_at: seenAt,
    last_opened_at: now,
  }
  const { data, error } = await viewer.supabase
    .from('user_project_states')
    .upsert(payload, { onConflict: 'user_id,project_id' })
    .select(PROJECT_STATE_SELECT)
    .single()
  if (error) throw error
  return mapProjectState(data as unknown as RawProjectState)
}

export async function markMyForgeModelUpdatesSeen(projectId: string, sourceRunId: string) {
  assertUuid(projectId, 'Project')
  const viewer = await requireViewer()
  const { data, error } = await viewer.supabase.rpc('mark_project_model_update_seen', {
    p_project_id: projectId,
    p_source_run_id: sourceRunId,
  })
  if (error) throw error
  if (typeof data !== 'string' || !Number.isFinite(Date.parse(data))) {
    throw new Error('PathForge could not confirm the model update timestamp.')
  }
  return data
}

export async function markMyForgeForkStarted(source: ProjectForkSource) {
  const projectId = assertUuid(source.sourceProjectId, 'Project')
  const viewer = await requireViewer()
  await assertApprovedProject(viewer, projectId)
  const forkStartedAt = new Date().toISOString()
  const existing = await readRawState(viewer, projectId)
  const modelUpdatesSeenAt = await modelUpdatesBaseline(viewer, projectId, existing)
  if (
    !Number.isInteger(source.depth) ||
    source.depth < 0 ||
    source.depth > PROJECT_FORK_MAX_STORED_DEPTH
  ) {
    throw new Error('Fork depth is outside the supported range.')
  }
  if (!Number.isInteger(source.branchIndex) || source.branchIndex < 0 || source.branchIndex >= 10) {
    throw new Error('Fork branch is outside the supported range.')
  }

  const hasExactSelection = Boolean(
    source.sourceModelVariantId ||
    source.sourceRunId ||
    source.sourceArtifactPath ||
    source.sourceArtifactSha256,
  )
  let selection: CanonicalResumeSelection | null = null
  let modelVariantId: string | null = null
  let legacyStepId: string | null = null
  let legacyStepNumber: number | null = null
  if (hasExactSelection) {
    if (
      !source.sourceRunId ||
      !source.sourceStepNumber ||
      !source.sourceArtifactPath ||
      !source.sourceArtifactSha256
    ) {
      throw new Error('An exact fork needs its model run, response, artifact, and SHA-256.')
    }
    selection = canonicalResumeSelection({
      projectId,
      sourceRunId: source.sourceRunId,
      stepId: source.sourceStepId,
      stepNumber: source.sourceStepNumber,
      artifactPath: source.sourceArtifactPath,
      artifactSha256: source.sourceArtifactSha256,
    })
    const { data: variant, error: variantError } = await viewer.supabase
      .from('project_model_variants')
      .select('id,artifact_version_paths')
      .eq('project_id', projectId)
      .eq('source_run_id', selection.sourceRunId)
      .in('status', ['published', 'historical'])
      .maybeSingle()
    if (variantError) throw variantError
    if (!variant || !(variant.artifact_version_paths ?? []).includes(selection.artifactPath)) {
      throw new Error('The fork source is not part of a published model run.')
    }
    if (source.sourceModelVariantId && source.sourceModelVariantId !== variant.id) {
      throw new Error('The fork model variant differs from the canonical run.')
    }
    modelVariantId = variant.id
  } else if (source.sourceStepId || source.sourceStepNumber) {
    if (!source.sourceStepId || !source.sourceStepNumber) {
      throw new Error('A fork response needs both its response id and number.')
    }
    const { data: sourceStep, error: sourceStepError } = await viewer.supabase
      .from('prompt_steps')
      .select('id,prompt_id,step_number')
      .eq('id', source.sourceStepId)
      .eq('prompt_id', projectId)
      .eq('step_number', source.sourceStepNumber)
      .maybeSingle()
    if (sourceStepError) throw sourceStepError
    if (!sourceStep) throw new Error('The fork response is not part of this public project.')
    legacyStepId = sourceStep.id
    legacyStepNumber = sourceStep.step_number
  }

  const { error } = await viewer.supabase
    .from('user_project_states')
    .upsert({
      user_id: viewer.userId,
      project_id: projectId,
      selected_model_variant_id: modelVariantId,
      selected_source_run_id: selection?.sourceRunId ?? null,
      selected_step_id: selection?.stepId ?? null,
      selected_step_number: selection?.stepNumber ?? null,
      selected_artifact_path: selection?.artifactPath ?? null,
      selected_artifact_sha256: selection?.artifactSha256 ?? null,
      model_updates_seen_at: modelUpdatesSeenAt,
      last_opened_at: forkStartedAt,
      fork_started_at: forkStartedAt,
      fork_source_model_variant_id: modelVariantId,
      fork_source_run_id: selection?.sourceRunId ?? null,
      fork_source_step_id: selection?.stepId ?? legacyStepId,
      fork_source_step_number: selection?.stepNumber ?? legacyStepNumber,
      fork_source_artifact_path: selection?.artifactPath ?? null,
      fork_source_artifact_sha256: selection?.artifactSha256 ?? null,
      fork_parent_submission_id: source.parentForkId ?? null,
      fork_depth: source.depth,
      fork_branch_index: source.branchIndex,
      fork_prompt_family_id: source.promptFamilyId ?? null,
    }, { onConflict: 'user_id,project_id' })
  if (error) throw error
  return forkStartedAt
}

export async function removeMyForgeProjectState(projectId: string) {
  assertUuid(projectId, 'Project')
  const viewer = await requireViewer()
  const { error } = await viewer.supabase
    .from('user_project_states')
    .delete()
    .eq('user_id', viewer.userId)
    .eq('project_id', projectId)
  if (error) throw error
}

export async function getMyForgeRepairContext(
  sourceRunId: string,
): Promise<MyForgeRepairContext | null> {
  assertUuid(sourceRunId, 'Source run')
  const viewer = await requireViewer()
  const { data, error } = await viewer.supabase
    .from('source_run_submissions')
    .select([
      'id',
      'title',
      'source_url',
      'status',
      'user_status_note',
      'fork_source_project_id',
      'fork_source_project_title',
      'fork_source_model_variant_id',
      'fork_source_run_id',
      'fork_source_step_id',
      'fork_source_step_number',
      'fork_source_artifact_path',
      'fork_source_artifact_sha256',
      'fork_parent_submission_id',
      'prompt_family_id',
      'fork_depth',
      'fork_branch_index',
    ].join(','))
    .eq('id', sourceRunId)
    .eq('author_id', viewer.userId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as unknown as RawSourceRun
  if (!['needs_repair', 'failed'].includes(row.status)) {
    throw new Error('This source run is not eligible for a repair submission.')
  }

  const { data: existingRepairs, error: repairError } = await viewer.supabase
    .from('source_run_submissions')
    .select('id,status')
    .eq('author_id', viewer.userId)
    .eq('resubmission_of_id', row.id)
  if (repairError) throw repairError
  const activeRepair = (existingRepairs ?? []).find((repair) => (
    !['failed', 'declined'].includes(repair.status)
  ))
  if (activeRepair) {
    throw new Error('A repair submission is already active for this source run.')
  }

  return {
    submissionId: row.id,
    title: row.title?.trim() || 'Untitled source run',
    sourceUrl: row.source_url,
    userStatusNote: row.user_status_note,
    forkSourceProjectId: row.fork_source_project_id,
    forkSourceProjectTitle: row.fork_source_project_title,
    forkSourceModelVariantId: row.fork_source_model_variant_id,
    forkSourceRunId: row.fork_source_run_id,
    forkSourceStepId: row.fork_source_step_id,
    forkSourceStepNumber: row.fork_source_step_number,
    forkSourceArtifactPath: row.fork_source_artifact_path,
    forkSourceArtifactSha256: row.fork_source_artifact_sha256,
    forkParentSubmissionId: row.fork_parent_submission_id,
    promptFamilyId: row.prompt_family_id,
    forkDepth: row.fork_depth ?? 0,
    forkBranchIndex: row.fork_branch_index ?? 0,
  }
}
