'use client'

import { type ReactNode, useLayoutEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type PendingComparisonScroll = {
  destination: string
  position: ModelVariantViewportPosition
}

type ModelVariantViewportPosition = {
  scrollY: number
  anchorId: 'final-result' | 'source-run-path' | null
  anchorTop: number | null
}

let pendingComparisonScroll: PendingComparisonScroll | null = null
const comparisonScrollPositions = new Map<string, ModelVariantViewportPosition>()
const SCROLL_RESTORE_TIMEOUT_MS = 12_000
let renderedComparisonRoute = ''
let renderedComparisonLocation = ''

function relativeLocation(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`
}

function routeLocation(url: URL) {
  return `${url.pathname}${url.search}`
}

function captureViewportPosition(): ModelVariantViewportPosition {
  const artifact = document.getElementById('final-result')
  const sourceRunPath = document.getElementById('source-run-path')
  const artifactRect = artifact?.getBoundingClientRect()
  const anchor = artifactRect && artifactRect.bottom > 0
    ? artifact
    : sourceRunPath ?? artifact
  return {
    scrollY: window.scrollY,
    anchorId: anchor?.id === 'source-run-path' ? 'source-run-path' : anchor ? 'final-result' : null,
    anchorTop: anchor?.getBoundingClientRect().top ?? null,
  }
}

function restoreComparisonScroll(
  destination: string,
  desiredPosition: ModelVariantViewportPosition,
) {
  const startedAt = window.performance.now()
  let animationFrame = 0
  let active = true
  const userInputEvents: Array<keyof WindowEventMap> = ['keydown', 'pointerdown', 'touchstart', 'wheel']
  const removeUserInputListeners = () => {
    for (const eventName of userInputEvents) {
      window.removeEventListener(eventName, stopForUserInput)
    }
  }
  const cleanup = () => {
    if (!active) return
    active = false
    window.cancelAnimationFrame(animationFrame)
    removeUserInputListeners()
  }
  function stopForUserInput() {
    if (pendingComparisonScroll?.destination === destination) {
      pendingComparisonScroll = null
    }
    comparisonScrollPositions.delete(destination)
    cleanup()
  }
  for (const eventName of userInputEvents) {
    window.addEventListener(eventName, stopForUserInput, { passive: true, once: true })
  }

  const restoreWhenReady = () => {
    if (!active) return

    const artifact = document.getElementById('final-result')
    const destinationReady = Boolean(
      artifact?.querySelector('[data-artifact-package-id] iframe[srcdoc], [data-artifact-load-error]'),
    )
    const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
    const timedOut = window.performance.now() - startedAt >= SCROLL_RESTORE_TIMEOUT_MS
    const destinationAnchorTop = desiredPosition.anchorId
      ? document.getElementById(desiredPosition.anchorId)?.getBoundingClientRect().top
      : undefined
    const anchoredScrollY = desiredPosition.anchorTop !== null && destinationAnchorTop !== undefined
      ? window.scrollY + destinationAnchorTop - desiredPosition.anchorTop
      : desiredPosition.scrollY
    const desiredScrollY = Math.max(0, anchoredScrollY)

    if ((destinationReady && maxScrollY >= desiredScrollY - 1) || timedOut) {
      const restoredScrollY = Math.min(desiredScrollY, maxScrollY)
      window.scrollTo(0, restoredScrollY)
      const restoredAnchorTop = desiredPosition.anchorId
        ? document.getElementById(desiredPosition.anchorId)?.getBoundingClientRect().top
        : undefined
      const anchorRestored = anchoredScrollY < 0 || desiredPosition.anchorTop === null || (
        restoredAnchorTop !== undefined &&
        Math.abs(restoredAnchorTop - desiredPosition.anchorTop) <= 1
      )
      if ((Math.abs(window.scrollY - restoredScrollY) <= 1 && anchorRestored) || timedOut) {
        comparisonScrollPositions.set(destination, captureViewportPosition())
        if (pendingComparisonScroll?.destination === destination) {
          pendingComparisonScroll = null
        }
        cleanup()
        return
      }
    }

    animationFrame = window.requestAnimationFrame(restoreWhenReady)
  }
  restoreWhenReady()
  return cleanup
}

export function ModelComparisonViewportManager({
  navigationKey = '',
}: {
  navigationKey?: string
}) {
  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    let directRestorationCleanup: (() => void) | null = null

    const handlePopState = () => {
      if (renderedComparisonLocation) {
        comparisonScrollPositions.set(renderedComparisonLocation, captureViewportPosition())
      }
      const destinationUrl = new URL(window.location.href)
      const destination = relativeLocation(destinationUrl)
      const position = comparisonScrollPositions.get(destination)
      if (position === undefined) return
      pendingComparisonScroll = {
        destination,
        position,
      }
      if (routeLocation(destinationUrl) === renderedComparisonRoute) {
        renderedComparisonLocation = destination
        directRestorationCleanup?.()
        directRestorationCleanup = restoreComparisonScroll(destination, position)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.history.scrollRestoration = previousScrollRestoration
      directRestorationCleanup?.()
    }
  }, [])

  useLayoutEffect(() => {
    let currentUrl = new URL(window.location.href)
    let currentLocation = relativeLocation(currentUrl)
    const pending = pendingComparisonScroll
    const pendingRouteMatches = Boolean(
      pending && routeLocation(new URL(pending.destination, currentUrl)) === routeLocation(currentUrl),
    )
    if (pendingRouteMatches && pending && pending.destination !== currentLocation) {
      window.history.replaceState(window.history.state, '', pending.destination)
      currentUrl = new URL(window.location.href)
      currentLocation = relativeLocation(currentUrl)
    }
    for (const link of document.querySelectorAll('[data-model-variant-preview-link]')) {
      link.setAttribute('data-model-variant-preview-hydrated', 'true')
    }
    for (const link of document.querySelectorAll('[data-model-variant-view]')) {
      link.setAttribute('data-model-variant-view-hydrated', 'true')
    }
    renderedComparisonRoute = routeLocation(currentUrl)
    renderedComparisonLocation = currentLocation
    const pendingMatchesCurrent = pending?.destination === currentLocation
    const desiredPosition = pendingMatchesCurrent && pending
      ? pending.position
      : comparisonScrollPositions.get(currentLocation)
    if (desiredPosition === undefined) return

    return restoreComparisonScroll(currentLocation, desiredPosition)
  }, [navigationKey])

  return null
}

export function ModelComparisonCurrentPreviewLink({
  ariaLabel,
  className,
  children,
}: {
  ariaLabel: string
  className: string
  children: ReactNode
}) {
  return (
    <a
      href="#final-result"
      aria-current="true"
      aria-label={ariaLabel}
      className={className}
      data-model-variant-preview-current
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

        const currentUrl = new URL(window.location.href)
        const destinationUrl = new URL('#final-result', currentUrl)
        const artifact = document.getElementById('final-result')
        const maxScrollY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
        const artifactScrollY = artifact
          ? Math.min(maxScrollY, window.scrollY + artifact.getBoundingClientRect().top)
          : window.scrollY
        comparisonScrollPositions.set(relativeLocation(currentUrl), captureViewportPosition())
        comparisonScrollPositions.set(relativeLocation(destinationUrl), {
          scrollY: artifactScrollY,
          anchorId: 'final-result',
          anchorTop: 0,
        })
        window.requestAnimationFrame(() => {
          renderedComparisonLocation = relativeLocation(new URL(window.location.href))
        })
      }}
    >
      {children}
    </a>
  )
}

function ViewportPreservingRouteLink({
  href,
  ariaLabel,
  className,
  children,
  kind,
}: {
  href: string
  ariaLabel: string
  className: string
  children: ReactNode
  kind: 'comparison-preview' | 'model-view'
}) {
  const router = useRouter()

  return (
    <Link
      href={href}
      scroll={false}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        if (pendingComparisonScroll) {
          event.preventDefault()
          return
        }

        const artifact = document.getElementById('final-result')
        if (!artifact) return

        event.preventDefault()
        const currentLocation = relativeLocation(new URL(window.location.href))
        const desiredPosition = captureViewportPosition()
        const finalDestinationUrl = new URL(href, window.location.href)
        finalDestinationUrl.hash = ''
        const navigationDestination = relativeLocation(finalDestinationUrl)
        comparisonScrollPositions.set(currentLocation, desiredPosition)
        comparisonScrollPositions.set(navigationDestination, desiredPosition)
        pendingComparisonScroll = {
          destination: navigationDestination,
          position: desiredPosition,
        }
        event.currentTarget.blur()
        router.push(navigationDestination, { scroll: false })
      }}
      aria-label={ariaLabel}
      className={className}
      data-model-variant-preview-link={kind === 'comparison-preview' ? '' : undefined}
      data-model-variant-view={kind === 'model-view' ? '' : undefined}
      data-model-variant-viewport-link
    >
      {children}
    </Link>
  )
}

export function ModelVariantViewLink({
  href,
  ariaLabel,
  className,
  children,
}: {
  href: string
  ariaLabel: string
  className: string
  children: ReactNode
}) {
  return (
    <ViewportPreservingRouteLink
      href={href}
      ariaLabel={ariaLabel}
      className={className}
      kind="model-view"
    >
      {children}
    </ViewportPreservingRouteLink>
  )
}

export default function ModelComparisonPreviewLink({
  href,
  ariaLabel,
  className,
  children,
}: {
  href: string
  ariaLabel: string
  className: string
  children: ReactNode
}) {
  return (
    <ViewportPreservingRouteLink
      href={href}
      ariaLabel={ariaLabel}
      className={className}
      kind="comparison-preview"
    >
      {children}
    </ViewportPreservingRouteLink>
  )
}
