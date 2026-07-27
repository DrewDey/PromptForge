'use client'

/* Concept C — the prompt is the headline.
 *
 * Request on top in the builder's own words, result underneath. No animation,
 * no reveal: the whole proposition is legible in one downward glance. Shuffle
 * carries over so the pairing keeps changing. */

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { PlayableExhibit } from './PlayableExhibit'
import type { ConceptItem } from './concept-items'
import styles from './page.module.css'

const PROMPT_CLAMP = 340

function clampPrompt(text: string) {
  const trimmed = text.trim().replace(/\s+/g, ' ')
  if (trimmed.length <= PROMPT_CLAMP) return trimmed
  return `${trimmed.slice(0, PROMPT_CLAMP - 1).trimEnd()}…`
}

export function ConceptPromptFirst({ deck }: { deck: ConceptItem[] }) {
  const [index, setIndex] = useState(0)
  const item = deck[index]

  const shuffle = useCallback(() => {
    setIndex((current) => (deck.length < 2 ? current : (current + 1) % deck.length))
  }, [deck.length])

  if (!item) return null

  return (
    <div className={styles.promptFirst}>
      <div className={styles.promptFirstHead}>
        <p className={styles.kicker}>Somebody typed this</p>
        {item.openingPrompt ? (
          <blockquote className={styles.promptQuote}>
            {clampPrompt(item.openingPrompt)}
          </blockquote>
        ) : (
          <blockquote className={styles.promptQuote}>
            {clampPrompt(item.title)}
          </blockquote>
        )}
        <p className={styles.promptByline}>
          — {item.authorName} · {item.modelLabel}
        </p>
      </div>

      <div className={styles.promptRule}>
        <span>
          {item.promptCount} {item.promptCount === 1 ? 'prompt' : 'prompts'} later
        </span>
      </div>

      <div className={styles.promptFirstExhibit}>
        <PlayableExhibit
          key={item.artifactPath}
          item={item}
          height="clamp(300px, 40vw, 460px)"
        />
        <p className={styles.exhibitCaption}>{item.title}</p>
      </div>

      <div className={styles.promptFirstFoot}>
        <Link href={item.href} className={styles.promptFirstCta}>
          See how it got built →
        </Link>
        <button type="button" className={styles.shuffleBtn} onClick={shuffle}>
          Another one <span aria-hidden="true">⟳</span>
        </button>
      </div>
    </div>
  )
}
