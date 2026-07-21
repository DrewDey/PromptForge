'use client'

import { type ReactNode, useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type PendingComparisonScroll = {
  destination: string
  scrollY: number
}

let pendingComparisonScroll: PendingComparisonScroll | null = null
const comparisonScrollPositions = new Map<string, number>()
const SCROLL_RESTORE_TIMEOUT_MS = 12_000
let renderedComparisonRoute = ''
let renderedComparisonLocation = ''

function relativeLocation(url: URL) {
  return `${url.pathname}${url.search}${url.hash}`
}

function routeLocation(url: URL) {
  return `${url.pathname}${url.search}`
}

function restoreComparisonScroll(destination: string, desiredScrollY: number) {
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

    if ((destinationReady && maxScrollY >= desiredScrollY - 1) || timedOut) {
      const restoredScrollY = Math.min(desiredScrollY, maxScrollY)
      window.scrollTo(0, restoredScrollY)
      if (Math.abs(window.scrollY - restoredScrollY) <= 1 || timedOut) {
        comparisonScrollPositions.set(destination, restoredScrollY)
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

export function ModelComparisonViewportManager() {
  useLayoutEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    let directRestorationCleanup: (() => void) | null = null

    const handlePopState = () => {
      if (renderedComparisonLocation) {
        comparisonScrollPositions.set(renderedComparisonLocation, window.scrollY)
      }
      const destinationUrl = new URL(window.location.href)
      const destination = relativeLocation(destinationUrl)
      const scrollY = comparisonScrollPositions.get(destination)
      if (scrollY === undefined) return
      pendingComparisonScroll = {
        destination,
        scrollY,
      }
      if (routeLocation(destinationUrl) === renderedComparisonRoute) {
        renderedComparisonLocation = destination
        directRestorationCleanup?.()
        directRestorationCleanup = restoreComparisonScroll(destination, scrollY)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.history.scrollRestoration = previousScrollRestoration
      directRestorationCleanup?.()
    }
  }, [])

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
        comparisonScrollPositions.set(relativeLocation(currentUrl), window.scrollY)
        comparisonScrollPositions.set(relativeLocation(destinationUrl), artifactScrollY)
        window.requestAnimationFrame(() => {
          renderedComparisonLocation = relativeLocation(new URL(window.location.href))
        })
      }}
    >
      {children}
    </a>
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
  const router = useRouter()
  const linkRef = useRef<HTMLAnchorElement>(null)

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
    linkRef.current?.setAttribute('data-model-variant-preview-hydrated', 'true')
    renderedComparisonRoute = routeLocation(currentUrl)
    renderedComparisonLocation = currentLocation
    const pendingMatchesCurrent = pending?.destination === currentLocation
    const desiredScrollY = pendingMatchesCurrent && pending
      ? pending.scrollY
      : comparisonScrollPositions.get(currentLocation)
    if (desiredScrollY === undefined) return

    return restoreComparisonScroll(currentLocation, desiredScrollY)
  }, [href])

  return (
    <Link
      ref={linkRef}
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
        const desiredScrollY = window.scrollY
        const finalDestinationUrl = new URL(href, window.location.href)
        finalDestinationUrl.hash = ''
        const navigationDestination = relativeLocation(finalDestinationUrl)
        comparisonScrollPositions.set(currentLocation, desiredScrollY)
        comparisonScrollPositions.set(navigationDestination, desiredScrollY)
        pendingComparisonScroll = {
          destination: navigationDestination,
          scrollY: desiredScrollY,
        }
        event.currentTarget.blur()
        router.push(navigationDestination, { scroll: false })
      }}
      aria-label={ariaLabel}
      className={className}
      data-model-variant-preview-link
    >
      {children}
    </Link>
  )
}
