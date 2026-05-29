'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  approveSuggestionById,
  createBuildRequest,
  createBuildRequestResponse,
  createDraftProjectFromSourceRun,
  createProject,
  createSourceRunSubmission,
  createSuggestion,
  createSuggestionResponse,
  declineSuggestionById,
  keepSuggestionPrivateById,
  toggleBuildRequestVote,
  toggleBookmark,
  toggleSuggestionVote,
  toggleVote,
  updatePromptStatus,
  updateSourceRunStatusById,
  updateSuggestionPublicStatusById,
} from './data'
import type { SuggestionPublicStatus, SuggestionResponseVisibility } from './types'

export type SuggestionSubmitState = {
  error: string | null
}

export type BuildRequestSubmitState = {
  error: string | null
}

export type SourceRunSubmitResult = {
  success: boolean
  id?: string
  error?: string
}

export type SourceRunDraftState = {
  error: string | null
  promptUrl?: string
}

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function splitList(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseDraftSteps(formData: FormData) {
  const titles = formData.getAll('step_title').map((value) => String(value).trim())
  const prompts = formData.getAll('step_content').map((value) => String(value).trim())
  const responses = formData.getAll('step_result_content').map((value) => String(value).trim())
  const descriptions = formData.getAll('step_description').map((value) => String(value).trim())
  const count = Math.max(titles.length, prompts.length, responses.length, descriptions.length)

  return Array.from({ length: count }, (_, index) => ({
    title: titles[index] ?? '',
    content: prompts[index] ?? '',
    result_content: responses[index] ?? '',
    description: descriptions[index] ?? '',
  })).filter((step) => step.title || step.content || step.result_content || step.description)
}

export async function approvePrompt(id: string) {
  await updatePromptStatus(id, 'approved')
  revalidatePath('/admin')
  revalidatePath('/browse')
  revalidatePath('/paths')
  revalidatePath('/')
}

export async function rejectPrompt(id: string) {
  await updatePromptStatus(id, 'rejected')
  revalidatePath('/admin')
}

export async function logout() {
  const { createClient } = await import('./supabase/server')
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function voteOnProject(promptId: string) {
  try {
    const result = await toggleVote(promptId)
    revalidatePath(`/prompt/${promptId}`)
    revalidatePath('/browse')
    revalidatePath('/paths')
    revalidatePath('/')
    return result
  } catch {
    return { voted: false, newCount: 0 }
  }
}

export async function bookmarkProject(promptId: string) {
  try {
    const result = await toggleBookmark(promptId)
    revalidatePath(`/prompt/${promptId}`)
    return result
  } catch {
    return { bookmarked: false, newCount: 0 }
  }
}

export async function submitProject(data: {
  title: string
  description: string
  content: string
  result_content: string
  category_slug: string
  difficulty: string
  model_used: string
  model_recommendation: string
  tools_used: string[]
  tags: string[]
  steps: { title: string; content: string; result_content: string; description: string }[]
}) {
  try {
    const result = await createProject({
      ...data,
      result_content: data.result_content || null,
      model_used: data.model_used || null,
      model_recommendation: data.model_recommendation || null,
      steps: data.steps.map(s => ({
        ...s,
        result_content: s.result_content || null,
        description: s.description || null,
      })),
    })
    revalidatePath('/admin')
    return { success: true, id: result.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to submit project' }
  }
}

export async function submitSourceRun(data: {
  title?: string
  source_url?: string
  notes?: string
}): Promise<SourceRunSubmitResult> {
  try {
    const result = await createSourceRunSubmission(data)
    revalidatePath('/admin')
    return { success: true, id: result.id }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to submit source run' }
  }
}

export async function dismissSourceRun(formData: FormData) {
  const id = String(formData.get('source_run_id') ?? '')
  if (!id) return

  await updateSourceRunStatusById(
    id,
    'failed',
    'Dismissed from admin pending review. This intake should not be drafted.'
  )
  revalidatePath('/admin')
  revalidatePath(`/admin/source-runs/${id}`)
}

export async function createDraftFromSourceRun(
  _prevState: SourceRunDraftState,
  formData: FormData
): Promise<SourceRunDraftState> {
  const sourceRunId = formString(formData, 'source_run_id')

  try {
    const result = await createDraftProjectFromSourceRun({
      source_run_id: sourceRunId,
      title: formString(formData, 'title'),
      description: formString(formData, 'description'),
      content: formString(formData, 'content'),
      result_content: formString(formData, 'result_content'),
      category_slug: formString(formData, 'category_slug'),
      difficulty: formString(formData, 'difficulty'),
      model_used: formString(formData, 'model_used'),
      model_recommendation: formString(formData, 'model_recommendation'),
      tools_used: splitList(formString(formData, 'tools_used')),
      tags: splitList(formString(formData, 'tags')),
      steps: parseDraftSteps(formData),
    })

    revalidatePath('/admin')
    revalidatePath(`/admin/source-runs/${sourceRunId}`)
    revalidatePath(`/prompt/${result.id}`)
    return { error: null, promptUrl: `/prompt/${result.id}` }
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Failed to create source-run draft',
    }
  }
}

export async function submitSuggestion(
  _prevState: SuggestionSubmitState,
  formData: FormData
): Promise<SuggestionSubmitState> {
  try {
    await createSuggestion({
      title: String(formData.get('title') ?? ''),
      body: String(formData.get('body') ?? ''),
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to send suggestion' }
  }

  revalidatePath('/suggestion-box')
  revalidatePath('/suggestion-box/mine')
  revalidatePath('/admin')
  redirect('/suggestion-box/mine?submitted=1')
}

export async function approveSuggestion(id: string) {
  await approveSuggestionById(id)
  revalidatePath('/admin')
  revalidatePath('/suggestion-box')
  revalidatePath('/suggestion-box/mine')
}

export async function declineSuggestion(id: string) {
  await declineSuggestionById(id)
  revalidatePath('/admin')
  revalidatePath('/suggestion-box/mine')
}

export async function keepSuggestionPrivate(formData: FormData) {
  const id = String(formData.get('suggestion_id') ?? '')
  if (id) await keepSuggestionPrivateById(id)
  revalidatePath('/suggestion-box')
  revalidatePath('/suggestion-box/mine')
}

export async function updateSuggestionPublicStatus(formData: FormData) {
  const id = String(formData.get('suggestion_id') ?? '')
  const status = String(formData.get('public_status') ?? 'under_review') as SuggestionPublicStatus
  if (id) await updateSuggestionPublicStatusById(id, status)
  revalidatePath('/admin')
  revalidatePath('/suggestion-box')
  revalidatePath('/suggestion-box/mine')
}

export async function respondToSuggestion(formData: FormData) {
  const suggestionId = String(formData.get('suggestion_id') ?? '')
  const body = String(formData.get('body') ?? '')
  const visibility = String(formData.get('visibility') ?? 'submitter') as SuggestionResponseVisibility
  if (suggestionId) {
    await createSuggestionResponse({ suggestionId, body, visibility })
  }
  revalidatePath('/admin')
  revalidatePath('/suggestion-box')
  revalidatePath('/suggestion-box/mine')
}

export async function voteOnSuggestion(formData: FormData) {
  const suggestionId = String(formData.get('suggestion_id') ?? '')
  if (suggestionId) await toggleSuggestionVote(suggestionId)
  revalidatePath('/suggestion-box')
}

export async function submitBuildRequest(
  _prevState: BuildRequestSubmitState,
  formData: FormData
): Promise<BuildRequestSubmitState> {
  try {
    await createBuildRequest({
      title: String(formData.get('title') ?? ''),
      body: String(formData.get('body') ?? ''),
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to send build request' }
  }

  revalidatePath('/requests')
  redirect('/requests?submitted=1')
}

export async function respondToBuildRequest(formData: FormData) {
  const requestId = String(formData.get('request_id') ?? '')
  if (!requestId) return

  await createBuildRequestResponse({
    requestId,
    body: String(formData.get('body') ?? ''),
    url: String(formData.get('url') ?? ''),
  })

  revalidatePath('/requests')
}

export async function voteOnBuildRequest(formData: FormData) {
  const requestId = String(formData.get('request_id') ?? '')
  if (requestId) await toggleBuildRequestVote(requestId)
  revalidatePath('/requests')
}
