import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { REFERENCE_IMAGE_CHANGE_RECEIPT_BOARD_OPENROUTER_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = REFERENCE_IMAGE_CHANGE_RECEIPT_BOARD_OPENROUTER_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ReferenceImageChangeReceiptBoardOpenrouterDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('reference-image-change-receipt-board-openrouter-source-run.json')}
      route="/reference-image-change-receipt-board-openrouter-demo"
      capturedAt="June 14, 2026"
    />
  )
}
