import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { POCKET_RALLY_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/pocket-rally-chatgpt-source-run.json'

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
