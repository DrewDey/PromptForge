import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { PRODUCT_PHOTO_PROMPT_CARD_STUDIO_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = PRODUCT_PHOTO_PROMPT_CARD_STUDIO_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ProductPhotoPromptCardStudioGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('product-photo-prompt-card-studio-gemini-source-run.json')}
      route="/product-photo-prompt-card-studio-gemini-demo"
      capturedAt="June 13, 2026"
    />
  )
}
