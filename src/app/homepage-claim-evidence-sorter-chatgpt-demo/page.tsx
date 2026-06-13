import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { HOMEPAGE_CLAIM_EVIDENCE_SORTER_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = HOMEPAGE_CLAIM_EVIDENCE_SORTER_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function HomepageClaimEvidenceSorterChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('homepage-claim-evidence-sorter-chatgpt-source-run.json')}
      route="/homepage-claim-evidence-sorter-chatgpt-demo"
      capturedAt="June 12, 2026"
    />
  )
}
