import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hasSupabaseAuthCookie } from './auth-cookies'

export async function refreshAuthSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !hasSupabaseAuthCookie(request.cookies.getAll())
  ) {
    return response
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options)
            })
          },
        },
      },
    )

    // Server Components cannot persist refreshed cookies. Refresh and verify
    // here so authenticated state stays stable across every PathForge route.
    await supabase.auth.getClaims()
  } catch {
    // A temporary Auth outage must not take the public library offline.
    // Protected Server Components still validate the current user themselves.
  }

  return response
}
