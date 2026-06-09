import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { FOLLOW_UP_CRM_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/follow-up-crm-chatgpt-gpt55-instant-source-run.json'

export const metadata = buildPreparedSourceRunDetailMetadata(FOLLOW_UP_CRM_SHOWCASE_PROJECT)

export default function FollowUpCrmTrackerDemoPage() {
  return (
    <PreparedSourceRunPage
      project={FOLLOW_UP_CRM_SHOWCASE_PROJECT}
      sourceRunPackage={sourceRunPackage}
      route="/follow-up-crm-tracker-demo"
      capturedAt="June 4, 2026"
    />
  )
}
