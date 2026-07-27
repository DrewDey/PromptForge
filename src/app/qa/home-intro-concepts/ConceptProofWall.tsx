'use client'

/* Concept B — wall of proof.
 *
 * Tiles surround the copy block so the first impression is volume: all of this
 * is real and all of it runs. Only a few tiles are live frames; the rest are
 * typographic stand-ins for the captured thumbnails that would fill them once
 * image capture exists. That split is the honest cost of this concept and the
 * page says so out loud. */

import Link from 'next/link'
import { PlayableExhibit } from './PlayableExhibit'
import type { ConceptItem } from './concept-items'
import styles from './page.module.css'

const LIVE_TILE_COUNT = 6

export function ConceptProofWall({
  featured,
  tiles,
  pathCount,
  artifactCount,
}: {
  featured: ConceptItem
  tiles: ConceptItem[]
  pathCount: number
  artifactCount: number
}) {
  return (
    <div className={styles.wall}>
      <div className={styles.wallGrid}>
        {/* Copy block is placed explicitly; tiles auto-flow around it. */}
        <div className={styles.wallCopy}>
          <p className={styles.kicker}>
            {artifactCount.toLocaleString()} working results · {pathCount.toLocaleString()} paths
          </p>
          <h2 className={styles.heroTitle}>
            All of this <em>actually runs.</em>
          </h2>
          <p className={styles.heroLead}>
            Every tile is a finished thing somebody built with AI, with the
            prompts still attached. Pick one and take it apart.
          </p>

          <div className={styles.wallFeature}>
            <PlayableExhibit item={featured} height="200px" />
          </div>

          <div className={styles.heroLinks}>
            <Link href={featured.href}>Open {featured.title} →</Link>
            <Link href="/paths">Explore every path</Link>
          </div>
        </div>

        {tiles.map((tile, tileIndex) =>
          tileIndex < LIVE_TILE_COUNT ? (
            <div key={tile.id} className={styles.wallTileLive}>
              <PlayableExhibit
                item={tile}
                height="100%"
                interactive={false}
              />
              <span className={styles.wallTileTag}>Live</span>
            </div>
          ) : (
            <Link key={tile.id} href={tile.href} className={styles.wallTile}>
              <span className={styles.wallTileCat}>{tile.categoryLabel}</span>
              <span className={styles.wallTileTitle}>{tile.title}</span>
              <span className={styles.wallTileMeta}>
                {tile.promptCount} {tile.promptCount === 1 ? 'prompt' : 'prompts'}
              </span>
            </Link>
          ),
        )}
      </div>
    </div>
  )
}
