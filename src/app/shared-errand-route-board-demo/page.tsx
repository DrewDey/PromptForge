import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { SHARED_ERRAND_ROUTE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function SharedErrandRouteDemoPage() {
  return (
    <PreparedSourceRunPage
      project={SHARED_ERRAND_ROUTE_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('shared-errand-route-board-gemini-source-run.json')}
      route="/shared-errand-route-board-demo"
      capturedAt="June 5, 2026"
    />
  )
}
