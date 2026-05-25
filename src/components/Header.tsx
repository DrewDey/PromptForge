import HeaderClient, { type HeaderViewer } from './HeaderClient'

const SUPABASE_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
const HEADER_AUTH_TIMEOUT_MS = 1500

async function readHeaderState(): Promise<{ viewer: HeaderViewer; isAdmin: boolean }> {
  try {
    const { createClient } = await import('@/lib/supabase/server')
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { viewer: null, isAdmin: false }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, role')
      .eq('id', user.id)
      .maybeSingle()

    return {
      viewer: {
        id: user.id,
        username: profile?.username ?? user.user_metadata?.username,
        display_name: profile?.display_name ?? user.user_metadata?.display_name,
      },
      isAdmin: profile?.role === 'admin',
    }
  } catch {
    return { viewer: null, isAdmin: false }
  }
}

async function getHeaderState(): Promise<{ viewer: HeaderViewer; isAdmin: boolean }> {
  const fallback = { viewer: null, isAdmin: false }
  if (!SUPABASE_CONFIGURED) return fallback

  return Promise.race([
    readHeaderState(),
    new Promise<typeof fallback>((resolve) => {
      setTimeout(() => resolve(fallback), HEADER_AUTH_TIMEOUT_MS)
    }),
  ])
}

export default async function Header() {
  const { viewer, isAdmin } = await getHeaderState()
  return <HeaderClient viewer={viewer} isAdmin={isAdmin} />
}
