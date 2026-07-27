import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ConceptPromptFirst } from './ConceptPromptFirst'
import { ConceptProofWall } from './ConceptProofWall'
import { ConceptShuffleHero } from './ConceptShuffleHero'
import type { ConceptItem } from './concept-items'
import {
  buildPathDiscoveryCatalog,
  recommendedOrder,
  type BuildPathDiscoveryItem,
} from '@/lib/path-discovery'
import {
  getCachedPublicCategories,
  getCachedPublicPrompts,
} from '@/lib/public-catalog-cache'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Homepage Intro Concepts | PathForge QA',
  description:
    'Three live homepage intro concepts, side by side, before any of them touch the real homepage.',
  robots: { index: false, follow: false },
}

/** Pulls the builder's own opening prompt when the catalog row carries steps. */
function openingPromptOf(item: BuildPathDiscoveryItem) {
  const steps = item.prompt.steps
  if (!steps || steps.length === 0) return null
  const ordered = [...steps].sort((a, b) => a.step_number - b.step_number)
  const first = ordered[0]?.content?.trim()
  return first && first.length > 0 ? first : null
}

function toConceptItem(item: BuildPathDiscoveryItem): ConceptItem | null {
  if (!item.artifactPath) return null
  return {
    id: item.id,
    href: item.href,
    title: item.title,
    categoryLabel: item.categoryLabel,
    authorName: item.authorName,
    promptCount: item.promptCount || 1,
    modelLabel: item.modelLabel,
    modelRunCount: item.modelRunCount,
    artifactPath: item.artifactPath,
    preview: item.preview,
    openingPrompt: openingPromptOf(item),
  }
}

export default async function HomeIntroConceptsPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  const [categories, prompts] = await Promise.all([
    getCachedPublicCategories(),
    getCachedPublicPrompts({ sort: 'newest', limit: 300 }),
  ])
  const catalog = buildPathDiscoveryCatalog(prompts, categories)
  const ranked = recommendedOrder(catalog)

  // Concepts only ever show trusted, artifact-backed paths. Community uploads
  // stay visual-only everywhere, so they are not eligible to be played.
  const playable = ranked
    .filter((item) => item.hasWorkingArtifact && !item.isCommunityArtifact)
    .map(toConceptItem)
    .filter((item): item is ConceptItem => item !== null)

  if (playable.length === 0) notFound()

  // Games lead the shuffle deck — they are the fastest thing to "get".
  const games = playable.filter((item) => item.preview === 'game')
  const rest = playable.filter((item) => item.preview !== 'game')
  const deck = [...games, ...rest].slice(0, 10)

  const withPrompt = playable.filter((item) => item.openingPrompt !== null)
  const promptDeck = (withPrompt.length > 0 ? withPrompt : playable).slice(0, 8)

  const featured = deck[0]
  // 32 tiles fills exactly four rows of the eight-column wall, so the floating
  // copy panel always has grid behind it instead of running off the bottom.
  const tiles = playable.slice(1, 33)

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={styles.shell}>
          <p className={styles.kicker}>Three homepage intros · nothing live has changed</p>
          <h1>
            Pick the one that feels like <em>PathForge.</em>
          </h1>
          <p className={styles.lead}>
            All three run on your real catalog and your real artifacts. Every
            exhibit below is playable — click it and you are using the actual
            thing someone built, not a picture of it. Your live homepage is
            untouched.
          </p>
          <p className={styles.notice}>
            Preview route · noindex · returns 404 on production
          </p>
        </div>
      </header>

      <section className={styles.concept}>
        <div className={styles.shell}>
          <div className={styles.conceptLabel}>
            <span className={styles.conceptTag}>Concept A</span>
            <div>
              <h2>Playable hero + shuffle</h2>
              <p>
                The exhibit is the product. Shuffle deals another real build with
                a hard cut — aimed at the visitor who has AI tools and no idea
                what to make. Press <kbd className={styles.kbd}>R</kbd> anywhere.
              </p>
            </div>
          </div>
        </div>
        <div className={styles.conceptStage}>
          <div className={styles.shell}>
            <ConceptShuffleHero deck={deck} pathCount={catalog.length} />
          </div>
        </div>
      </section>

      <section className={styles.concept}>
        <div className={styles.shell}>
          <div className={styles.conceptLabel}>
            <span className={styles.conceptTag}>Concept B</span>
            <div>
              <h2>Wall of proof</h2>
              <p>
                Volume as the first impression. Six tiles are live frames; the
                rest are typographic stand-ins for thumbnails you do not have
                yet — that gap is this concept&apos;s real cost, and it is why it
                needs image capture before it could ship.
              </p>
            </div>
          </div>
        </div>
        <div className={styles.conceptStage}>
          <div className={styles.shell}>
            <ConceptProofWall
              featured={featured}
              tiles={tiles}
              pathCount={catalog.length}
              artifactCount={playable.length}
            />
          </div>
        </div>
      </section>

      <section className={styles.concept}>
        <div className={styles.shell}>
          <div className={styles.conceptLabel}>
            <span className={styles.conceptTag}>Concept C</span>
            <div>
              <h2>The prompt is the headline</h2>
              <p>
                The builder&apos;s own words on top, the working result
                underneath. Cheapest of the three and the quietest — it states
                the whole proposition in one downward glance.
              </p>
            </div>
          </div>
        </div>
        <div className={styles.conceptStage}>
          <div className={styles.shell}>
            <ConceptPromptFirst deck={promptDeck} />
          </div>
        </div>
      </section>

      <section className={styles.concept}>
        <div className={styles.shell}>
          <div className={styles.conceptLabel}>
            <span className={styles.conceptTag}>Honest read</span>
            <div>
              <h2>What I&apos;d actually ship</h2>
            </div>
          </div>
          <div className={styles.notes}>
            <ul>
              <li>
                <strong>Concept A, and it is not close.</strong> It needs no new
                content, it uses the {playable.length} artifacts you already
                have, and it turns the hero from a screenshot into something
                people poke at.
              </li>
              <li>
                <strong>The one line that unlocks it.</strong> Your hero already
                runs a live app; <code>ProjectPreview</code> seals it with{' '}
                <code>pointer-events: none</code> and <code>inert</code>. These
                concepts reuse the exact same protected frame and sandbox —
                downloads off, scripts on — and only remove the glass.
              </li>
              <li className={styles.against}>
                <strong>Concept B is blocked, not rejected.</strong> Without
                captured thumbnails it is 6 live frames and 20 text boxes.
                Revisit it after image capture lands.
              </li>
              <li className={styles.against}>
                <strong>Cost of A worth knowing:</strong> an interactive hero can
                swallow a click that visitors meant for the page, and every
                shuffle loads a fresh artifact. Click-to-play keeps both
                contained, but it does add a step before the fun starts.
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
