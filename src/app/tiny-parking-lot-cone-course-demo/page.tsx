import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { TINY_PARKING_LOT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function TinyParkingLotConeCourseDemoPage() {
  return (
    <PreparedSourceRunPage
      project={TINY_PARKING_LOT_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('tiny-parking-lot-cone-course-chatgpt-source-run.json')}
      capturedAt="June 6, 2026"
    />
  )
}
