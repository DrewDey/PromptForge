'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, LogOut, User } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { logout } from '@/lib/actions'

export default function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userMeta, setUserMeta] = useState<{ username?: string; display_name?: string }>({})
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return

    import('@/lib/supabase/client').then(({ createClient }) => {
      const supabase = createClient()

      supabase.auth.getUser().then(({ data: { user } }) => {
        setUser(user)
        if (user) {
          setUserMeta({
            username: user.user_metadata?.username,
            display_name: user.user_metadata?.display_name,
          })
          supabase.from('profiles').select('role').eq('id', user.id).single()
            .then(({ data }) => setIsAdmin(data?.role === 'admin'))
        }
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          setUserMeta({
            username: session.user.user_metadata?.username,
            display_name: session.user.user_metadata?.display_name,
          })
        } else {
          setUserMeta({})
          setIsAdmin(false)
        }
      })

      return () => subscription.unsubscribe()
    })
  }, [])

  const displayName = userMeta.display_name || userMeta.username || 'Account'

  // Active state: highlight nav link matching current route
  const isActive = (href: string) => {
    if (href === '/browse') return pathname === '/browse' || (pathname.startsWith('/prompt/') && pathname !== '/prompt/new')
    if (href === '/prompt/new') return pathname === '/prompt/new'
    return false
  }

  const navLinkClass = (href: string) =>
    `text-sm font-medium transition-colors duration-200 relative py-1 ${
      isActive(href)
        ? 'text-brand-orange'
        : 'text-gray-500 hover:text-gray-900'
    }`

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="PathForge" width={120} height={34} priority />
            </Link>
            <div className="hidden md:flex items-center gap-1">
              <Link href="/browse" className={navLinkClass('/browse')}>
                <span className="px-3 py-1.5 hover:bg-gray-100 transition-colors duration-200">Browse</span>
                {isActive('/browse') && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange" />}
              </Link>
              <Link href="/prompt/new" className={navLinkClass('/prompt/new')}>
                <span className="px-3 py-1.5 hover:bg-gray-100 transition-colors duration-200">Submit</span>
                {isActive('/prompt/new') && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange" />}
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                {isAdmin && (
                  <Link href="/admin" className="text-sm text-gray-400 hover:text-gray-700 transition-colors duration-200">
                    Admin
                  </Link>
                )}
                <Link href={`/user/${userMeta.username ?? ''}`} className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-brand-orange transition-colors duration-200">
                  <User className="w-4 h-4" />
                  {displayName}
                </Link>
                <form action={logout}>
                  <button type="submit" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors duration-200">
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors duration-200">
                  Log in
                </Link>
                <Link href="/auth/signup" className="bg-brand-orange text-white px-4 py-2 text-sm font-semibold hover:bg-brand-orange-dark transition-colors duration-200">
                  Sign up
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-500 hover:text-gray-900">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200 mt-2 pt-4 flex flex-col gap-1">
            <Link href="/browse" className={`text-sm font-medium px-3 py-2 transition-colors duration-200 ${isActive('/browse') ? 'text-brand-orange bg-brand-orange/5 border-l-2 border-brand-orange' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`} onClick={() => setMobileMenuOpen(false)}>Browse</Link>
            <Link href="/prompt/new" className={`text-sm font-medium px-3 py-2 transition-colors duration-200 ${isActive('/prompt/new') ? 'text-brand-orange bg-brand-orange/5 border-l-2 border-brand-orange' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`} onClick={() => setMobileMenuOpen(false)}>Submit</Link>
            <hr className="border-gray-200" />
            {user ? (
              <>
                {isAdmin && <Link href="/admin" className="text-gray-400 hover:text-gray-700 text-sm" onClick={() => setMobileMenuOpen(false)}>Admin</Link>}
                <Link href={`/user/${userMeta.username ?? ''}`} className="text-sm font-medium text-gray-700 flex items-center gap-1.5" onClick={() => setMobileMenuOpen(false)}>
                  <User className="w-4 h-4" />{displayName}
                </Link>
                <form action={logout}><button type="submit" className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1.5"><LogOut className="w-4 h-4" />Log out</button></form>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm font-medium text-gray-500" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
                <Link href="/auth/signup" className="bg-brand-orange text-white px-4 py-2 text-sm font-semibold text-center" onClick={() => setMobileMenuOpen(false)}>Sign up</Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}
