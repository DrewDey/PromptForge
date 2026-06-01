'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  approveSuggestionById,
  createBuildRequest,
  createBuildRequestResponse,
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
    return { voted: false, newCount: 0, error: 'Could not save vote.' }
  }
}

export async function bookmarkProject(promptId: string) {
  try {
    const result = await toggleBookmark(promptId)
    revalidatePath(`/prompt/${promptId}`)
    return result
  } catch {
    return { bookmarked: false, newCount: 0, error: 'Could not save bookmark.' }
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
