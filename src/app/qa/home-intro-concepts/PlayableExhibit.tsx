'use client'

/* A hero exhibit you can actually touch.
 *
 * The production hero renders the same artifact through ProjectPreview, which
 * wraps it in `pointer-events: none` + `inert`. The artifact underneath is
 * already live — these concepts only remove the glass, so the security posture
 * is unchanged: same ProtectedArtifactFrame, same sandbox, downloads off.
 *
 * Interaction is opt-in behind a click. That keeps a page full of exhibits from
 * grabbing scroll or keyboard on load, and makes the invitation explicit. */

import { useState } from 'react'
import {
  ProtectedArtifactFrame,
  type ArtifactPackage,
} from '@/components/SourceRunShowcase'
import type { ConceptItem } from './concept-items'
import styles from './page.module.css'

type Props = {
  item: ConceptItem
  /** CSS height for the exhibit box. */
  height: string
  /** Small tiles skip the activation affordance and stay visual-only. */
  interactive?: boolean
  className?: string
}

export function PlayableExhibit({
  item,
  height,
  interactive = true,
  className = '',
}: Props) {
  const [live, setLive] = useState(false)

  const selectedPackage: ArtifactPackage = {
    id: `concept-exhibit:${item.artifactPath}`,
    stepId: `concept-exhibit:${item.artifactPath}`,
    stepNumber: 1,
    title: item.title,
    prompt: '',
    response: '',
    artifactPath: item.artifactPath,
    artifactTitle: item.title,
    artifactOrdinal: 1,
    artifactCount: 1,
    isDefaultArtifact: true,
  }

  const frameId = `concept-${item.artifactPath
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`

  return (
    <div
      className={`${styles.exhibit} ${className}`.trim()}
      style={{ height }}
      data-exhibit-live={live ? 'true' : 'false'}
    >
      <div
        className={styles.exhibitFrame}
        style={{ pointerEvents: live ? 'auto' : 'none' }}
        // Keep the artifact out of the tab order until the visitor opts in.
        inert={!live}
      >
        <ProtectedArtifactFrame
          selectedPackage={selectedPackage}
          providerName="AI"
          showOpenAction={false}
          frameHeight="100%"
          bare
          frameId={frameId}
          allowArtifactDownloads={false}
          allowArtifactScripts
        />
      </div>

      {interactive && !live && (
        <button
          type="button"
          className={styles.exhibitActivate}
          onClick={() => setLive(true)}
        >
          <span className={styles.exhibitActivateLabel}>Click to play</span>
          <span className={styles.exhibitActivateSub}>
            {item.title} · real result
          </span>
        </button>
      )}

      {live && (
        <span className={styles.exhibitLiveTag} aria-live="polite">
          Live · you are using the real thing
        </span>
      )}
    </div>
  )
}
