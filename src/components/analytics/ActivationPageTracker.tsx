'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackActivationEvent } from '@/lib/activation/track'
import type { ActivationSurface } from '@/lib/activation/contract'

function discoverySurface(pathname: string): ActivationSurface | null {
  if (pathname === '/') return 'home'
  if (pathname === '/paths' || pathname === '/browse') return 'explore'
  if (pathname === '/what-to-build') return 'ideas'
  if (pathname === '/requests') return 'requests'
  if (pathname === '/guide') return 'guide'
  return null
}

function hasDiscoveryRefinement(pathname: string) {
  if (pathname === '/paths' || pathname === '/browse') {
    return ['q', 'intent', 'domain', 'difficulty', 'model', 'compare', 'artifact', 'fork', 'sort']
      .some((key) => new URLSearchParams(window.location.search).has(key))
  }
  if (pathname === '/what-to-build') {
    const params = new URLSearchParams(window.location.search)
    return params.has('goal') || params.has('pace')
  }
  return false
}

export default function ActivationPageTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const searchKey = searchParams.toString()

  useEffect(() => {
    const surface = discoverySurface(pathname)
    if (!surface) return
    void trackActivationEvent({
      eventName: 'discovery_viewed',
      surface,
      path: pathname,
    })
    if (hasDiscoveryRefinement(pathname)) {
      void trackActivationEvent({
        eventName: 'discovery_searched',
        surface,
        action: 'search',
        path: pathname,
      })
    }
  }, [pathname, searchKey])

  useEffect(() => {
    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target instanceof HTMLFormElement ? event.target : null
      const surface = form?.dataset.activationSearch as ActivationSurface | undefined
      if (!surface) return
      void trackActivationEvent({
        eventName: 'discovery_searched',
        surface,
        action: 'search',
        path: pathname,
      })
    }
    document.addEventListener('submit', handleSubmit, true)
    return () => document.removeEventListener('submit', handleSubmit, true)
  }, [pathname])

  return null
}
