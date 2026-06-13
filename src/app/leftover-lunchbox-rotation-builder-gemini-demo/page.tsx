import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { LEFTOVER_LUNCHBOX_ROTATION_BUILDER_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = LEFTOVER_LUNCHBOX_ROTATION_BUILDER_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function LeftoverLunchboxRotationBuilderGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('leftover-lunchbox-rotation-builder-gemini-source-run.json')}
      route="/leftover-lunchbox-rotation-builder-gemini-demo"
      capturedAt="June 12, 2026"
    />
  )
}
