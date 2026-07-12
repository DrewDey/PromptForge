import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { ROOMMATE_FREEZER_BOARD_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function RoommateFreezerBoardDemoPage() {
  return (
    <PreparedSourceRunPage
      project={ROOMMATE_FREEZER_BOARD_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('roommate-freezer-board-gemini-source-run.json')}
      capturedAt="June 6, 2026"
    />
  )
}
