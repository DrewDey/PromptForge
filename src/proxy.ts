import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getProjectRouteOverride } from './lib/project-links'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const promptMatch = pathname.match(/^\/prompt\/([^/]+)$/)

  if (promptMatch) {
    const routeOverride = getProjectRouteOverride(decodeURIComponent(promptMatch[1]))
    if (routeOverride) {
      return NextResponse.redirect(new URL(routeOverride, request.url))
    }
  }

  const authAwareRoute = pathname.startsWith('/admin')

  if (
    !authAwareRoute ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return NextResponse.next()
  }

  let response = NextResponse.next({ request })

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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  try {
    await supabase.auth.getUser()
  } catch {
    // Protected pages still run their own guard; keep transient local-network
    // Supabase failures from taking over the dev overlay.
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
