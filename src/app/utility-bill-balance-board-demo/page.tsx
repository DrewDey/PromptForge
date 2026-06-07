import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { UTILITY_BILL_BALANCE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function UtilityBillBalanceBoardDemoPage() {
  return (
    <PreparedSourceRunPage
      project={UTILITY_BILL_BALANCE_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('utility-bill-balance-board-gemini-source-run.json')}
      route="/utility-bill-balance-board-demo"
      capturedAt="June 6, 2026"
    />
  )
}
