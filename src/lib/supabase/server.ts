import { createServerClient as createSSRClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

async function createCookieBackedClient() {
  const cookieStore = await cookies()

  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll is called from Server Components where cookies can't be set.
            // This can be ignored if middleware is refreshing sessions.
          }
        },
      },
    }
  )
}

export async function createClient() {
  return createCookieBackedClient()
}

// Public reads have checked local fallbacks. Retrying a degraded Data API after
// the fallback deadline only consumes pool capacity without improving the page.
// supabase-js does not expose PostgREST retry policy at the client level, so
// every query issued through this scoped client is guarded with retry(false).
export async function createPublicReadClient(
  options: { anonymous?: boolean } = {},
) {
  if (options.anonymous) {
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      },
    )
  }

  return createCookieBackedClient()
}
