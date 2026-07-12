import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { POCKET_PIRATE_MAP_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function PocketPirateMapDemoPage() {
  return (
    <PreparedSourceRunPage
      project={POCKET_PIRATE_MAP_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('pocket-pirate-map-decoder-chatgpt-source-run.json')}
      capturedAt="June 5, 2026"
    />
  )
}
