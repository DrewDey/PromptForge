import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { LANDING_PAGE_PROOF_RECEIPT_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = LANDING_PAGE_PROOF_RECEIPT_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function LandingPageProofReceiptChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('landing-page-proof-receipt-chatgpt-source-run.json')}
      route="/landing-page-proof-receipt-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
