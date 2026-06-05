import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { STAR_MAP_SCAVENGER_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function StarMapScavengerDemoPage() {
  return (
    <PreparedSourceRunPage
      project={STAR_MAP_SCAVENGER_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('star-map-scavenger-chatgpt-source-run.json')}
      route="/backyard-star-map-scavenger-hunt-builder-demo"
      capturedAt="June 5, 2026"
    />
  )
}
