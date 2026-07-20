import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  InteractiveBuildPathCard,
  type BuildPathCardClientItem,
} from '@/components/discovery/InteractiveBuildPathCard'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'
import {
  getProjectModelProfileSummary,
  type PublicProjectModelProfileRunSummary,
} from '@/lib/project-model-profile-summaries'
import {
  getProjectModelVariantSet,
  type ProjectModelVariant,
} from '@/lib/project-model-variants'
import type { BuildPathModelVariant } from '@/lib/path-discovery'
import { isPublicModelLabel } from '@/lib/public-model-labels'
import styles from './page.module.css'
import '../../browse.css'

const BOOKING_FLOW_PROJECT_ID = '0ddfc7cf-37bf-47ae-8fe0-d8d445ba1bee'
const BOOKING_FLOW_PROJECT_SOURCE_RUN_ID = '08c8b725-4228-4b24-a6e6-5d7fcf78457c'
const BOOKING_FLOW_GEMINI_SOURCE_RUN_ID = '4fcd2293646af036'
const EXPECTED_VERIFIED_SOURCE_RUN_IDS = new Set([
  BOOKING_FLOW_GEMINI_SOURCE_RUN_ID,
  'c42eebed94a0395e',
])

const CAPTURED_DATE_FORMATTER = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

export const metadata: Metadata = {
  title: 'Pull-Down Model Index | PathForge QA',
  description: 'The selected production model selector using two verified Booking Flow artifacts.',
  robots: { index: false, follow: false },
}

function normalizedArtifactPath(value: string) {
  return value.replace(/^public\//, '/').split('#', 1)[0]
}

function publicLabelForVariant(
  variant: ProjectModelVariant,
  profiles: PublicProjectModelProfileRunSummary[],
) {
  const publicLabel = profiles.find((profile) => (
    profile.modelLabel === variant.modelLabel &&
    profile.serviceLabel === variant.serviceLabel &&
    profile.modelSettings === variant.modelSettings
  ))?.publicModelLabel.trim() ?? ''

  return isPublicModelLabel(publicLabel) ? publicLabel : null
}

function browserVariant(
  variant: ProjectModelVariant,
  profiles: PublicProjectModelProfileRunSummary[],
  canonicalRoute: string,
  defaultSourceRunId: string,
): BuildPathModelVariant | null {
  const publicModelLabel = publicLabelForVariant(variant, profiles)
  const capturedAt = new Date(variant.capturedAt)
  const artifactPath = normalizedArtifactPath(variant.finalArtifactPath)
  if (!publicModelLabel || !artifactPath || Number.isNaN(capturedAt.getTime())) return null

  return {
    sourceRunId: variant.sourceRunId,
    publicModelLabel,
    capturedAt: variant.capturedAt,
    capturedAtLabel: CAPTURED_DATE_FORMATTER.format(capturedAt),
    artifactPath,
    href: variant.sourceRunId === defaultSourceRunId
      ? canonicalRoute
      : `${canonicalRoute}?${new URLSearchParams({ run: variant.sourceRunId }).toString()}`,
    promptCount: variant.promptCount,
  }
}

export default function PathCardConceptsPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  const project = getPreparedShowcaseProjectBySourceRunId(BOOKING_FLOW_PROJECT_SOURCE_RUN_ID)
  const variantSet = getProjectModelVariantSet(BOOKING_FLOW_PROJECT_ID)
  if (!project || !variantSet) notFound()

  const profiles = getProjectModelProfileSummary(BOOKING_FLOW_PROJECT_ID)
  const variants = variantSet.variants
    .filter((variant) => variant.qualityStatus === 'verified')
    .map((variant) => browserVariant(
      variant,
      profiles,
      variantSet.canonicalRoute,
      variantSet.defaultSourceRunId,
    ))
    .filter((variant): variant is BuildPathModelVariant => variant !== null)
    .sort((left, right) => Date.parse(right.capturedAt) - Date.parse(left.capturedAt))

  const hasExactFixture = (
    variants.length === EXPECTED_VERIFIED_SOURCE_RUN_IDS.size &&
    variants.every((variant) => EXPECTED_VERIFIED_SOURCE_RUN_IDS.has(variant.sourceRunId)) &&
    variants[0]?.sourceRunId === BOOKING_FLOW_GEMINI_SOURCE_RUN_ID
  )
  if (!hasExactFixture) notFound()

  const item: BuildPathCardClientItem = {
    id: project.id,
    title: project.title,
    description: project.description,
    categoryLabel: project.categorySlug === 'personal' ? 'Personal & Fun' : 'Productivity',
    modelLabel: variants[0].publicModelLabel,
    authorName: project.authorDisplayName,
    modelRunCount: variants.length,
    verifiedModelCount: variants.length,
    variantsAreVerified: true,
    hasWorkingArtifact: true,
    hasFork: false,
    isFork: false,
    forkCount: 0,
    isActive: true,
    preview: 'utility',
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
            <li>Distinct verified model identities only.</li>
            <li>Newest capture is shown first.</li>
            <li>Active ordering stays locked until per-version activity exists.</li>
            <li>The Forge Slab dimensions stay fixed while artifacts change.</li>
          </ul>
        </aside>
      </section>
    </div>
  )
}
