import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { NEIGHBORHOOD_LOST_AND_FOUND_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function NeighborhoodLostAndFoundClaimBoardDemoPage() {
  return (
    <PreparedSourceRunPage
      project={NEIGHBORHOOD_LOST_AND_FOUND_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('neighborhood-lost-and-found-claim-board-gemini-source-run.json')}
      capturedAt="June 6, 2026"
    />
  )
}
