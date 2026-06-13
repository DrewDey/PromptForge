import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { SHORT_VIDEO_HOOK_CONTINUITY_BOARD_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = SHORT_VIDEO_HOOK_CONTINUITY_BOARD_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ShortVideoHookContinuityBoardClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('short-video-hook-continuity-board-claude-source-run.json')}
      route="/short-video-hook-continuity-board-claude-demo"
      capturedAt="June 12, 2026"
    />
  )
}
