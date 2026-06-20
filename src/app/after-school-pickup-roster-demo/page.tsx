import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { AFTER_SCHOOL_PICKUP_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function AfterSchoolPickupRosterDemoPage() {
  return (
    <PreparedSourceRunPage
      project={AFTER_SCHOOL_PICKUP_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('after-school-pickup-roster-gemini-source-run.json')}
      capturedAt="June 6, 2026"
    />
  )
}
