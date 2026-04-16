'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X, LogOut, User, Plus } from 'lucide-react'
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

  const isActive = (href: string) => {
    if (href === '/browse') return pathname === '/browse' || (pathname.startsWith('/prompt/') && pathname !== '/prompt/new')
    if (href === '/prompt/new') return pathname === '/prompt/new'
    return false
  }

  return (
    <header className="bg-surface-900 shadow-[0_1px_3px_0_rgba(0,0,0,0.3),0_4px_12px_0_rgba(0,0,0,0.15)] sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
              <Image src="/logo.png" alt="PathForge — AI Build Paths" width={110} height={30} priority />
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link
                href="/browse"
                className={`text-[13px] font-medium px-3 py-1.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
                  isActive('/browse')
                    ? 'text-brand-orange bg-surface-800'
                    : 'text-surface-300 hover:text-white'
                }`}
              >
                Browse
              </Link>
              <Link
                href="/prompt/new"
                className={`text-[13px] font-semibold px-3 py-1.5 transition-all duration-200 flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
                  isActive('/prompt/new')
                    ? 'text-surface-900 bg-brand-orange'
                    : 'text-brand-orange border border-brand-orange/40 hover:bg-brand-orange hover:text-surface-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Build
              </Link>
            </div>
          </div>

          {/* Right: Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                {isAdmin && (
                  <Link href="/admin" className="text-[13px] text-surface-300 hover:text-white transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
                    Admin
                  </Link>
                )}
                <Link
                  href={`/user/${userMeta.username ?? ''}`}
                  className="flex items-center gap-1.5 text-[13px] font-medium text-surface-300 hover:text-white transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
                >
                  <div className="w-5 h-5 bg-surface-700 border border-surface-600 flex items-center justify-center">
                    <User className="w-3 h-3 text-surface-400" />
                  </div>
                  {displayName}
                </Link>
                <form action={logout}>
                  <button type="submit" className="text-surface-400 hover:text-white transition-colors duration-200 p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange" aria-label="Log out">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-[13px] font-medium text-surface-300 hover:text-white transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
                  Log in
                </Link>
                <Link href="/auth/signup" className="bg-brand-orange text-white px-3.5 py-1.5 text-[13px] font-semibold hover:bg-brand-orange-dark transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  Sign up
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-surface-300 hover:text-white p-2.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-surface-800 mt-1 pt-3 flex flex-col gap-0.5">
            <Link
              href="/browse"
              className={`text-sm font-medium px-3 py-3 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
                isActive('/browse') ? 'text-brand-orange bg-surface-800' : 'text-surface-300 hover:text-white active:bg-surface-800'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Browse
            </Link>
            <Link
              href="/prompt/new"
              className={`text-sm font-semibold px-3 py-3 transition-colors duration-200 flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
                isActive('/prompt/new') ? 'text-brand-orange bg-surface-800' : 'text-surface-300 hover:text-white active:bg-surface-800'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Plus className="w-3.5 h-3.5" />
              Build
            </Link>
            <div className="border-t border-surface-700 my-2" />
            {user ? (
              <>
                {isAdmin && (
                  <Link href="/admin" className="text-sm text-surface-300 hover:text-white active:bg-surface-800 px-3 py-3 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange" onClick={() => setMobileMenuOpen(false)}>
                    Admin
                  </Link>
                )}
                <Link
                  href={`/user/${userMeta.username ?? ''}`}
                  className="text-sm font-medium text-surface-300 hover:text-white active:bg-surface-800 flex items-center gap-1.5 px-3 py-3 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-3.5 h-3.5" />
                  {displayName}
                </Link>
                <form action={logout}>
                  <button type="submit" className="text-sm text-surface-400 hover:text-white active:bg-surface-800 flex items-center gap-1.5 px-3 py-3 w-full text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
                    <LogOut className="w-3.5 h-3.5" />
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm font-medium text-surface-300 hover:text-white active:bg-surface-800 px-3 py-3 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange" onClick={() => setMobileMenuOpen(false)}>
                  Log in
                </Link>
                <Link href="/auth/signup" className="bg-brand-orange text-white px-3 py-3 text-sm font-semibold text-center mx-3 mt-1 hover:bg-brand-orange-dark transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" onClick={() => setMobileMenuOpen(false)}>
                  Sign up
                </Link>
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}
