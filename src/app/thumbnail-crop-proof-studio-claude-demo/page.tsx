import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { THUMBNAIL_CROP_PROOF_STUDIO_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = THUMBNAIL_CROP_PROOF_STUDIO_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ThumbnailCropProofStudioClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('thumbnail-crop-proof-studio-claude-source-run.json')}
      route="/thumbnail-crop-proof-studio-claude-demo"
      capturedAt="June 12, 2026"
    />
  )
}
