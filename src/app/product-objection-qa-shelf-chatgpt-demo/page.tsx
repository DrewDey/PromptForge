import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { PRODUCT_OBJECTION_QA_SHELF_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = PRODUCT_OBJECTION_QA_SHELF_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ProductObjectionQaShelfChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('product-objection-qa-shelf-chatgpt-source-run.json')}
      route="/product-objection-qa-shelf-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
