import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { FLASHCARD_CRAM_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/flashcard-cram-gemini-31-pro-source-run.json'

export const metadata = buildPreparedSourceRunDetailMetadata(FLASHCARD_CRAM_SHOWCASE_PROJECT)

export default function FlashcardCramDrillDemoPage() {
  return (
    <PreparedSourceRunPage
      project={FLASHCARD_CRAM_SHOWCASE_PROJECT}
      sourceRunPackage={sourceRunPackage}
      capturedAt="June 4, 2026"
    />
  )
}
