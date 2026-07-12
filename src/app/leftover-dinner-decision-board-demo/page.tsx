import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { LEFTOVER_DINNER_BOARD_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function LeftoverDinnerBoardDemoPage() {
  return (
    <PreparedSourceRunPage
      project={LEFTOVER_DINNER_BOARD_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('leftover-dinner-board-gemini-source-run.json')}
      capturedAt="June 5, 2026"
    />
  )
}
