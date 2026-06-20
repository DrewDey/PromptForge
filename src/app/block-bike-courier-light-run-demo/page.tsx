import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { BLOCK_BIKE_COURIER_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function BlockBikeCourierLightRunDemoPage() {
  return (
    <PreparedSourceRunPage
      project={BLOCK_BIKE_COURIER_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('bike-courier-light-run-chatgpt-source-run.json')}
      capturedAt="June 6, 2026"
    />
  )
}
