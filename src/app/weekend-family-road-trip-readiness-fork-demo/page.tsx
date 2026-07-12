import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { WEEKEND_CHECKLIST_REAL_FORK_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function WeekendFamilyRoadTripReadinessForkDemoPage() {
  return (
    <PreparedSourceRunPage
      project={WEEKEND_CHECKLIST_REAL_FORK_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('weekend-plan-checklist-chatgpt-family-road-trip-fork.json')}
      capturedAt="June 9, 2026"
    />
  )
}
