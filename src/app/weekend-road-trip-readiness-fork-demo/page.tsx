import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { WEEKEND_CHECKLIST_FORK_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function WeekendRoadTripReadinessForkDemoPage() {
  return (
    <PreparedSourceRunPage
      project={WEEKEND_CHECKLIST_FORK_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('weekend-road-trip-readiness-codex-fork-source-run.json')}
      route="/weekend-road-trip-readiness-fork-demo"
      capturedAt="June 7, 2026"
    />
  )
}
