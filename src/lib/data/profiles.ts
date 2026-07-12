import type { User } from '@supabase/supabase-js'
import type { Profile } from '../types'
import { SUPABASE_CONFIGURED } from './shared'

export type AuthenticatedProfile = {
  user: User | null
  profile: Profile | null
}

export async function getAuthenticatedUserId(): Promise<string | null> {
  if (!SUPABASE_CONFIGURED) return null

  try {
    const { createClient } = await import('../supabase/server')
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    return error ? null : user?.id ?? null
  } catch {
    return null
  }
}

/**
 * Reads the current identity from Supabase Auth on the server. `getUser()` is
 * deliberate: settings and owner controls should use a freshly validated user,
 * not an unverified session payload or client-supplied profile id.
 */
export async function getAuthenticatedProfile(): Promise<AuthenticatedProfile> {
  if (!SUPABASE_CONFIGURED) return { user: null, profile: null }

  try {
    const { createClient } = await import('../supabase/server')
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) return { user: null, profile: null }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) return { user, profile: null }
    return { user, profile: profile as Profile | null }
  } catch {
    return { user: null, profile: null }
  }
}
