import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import sleepSoundMixerVariantSet from '../../../../seed-runs/model-variants/calming-sleep-sound-mixer.json'
import { ModelRunStackDiagram, type RunPlane } from './ModelRunStackDiagram'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Axonometric Model-Run Stack | PathForge QA',
  description:
    'Design concept: drawing the model-run axis as real depth instead of a dropdown.',
  robots: { index: false, follow: false },
}

/* Shape of the fields this concept reads. The full variant record carries more,
 * but a concept page should not couple itself to the launch registry's types. */
type VariantRecord = {
  serviceLabel: string
  modelLabel: string
  modelSettings: string
  promptCount: number
  repairPromptCount: number
  qualityStatus: string
  sourceRunId: string
}

export default function LineageThreeDConceptsPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  const variantSet = sleepSoundMixerVariantSet as unknown as {
    title: string
    canonicalRoute: string
    defaultSourceRunId: string
    contract: { openingPromptExact: string; openingPromptSha256: string }
    variants: VariantRecord[]
  }

  const runs: RunPlane[] = variantSet.variants.map((variant) => ({
    serviceLabel: variant.serviceLabel,
    modelLabel: variant.modelLabel,
    modelSettings: variant.modelSettings,
    promptCount: variant.promptCount,
    repairPromptCount: variant.repairPromptCount,
    qualityStatus: variant.qualityStatus,
    isDefaultRun: variant.sourceRunId === variantSet.defaultSourceRunId,
  }))

  const shaShort = variantSet.contract.openingPromptSha256.slice(0, 12)
  const promptSpread = runs.map((run) => run.promptCount).sort((a, b) => a - b)

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.shell}>
          <p className={styles.kicker}>Design concept · not wired to any page</p>
          <h1>
            The third axis is already in your data. It&apos;s just{' '}
            <em>collapsed into a dropdown.</em>
          </h1>
          <p className={styles.lead}>
            Every model run of a build path answers the byte-identical opening
            prompt, then takes a different number of prompts to reach something
            that works. Today the site says &ldquo;3 model runs&rdquo; and hides
            that behind a selector. Drawn as depth, the comparison becomes the
            picture.
          </p>
          <p className={styles.notice}>
            Preview route · noindex · returns 404 on production
          </p>
        </div>
      </header>

      <section className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Real data · no mock numbers</p>
              <h2>{variantSet.title}</h2>
            </div>
            <p>
              Read straight from{' '}
              <code>seed-runs/model-variants/calming-sleep-sound-mixer.json</code>
              . Plane length is the work each model needed:{' '}
              {promptSpread.join(', ')} prompts. Nothing here is invented — if
              the run data changes, the drawing changes.
            </p>
          </div>

          <div className={styles.sheet}>
            <div className={styles.sheetInner}>
              <ModelRunStackDiagram
                runs={runs}
                openingPromptShaShort={shaShort}
              />
            </div>
            <div className={styles.caption}>
              <span>Fig. 01 — dimetric projection</span>
              <span>X: prompt sequence</span>
              <span>Z: model run</span>
              <span>Server-rendered SVG · 0 new dependencies</span>
            </div>
          </div>

          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <span className={styles.swatch} />
              <span>
                <strong>Opening prompt</strong>
                <p>
                  Identical across all three runs, verified by SHA. The dashed
                  orange tie is the controlled variable.
                </p>
              </span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.swatch} ${styles.swatchRepair}`} />
              <span>
                <strong>Repair prompt</strong>
                <p>
                  Where a model needed another turn. These are the nodes that
                  make one run longer than another.
                </p>
              </span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.swatch} ${styles.swatchArtifact}`} />
              <span>
                <strong>Working artifact</strong>
                <p>
                  Terminates the plane. The ragged right edge across the stack is
                  the actual finding.
                </p>
              </span>
            </div>
            <div className={styles.legendItem}>
              <span className={`${styles.swatch} ${styles.swatchIssue}`} />
              <span>
                <strong>Known issue</strong>
                <p>
                  A run can finish fastest and still be the weakest result. GPT
                  got there in one prompt and carries the flag.
                </p>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Scale test</p>
              <h2>Same drawing, card size.</h2>
            </div>
            <p>
              A concept that only works at hero scale is a poster, not a system.
              Stripped of labels the projection still reads as a run stack, so it
              can sit on a path card without a second asset.
            </p>
          </div>

          <div className={styles.glyphRow}>
            <div className={styles.glyphCard}>
              <figure>
                <ModelRunStackDiagram runs={runs} variant="glyph" />
              </figure>
              <figcaption>3 model runs · glyph at card width</figcaption>
            </div>
            <div className={styles.glyphCard}>
              <figure>
                <ModelRunStackDiagram runs={runs.slice(0, 2)} variant="glyph" />
              </figure>
              <figcaption>2 model runs · degrades cleanly</figcaption>
            </div>
            <div className={styles.glyphCard}>
              <figure>
                <ModelRunStackDiagram runs={runs.slice(0, 1)} variant="glyph" />
              </figure>
              <figcaption>1 run · single plane, no stack</figcaption>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.shell}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.kicker}>Honest read</p>
              <h2>Where I&apos;d use it — and where I wouldn&apos;t.</h2>
            </div>
            <p>
              This is one contained element. Nothing on the homepage, browse, or
              detail pages changed to show it to you.
            </p>
          </div>

          <div className={styles.notes}>
            <ul>
              <li>
                <strong>Best home:</strong> the model-comparison surface on a
                detail page, where a visitor is already asking &ldquo;which model
                did this better?&rdquo; The stack answers it before they open the
                selector.
              </li>
              <li>
                <strong>Second home:</strong> the{' '}
                <Link href="/guide">guide</Link>, as the diagram that explains
                what a build path actually is. It replaces an explanation, which
                is the only justification for a graphic this size.
              </li>
              <li>
                <strong>Why it stays flat-tone:</strong> hairlines, sharp
                corners, mono labels, one orange accent. No gloss, no shadow, no
                perspective vanishing point — a drafting projection, not a 3D
                render. That&apos;s what keeps it in the same family as the rest
                of the site.
              </li>
              <li className={styles.against}>
                <strong>Where it fails:</strong> paths with one run. Two-thirds
                of the catalog has a single model run, so the stack collapses to
                one plane and earns nothing. It should render only when a path
                has 2+ runs.
              </li>
              <li className={styles.against}>
                <strong>The real cost:</strong> it adds a second visual language
                for lineage next to the existing fork chips. If this ships, the
                fork explorer should adopt the same projection or the site ends
                up with two grammars for the same idea.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
