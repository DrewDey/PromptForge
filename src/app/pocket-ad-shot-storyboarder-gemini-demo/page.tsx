import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { POCKET_AD_SHOT_STORYBOARDER_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = POCKET_AD_SHOT_STORYBOARDER_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function PocketAdShotStoryboarderGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('pocket-ad-shot-storyboarder-gemini-source-run.json')}
      route="/pocket-ad-shot-storyboarder-gemini-demo"
      capturedAt="June 12, 2026"
    />
  )
}
