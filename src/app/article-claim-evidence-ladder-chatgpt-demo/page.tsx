import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { ARTICLE_CLAIM_EVIDENCE_LADDER_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = ARTICLE_CLAIM_EVIDENCE_LADDER_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ArticleClaimEvidenceLadderChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('article-claim-evidence-ladder-chatgpt-source-run.json')}
      route="/article-claim-evidence-ladder-chatgpt-demo"
      capturedAt="June 12, 2026"
    />
  )
}
