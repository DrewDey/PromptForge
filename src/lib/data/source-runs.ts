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
import { composeSourceRunReviewNotes, detectSourceRunProvider } from '../source-run-review'
import { forkColumnsMissing, omitForkFields, sourceRunForkColumnsMissing } from './fork-column-compat'
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

export async function publishPreparedShowcaseProjectFromSourceRun(
  sourceRunId: string,
  project: PreparedShowcaseProject
) {
  if (sourceRunId !== project.sourceRunId) {
    throw new Error('Prepared project does not match this source run.')
  }

  const { supabase, user } = await requireAdminAccess()
  let { data: sourceRun, error: sourceRunError } = await supabase
    .from('source_run_submissions')
    .select('id, author_id, fork_source_project_id, fork_source_project_title, fork_source_step_id, fork_source_step_number, fork_parent_submission_id, prompt_family_id, fork_depth, fork_branch_index')
    .eq('id', sourceRunId)
    .maybeSingle()

  if (sourceRunForkColumnsMissing(sourceRunError)) {
    const fallbackResult = await supabase
      .from('source_run_submissions')
      .select('id, author_id')
      .eq('id', sourceRunId)
      .maybeSingle()
    sourceRun = fallbackResult.data ? {
      ...fallbackResult.data,
      fork_source_project_id: null,
      fork_source_project_title: null,
      fork_source_step_id: null,
      fork_source_step_number: null,
      fork_parent_submission_id: null,
      prompt_family_id: null,
      fork_depth: null,
      fork_branch_index: null,
    } : null
    sourceRunError = fallbackResult.error
  }

  throwReadableSourceRunError(sourceRunError)
  if (!sourceRun) throw new Error('Source run not found.')
  const sourceForkFields = projectForkSourceToSubmissionFields(projectForkSourceFromSubmissionFields(sourceRun))

  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', project.categorySlug)
    .maybeSingle()

  if (categoryError) throw categoryError
  if (!category) throw new Error(`Category not found: ${project.categorySlug}.`)

  const promptPatch = {
    title: project.title,
    description: project.description,
    content: project.content,
    result_content: project.resultContent,
    category_id: category.id as string,
    difficulty: project.difficulty,
    model_used: project.modelUsed,
    model_recommendation: project.modelRecommendation,
    tools_used: project.toolsUsed,
    tags: project.tags,
    status: 'approved',
    ...sourceForkFields,
    updated_at: new Date().toISOString(),
  }

  const { data: existingPrompt, error: existingPromptError } = await supabase
    .from('prompts')
    .select('id')
    .eq('id', project.id)
    .maybeSingle()

  if (existingPromptError) throw existingPromptError

  if (!existingPrompt) {
    const insertPayload = {
      id: project.id,
      ...promptPatch,
      author_id: user.id,
      vote_count: 0,
      bookmark_count: 0,
      created_at: project.createdAt,
    }
    const { error: insertError } = await supabase
      .from('prompts')
      .insert(insertPayload)

    if (insertError) {
      if (!forkColumnsMissing(insertError)) throw insertError

      const { error: fallbackInsertError } = await supabase
        .from('prompts')
        .insert(omitForkFields(insertPayload))
      if (fallbackInsertError) throw fallbackInsertError
    }
  }

  const updatePayload = {
    ...promptPatch,
    author_id: sourceRun.author_id,
  }
  const { error: updatePromptError } = await supabase
    .from('prompts')
    .update(updatePayload)
    .eq('id', project.id)

  if (updatePromptError) {
    if (!forkColumnsMissing(updatePromptError)) throw updatePromptError

    const { error: fallbackUpdateError } = await supabase
      .from('prompts')
      .update(omitForkFields(updatePayload))
      .eq('id', project.id)
    if (fallbackUpdateError) throw fallbackUpdateError
  }

  const { error: updateSourceRunError } = await supabase
    .from('source_run_submissions')
    .update({
      status: 'draft_created',
      extracted_prompt_id: project.id,
      admin_notes: `Published to ${project.href}.`,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceRunId)

  throwReadableSourceRunError(updateSourceRunError)
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
