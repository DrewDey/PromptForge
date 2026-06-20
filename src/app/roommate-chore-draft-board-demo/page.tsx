import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { ROOMMATE_CHORE_DRAFT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function RoommateChoreDraftDemoPage() {
  return (
    <PreparedSourceRunPage
      project={ROOMMATE_CHORE_DRAFT_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('roommate-chore-draft-board-gemini-source-run.json')}
      capturedAt="June 5, 2026"
    />
  )
}
