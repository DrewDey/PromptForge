import { NextResponse } from 'next/server'
import { authHref, safeAuthNextPath } from '@/lib/auth-redirects'

const tokenHashTypes = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email'] as const
type TokenHashType = typeof tokenHashTypes[number]

function isTokenHashType(value: string | null): value is TokenHashType {
  return Boolean(value && tokenHashTypes.some((type) => type === value))
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const { searchParams, origin } = requestUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const tokenHashType = searchParams.get('type')
  const flow = searchParams.get('flow')
  const nextPath = safeAuthNextPath(searchParams.get('next'))
  const providerError = searchParams.get('error')
  const hasTokenHash = Boolean(tokenHash && isTokenHashType(tokenHashType))

  if ((!code && !hasTokenHash) || providerError) {
    const failureRoute = flow === 'recovery' ? '/auth/forgot-password' : '/auth/login'
    return NextResponse.redirect(new URL(`${authHref(failureRoute, nextPath)}&error=auth`, origin))
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: tokenHashType as TokenHashType,
      })

  if (error || !data.user) {
    const failureRoute = flow === 'recovery' ? '/auth/forgot-password' : '/auth/login'
    return NextResponse.redirect(new URL(`${authHref(failureRoute, nextPath)}&error=auth`, origin))
  }

  if (flow !== 'recovery') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', data.user.id)
      .maybeSingle()

    if (!profile?.username) {
      const onboardingUrl = new URL('/settings/profile', origin)
      onboardingUrl.searchParams.set('welcome', '1')
      onboardingUrl.searchParams.set('next', nextPath)
      return NextResponse.redirect(onboardingUrl)
    }
  }

  return NextResponse.redirect(new URL(nextPath, origin))
}
