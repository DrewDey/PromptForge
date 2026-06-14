import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { TRAVEL_POSTER_LAYOUT_STAMP_GAME_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = TRAVEL_POSTER_LAYOUT_STAMP_GAME_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function TravelPosterLayoutStampGameGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('travel-poster-layout-stamp-game-gemini-source-run.json')}
      route="/travel-poster-layout-stamp-game-gemini-demo"
      capturedAt="June 13, 2026"
    />
  )
}
