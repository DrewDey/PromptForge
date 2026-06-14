import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { TRAVEL_POSTER_LANDMARK_LAYER_GAME_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = TRAVEL_POSTER_LANDMARK_LAYER_GAME_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function TravelPosterLandmarkLayerGameClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('travel-poster-landmark-layer-game-claude-source-run.json')}
      route="/travel-poster-landmark-layer-game-claude-demo"
      capturedAt="June 13, 2026"
    />
  )
}
