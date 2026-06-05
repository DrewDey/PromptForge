import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { TINY_FARMERS_MARKET_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function TinyFarmersMarketDemoPage() {
  return (
    <PreparedSourceRunPage
      project={TINY_FARMERS_MARKET_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('tiny-farmers-market-booth-claude-source-run.json')}
      route="/tiny-farmers-market-booth-simulator-demo"
      capturedAt="June 5, 2026"
    />
  )
}
