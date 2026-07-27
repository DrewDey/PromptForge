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
import { isSupportedCommunitySourceUrl } from '../community-project-contract'
import {
  assertAuthoritativePreparedLegacyProfileBinding,
  assertPreparedLegacyPackageBinding,
} from '../prepared-legacy-source-runs.mjs'
import { sourceRunForkColumnsMissing } from './fork-column-compat'
import { requireAdminAccess, SUPABASE_CONFIGURED } from './shared'
import { createAdminClient } from '../supabase/admin'
import { randomUUID } from 'node:crypto'

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

export async function createSourceRunSubmission(input: {
  title?: string
  source_url?: string
  provider?: string
  model_used?: string
  model_settings?: string
  notes?: string
  fork_source?: ProjectForkSource | null
  resubmission_of_id?: string | null
  privacy_attested?: boolean
  queue_only_attested?: boolean
  source_publication_attested?: boolean
}) {
  if (!SUPABASE_CONFIGURED) throw new Error('Source run intake requires sign in.')

  const { createClient } = await import('../supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Log in to submit a source run.')

  const title = input.title?.trim() ?? ''
  const sourceUrl = input.source_url?.trim() ?? ''
  const detectedProvider = detectSourceRunProvider(sourceUrl)
  const provider = input.provider?.trim() || detectedProvider
  const modelUsed = input.model_used?.trim() ?? ''
  const modelSettings = input.model_settings?.trim() ?? ''

  if (!title) {
    throw new Error('Add a title for this source run.')
  }

  if (!sourceUrl) {
    throw new Error('Paste a source run link.')
  }

  if (!isSupportedCommunitySourceUrl(sourceUrl)) {
    throw new Error(
      'Use a public ChatGPT, Claude, or Gemini share link without a query string or fragment. Private conversation URLs are not accepted.',
    )
  }

  if (!detectedProvider || provider !== detectedProvider) {
    throw new Error('The AI service must match the submitted public share link.')
  }

  if (!modelUsed) {
    throw new Error('Add the exact model shown for this source run, or type Not sure.')
  }

  if (!input.privacy_attested || !input.queue_only_attested || !input.source_publication_attested) {
    throw new Error('Confirm the privacy, public-link permission, and queue-only review statements before submitting.')
  }

  const resubmissionOfId = input.resubmission_of_id?.trim() || null
  const sourcePublicationConsentAt = new Date().toISOString()
  const attestation = [
    'PathForge queue-only intake attestations:',
    '- The builder confirmed the provider link may be shared with PathForge review.',
    '- The builder confirmed the notes were checked for secrets and personal information.',
    '- The builder explicitly authorized the exact public share link to appear on an approved public showcase.',
    '- The builder confirmed this creates a private review record and does not publish automatically.',
    `- Recorded ${sourcePublicationConsentAt}.`,
  ].join('\n')
  const notes = composeSourceRunReviewNotes({
    sourceUrl,
    provider,
    modelUsed,
    modelSettings,
    notes: [input.notes?.trim(), attestation].filter(Boolean).join('\n\n'),
  })

  if (resubmissionOfId) {
    // Do not accept lineage from this request. The database locks the owned
    // prior record and copies its complete fork tuple into the append-only
    // repair.
    const { data, error } = await createAdminClient().rpc('create_legacy_source_run_repair', {
      target_submission: resubmissionOfId,
      actor: user.id,
      repair_title: title,
      repair_source_url: sourceUrl,
      repair_notes: notes || null,
      repair_source_visibility: 'public',
      repair_source_publication_consent_at: sourcePublicationConsentAt,
      correlation: randomUUID(),
    })
    throwReadableSourceRunError(error)
    return { id: String(data) }
  }

  const forkFields = projectForkSourceToSubmissionFields(input.fork_source)
  const { data, error } = await supabase
    .from('source_run_submissions')
    .insert({
      title,
      source_url: sourceUrl,
      source_visibility: 'public',
      source_publication_consent_at: sourcePublicationConsentAt,
      file_name: null,
      notes,
      ...forkFields,
      resubmission_of_id: null,
      author_id: user.id,
      status: 'queued',
    })
    .select('id')
    .single()

  if (sourceRunForkColumnsMissing(error) && input.fork_source) {
    throw new Error(
      'This fork intake is unavailable because the database is missing durable lineage columns. No unlinked submission was created.',
    )
  }
  throwReadableSourceRunError(error)
  if (!data?.id) throw new Error('PathForge did not confirm the private review record.')
  return { id: String(data.id) }
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
  options?: {
    adminNotes?: string
    userStatusNote?: string
  },
) {
  const { supabase } = await requireAdminAccess()
  const patch: {
    status: SourceRunSubmissionStatus
    admin_notes?: string
    user_status_note?: string
    updated_at: string
  } = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (options?.adminNotes?.trim()) patch.admin_notes = options.adminNotes.trim()
  if (options?.userStatusNote?.trim()) patch.user_status_note = options.userStatusNote.trim()

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
    .select('id, author_id, status, title, source_url, source_visibility, source_publication_consent_at, canonical_source_url, file_name, notes, source_package_file, source_package_sha256, intake_evidence, fork_source_project_id, fork_source_project_title, fork_source_model_variant_id, fork_source_run_id, fork_source_step_id, fork_source_step_number, fork_source_artifact_path, fork_source_artifact_sha256, fork_parent_submission_id, prompt_family_id, fork_depth, fork_branch_index')
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
  const preparedBinding = assertPreparedLegacyPackageBinding(
    packageEvidence.sourceRunPackage,
  )
  // Ordinary intake still carries consent on its source row. Exact legacy
  // packages intentionally remain review_only: the atomic RPC below is the
  // authoritative gate for their separately consented, anonymously verified
  // source_run_id + project_id public-share registration.
  if (
    !preparedBinding &&
    (
      sourceRun.source_visibility !== 'public' ||
      !sourceRun.source_publication_consent_at
    )
  ) {
    throw new Error(
      'Ordinary prepared publish requires explicit consent to display the public provider share link.',
    )
  }
  if (preparedBinding) {
    if (
      preparedBinding.projectId !== project.id ||
      preparedBinding.sourceRunId !== sourceRunId
    ) {
      throw new Error(
        'Prepared publish blocked: package project and source-run binding differs from the prepared registry.',
      )
    }
    if (
      preparedBinding.username !== project.authorUsername ||
      preparedBinding.displayName !== project.authorDisplayName
    ) {
      throw new Error(
        'Prepared publish blocked: package seed profile differs from the prepared byline.',
      )
    }
    const { data: authorRows, error: authorBindingError } = await supabase.rpc(
      'check_prepared_legacy_seed_profile_binding',
      {
        target_profile_id: sourceRun.author_id,
        expected_username: preparedBinding.username,
        expected_display_name: preparedBinding.displayName,
      },
    )
    throwReadableSourceRunError(authorBindingError)
    const authorProfile = Array.isArray(authorRows) ? authorRows[0] : authorRows
    if (!authorProfile || authorProfile.profile_id !== sourceRun.author_id) {
      throw new Error(
        'Prepared publish blocked: intake author lacks its confirmed private seed-operator binding.',
      )
    }
    assertAuthoritativePreparedLegacyProfileBinding(
      preparedBinding,
      authorProfile,
    )
  }
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
