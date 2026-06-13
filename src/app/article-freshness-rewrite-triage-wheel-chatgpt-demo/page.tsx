import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { ARTICLE_FRESHNESS_REWRITE_TRIAGE_WHEEL_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = ARTICLE_FRESHNESS_REWRITE_TRIAGE_WHEEL_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ArticleFreshnessRewriteTriageWheelChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('article-freshness-rewrite-triage-wheel-chatgpt-source-run.json')}
      route="/article-freshness-rewrite-triage-wheel-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
