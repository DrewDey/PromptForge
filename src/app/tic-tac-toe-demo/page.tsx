import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { TIC_TAC_TOE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export const metadata = buildPreparedSourceRunDetailMetadata(TIC_TAC_TOE_SHOWCASE_PROJECT)

export default function TicTacToeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={TIC_TAC_TOE_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('tic-tac-toe-gemini-flash-basic.json')}
      capturedAt="May 30, 2026"
    />
  )
}
