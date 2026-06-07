import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { WEEKEND_YARD_SALE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function WeekendYardSaleTableMapperDemoPage() {
  return (
    <PreparedSourceRunPage
      project={WEEKEND_YARD_SALE_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('weekend-yard-sale-table-mapper-gemini-source-run.json')}
      route="/weekend-yard-sale-table-mapper-demo"
      capturedAt="June 6, 2026"
    />
  )
}
