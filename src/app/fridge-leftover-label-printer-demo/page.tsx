import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { FRIDGE_LEFTOVER_LABEL_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function FridgeLeftoverLabelPrinterDemoPage() {
  return (
    <PreparedSourceRunPage
      project={FRIDGE_LEFTOVER_LABEL_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('fridge-leftover-label-printer-gemini-source-run.json')}
      capturedAt="June 6, 2026"
    />
  )
}
