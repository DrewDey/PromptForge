const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/

export function safeAuthNextPath(value: string | null | undefined, fallback = '/') {
  if (!value) return fallback

  const candidate = value.trim()
  if (
    candidate.length > 2_048 ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('\\') ||
    CONTROL_CHARACTERS.test(candidate)
  ) {
    return fallback
  }

  try {
    const parsed = new URL(candidate, 'https://pathforge.local')
    if (parsed.origin !== 'https://pathforge.local') return fallback
  } catch {
    return fallback
  }

  return candidate
}
export function authHref(pathname: string, nextPath: string) {
  const safeNext = safeAuthNextPath(nextPath)
  return `${pathname}?next=${encodeURIComponent(safeNext)}`
}

export function authCallbackUrl(origin: string, nextPath: string, flow?: 'oauth' | 'signup' | 'recovery') {
  const url = new URL('/auth/callback', origin)
  url.searchParams.set('next', safeAuthNextPath(nextPath))
  if (flow) url.searchParams.set('flow', flow)
  return url.toString()
}
