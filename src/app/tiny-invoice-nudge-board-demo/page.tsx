import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { TINY_INVOICE_NUDGE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function TinyInvoiceNudgeBoardDemoPage() {
  return (
    <PreparedSourceRunPage
      project={TINY_INVOICE_NUDGE_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('tiny-invoice-nudge-board-gemini-source-run.json')}
      route="/tiny-invoice-nudge-board-demo"
      capturedAt="June 6, 2026"
    />
  )
}
