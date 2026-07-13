import { NextResponse, type NextRequest } from 'next/server'
import { getProjectRouteOverride } from './lib/project-links'
import { refreshAuthSession } from './lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const promptMatch = pathname.match(/^\/prompt\/([^/]+)$/)

  if (promptMatch) {
    const routeOverride = getProjectRouteOverride(decodeURIComponent(promptMatch[1]))
    if (routeOverride) {
      return NextResponse.redirect(new URL(routeOverride, request.url))
    }
  }

  return refreshAuthSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
