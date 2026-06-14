import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { PORTFOLIO_CASE_STUDY_PROOF_CARDS_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = PORTFOLIO_CASE_STUDY_PROOF_CARDS_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function PortfolioCaseStudyProofCardsChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('portfolio-case-study-proof-cards-chatgpt-source-run.json')}
      route="/portfolio-case-study-proof-cards-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
