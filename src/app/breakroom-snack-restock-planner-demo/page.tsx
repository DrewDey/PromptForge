import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { BREAKROOM_SNACK_RESTOCK_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function BreakroomSnackRestockDemoPage() {
  return (
    <PreparedSourceRunPage
      project={BREAKROOM_SNACK_RESTOCK_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('breakroom-snack-restock-planner-gemini-source-run.json')}
      route="/breakroom-snack-restock-planner-demo"
      capturedAt="June 5, 2026"
    />
  )
}
