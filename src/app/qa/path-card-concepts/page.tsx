import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  InteractiveBuildPathCard,
  type BuildPathCardClientItem,
} from '@/components/discovery/InteractiveBuildPathCard'
import { getCategories, getPrompts } from '@/lib/data'
import { buildPathDiscoveryCatalog } from '@/lib/path-discovery'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'
import styles from './page.module.css'
import '../../browse.css'

const BOOKING_FLOW_PROJECT_ID = '0ddfc7cf-37bf-47ae-8fe0-d8d445ba1bee'
const BOOKING_FLOW_PROJECT_SOURCE_RUN_ID = '08c8b725-4228-4b24-a6e6-5d7fcf78457c'
const BOOKING_FLOW_GEMINI_SOURCE_RUN_ID = '4fcd2293646af036'
const EXPECTED_SOURCE_RUN_IDS = new Set([
  BOOKING_FLOW_PROJECT_SOURCE_RUN_ID,
  BOOKING_FLOW_GEMINI_SOURCE_RUN_ID,
  'c42eebed94a0395e',
])

export const metadata: Metadata = {
  title: 'Pull-Down Model Index | PathForge QA',
  description: 'The selected production model selector using all three recorded Booking Flow artifacts.',
  robots: { index: false, follow: false },
}

export default async function PathCardConceptsPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  const project = getPreparedShowcaseProjectBySourceRunId(BOOKING_FLOW_PROJECT_SOURCE_RUN_ID)
  const [categories, prompts] = await Promise.all([getCategories(), getPrompts({ sort: 'newest' })])
  const discoveryItem = buildPathDiscoveryCatalog(prompts, categories).find((item) => (
    item.id === BOOKING_FLOW_PROJECT_ID
  ))
  if (!project || !discoveryItem) notFound()

  const variants = discoveryItem.modelVariants

  const hasExactFixture = (
    variants.length === EXPECTED_SOURCE_RUN_IDS.size &&
    variants.every((variant) => EXPECTED_SOURCE_RUN_IDS.has(variant.sourceRunId)) &&
    variants[0]?.sourceRunId === BOOKING_FLOW_GEMINI_SOURCE_RUN_ID
  )
  if (!hasExactFixture) notFound()

  const item: BuildPathCardClientItem = {
    id: project.id,
    title: project.title,
    description: project.description,
    categoryLabel: discoveryItem.categoryLabel,
    authorName: project.authorDisplayName,
    authorProvenanceKind: discoveryItem.authorProvenanceKind,
    modelRunCount: discoveryItem.modelRunCount,
    verifiedModelRunCount: discoveryItem.verifiedModelRunCount,
    hasWorkingArtifact: true,
    hasFork: discoveryItem.hasFork,
    isFork: discoveryItem.isFork,
    forkCount: discoveryItem.forkCount,
    isActive: discoveryItem.isActive,
    preview: discoveryItem.preview,
    modelVariants: variants,
  }

  return (
    <div className={`pf-paths ${styles.page}`}>
      <header className={styles.header}>
        <div>
          <span>Selected production treatment</span>
          <h1>Pull-Down Index</h1>
          <p>
            One Forge Slab. The attached manila index changes the model artifact,
            capture date, prompt receipt, and destination without moving the card.
          </p>
        </div>
        <Link href="/paths">Back to Explore</Link>
      </header>

      <section className={styles.review} aria-label="Selected PathForge project-card treatment">
        <InteractiveBuildPathCard item={item} />
        <aside>
          <strong>Production rules</strong>
          <ul>
            <li>Every distinct recorded model identity, including disclosed known issues.</li>
            <li>Known issues retain a visible warning and source-backed explanation.</li>
            <li>Newest capture is shown first.</li>
            <li>New orders by capture date; Active orders by real published-project usage.</li>
            <li>The Forge Slab dimensions stay fixed while artifacts change.</li>
          </ul>
        </aside>
      </section>
    </div>
  )
}
