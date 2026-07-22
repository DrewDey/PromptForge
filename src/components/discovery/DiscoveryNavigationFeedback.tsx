'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { ArrowDownWideNarrow, LoaderCircle } from 'lucide-react'

type DiscoveryNavigationKind = 'filter' | 'sort'

type PendingDiscoveryNavigation = {
  href: string
  label: string
  kind: DiscoveryNavigationKind
  preserveScroll: boolean
}

type DiscoveryNavigationContextValue = {
  isTransitionPending: boolean
  pendingNavigation: PendingDiscoveryNavigation | null
  beginNavigation: (navigation: PendingDiscoveryNavigation) => void
}

const DiscoveryNavigationContext = createContext<DiscoveryNavigationContextValue | null>(null)

function useDiscoveryNavigation() {
  const value = useContext(DiscoveryNavigationContext)
  if (!value) {
    throw new Error('Discovery navigation controls must be rendered inside their feedback provider.')
  }
  return value
}

export function DiscoveryNavigationFeedbackProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [isTransitionPending, startTransition] = useTransition()
  const [requestedNavigation, setRequestedNavigation] = useState<PendingDiscoveryNavigation | null>(null)
  const preservedAnchorRef = useRef<{
    href: string
    summaryTop: number
    observedPendingTransition: boolean
  } | null>(null)
  const pendingNavigation = isTransitionPending ? requestedNavigation : null

  useLayoutEffect(() => {
    const preservedAnchor = preservedAnchorRef.current
    if (!preservedAnchor) return
    if (isTransitionPending) {
      preservedAnchor.observedPendingTransition = true
      return
    }
    if (!preservedAnchor.observedPendingTransition) return

    const destination = new URL(preservedAnchor.href, window.location.href)
    if (
      destination.pathname !== window.location.pathname ||
      destination.search !== window.location.search ||
      destination.hash !== window.location.hash
    ) {
      preservedAnchorRef.current = null
      return
    }

    const summary = document.querySelector('.path-filter-menu summary')
    if (summary instanceof HTMLElement) {
      const delta = summary.getBoundingClientRect().top - preservedAnchor.summaryTop
      if (Math.abs(delta) > 0.5) {
        window.scrollTo(window.scrollX, window.scrollY + delta)
      }
    }
    preservedAnchorRef.current = null
  }, [children, isTransitionPending])

  const beginNavigation = (navigation: PendingDiscoveryNavigation) => {
    if (pendingNavigation) return
    if (navigation.preserveScroll) {
      const summary = document.querySelector('.path-filter-menu summary')
      preservedAnchorRef.current = summary instanceof HTMLElement
        ? {
            href: navigation.href,
            summaryTop: summary.getBoundingClientRect().top,
            observedPendingTransition: false,
          }
        : null
    } else {
      preservedAnchorRef.current = null
    }
    setRequestedNavigation(navigation)
    startTransition(() => {
      if (navigation.preserveScroll) {
        router.push(navigation.href, { scroll: false })
        return
      }
      router.push(navigation.href)
    })
  }

  return (
    <DiscoveryNavigationContext.Provider
      value={{ isTransitionPending, pendingNavigation, beginNavigation }}
    >
      {children}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {pendingNavigation ? `Updating paths: ${pendingNavigation.label}` : ''}
      </span>
    </DiscoveryNavigationContext.Provider>
  )
}

type DiscoveryNavigationLinkProps = Omit<ComponentProps<typeof Link>, 'href' | 'onClick'> & {
  href: string
  navigationKind?: DiscoveryNavigationKind
  navigationLabel: string
  preserveScroll?: boolean
}

function isModifiedActivation(event: MouseEvent<HTMLAnchorElement>) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

export function DiscoveryNavigationLink({
  href,
  prefetch = false,
  navigationKind = 'filter',
  navigationLabel,
  preserveScroll = false,
  className = '',
  children,
  ...props
}: DiscoveryNavigationLinkProps) {
  const { pendingNavigation, beginNavigation } = useDiscoveryNavigation()
  const isNavigationLocked = pendingNavigation !== null
  const isThisNavigationPending = pendingNavigation?.href === href

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedActivation(event)) return
    if (isNavigationLocked) {
      event.preventDefault()
      return
    }

    const target = new URL(event.currentTarget.href)
    const current = new URL(window.location.href)
    if (
      target.pathname === current.pathname &&
      target.search === current.search &&
      target.hash === current.hash
    ) {
      event.preventDefault()
      return
    }

    event.preventDefault()
    beginNavigation({ href, label: navigationLabel, kind: navigationKind, preserveScroll })
  }

  return (
    <Link
      {...props}
      href={href}
      prefetch={prefetch}
      onClick={handleClick}
      className={[className, isThisNavigationPending ? 'is-pending' : ''].filter(Boolean).join(' ')}
      aria-busy={isThisNavigationPending || undefined}
      aria-disabled={isNavigationLocked || undefined}
      data-discovery-navigation-kind={navigationKind}
      data-discovery-navigation-pending={isThisNavigationPending ? 'true' : undefined}
      data-discovery-navigation-locked={isNavigationLocked ? 'true' : undefined}
    >
      {children}
      {isThisNavigationPending && (
        <span className="path-navigation-pending-indicator" aria-hidden="true">
          <LoaderCircle />
        </span>
      )}
    </Link>
  )
}

export type DiscoverySortMenuOption = {
  value: string
  label: string
  href: string
  isActive: boolean
}

export function DiscoverySortMenu({
  activeLabel,
  options,
}: {
  activeLabel: string
  options: DiscoverySortMenuOption[]
}) {
  const { pendingNavigation, isTransitionPending } = useDiscoveryNavigation()
  const pendingSort = pendingNavigation?.kind === 'sort' ? pendingNavigation : null

  return (
    <details className="path-sort-menu" data-discovery-sort-menu>
      <summary
        aria-label="Sort build paths"
        aria-busy={Boolean(pendingSort && isTransitionPending) || undefined}
      >
        <ArrowDownWideNarrow aria-hidden="true" />
        <span>Sort</span>
        <strong data-discovery-sort-label>
          {pendingSort ? `${pendingSort.label}…` : activeLabel}
        </strong>
      </summary>
      <div className="path-sort-popover">
        {options.map((option) => (
          <DiscoveryNavigationLink
            key={option.value}
            href={option.href}
            navigationKind="sort"
            navigationLabel={option.label}
            className={option.isActive ? 'is-active' : ''}
            aria-current={option.isActive ? 'true' : undefined}
          >
            {option.label}
          </DiscoveryNavigationLink>
        ))}
      </div>
    </details>
  )
}
