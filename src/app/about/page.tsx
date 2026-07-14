import Link from 'next/link'
import type { Metadata } from 'next'
import { canonicalMetadata } from '@/lib/site-url'
import styles from './about.module.css'

export const metadata: Metadata = {
  title: 'About — PathForge',
  description: 'The vision, evidence standard, and publishing principles behind PathForge.',
  ...canonicalMetadata('/about'),
}

const evidencePrinciples = [
  {
    number: '01',
    title: 'Start with the result',
    body: 'A path should lead to a finished, production-servable artifact people can inspect and use—not stop at a clever prompt or a description of what might be built.',
  },
  {
    number: '02',
    title: 'Keep the run attached',
    body: 'The exact prompts, visible model responses, provider and model details, and real artifact versions stay with the project. The evidence is part of the product.',
  },
  {
    number: '03',
    title: 'Show how it changes',
    body: 'A fork keeps the shared path visible. A new model run keeps its own source evidence. Improvement should add history, not rewrite it.',
  },
] as const

const publishingStandards = [
  {
    label: 'Useful',
    title: 'There is a real outcome worth opening.',
    body: 'The artifact works, has a clear purpose, and offers more than a generic demo or a transcript dressed up as a project.',
  },
  {
    label: 'Traceable',
    title: 'The source run can be inspected.',
    body: 'Prompts and responses are preserved as they appeared, model information is explicit, and each artifact is attached to the step that actually produced it.',
  },
  {
    label: 'Legible',
    title: 'The project tells one coherent build story.',
    body: 'The title, summary, artifact, prompt chain, and lineage agree. A visitor should understand what changed without reconstructing the history themselves.',
  },
  {
    label: 'Attributable',
    title: 'Ownership and operation are clear.',
    body: 'Projects live under profiles. Community work, official PathForge work, and developer-operated model runs are labeled for what they are.',
  },
  {
    label: 'Reviewed',
    title: 'Submission is not publication.',
    body: 'New builds enter review before they become public. Weak, broken, unsafe, incomplete, or misleading work does not receive a product page simply because it was submitted.',
  },
] as const

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <header className={styles.masthead}>
        <div className={styles.shell}>
          <p className={styles.kicker}>PathForge / why it exists</p>
          <div className={styles.heroLayout}>
            <div className={styles.heroCopy}>
              <h1>The work matters more than the prompt.</h1>
              <p className={styles.lead}>
                PathForge is a library of finished projects built with AI, preserved with the exact
                evidence that produced them. Open the result first. Inspect the path behind it. Then
                carry the strongest work forward without losing where it came from.
              </p>
              <div className={styles.heroActions}>
                <Link href="/paths" className={styles.primaryLink}>
                  Explore build paths <span aria-hidden="true">→</span>
                </Link>
                <Link href="/guide" className={styles.textLink}>
                  See how PathForge works
                </Link>
              </div>
            </div>

            <aside className={styles.definition} aria-label="PathForge in one sentence">
              <p className={styles.definitionLabel}>The compact definition</p>
              <p className={styles.definitionText}>
                A public record of <strong>what worked</strong>, <strong>how it was made</strong>, and
                <strong> what happened next</strong>.
              </p>
              <dl className={styles.ledger}>
                <div>
                  <dt>Outcome</dt>
                  <dd>Finished artifact</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>Exact source run</dd>
                </div>
                <div>
                  <dt>Evolution</dt>
                  <dd>Forks + model history</dd>
                </div>
                <div>
                  <dt>Trust</dt>
                  <dd>Reviewed + attributable</dd>
                </div>
              </dl>
            </aside>
          </div>
        </div>
      </header>

      <section className={styles.section} aria-labelledby="evidence-title">
        <div className={`${styles.shell} ${styles.sectionLayout}`}>
          <div className={styles.sectionIntro}>
            <p className={styles.sectionNumber}>01 / The unit of value</p>
            <h2 id="evidence-title">An outcome with its evidence still attached.</h2>
            <p>
              A prompt alone is easy to copy and hard to trust. PathForge keeps the working result and
              the decisions behind it in the same place.
            </p>
          </div>

          <ol className={styles.principleList}>
            {evidencePrinciples.map((principle) => (
              <li key={principle.number} className={styles.principle}>
                <span className={styles.principleNumber}>{principle.number}</span>
                <div>
                  <h3>{principle.title}</h3>
                  <p>{principle.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={`${styles.section} ${styles.evolution}`} aria-labelledby="evolution-title">
        <div className={styles.shell}>
          <div className={styles.wideHeading}>
            <p className={styles.sectionNumber}>02 / Project evolution</p>
            <h2 id="evolution-title">Two ways a project grows. They are not the same thing.</h2>
            <p>
              PathForge keeps both forms of progress visible while preserving the distinction between
              community authorship and platform-operated comparison work.
            </p>
          </div>

          <div className={styles.lanes}>
            <article className={styles.lane}>
              <div className={styles.laneHeader}>
                <span className={styles.laneMarker} aria-hidden="true">↳</span>
                <div>
                  <p className={styles.laneType}>Community branch</p>
                  <h3>A fork chooses a new direction.</h3>
                </div>
              </div>
              <p>
                A fork begins from one exact response in an existing path. The shared prompts and
                responses remain visible, the branch point stays attached, and the new work belongs to
                the builder who continued it.
              </p>
              <p className={styles.laneRule}>Same history. New owner. New direction.</p>
            </article>

            <article className={styles.lane}>
              <div className={styles.laneHeader}>
                <span className={`${styles.laneMarker} ${styles.laneMarkerBlue}`} aria-hidden="true">≋</span>
                <div>
                  <p className={styles.laneType}>Model history</p>
                  <h3>A model run tests the project again.</h3>
                </div>
              </div>
              <p>
                PathForge developers can run the same project contract with another model. Each run
                keeps its own prompts, responses, settings, and artifact versions, then appears in the
                project&apos;s model selector for direct comparison.
              </p>
              <p className={styles.laneRule}>Independent evidence. Same project. Not a community fork.</p>
            </article>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.standards}`} aria-labelledby="standards-title">
        <div className={`${styles.shell} ${styles.sectionLayout}`}>
          <div className={styles.sectionIntro}>
            <p className={styles.sectionNumber}>03 / Publishing standard</p>
            <h2 id="standards-title">A page is earned by the work.</h2>
            <p>
              PathForge is seeded enough to be useful, but inventory is not the goal. Review protects
              the library from becoming a pile of interchangeable AI output.
            </p>
          </div>

          <ol className={styles.standardList}>
            {publishingStandards.map((standard) => (
              <li key={standard.label} className={styles.standard}>
                <p className={styles.standardLabel}>{standard.label}</p>
                <div>
                  <h3>{standard.title}</h3>
                  <p>{standard.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={styles.trust} aria-labelledby="trust-title">
        <div className={`${styles.shell} ${styles.trustLayout}`}>
          <div>
            <p className={styles.sectionNumber}>04 / The trust rule</p>
            <h2 id="trust-title">Nothing gets a head start it did not earn.</h2>
          </div>
          <div className={styles.trustCopy}>
            <p>
              Public work belongs to a real profile. Votes, bookmarks, comments, and forks come from
              real activity. New projects start without manufactured momentum, and developer-operated
              runs are identified instead of being passed off as community contributions.
            </p>
            <p>
              That restraint is deliberate. The library only becomes more valuable over time if people
              can trust the artifact, the source evidence, the lineage, and the signals around it.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="closing-title">
        <div className={styles.shell}>
          <p className={styles.kicker}>The long game</p>
          <div className={styles.closingLayout}>
            <h2 id="closing-title">A useful project should appreciate as the models improve.</h2>
            <div>
              <p>
                PathForge does not have to replace an older run to show a better one. It can keep the
                original evidence, add a new developer-operated model result, and let visitors see the
                difference. The project becomes a living benchmark without pretending its history never
                happened.
              </p>
              <div className={styles.closingActions}>
                <Link href="/paths" className={styles.primaryLink}>
                  Find a project <span aria-hidden="true">→</span>
                </Link>
                <Link href="/build" className={styles.secondaryLink}>
                  Share finished work
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
