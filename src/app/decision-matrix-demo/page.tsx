import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { DECISION_MATRIX_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export const metadata = buildPreparedSourceRunDetailMetadata(DECISION_MATRIX_SHOWCASE_PROJECT)

export default function DecisionMatrixDemoPage() {
  return (
    <PreparedSourceRunPage
      project={DECISION_MATRIX_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('decision-matrix-gemini-flash-oneshot.json')}
      route="/decision-matrix-demo"
      capturedAt="May 28, 2026"
    />
  )
}
