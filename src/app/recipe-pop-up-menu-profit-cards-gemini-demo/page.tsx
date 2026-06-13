import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { RECIPE_POP_UP_MENU_PROFIT_CARDS_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = RECIPE_POP_UP_MENU_PROFIT_CARDS_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function RecipePopUpMenuProfitCardsGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('recipe-pop-up-menu-profit-cards-gemini-source-run.json')}
      route="/recipe-pop-up-menu-profit-cards-gemini-demo"
      capturedAt="June 13, 2026"
    />
  )
}
