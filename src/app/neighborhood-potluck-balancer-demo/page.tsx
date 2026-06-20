import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { NEIGHBORHOOD_POTLUCK_BALANCER_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function NeighborhoodPotluckBalancerDemoPage() {
  return (
    <PreparedSourceRunPage
      project={NEIGHBORHOOD_POTLUCK_BALANCER_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('neighborhood-potluck-balancer-gemini-source-run.json')}
      capturedAt="June 6, 2026"
    />
  )
}
