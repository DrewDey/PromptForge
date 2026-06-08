'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { BriefcaseBusiness, ChevronDown, Gamepad2, LogOut, Menu, Plus, RadioTower, Search, User, X } from 'lucide-react'
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
  { href: '/paths', label: 'Build Paths' },
  { href: '/requests', label: 'Build Requests' },
]

const pathsMenuItems = [
  { href: '/paths?panel=open', label: 'Search all', description: 'Open the full path finder', icon: Search },
  { href: '/paths?domain=games&panel=open', label: 'Games', description: 'Playable builds and experiments', icon: Gamepad2 },
  { href: '/paths?domain=productivity&panel=open', label: 'Productivity', description: 'Work tools and practical artifacts', icon: BriefcaseBusiness },
]

function isActivePath(pathname: string, href: string) {
  if (href === '/what-to-build') return pathname === '/what-to-build'
  if (href === '/paths') {
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
  if (href === '/suggestion-box') return pathname.startsWith('/suggestion-box')
  if (href === '/requests') return pathname.startsWith('/requests')
  if (href === '/build') return pathname === '/build' || pathname === '/prompt/new'
  return false
}

export default function HeaderClient({ viewer, isAdmin }: HeaderClientProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pathsMenuOpen, setPathsMenuOpen] = useState(false)
  const displayName = viewer?.display_name || viewer?.username || 'Account'
  const profileHref = viewer?.username ? `/user/${viewer.username}` : '/'

  const navLinkClass = (href: string) => (
    `text-[13px] font-medium px-3 py-1.5 transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
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
    `text-[13px] font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
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
                item.href === '/paths' ? (
                  <div key={item.href} className="relative">
                    <button
                      type="button"
                      onClick={() => setPathsMenuOpen((open) => !open)}
                      className={`${navLinkClass(item.href)} flex items-center gap-1`}
                      aria-haspopup="menu"
                      aria-expanded={pathsMenuOpen}
                    >
                      {item.label}
                      <ChevronDown className={`h-3 w-3 transition-transform ${pathsMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {pathsMenuOpen && (
                      <div className="absolute left-0 top-full mt-2 w-64 border border-surface-200 bg-white p-1 shadow-xl" role="menu">
                        {pathsMenuItems.map((menuItem) => {
                          const Icon = menuItem.icon
                          return (
                            <Link
                              key={menuItem.href}
                              href={menuItem.href}
                              className="flex items-start gap-3 px-3 py-3 text-surface-700 transition-colors hover:bg-primary-50 hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-brand-orange"
                              onClick={() => setPathsMenuOpen(false)}
                              role="menuitem"
                            >
                              <Icon className="mt-0.5 h-4 w-4 text-brand-orange" />
                              <span>
                                <span className="block text-[13px] font-semibold">{menuItem.label}</span>
                                <span className="mt-0.5 block text-[11px] leading-4 text-surface-500">{menuItem.description}</span>
                              </span>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link key={item.href} href={item.href} className={navLinkClass(item.href)}>
                    {item.href === '/requests' && <RadioTower className="mr-1 inline h-3 w-3 text-brand-orange" />}
                    {item.label}
                  </Link>
                )
              ))}
              <Link
                href="/build"
                className={`text-[13px] font-semibold px-3 py-1.5 transition-all duration-200 flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange ${
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
            <Link href="/suggestion-box" className={rightNavLinkClass('/suggestion-box')}>
              Suggestion Box
            </Link>
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
                <Link href="/auth/login" className="text-[13px] font-medium text-surface-600 hover:text-brand-orange transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
                  Log in
                </Link>
                <Link href="/auth/signup" className="bg-brand-orange text-white px-3.5 py-1.5 text-[13px] font-semibold hover:bg-brand-orange-dark transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
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
              item.href === '/paths' ? (
                <div key={item.href} className="border-y border-surface-200 py-1">
                  <Link
                    href="/paths?panel=open"
                    className={mobileNavLinkClass(item.href)}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Build Paths
                  </Link>
                  <div className="grid gap-0.5 pl-4">
                    {pathsMenuItems.slice(1).map((menuItem) => {
                      const Icon = menuItem.icon
                      return (
                        <Link
                          key={menuItem.href}
                          href={menuItem.href}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-surface-600 transition-colors hover:bg-primary-50 hover:text-brand-orange"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <Icon className="h-3.5 w-3.5 text-brand-orange" />
                          {menuItem.label}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={mobileNavLinkClass(item.href)}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              )
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
