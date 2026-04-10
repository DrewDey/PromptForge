'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { updatePromptStatus, createProject, toggleVote, toggleBookmark } from './data'

export async function approvePrompt(id: string) {
  await updatePromptStatus(id, 'approved')
  revalidatePath('/admin')
  revalidatePath('/browse')
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
