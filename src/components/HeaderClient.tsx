'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { LogOut, Menu, Plus, User, X } from 'lucide-react'
import { logout } from '@/lib/actions'

export type HeaderViewer = {
  id: string
  username?: string
  display_name?: string
} | null

type HeaderClientProps = {
  viewer: HeaderViewer
  isAdmin: boolean
}

const navItems = [
  { href: '/what-to-build', label: 'What to Build' },
  { href: '/paths?panel=open', label: 'Build Paths' },
  { href: '/requests', label: 'Build Requests' },
  { href: '/guide', label: 'Walkthrough' },
]

function isActivePath(pathname: string, href: string) {
  const hrefPath = href.split('?')[0]
  if (hrefPath === '/what-to-build') return pathname === '/what-to-build'
  if (hrefPath === '/paths') {
    return (
      pathname === '/paths' ||
      pathname === '/browse' ||
      pathname === '/snake-demo' ||
      pathname === '/decision-matrix-demo' ||
      pathname === '/hp-10bii-calculator-demo' ||
      pathname === '/tic-tac-toe-demo' ||
      (pathname.startsWith('/prompt/') && pathname !== '/prompt/new')
    )
  }
  if (hrefPath === '/suggestion-box') return pathname.startsWith('/suggestion-box')
  if (hrefPath === '/requests') return pathname.startsWith('/requests')
  if (hrefPath === '/guide') return pathname === '/guide'
  if (hrefPath === '/build') return pathname === '/build' || pathname === '/prompt/new'
  return false
}

export default function HeaderClient({ viewer, isAdmin }: HeaderClientProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const displayName = viewer?.display_name || viewer?.username || 'Account'
  const profileHref = viewer?.username ? `/user/${viewer.username}` : '/'

  const navLinkClass = (href: string) => (
    `inline-flex h-8 shrink-0 items-center whitespace-nowrap px-3 text-[13px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
      isActivePath(pathname, href)
        ? 'text-brand-orange bg-primary-50'
        : 'text-surface-700 hover:text-brand-orange'
    }`
  )

  const mobileNavLinkClass = (href: string) => (
    `text-sm font-medium px-3 py-3 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
      isActivePath(pathname, href)
        ? 'text-brand-orange bg-primary-50'
        : 'text-surface-700 hover:text-brand-orange active:bg-surface-100'
    }`
  )

  const rightNavLinkClass = (href: string) => (
    `inline-flex h-8 shrink-0 items-center whitespace-nowrap text-[13px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
      isActivePath(pathname, href)
        ? 'text-brand-orange'
        : 'text-surface-600 hover:text-brand-orange'
    }`
  )

  return (
    <header className="sticky top-0 z-50 border-b border-surface-200 bg-white shadow-[0_1px_0_rgba(24,24,27,0.04)]">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
              <Image src="/logo.png" alt="PathForge — AI Build Paths" width={110} height={35} priority />
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
                  {item.label}
                </Link>
              ))}
              <Link
                href="/build"
                className={`flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap px-3 text-[13px] font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
                  isActivePath(pathname, '/build')
                    ? 'text-surface-900 bg-brand-orange'
                    : 'text-brand-orange border border-brand-orange/40 hover:bg-brand-orange hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                Build
              </Link>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="hidden xl:block">
              <Link href="/suggestion-box" className={rightNavLinkClass('/suggestion-box')}>
                Suggestion Box
              </Link>
            </div>
            {viewer ? (
              <>
                {isAdmin && (
                  <Link href="/admin" className="text-[13px] text-surface-600 hover:text-brand-orange transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
                    Admin
                  </Link>
                )}
                <Link
                  href={profileHref}
                  className="flex items-center gap-1.5 text-[13px] font-medium text-surface-600 hover:text-brand-orange transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
                >
                  <div className="w-5 h-5 bg-surface-100 border border-surface-200 flex items-center justify-center">
                    <User className="w-3 h-3 text-surface-500" />
                  </div>
                  {displayName}
                </Link>
                <form action={logout}>
                  <button type="submit" className="text-surface-500 hover:text-brand-orange transition-colors duration-200 p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange" aria-label="Log out">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="inline-flex h-8 shrink-0 items-center whitespace-nowrap text-[13px] font-medium text-surface-600 hover:text-brand-orange transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
                  Log in
                </Link>
                <Link href="/auth/signup" className="inline-flex h-8 shrink-0 items-center whitespace-nowrap bg-brand-orange px-3.5 text-[13px] font-semibold text-white hover:bg-brand-orange-dark transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                  Sign up
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-surface-600 hover:text-brand-orange p-2.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4 border-t border-surface-200 mt-1 pt-3 flex flex-col gap-0.5">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={mobileNavLinkClass(item.href)}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/build"
              className={`text-sm font-semibold px-3 py-3 transition-colors duration-200 flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
                isActivePath(pathname, '/build')
                  ? 'text-brand-orange bg-primary-50'
                  : 'text-surface-700 hover:text-brand-orange active:bg-surface-100'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Plus className="w-3.5 h-3.5" />
              Build
            </Link>

            <Link
              href="/suggestion-box"
              className={mobileNavLinkClass('/suggestion-box')}
              onClick={() => setMobileMenuOpen(false)}
            >
              Suggestion Box
            </Link>

            <div className="border-t border-surface-200 my-2" />

            {viewer ? (
              <>
                {isAdmin && (
                  <Link href="/admin" className="text-sm text-surface-700 hover:text-brand-orange active:bg-surface-100 px-3 py-3 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange" onClick={() => setMobileMenuOpen(false)}>
                    Admin
                  </Link>
                )}
                <Link
                  href={profileHref}
                  className="text-sm font-medium text-surface-700 hover:text-brand-orange active:bg-surface-100 flex items-center gap-1.5 px-3 py-3 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-3.5 h-3.5" />
                  {displayName}
                </Link>
                <form action={logout}>
                  <button type="submit" className="text-sm text-surface-600 hover:text-brand-orange active:bg-surface-100 flex items-center gap-1.5 px-3 py-3 w-full text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
                    <LogOut className="w-3.5 h-3.5" />
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="text-sm font-medium text-surface-700 hover:text-brand-orange active:bg-surface-100 px-3 py-3 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange" onClick={() => setMobileMenuOpen(false)}>
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
