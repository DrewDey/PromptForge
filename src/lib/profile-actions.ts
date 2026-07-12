'use server'

import { revalidatePath } from 'next/cache'
import { isPathForgeReservedProfileHandle } from '@/lib/profile-handles'

export type ProfileUpdateState = {
  success: boolean
  message?: string
  profileHref?: string
  fieldErrors?: Partial<Record<'displayName' | 'username' | 'bio', string>>
}

const USERNAME_PATTERN = /^[A-Za-z0-9_]+$/
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/

function formText(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

function normalizeSingleLine(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeBio(value: string) {
  return value.trim().replace(/\r\n?/g, '\n')
}

function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`)
}

function validateProfileInput(input: {
  displayName: string
  username: string
  bio: string
}) {
  const fieldErrors: NonNullable<ProfileUpdateState['fieldErrors']> = {}

  if (input.displayName.length < 2 || input.displayName.length > 60) {
    fieldErrors.displayName = 'Use between 2 and 60 characters.'
  } else if (CONTROL_CHARACTERS.test(input.displayName)) {
    fieldErrors.displayName = 'Remove unsupported control characters.'
  }

  if (input.username.length < 3 || input.username.length > 30) {
    fieldErrors.username = 'Use between 3 and 30 characters.'
  } else if (!USERNAME_PATTERN.test(input.username)) {
    fieldErrors.username = 'Use letters, numbers, and underscores only.'
  } else if (isPathForgeReservedProfileHandle(input.username)) {
    fieldErrors.username = 'That handle is reserved for an existing PathForge builder profile.'
  }

  if (input.bio.length > 280) {
    fieldErrors.bio = 'Keep the bio at 280 characters or fewer.'
  } else if (CONTROL_CHARACTERS.test(input.bio)) {
    fieldErrors.bio = 'Remove unsupported control characters.'
  }

  return fieldErrors
}

export async function updateProfile(
  _previousState: ProfileUpdateState,
  formData: FormData,
): Promise<ProfileUpdateState> {
  const displayName = normalizeSingleLine(formText(formData, 'display_name'))
  const username = normalizeSingleLine(formText(formData, 'username'))
  const bio = normalizeBio(formText(formData, 'bio'))
  const fieldErrors = validateProfileInput({ displayName, username, bio })

  if (Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors }
  }

  try {
    const { createClient } = await import('./supabase/server')
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return { success: false, message: 'Your session expired. Log in again before saving.' }
    }

    const { data: currentProfile, error: currentProfileError } = await supabase
      .from('profiles')
      .select('id, username')
      .eq('id', user.id)
      .maybeSingle()

    if (currentProfileError || !currentProfile) {
      return { success: false, message: 'PathForge could not load your profile.' }
    }

    const escapedUsername = escapeLikePattern(username)
    const { data: possibleConflicts, error: conflictError } = await supabase
      .from('profiles')
      .select('id, username')
      .ilike('username', escapedUsername)
      .neq('id', user.id)
      .limit(5)

    if (conflictError) {
      return { success: false, message: 'PathForge could not verify that handle. Try again.' }
    }

    const hasConflict = (possibleConflicts ?? []).some((profile) => (
      profile.username?.toLowerCase() === username.toLowerCase()
    ))
    if (hasConflict) {
      return {
        success: false,
        fieldErrors: { username: 'That handle is already in use.' },
      }
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        username,
        bio: bio || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select('username')
      .single()

    if (updateError) {
      if (updateError.code === '23505') {
        return {
          success: false,
          fieldErrors: { username: 'That handle is already in use.' },
        }
      }
      return { success: false, message: 'PathForge could not save your profile.' }
    }

    const oldUsername = currentProfile.username
    const savedUsername = updatedProfile.username || username
    if (oldUsername) revalidatePath(`/user/${oldUsername}`)
    revalidatePath(`/user/${savedUsername}`)
    revalidatePath('/settings/profile')
    revalidatePath('/my-forge')
    revalidatePath('/', 'layout')

    return {
      success: true,
      message: 'Profile updated.',
      profileHref: `/user/${savedUsername}`,
    }
  } catch {
    return { success: false, message: 'PathForge could not save your profile.' }
  }
}
