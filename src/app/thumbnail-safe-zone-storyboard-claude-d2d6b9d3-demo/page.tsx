import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { THUMBNAIL_SAFE_ZONE_STORYBOARD_CLAUDE_D2D6B9D3_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = THUMBNAIL_SAFE_ZONE_STORYBOARD_CLAUDE_D2D6B9D3_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ThumbnailSafeZoneStoryboardClaudeD2d6b9d3DemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('thumbnail-safe-zone-storyboard-claude-20260612-source-run.json')}
      route="/thumbnail-safe-zone-storyboard-claude-d2d6b9d3-demo"
      capturedAt="June 12, 2026"
    />
  )
}
