import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { LEFTOVER_INGREDIENT_SWAP_CARDS_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = LEFTOVER_INGREDIENT_SWAP_CARDS_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function LeftoverIngredientSwapCardsGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('leftover-ingredient-swap-cards-gemini-source-run.json')}
      route="/leftover-ingredient-swap-cards-gemini-demo"
      capturedAt="June 12, 2026"
    />
  )
}
