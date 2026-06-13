import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { PRODUCT_DESCRIPTION_SHELF_CARD_STRESS_TESTER_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = PRODUCT_DESCRIPTION_SHELF_CARD_STRESS_TESTER_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ProductDescriptionShelfCardStressTesterChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('product-description-shelf-card-stress-tester-chatgpt-source-run.json')}
      route="/product-description-shelf-card-stress-tester-chatgpt-demo"
      capturedAt="June 12, 2026"
    />
  )
}
