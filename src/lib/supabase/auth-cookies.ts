export function hasSupabaseAuthCookie(cookies: Array<{ name: string }>) {
  return cookies.some(({ name }) => name.startsWith('sb-') && name.includes('-auth-token'))
}
