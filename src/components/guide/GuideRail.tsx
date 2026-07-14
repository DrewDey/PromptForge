'use client'

import { useEffect, useSyncExternalStore } from 'react'

const chapters = [
  ['01', 'Find a result', '#find'],
  ['02', 'Read the path', '#inspect'],
  ['03', 'Fork a response', '#fork'],
  ['04', 'Run the change', '#run'],
  ['05', 'Bring it back', '#submit'],
] as const

function subscribeToHashChange(onStoreChange: () => void) {
  window.addEventListener('hashchange', onStoreChange)
  return () => window.removeEventListener('hashchange', onStoreChange)
}

function getCurrentHash() {
  const hash = window.location.hash
  return chapters.some(([, , href]) => href === hash) ? hash : '#find'
}

function getServerHash() {
  return '#find'
}

export default function GuideRail() {
  const currentHash = useSyncExternalStore(
    subscribeToHashChange,
    getCurrentHash,
    getServerHash,
  )

  useEffect(() => {
    const hash = window.location.hash
    if (!chapters.some(([, , href]) => href === hash)) return

    let userInteracted = false
    const timers: number[] = []
    const stopCorrections = () => {
      userInteracted = true
    }

    const alignChapter = () => {
      if (userInteracted || window.location.hash !== hash) return

      const target = document.getElementById(hash.slice(1))
      if (!target) return

      const expectedTop = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop || '0')
      if (Math.abs(target.getBoundingClientRect().top - expectedTop) > 4) {
        target.scrollIntoView({ block: 'start', behavior: 'auto' })
      }
    }

    const scheduleCorrection = (delay: number) => {
      timers.push(window.setTimeout(alignChapter, delay))
    }

    window.addEventListener('wheel', stopCorrections, { passive: true })
    window.addEventListener('touchstart', stopCorrections, { passive: true })
    window.addEventListener('keydown', stopCorrections)
    const correctionDelays = [0, 80, 250, 600, 1200]
    correctionDelays.forEach(scheduleCorrection)

    return () => {
      timers.forEach(window.clearTimeout)
      window.removeEventListener('wheel', stopCorrections)
      window.removeEventListener('touchstart', stopCorrections)
      window.removeEventListener('keydown', stopCorrections)
    }
  }, [currentHash])

  return (
    <nav className="guide-rail" aria-label="Walkthrough chapters">
      <div className="guide-shell guide-rail-inner">
        <span className="guide-rail-label" aria-hidden="true">Your route</span>
        <ol>
          {chapters.map(([number, label, href]) => (
            <li key={number}>
              <a
                href={href}
                aria-current={currentHash === href ? 'location' : undefined}
              >
                <span aria-hidden="true">{number}</span>
                {label}
              </a>
            </li>
          ))}
        </ol>
      </div>
    </nav>
  )
}
