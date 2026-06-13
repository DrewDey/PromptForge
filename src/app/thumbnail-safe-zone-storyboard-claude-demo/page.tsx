import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { THUMBNAIL_SAFE_ZONE_STORYBOARD_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = THUMBNAIL_SAFE_ZONE_STORYBOARD_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ThumbnailSafeZoneStoryboardClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('thumbnail-safe-zone-storyboard-claude-source-run.json')}
      route="/thumbnail-safe-zone-storyboard-claude-demo"
      capturedAt="June 13, 2026"
    />
  )
}
