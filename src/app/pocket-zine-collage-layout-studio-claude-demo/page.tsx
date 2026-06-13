import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { POCKET_ZINE_COLLAGE_LAYOUT_STUDIO_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = POCKET_ZINE_COLLAGE_LAYOUT_STUDIO_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function PocketZineCollageLayoutStudioClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('pocket-zine-collage-layout-studio-claude-source-run.json')}
      route="/pocket-zine-collage-layout-studio-claude-demo"
      capturedAt="June 12, 2026"
    />
  )
}
