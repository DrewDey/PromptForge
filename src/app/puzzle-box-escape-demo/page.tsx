import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { PUZZLE_BOX_ESCAPE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/puzzle-box-escape-claude-sonnet-46-max-source-run.json'

export default function PuzzleBoxEscapeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={PUZZLE_BOX_ESCAPE_SHOWCASE_PROJECT}
      sourceRunPackage={sourceRunPackage}
      capturedAt="June 5, 2026"
    />
  )
}
