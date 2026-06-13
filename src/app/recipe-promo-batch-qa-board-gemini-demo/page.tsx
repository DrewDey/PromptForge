import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { RECIPE_PROMO_BATCH_QA_BOARD_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = RECIPE_PROMO_BATCH_QA_BOARD_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function RecipePromoBatchQaBoardGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('recipe-promo-batch-qa-board-gemini-source-run.json')}
      route="/recipe-promo-batch-qa-board-gemini-demo"
      capturedAt="June 12, 2026"
    />
  )
}
