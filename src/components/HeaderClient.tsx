'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  ChevronDown,
  FolderGit2,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  ShieldCheck,
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
  { href: '/paths', label: 'Explore' },
  { href: '/what-to-build', label: 'Ideas' },
  { href: '/requests', label: 'Requests' },
  { href: '/guide', label: 'How it works' },
  { href: '/build', label: 'Share a build' },
] as const

const MOBILE_MENU_FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

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
      pathname.endsWith('-demo') ||
      pathname === '/artifact-viewer' ||
      (pathname.startsWith('/prompt/') && pathname !== '/prompt/new')
    )
  }
  if (hrefPath === '/suggestion-box/mine') return pathname.startsWith('/suggestion-box/mine')
  if (hrefPath === '/suggestion-box') return pathname === '/suggestion-box'
  if (hrefPath === '/requests') return pathname.startsWith('/requests')
  if (hrefPath === '/guide') return pathname === '/guide'
  if (hrefPath === '/build') return pathname === '/build' || pathname === '/prompt/new'
  if (hrefPath === '/my-forge') return pathname.startsWith('/my-forge')
  if (hrefPath.startsWith('/user/')) return pathname === hrefPath
  if (hrefPath === '/settings/profile') return pathname.startsWith('/settings/profile')
  if (hrefPath === '/admin') return pathname.startsWith('/admin')
  if (hrefPath.startsWith('/auth/')) return pathname === hrefPath
  return false
}

export default function HeaderClient({ viewer, isAdmin }: HeaderClientProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const accountMenuRef = useRef<HTMLDetailsElement>(null)
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null)
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const displayName = viewer?.display_name || viewer?.username || 'Account'
  const profileHref = viewer?.username ? `/user/${viewer.username}` : '/settings/profile'
  const accountAreaActive = (
    pathname.startsWith('/user/') ||
    pathname.startsWith('/settings/') ||
    pathname.startsWith('/suggestion-box') ||
    pathname.startsWith('/admin')
  )

  useEffect(() => {
    accountMenuRef.current?.removeAttribute('open')
    const closeTimer = window.setTimeout(() => setMobileMenuOpen(false), 0)
    return () => window.clearTimeout(closeTimer)
  }, [pathname])

  useEffect(() => {
    const desktopBreakpoint = window.matchMedia('(min-width: 1024px)')
    const closeAtDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileMenuOpen(false)
    }

    desktopBreakpoint.addEventListener('change', closeAtDesktop)
    return () => desktopBreakpoint.removeEventListener('change', closeAtDesktop)
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen) return

    const menu = mobileMenuRef.current
    const menuButton = mobileMenuButtonRef.current
    const previousBodyOverflow = document.body.style.overflow
    const header = menu?.closest('header')
    const backgroundElements = header
      ? Array.from(document.body.children).filter(
          (element): element is HTMLElement => element instanceof HTMLElement && element !== header,
        )
      : []
    const backgroundInertState = backgroundElements.map((element) => [element, element.inert] as const)

    document.body.style.overflow = 'hidden'
    backgroundElements.forEach((element) => {
      element.inert = true
    })

    const getFocusableItems = () => (
      Array.from(menu?.querySelectorAll<HTMLElement>(MOBILE_MENU_FOCUSABLE) ?? [])
        .filter((item) => !item.hasAttribute('disabled') && item.getAttribute('aria-hidden') !== 'true')
    )

    const focusFrame = window.requestAnimationFrame(() => {
      getFocusableItems()[0]?.focus()
    })

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setMobileMenuOpen(false)
        return
      }

      if (event.key !== 'Tab') return

      const focusableItems = getFocusableItems()
      const firstItem = focusableItems[0]
      const lastItem = focusableItems.at(-1)
      if (!firstItem || !lastItem) return

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault()
        lastItem.focus()
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault()
        firstItem.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousBodyOverflow
      backgroundInertState.forEach(([element, wasInert]) => {
        element.inert = wasInert
      })
      if (menuButton?.isConnected) {
        menuButton.focus({ preventScroll: true })
      }
    }
  }, [mobileMenuOpen])

  const closeMobileMenu = () => setMobileMenuOpen(false)
  const closeAccountMenu = () => accountMenuRef.current?.removeAttribute('open')

  const navLinkClass = (href: string) => (
    `relative inline-flex h-16 shrink-0 items-center whitespace-nowrap px-3 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink ${
      isActivePath(pathname, href)
        ? 'text-surface-900 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-brand-orange'
        : 'text-surface-600 hover:text-surface-900'
    }`
  )

  const mobileNavLinkClass = (href: string) => (
    `flex min-h-12 items-center justify-between border-b border-surface-100 px-4 py-3 text-[15px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-orange-ink ${
      isActivePath(pathname, href)
        ? 'bg-primary-50 text-brand-orange-ink'
        : 'text-surface-800 hover:bg-surface-50 hover:text-brand-orange-ink'
    }`
  )

  const accountMenuLinkClass = 'flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-surface-700 transition-colors duration-150 hover:bg-primary-50 hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-orange-ink'

  return (
    <header className="sticky top-0 z-50 border-b border-surface-200 bg-white/95 shadow-[0_1px_0_rgba(24,24,27,0.04)] backdrop-blur-md">
      <nav className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Primary navigation">
        <div className="flex h-16 items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-6 xl:gap-8">
            <Link
              href="/"
              className="flex shrink-0 items-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink"
              aria-label="PathForge home"
            >
              <Image
                src="/logo.png"
                alt="PathForge"
                width={971}
                height={310}
                loading="eager"
                className="h-auto w-[118px]"
              />
            </Link>

            <div className="hidden items-center lg:flex">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={navLinkClass(item.href)}
                  aria-current={isActivePath(pathname, item.href) ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            {viewer ? (
              <Link
                href="/my-forge"
                aria-current={isActivePath(pathname, '/my-forge') ? 'page' : undefined}
                className={`inline-flex h-9 items-center gap-2 px-3 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink ${
                  isActivePath(pathname, '/my-forge')
                    ? 'bg-surface-100 text-surface-900'
                    : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                }`}
              >
                <FolderGit2 className="h-4 w-4" aria-hidden="true" />
                My Forge
              </Link>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  aria-current={isActivePath(pathname, '/auth/login') ? 'page' : undefined}
                  className="inline-flex h-9 items-center px-2.5 text-[13px] font-semibold text-surface-600 transition-colors duration-150 hover:text-surface-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink"
                >
                  Log in
                </Link>
                <Link
                  href="/auth/signup"
                  aria-current={isActivePath(pathname, '/auth/signup') ? 'page' : undefined}
                  className="inline-flex h-9 items-center border border-surface-300 px-3 text-[13px] font-semibold text-surface-800 transition-colors duration-150 hover:border-surface-500 hover:bg-surface-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink"
                >
                  Sign up
                </Link>
              </>
            )}

            {viewer && (
              <details ref={accountMenuRef} className="group relative" data-account-menu>
                <summary
                  className={`flex h-9 cursor-pointer list-none items-center gap-2 border px-2.5 text-[13px] font-semibold transition-colors duration-150 marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink [&::-webkit-details-marker]:hidden ${
                    accountAreaActive
                      ? 'border-primary-200 bg-primary-50 text-brand-orange-ink'
                      : 'border-surface-200 bg-white text-surface-700 hover:border-surface-300 hover:bg-surface-50 hover:text-surface-900'
                  }`}
                  aria-label={`Open account menu for ${displayName}`}
                >
                  <span className="flex h-5 w-5 items-center justify-center bg-surface-900 text-[10px] font-bold uppercase text-white" aria-hidden="true">
                    {displayName.charAt(0)}
                  </span>
                  <span className="hidden max-w-24 truncate xl:block">{displayName}</span>
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
                </summary>

                <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 border border-surface-200 bg-white p-1.5 shadow-[0_22px_70px_rgba(15,23,42,0.18)]">
                  <div className="border-b border-surface-100 px-3 py-2.5">
                    <p className="truncate text-sm font-bold text-surface-900">{displayName}</p>
                    {viewer.username && (
                      <p className="mt-0.5 truncate text-xs text-surface-500">@{viewer.username}</p>
                    )}
                  </div>

                  <div className="py-1">
                    <Link
                      href={profileHref}
                      className={accountMenuLinkClass}
                      onClick={closeAccountMenu}
                      aria-current={isActivePath(pathname, profileHref) ? 'page' : undefined}
                    >
                      <User className="h-4 w-4" aria-hidden="true" />
                      {viewer.username ? 'Public profile' : 'Complete profile'}
                    </Link>
                    <Link
                      href="/settings/profile"
                      className={accountMenuLinkClass}
                      onClick={closeAccountMenu}
                      aria-current={isActivePath(pathname, '/settings/profile') ? 'page' : undefined}
                    >
                      <Settings className="h-4 w-4" aria-hidden="true" />
                      Edit profile
                    </Link>
                  </div>

                  <div className="border-t border-surface-100 py-1">
                    <Link
                      href="/suggestion-box"
                      className={accountMenuLinkClass}
                      onClick={closeAccountMenu}
                      aria-current={isActivePath(pathname, '/suggestion-box') ? 'page' : undefined}
                    >
                      <MessageSquare className="h-4 w-4" aria-hidden="true" />
                      Suggestion Box
                    </Link>
                    <Link
                      href="/suggestion-box/mine"
                      className={accountMenuLinkClass}
                      onClick={closeAccountMenu}
                      aria-current={isActivePath(pathname, '/suggestion-box/mine') ? 'page' : undefined}
                    >
                      <FolderGit2 className="h-4 w-4" aria-hidden="true" />
                      Your suggestions
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className={accountMenuLinkClass}
                        onClick={closeAccountMenu}
                        aria-current={isActivePath(pathname, '/admin') ? 'page' : undefined}
                      >
                        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        Admin
                      </Link>
                    )}
                  </div>

                  <form action={logout} className="border-t border-surface-100 pt-1">
                    <button type="submit" className={`${accountMenuLinkClass} w-full text-left text-surface-600`}>
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Log out
                    </button>
                  </form>
                </div>
              </details>
            )}
          </div>

          <button
            ref={mobileMenuButtonRef}
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="flex h-11 w-11 shrink-0 items-center justify-center border border-surface-200 text-surface-700 transition-colors duration-150 hover:border-surface-300 hover:bg-surface-50 hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink lg:hidden"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-controls={mobileMenuOpen ? 'mobile-navigation' : undefined}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation menu"
            className="absolute inset-x-0 top-full h-[calc(100dvh-var(--site-header-height))] overflow-y-auto border-b border-surface-200 bg-white shadow-[0_22px_50px_rgba(15,23,42,0.14)] lg:hidden"
          >
            <div className="mx-auto max-w-7xl px-4 pb-5 pt-4 sm:px-6">
              <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-surface-400">Navigate</p>
              <div className="border-t border-surface-100">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={mobileNavLinkClass(item.href)}
                    onClick={closeMobileMenu}
                    aria-current={isActivePath(pathname, item.href) ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {viewer ? (
                <div className="mt-5">
                  <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-surface-400">Your workspace</p>
                  <div className="border-t border-surface-100">
                    <Link
                      href="/my-forge"
                      className={mobileNavLinkClass('/my-forge')}
                      onClick={closeMobileMenu}
                      aria-current={isActivePath(pathname, '/my-forge') ? 'page' : undefined}
                    >
                      <span className="flex items-center gap-2">
                        <FolderGit2 className="h-4 w-4" aria-hidden="true" />
                        My Forge
                      </span>
                    </Link>
                    <Link
                      href={profileHref}
                      className={mobileNavLinkClass(profileHref)}
                      onClick={closeMobileMenu}
                      aria-current={isActivePath(pathname, profileHref) ? 'page' : undefined}
                    >
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" aria-hidden="true" />
                        {viewer.username ? 'Public profile' : 'Complete profile'}
                      </span>
                    </Link>
                    <Link
                      href="/settings/profile"
                      className={mobileNavLinkClass('/settings/profile')}
                      onClick={closeMobileMenu}
                      aria-current={isActivePath(pathname, '/settings/profile') ? 'page' : undefined}
                    >
                      <span className="flex items-center gap-2">
                        <Settings className="h-4 w-4" aria-hidden="true" />
                        Edit profile
                      </span>
                    </Link>
                    <Link
                      href="/suggestion-box"
                      className={mobileNavLinkClass('/suggestion-box')}
                      onClick={closeMobileMenu}
                      aria-current={isActivePath(pathname, '/suggestion-box') ? 'page' : undefined}
                    >
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" aria-hidden="true" />
                        Suggestion Box
                      </span>
                    </Link>
                    <Link
                      href="/suggestion-box/mine"
                      className={mobileNavLinkClass('/suggestion-box/mine')}
                      onClick={closeMobileMenu}
                      aria-current={isActivePath(pathname, '/suggestion-box/mine') ? 'page' : undefined}
                    >
                      Your suggestions
                    </Link>
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className={mobileNavLinkClass('/admin')}
                        onClick={closeMobileMenu}
                        aria-current={isActivePath(pathname, '/admin') ? 'page' : undefined}
                      >
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                          Admin
                        </span>
                      </Link>
                    )}
                    <form action={logout}>
                      <button
                        type="submit"
                        className="flex min-h-12 w-full items-center gap-2 border-b border-surface-100 px-4 py-3 text-left text-[15px] font-semibold text-surface-600 transition-colors duration-150 hover:bg-surface-50 hover:text-brand-orange-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-orange-ink"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Log out
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-surface-400">Account</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/auth/login"
                      aria-current={isActivePath(pathname, '/auth/login') ? 'page' : undefined}
                      className="flex min-h-11 items-center justify-center border border-surface-300 px-3 text-sm font-semibold text-surface-800 transition-colors duration-150 hover:bg-surface-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink"
                      onClick={closeMobileMenu}
                    >
                      Log in
                    </Link>
                    <Link
                      href="/auth/signup"
                      aria-current={isActivePath(pathname, '/auth/signup') ? 'page' : undefined}
                      className="flex min-h-11 items-center justify-center bg-surface-900 px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-surface-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange-ink"
                      onClick={closeMobileMenu}
                    >
                      Sign up
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
