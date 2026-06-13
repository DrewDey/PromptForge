import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { VISUAL_BRIEF_CONSISTENCY_BOARD_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = VISUAL_BRIEF_CONSISTENCY_BOARD_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function VisualBriefConsistencyBoardClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('visual-brief-consistency-board-claude-source-run.json')}
      route="/visual-brief-consistency-board-claude-demo"
      capturedAt="June 13, 2026"
    />
  )
}
