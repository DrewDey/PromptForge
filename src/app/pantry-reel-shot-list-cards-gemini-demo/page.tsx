import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { PANTRY_REEL_SHOT_LIST_CARDS_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = PANTRY_REEL_SHOT_LIST_CARDS_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function PantryReelShotListCardsGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('pantry-reel-shot-list-cards-gemini-source-run.json')}
      route="/pantry-reel-shot-list-cards-gemini-demo"
      capturedAt="June 12, 2026"
    />
  )
}
