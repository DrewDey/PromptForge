import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { SEO_CONTENT_PROMISE_COVERAGE_BOARD_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = SEO_CONTENT_PROMISE_COVERAGE_BOARD_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function SeoContentPromiseCoverageBoardChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('seo-content-promise-coverage-board-chatgpt-source-run.json')}
      route="/seo-content-promise-coverage-board-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
