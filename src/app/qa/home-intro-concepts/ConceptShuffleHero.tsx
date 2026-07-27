'use client'

/* Concept A — playable hero + shuffle.
 *
 * The exhibit is the product, not a screenshot of it. Shuffle deals another
 * real build with a hard cut, aimed at the visitor who has AI tools and no idea
 * what to make. */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { PlayableExhibit } from './PlayableExhibit'
import type { ConceptItem } from './concept-items'
import styles from './page.module.css'

export function ConceptShuffleHero({
  deck,
  pathCount,
}: {
  deck: ConceptItem[]
  pathCount: number
}) {
  const [index, setIndex] = useState(0)
  const [dealt, setDealt] = useState(0)
  const item = deck[index]

  const shuffle = useCallback(() => {
    setIndex((current) => (deck.length < 2 ? current : (current + 1) % deck.length))
    setDealt((count) => count + 1)
  }, [deck.length])

  // `R` deals the next build. Ignored while typing so the search field still
  // behaves like a search field.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'r' && event.key !== 'R') return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return
      event.preventDefault()
      shuffle()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [shuffle])

  if (!item) return null

  return (
    <div className={styles.heroA}>
      <div className={styles.heroACopy}>
        <p className={styles.kicker}>
          {pathCount.toLocaleString()} published build paths
        </p>
        <h2 className={styles.heroTitle}>
          Someone made this with AI. <em>Go on, play it.</em>
        </h2>
        <p className={styles.heroLead}>
          Everything on PathForge is a real finished thing, not a screenshot.
          Have a go at this one, then open up the prompts that built it.
        </p>

        <div className={styles.heroDeck}>
          <button type="button" className={styles.shuffleBtn} onClick={shuffle}>
            Shuffle <span aria-hidden="true">⟳</span>
          </button>
          <span className={styles.shuffleHint}>
            or press <kbd className={styles.kbd}>R</kbd>
          </span>
          <span className={styles.shuffleCount} aria-live="polite">
            {dealt === 0
              ? `${deck.length} in the deck`
              : `${dealt} dealt · ${deck.length} in the deck`}
          </span>
        </div>

        <div className={styles.heroLinks}>
          <Link href={item.href}>See the {item.promptCount === 1 ? 'prompt' : `${item.promptCount} prompts`} behind it →</Link>
          <Link href="/paths">Explore every path</Link>
        </div>
      </div>

      <div className={styles.heroAExhibit}>
        <div className={styles.exhibitMeta}>
          <span>
            {item.categoryLabel} · by {item.authorName}
          </span>
          <strong>
            {item.modelLabel}
            {item.modelRunCount > 1 ? ` · ${item.modelRunCount} runs` : ''}
          </strong>
        </div>
        {/* key on the artifact so a shuffle is a hard cut, not a cross-fade */}
        <PlayableExhibit key={item.artifactPath} item={item} height="clamp(300px, 38vw, 430px)" />
        <p className={styles.exhibitCaption}>{item.title}</p>
      </div>
    </div>
  )
}
