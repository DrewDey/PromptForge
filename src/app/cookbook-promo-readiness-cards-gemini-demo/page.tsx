import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { COOKBOOK_PROMO_READINESS_CARDS_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = COOKBOOK_PROMO_READINESS_CARDS_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function CookbookPromoReadinessCardsGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('cookbook-promo-readiness-cards-gemini-source-run.json')}
      route="/cookbook-promo-readiness-cards-gemini-demo"
      capturedAt="June 12, 2026"
    />
  )
}
