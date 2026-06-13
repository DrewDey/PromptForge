import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { ALBUM_COVER_COMPOSITION_PLANNER_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = ALBUM_COVER_COMPOSITION_PLANNER_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function AlbumCoverCompositionPlannerClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('album-cover-composition-planner-claude-source-run.json')}
      route="/album-cover-composition-planner-claude-demo"
      capturedAt="June 12, 2026"
    />
  )
}
