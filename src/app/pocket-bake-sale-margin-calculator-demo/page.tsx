import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { BAKE_SALE_MARGIN_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function BakeSaleMarginDemoPage() {
  return (
    <PreparedSourceRunPage
      project={BAKE_SALE_MARGIN_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('bake-sale-margin-gemini-source-run.json')}
      route="/pocket-bake-sale-margin-calculator-demo"
      capturedAt="June 5, 2026"
    />
  )
}
