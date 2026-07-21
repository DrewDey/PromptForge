export const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const SUPABASE_PUBLIC_READS_ENABLED =
  SUPABASE_CONFIGURED && process.env.PATHFORGE_ENABLE_SUPABASE_READS !== 'false'

export const SUPABASE_READ_TIMEOUT_MS = 3000

export async function readWithFallback<T>(
  fallback: T,
  read: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  if (!SUPABASE_PUBLIC_READS_ENABLED) return fallback

  const controller = new AbortController()
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      read(controller.signal),
      new Promise<T>((resolve) => {
        timeout = setTimeout(() => {
          resolve(fallback)
          controller.abort()
        }, SUPABASE_READ_TIMEOUT_MS)
      }),
    ])
  } catch {
    return fallback
  } finally {
    if (timeout) clearTimeout(timeout)
    if (!controller.signal.aborted) controller.abort()
  }
}

export async function requireAdminAccess() {
  if (!SUPABASE_CONFIGURED) throw new Error('Admin access requires Supabase.')

  const { createClient } = await import('../supabase/server')
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) throw new Error('Log in as an admin.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || profile?.role !== 'admin') {
    throw new Error('Admin access required.')
  }

  return { supabase, user }
}
