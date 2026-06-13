import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { PRODUCT_CLAIM_SHELF_AUDIT_CARDS_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = PRODUCT_CLAIM_SHELF_AUDIT_CARDS_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ProductClaimShelfAuditCardsGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('product-claim-shelf-audit-cards-gemini-source-run.json')}
      route="/product-claim-shelf-audit-cards-gemini-demo"
      capturedAt="June 13, 2026"
    />
  )
}
