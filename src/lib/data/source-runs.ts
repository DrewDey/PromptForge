import type {
  SourceRunSubmissionStatus,
  SourceRunSubmissionWithRelations,
} from '../types'
import type { PreparedShowcaseProject } from '../prepared-showcase-projects'
import {
  projectForkSourceFromSubmissionFields,
  projectForkSourceToSubmissionFields,
  type ProjectForkSource,
} from '../project-forks'
import {
  buildSourceRunIntakeEvidence,
  canonicalizeSourceRunUrl,
  canonicalSourceRunForkEvidence,
  findSourceRunPackageFileById,
  loadSourceRunPackagePublicationEvidence,
  sourceRunEvidenceEquals,
} from '../source-run-package'
import { composeSourceRunReviewNotes, detectSourceRunProvider } from '../source-run-review'
import { sourceRunForkColumnsMissing } from './fork-column-compat'
import { requireAdminAccess, SUPABASE_CONFIGURED } from './shared'

function throwReadableSourceRunError(error: { code?: string; message?: string } | null) {
  if (!error) return

  if (
    error.code === '42P01' ||
    error.message?.includes('source_run_submissions')
  ) {
    throw new Error('Source run intake is not connected to the database yet.')
  }

  throw error
}

function titleColumnMissing(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? ''
  return Boolean(
    error &&
    (
      error.code === '42703' ||
      error.code === 'PGRST204'
    ) &&
    message.includes('title') &&
    message.includes('source_run_submissions')
  )
}

export async function createSourceRunSubmission(input: {
  title?: string
  source_url?: string
  provider?: string
  model_used?: string
  model_settings?: string
  notes?: string
  fork_source?: ProjectForkSource | null
}) {
  if (!SUPABASE_CONFIGURED) throw new Error('Source run intake requires sign in.')

  const { createClient } = await import('../supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Log in to submit a source run.')

  const title = input.title?.trim() ?? ''
  const sourceUrl = input.source_url?.trim() ?? ''
  const provider = input.provider?.trim() || detectSourceRunProvider(sourceUrl)
  const modelUsed = input.model_used?.trim() ?? ''
  const modelSettings = input.model_settings?.trim() ?? ''

  if (!title) {
    throw new Error('Add a title for this source run.')
  }

  if (!sourceUrl) {
    throw new Error('Paste a source run link.')
  }

  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) {
    throw new Error('Paste a full source run URL starting with http:// or https://.')
  }

  if (!provider) {
    throw new Error('Pick the AI service for this source run.')
  }

  if (!modelUsed) {
    throw new Error('Add the exact model shown for this source run, or type Not sure.')
  }

  const notes = composeSourceRunReviewNotes({
    sourceUrl,
    provider,
    modelUsed,
    modelSettings,
    notes: input.notes,
  })
  const forkFields = projectForkSourceToSubmissionFields(input.fork_source)

  const payload = {
    title,
    source_url: sourceUrl || null,
    file_name: null,
    notes,
    ...forkFields,
    author_id: user.id,
    status: 'queued',
  }

  const { data, error } = await supabase
    .from('source_run_submissions')
    .insert(payload)
    .select('id')
    .single()

  if (sourceRunForkColumnsMissing(error) && input.fork_source) {
    throw new Error(
      'Fork intake is unavailable because the database is missing durable fork-lineage columns. No unlinked submission was created.',
    )
  }

  if (titleColumnMissing(error) || sourceRunForkColumnsMissing(error)) {
    const fallbackNotes = titleColumnMissing(error)
      ? [`Title: ${title}`, notes].filter(Boolean).join('\n\n') || null
      : notes
    const fallbackPayload = titleColumnMissing(error)
      ? {
        source_url: sourceUrl || null,
        file_name: null,
        notes: fallbackNotes,
        author_id: user.id,
        status: 'queued',
      }
      : {
        title,
        source_url: sourceUrl || null,
        file_name: null,
        notes: fallbackNotes,
        author_id: user.id,
        status: 'queued',
      }
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('source_run_submissions')
      .insert(fallbackPayload)
      .select('id')
      .single()

    throwReadableSourceRunError(fallbackError)
    return { id: fallbackData?.id as string }
  }

  throwReadableSourceRunError(error)
  return { id: data?.id as string }
}

export async function getSourceRunSubmissionForAdmin(id: string): Promise<SourceRunSubmissionWithRelations | null> {
  if (!SUPABASE_CONFIGURED) return null

  try {
    const { supabase } = await requireAdminAccess()
    const { data, error } = await supabase
      .from('source_run_submissions')
      .select('*, author:profiles(*), extracted_prompt:prompts(*)')
      .eq('id', id)
      .maybeSingle()

    throwReadableSourceRunError(error)
    return data as SourceRunSubmissionWithRelations | null
  } catch (error) {
    if (error instanceof Error && error.message.includes('Source run intake is not connected')) {
      return null
    }
    throw error
  }
}

export async function getSourceRunSubmissionByPromptIdForAdmin(promptId: string): Promise<SourceRunSubmissionWithRelations | null> {
  if (!SUPABASE_CONFIGURED) return null

  try {
    const { supabase } = await requireAdminAccess()
    const { data, error } = await supabase
      .from('source_run_submissions')
      .select('*, author:profiles(*), extracted_prompt:prompts(*)')
      .eq('extracted_prompt_id', promptId)
      .maybeSingle()

    throwReadableSourceRunError(error)
    return data as SourceRunSubmissionWithRelations | null
  } catch (error) {
    if (
      error instanceof Error &&
      (
        error.message.includes('Source run intake is not connected') ||
        error.message.includes('Admin access required')
      )
    ) {
      return null
    }
    throw error
  }
}

export async function updateSourceRunStatusById(
  id: string,
  status: SourceRunSubmissionStatus,
  adminNotes?: string
) {
  const { supabase } = await requireAdminAccess()
  const patch: {
    status: SourceRunSubmissionStatus
    admin_notes?: string
    updated_at: string
  } = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (adminNotes?.trim()) patch.admin_notes = adminNotes.trim()

  const { error } = await supabase
    .from('source_run_submissions')
    .update(patch)
    .eq('id', id)

  throwReadableSourceRunError(error)
}

function sourceRunIntegrityColumnsMissing(error: { code?: string; message?: string } | null) {
  const message = error?.message?.toLowerCase() ?? ''
  return Boolean(
    error &&
    ['42703', 'PGRST204'].includes(error.code ?? '') &&
    (
      message.includes('canonical_source_url') ||
      message.includes('source_package_file') ||
      message.includes('source_package_sha256') ||
      message.includes('intake_evidence')
    )
  )
}

function preparedPublishRpcMissing(error: { code?: string; message?: string } | null) {
  if (!error) return false
  const message = error.message?.toLowerCase() ?? ''
  return (
    ['42883', 'PGRST202'].includes(error.code ?? '') &&
    message.includes('publish_prepared_showcase_source_run')
  )
}

async function resolvePublishedForkSource(
  supabase: Awaited<ReturnType<typeof requireAdminAccess>>['supabase'],
  source?: ProjectForkSource | null,
) {
  if (!source?.sourceProjectId) return null
  if (!source.sourceRunId) return source
  if (!source.sourceStepId || !source.sourceStepNumber) {
    throw new Error('Variant-aware fork publishing requires exact step id and step number.')
  }
  if (
    source.sourceStepId !==
    `${source.sourceProjectId}:${source.sourceRunId}:step:${source.sourceStepNumber}`
  ) {
    throw new Error('Variant-aware fork step identity does not match its project, run, and number.')
  }

  const { data: sourceVariant, error: sourceVariantError } = await supabase
    .from('project_model_variants')
    .select('id, project_id, source_run_id, artifact_version_paths')
    .eq('project_id', source.sourceProjectId)
    .eq('source_run_id', source.sourceRunId)
    .maybeSingle()

  if (sourceVariantError) throw sourceVariantError
  if (!sourceVariant) {
    throw new Error('Fork source model run is not published for the selected canonical project.')
  }
  if (source.sourceModelVariantId && source.sourceModelVariantId !== sourceVariant.id) {
    throw new Error('Fork source model variant does not match the selected canonical run.')
  }
  if (
    !source.sourceArtifactPath ||
    !(sourceVariant.artifact_version_paths ?? []).includes(source.sourceArtifactPath)
  ) {
    throw new Error('Fork source artifact does not belong to the selected model run.')
  }

  return {
    ...source,
    sourceModelVariantId: sourceVariant.id,
  }
}

function assertExactForkTuple(
  intakeFork: ProjectForkSource | null,
  preparedFork: ProjectForkSource | null,
  packageFork: ProjectForkSource | null,
) {
  const intakeEvidence = canonicalSourceRunForkEvidence(intakeFork)
  const preparedEvidence = canonicalSourceRunForkEvidence(preparedFork)
  const packageEvidence = canonicalSourceRunForkEvidence(packageFork)
  if (
    !sourceRunEvidenceEquals(intakeEvidence, preparedEvidence) ||
    !sourceRunEvidenceEquals(intakeEvidence, packageEvidence)
  ) {
    throw new Error(
      'Prepared publish blocked: intake, prepared project, and source package fork tuples are not identical.',
    )
  }
  return intakeEvidence
}

export async function publishPreparedShowcaseProjectFromSourceRun(
  sourceRunId: string,
  project: PreparedShowcaseProject
) {
  if (sourceRunId !== project.sourceRunId) {
    throw new Error('Prepared project does not match this source run.')
  }

  const { supabase } = await requireAdminAccess()
  const { data: sourceRun, error: sourceRunError } = await supabase
    .from('source_run_submissions')
    .select('id, author_id, status, title, source_url, canonical_source_url, file_name, notes, source_package_file, source_package_sha256, intake_evidence, fork_source_project_id, fork_source_project_title, fork_source_model_variant_id, fork_source_run_id, fork_source_step_id, fork_source_step_number, fork_source_artifact_path, fork_source_artifact_sha256, fork_parent_submission_id, prompt_family_id, fork_depth, fork_branch_index')
    .eq('id', sourceRunId)
    .maybeSingle()

  if (sourceRunIntegrityColumnsMissing(sourceRunError)) {
    throw new Error(
      'Prepared publishing is unavailable because immutable intake evidence columns are missing.',
    )
  }
  if (sourceRunForkColumnsMissing(sourceRunError)) {
    throw new Error(
      'Prepared publishing is unavailable because durable fork-lineage columns are missing.',
    )
  }

  throwReadableSourceRunError(sourceRunError)
  if (!sourceRun) throw new Error('Source run not found.')
  if (!['queued', 'draft_created'].includes(sourceRun.status)) {
    throw new Error(
      `Prepared publish requires a queued intake or exact published replay; current status is ${sourceRun.status}.`,
    )
  }

  const sourcePackageFile = project.sourceRunPackageFile
    ?? findSourceRunPackageFileById(sourceRunId)
  if (!sourcePackageFile) {
    throw new Error('Prepared publish requires an immutable source-run package file.')
  }
  const packageEvidence = loadSourceRunPackagePublicationEvidence(sourcePackageFile)
  const packageSourceRunId = packageEvidence.sourceRunPackage.source_run_id
    ?? packageEvidence.sourceRunPackage.source_run_submission_id
  if (packageSourceRunId !== sourceRunId) {
    throw new Error('Prepared project source run does not match its immutable package identity.')
  }

  const intakeFork = await resolvePublishedForkSource(
    supabase,
    projectForkSourceFromSubmissionFields(sourceRun),
  )
  const preparedFork = await resolvePublishedForkSource(supabase, project.forkSource ?? null)
  const packageFork = await resolvePublishedForkSource(
    supabase,
    packageEvidence.sourceRunPackage.fork_source ?? null,
  )
  const expectedFork = assertExactForkTuple(intakeFork, preparedFork, packageFork)
  const sourceFork = intakeFork

  const expectedEvidence = buildSourceRunIntakeEvidence({
    sourceRunPackage: packageEvidence.sourceRunPackage,
    forkSource: sourceFork,
  })
  const packageSourceUrl = packageEvidence.sourceRunPackage.source_url?.trim()
  if (!packageSourceUrl) {
    throw new Error('Prepared publish package is missing its source URL.')
  }
  const canonicalPackageSourceUrl = canonicalizeSourceRunUrl(packageSourceUrl)
  if (sourceRun.title !== packageEvidence.sourceRunPackage.title?.trim()) {
    throw new Error('Prepared publish blocked: intake title differs from its source package.')
  }
  if (
    sourceRun.source_url !== packageSourceUrl ||
    sourceRun.canonical_source_url !== canonicalPackageSourceUrl
  ) {
    throw new Error('Prepared publish blocked: source URL identity differs from its package.')
  }
  if (sourceRun.file_name !== null) {
    throw new Error('Prepared publish blocked: package intake unexpectedly has an uploaded file.')
  }
  if (sourceRun.source_package_file !== packageEvidence.sourcePackageFile) {
    throw new Error('Prepared publish blocked: source package file identity changed after intake.')
  }
  if (sourceRun.source_package_sha256 !== packageEvidence.sourcePackageSha256) {
    throw new Error('Prepared publish blocked: source package SHA-256 changed after intake.')
  }
  if (!sourceRunEvidenceEquals(sourceRun.intake_evidence, expectedEvidence)) {
    throw new Error('Prepared publish blocked: immutable intake evidence no longer matches the package.')
  }
  const expectedIntake = {
    author_id: sourceRun.author_id,
    title: sourceRun.title,
    source_url: sourceRun.source_url,
    canonical_source_url: sourceRun.canonical_source_url,
    file_name: sourceRun.file_name,
    notes: sourceRun.notes,
    source_package_file: sourceRun.source_package_file,
    source_package_sha256: sourceRun.source_package_sha256,
    intake_evidence: expectedEvidence,
  }

  const projectPayload = {
    id: project.id,
    title: project.title,
    description: project.description,
    content: project.content,
    result_content: project.resultContent,
    category_slug: project.categorySlug,
    difficulty: project.difficulty,
    model_used: project.modelUsed,
    model_recommendation: project.modelRecommendation,
    tools_used: project.toolsUsed,
    tags: project.tags,
    created_at: project.createdAt,
    public_href: project.href,
  }
  const { error: atomicPublishError } = await supabase.rpc(
    'publish_prepared_showcase_source_run',
    {
      target_source_run_id: sourceRunId,
      expected_intake: expectedIntake,
      expected_fork: expectedFork,
      project_payload: projectPayload,
    },
  )
  if (!atomicPublishError) return
  if (preparedPublishRpcMissing(atomicPublishError)) {
    throw new Error(
      'Prepared publishing requires the atomic database function. Apply the checked source-run integrity migration first.',
    )
  }
  throw atomicPublishError
}

export async function getAllSourceRunSubmissionsForAdmin(): Promise<SourceRunSubmissionWithRelations[]> {
  if (!SUPABASE_CONFIGURED) return []

  try {
    const { supabase } = await requireAdminAccess()
    const { data, error } = await supabase
      .from('source_run_submissions')
      .select('*, author:profiles(*), extracted_prompt:prompts(*)')
      .order('created_at', { ascending: false })

    throwReadableSourceRunError(error)
    return (data ?? []) as SourceRunSubmissionWithRelations[]
  } catch (error) {
    if (error instanceof Error && error.message.includes('Source run intake is not connected')) {
      return []
    }
    throw error
  }
}
