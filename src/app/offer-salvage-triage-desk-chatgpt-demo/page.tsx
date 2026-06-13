import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { OFFER_SALVAGE_TRIAGE_DESK_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = OFFER_SALVAGE_TRIAGE_DESK_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function OfferSalvageTriageDeskChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('offer-salvage-triage-desk-chatgpt-source-run.json')}
      route="/offer-salvage-triage-desk-chatgpt-demo"
      capturedAt="June 12, 2026"
    />
  )
}
