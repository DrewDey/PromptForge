import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { FOLLOW_UP_CRM_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/follow-up-crm-chatgpt-gpt55-instant-source-run.json'

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
