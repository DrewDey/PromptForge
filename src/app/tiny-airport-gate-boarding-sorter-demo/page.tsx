import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { TINY_AIRPORT_GATE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function TinyAirportGateBoardingSorterDemoPage() {
  return (
    <PreparedSourceRunPage
      project={TINY_AIRPORT_GATE_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('tiny-airport-gate-boarding-sorter-chatgpt-source-run.json')}
      route="/tiny-airport-gate-boarding-sorter-demo"
      capturedAt="June 6, 2026"
    />
  )
}
