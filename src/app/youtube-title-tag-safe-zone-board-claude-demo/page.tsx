import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { YOUTUBE_TITLE_TAG_SAFE_ZONE_BOARD_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = YOUTUBE_TITLE_TAG_SAFE_ZONE_BOARD_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function YoutubeTitleTagSafeZoneBoardClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('youtube-title-tag-safe-zone-board-claude-source-run.json')}
      route="/youtube-title-tag-safe-zone-board-claude-demo"
      capturedAt="June 13, 2026"
    />
  )
}
