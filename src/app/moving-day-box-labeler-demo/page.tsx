import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { MOVING_DAY_BOX_LABELER_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function MovingDayBoxLabelerDemoPage() {
  return (
    <PreparedSourceRunPage
      project={MOVING_DAY_BOX_LABELER_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('moving-day-box-labeler-gemini-source-run.json')}
      capturedAt="June 6, 2026"
    />
  )
}
