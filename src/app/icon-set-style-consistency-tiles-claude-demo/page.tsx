import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { ICON_SET_STYLE_CONSISTENCY_TILES_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = ICON_SET_STYLE_CONSISTENCY_TILES_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function IconSetStyleConsistencyTilesClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('icon-set-style-consistency-tiles-claude-source-run.json')}
      route="/icon-set-style-consistency-tiles-claude-demo"
      capturedAt="June 13, 2026"
    />
  )
}
