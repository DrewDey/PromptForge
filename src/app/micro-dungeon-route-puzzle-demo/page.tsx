import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { MICRO_DUNGEON_ROUTE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function MicroDungeonRouteDemoPage() {
  return (
    <PreparedSourceRunPage
      project={MICRO_DUNGEON_ROUTE_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('micro-dungeon-route-chatgpt-source-run.json')}
      route="/micro-dungeon-route-puzzle-demo"
      capturedAt="June 5, 2026"
    />
  )
}
