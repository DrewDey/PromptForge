import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { INSTAGRAM_CAPTION_CTA_MIX_BOARD_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = INSTAGRAM_CAPTION_CTA_MIX_BOARD_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function InstagramCaptionCtaMixBoardGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('instagram-caption-cta-mix-board-gemini-source-run.json')}
      route="/instagram-caption-cta-mix-board-gemini-demo"
      capturedAt="June 13, 2026"
    />
  )
}
