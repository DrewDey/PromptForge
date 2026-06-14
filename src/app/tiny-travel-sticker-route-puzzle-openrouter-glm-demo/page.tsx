import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { TINY_TRAVEL_STICKER_ROUTE_PUZZLE_OPENROUTER_GLM_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = TINY_TRAVEL_STICKER_ROUTE_PUZZLE_OPENROUTER_GLM_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function TinyTravelStickerRoutePuzzleOpenrouterGlmDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('tiny-travel-sticker-route-puzzle-openrouter-glm-source-run.json')}
      route="/tiny-travel-sticker-route-puzzle-openrouter-glm-demo"
      capturedAt="June 14, 2026"
    />
  )
}
