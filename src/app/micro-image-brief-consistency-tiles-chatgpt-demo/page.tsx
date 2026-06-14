import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { MICRO_IMAGE_BRIEF_CONSISTENCY_TILES_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = MICRO_IMAGE_BRIEF_CONSISTENCY_TILES_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function MicroImageBriefConsistencyTilesChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('micro-image-brief-consistency-tiles-chatgpt-source-run.json')}
      route="/micro-image-brief-consistency-tiles-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
