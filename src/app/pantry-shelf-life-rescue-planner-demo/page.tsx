import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { PANTRY_SHELF_LIFE_RESCUE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function PantryShelfLifeRescueDemoPage() {
  return (
    <PreparedSourceRunPage
      project={PANTRY_SHELF_LIFE_RESCUE_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('pantry-shelf-life-rescue-gemini-source-run.json')}
      capturedAt="June 5, 2026"
    />
  )
}
