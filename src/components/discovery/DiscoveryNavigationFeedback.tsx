'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  createContext,
  useContext,
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
  const pendingNavigation = isTransitionPending ? requestedNavigation : null

  const beginNavigation = (navigation: PendingDiscoveryNavigation) => {
    if (pendingNavigation) return
    setRequestedNavigation(navigation)
    startTransition(() => {
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
}

function isModifiedActivation(event: MouseEvent<HTMLAnchorElement>) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
}

export function DiscoveryNavigationLink({
  href,
  navigationKind = 'filter',
  navigationLabel,
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
    beginNavigation({ href, label: navigationLabel, kind: navigationKind })
  }

  return (
    <Link
      {...props}
      href={href}
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
