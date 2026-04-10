'use server'

import { revalidatePath } from 'next/cache'
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
