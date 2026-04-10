'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Hammer, Menu, X, LogOut, User } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { logout } from '@/lib/actions'

export default function Header() {
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
        }
      })

      return () => subscription.unsubscribe()
    })
  }, [])

  const displayName = userMeta.display_name || userMeta.username || 'Account'

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary-600">
              <Hammer className="w-6 h-6" />
              PathForge
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/browse" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                Browse
              </Link>
              <Link href="/prompt/new" className="text-gray-600 hover:text-gray-900 text-sm font-medium">
                Submit Project
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Admin
                  </Link>
                )}
                <Link href={`/user/${userMeta.username ?? ''}`} className="flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors">
                  <User className="w-4 h-4" />
                  {displayName}
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-600 hover:text-gray-900"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-100 mt-2 pt-4 flex flex-col gap-3">
            <Link href="/browse" className="text-gray-600 hover:text-gray-900 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
              Browse
            </Link>
            <Link href="/prompt/new" className="text-gray-600 hover:text-gray-900 text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
              Submit Project
            </Link>
            <hr className="border-gray-100" />
            {user ? (
              <>
                {isAdmin && (
                  <Link href="/admin" className="text-gray-500 hover:text-gray-700 text-sm" onClick={() => setMobileMenuOpen(false)}>
                    Admin
                  </Link>
                )}
                <Link href={`/user/${userMeta.username ?? ''}`} className="text-sm font-medium text-gray-700 flex items-center gap-1.5 hover:text-primary-600" onClick={() => setMobileMenuOpen(false)}>
                  <User className="w-4 h-4" />
                  {displayName}
                </Link>
                <form action={logout}>
                  <button type="submit" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5">
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm font-medium text-gray-700" onClick={() => setMobileMenuOpen(false)}>
                  Log in
                </Link>
                <Link href="/auth/signup" className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium text-center" onClick={() => setMobileMenuOpen(false)}>
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
