'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { updatePromptStatus } from './data'

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
