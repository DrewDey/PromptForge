import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { FLASHCARD_CRAM_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/flashcard-cram-gemini-31-pro-source-run.json'

export default function FlashcardCramDrillDemoPage() {
  return (
    <PreparedSourceRunPage
      project={FLASHCARD_CRAM_SHOWCASE_PROJECT}
      sourceRunPackage={sourceRunPackage}
      route="/flashcard-cram-drill-demo"
      capturedAt="June 4, 2026"
    />
  )
}
