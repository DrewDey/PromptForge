'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  BriefcaseBusiness,
  ChevronDown,
  FolderGit2,
  Gamepad2,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings,
  User,
  X,
} from 'lucide-react'
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
  { href: '/guide', label: 'Walkthrough' },
]

const pathsMenuItems = [
  { href: '/paths?panel=open', label: 'Search all', description: 'Open the full path finder', icon: Search },
  { href: '/paths?domain=games&panel=open', label: 'Games', description: 'Playable builds and experiments', icon: Gamepad2 },
  { href: '/paths?domain=productivity&panel=open', label: 'Productivity', description: 'Work tools and practical artifacts', icon: BriefcaseBusiness },
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
  if (hrefPath === '/my-forge') return pathname.startsWith('/my-forge')
  if (hrefPath === '/settings/profile') return pathname === '/settings/profile'
  return false
}

export default function HeaderClient({ viewer, isAdmin }: HeaderClientProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pathsMenuOpen, setPathsMenuOpen] = useState(false)
  const displayName = viewer?.display_name || viewer?.username || 'Account'
  const profileHref = viewer?.username ? `/user/${viewer.username}` : '/settings/profile'

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
                item.href === '/paths' ? (
                  <div key={item.href} className="relative flex h-8 items-center">
                    <button
                      type="button"
                      onClick={() => setPathsMenuOpen((open) => !open)}
                      className={navLinkClass(item.href)}
                      data-testid="build-paths-menu-button"
                      aria-haspopup="menu"
                      aria-expanded={pathsMenuOpen}
                    >
                      {item.label}
                    </button>
                    {pathsMenuOpen && (
                      <div
                        className="absolute left-0 top-full mt-2 w-64 border border-surface-200 bg-white p-1 shadow-xl"
                        data-testid="build-paths-menu"
                        role="menu"
                      >
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
                    {item.label}
                  </Link>
                )
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
                <Link
                  href="/my-forge"
                  className={`${rightNavLinkClass('/my-forge')} gap-1.5 font-semibold`}
                >
                  <FolderGit2 className="h-3.5 w-3.5" />
                  My Forge
                </Link>
                <details className="group relative">
                  <summary className="flex h-8 cursor-pointer list-none items-center gap-1.5 text-[13px] font-medium text-surface-600 transition-colors hover:text-brand-orange focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
                    <span className="flex h-5 w-5 items-center justify-center border border-surface-200 bg-surface-100">
                      <User className="h-3 w-3 text-surface-500" />
                    </span>
                    <span className="max-w-28 truncate">{displayName}</span>
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 border border-surface-200 bg-white p-1 shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
                    <Link href={profileHref} className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-surface-700 hover:bg-primary-50 hover:text-brand-orange">
                      <User className="h-4 w-4" />
                      {viewer.username ? 'Public profile' : 'Complete profile'}
                    </Link>
                    <Link href="/settings/profile" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-surface-700 hover:bg-primary-50 hover:text-brand-orange">
                      <Settings className="h-4 w-4" />
                      Edit profile
                    </Link>
                    <Link href="/suggestion-box/mine" className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-surface-700 hover:bg-primary-50 hover:text-brand-orange">
                      <MessageSquare className="h-4 w-4" />
                      Suggestion inbox
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" className="flex items-center gap-2 border-t border-surface-100 px-3 py-2.5 text-sm font-medium text-surface-700 hover:bg-primary-50 hover:text-brand-orange">
                        Admin
                      </Link>
                    )}
                    <form action={logout} className="border-t border-surface-100">
                      <button type="submit" className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-surface-600 hover:bg-primary-50 hover:text-brand-orange">
                        <LogOut className="h-4 w-4" />
                        Log out
                      </button>
                    </form>
                  </div>
                </details>
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
                <Link
                  href="/my-forge"
                  className={mobileNavLinkClass('/my-forge')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="flex items-center gap-2">
                    <FolderGit2 className="h-4 w-4" />
                    My Forge
                  </span>
                </Link>
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
                  {viewer.username ? 'Public profile' : 'Complete profile'}
                </Link>
                <Link
                  href="/settings/profile"
                  className={mobileNavLinkClass('/settings/profile')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Edit profile
                  </span>
                </Link>
                <Link
                  href="/suggestion-box/mine"
                  className={mobileNavLinkClass('/suggestion-box')}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Suggestion inbox
                  </span>
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
