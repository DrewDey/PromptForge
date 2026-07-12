import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { POTLUCK_TABLE_PLANNER_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function PotluckTablePlannerDemoPage() {
  return (
    <PreparedSourceRunPage
      project={POTLUCK_TABLE_PLANNER_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('potluck-table-planner-gemini-source-run.json')}
      capturedAt="June 5, 2026"
    />
  )
}
