import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { NEIGHBORHOOD_SNOW_ROUTE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function NeighborhoodSnowRoutePlowPuzzleDemoPage() {
  return (
    <PreparedSourceRunPage
      project={NEIGHBORHOOD_SNOW_ROUTE_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('neighborhood-snow-route-plow-puzzle-chatgpt-source-run.json')}
      capturedAt="June 6, 2026"
    />
  )
}
