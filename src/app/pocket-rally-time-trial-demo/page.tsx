import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { POCKET_RALLY_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/pocket-rally-chatgpt-source-run.json'

export const metadata = buildPreparedSourceRunDetailMetadata(POCKET_RALLY_SHOWCASE_PROJECT)

export default function PocketRallyTimeTrialDemoPage() {
  return (
    <PreparedSourceRunPage
      project={POCKET_RALLY_SHOWCASE_PROJECT}
      sourceRunPackage={sourceRunPackage}
      route="/pocket-rally-time-trial-demo"
      capturedAt="June 5, 2026"
    />
  )
}
