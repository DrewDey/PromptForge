import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { RECIPE_POP_UP_MENU_PROFIT_CARDS_GEMINI_A4FD2166_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = RECIPE_POP_UP_MENU_PROFIT_CARDS_GEMINI_A4FD2166_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function RecipePopUpMenuProfitCardsGeminiA4fd2166DemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('recipe-pop-up-menu-profit-cards-gemini-a4fd2166-source-run.json')}
      route="/recipe-pop-up-menu-profit-cards-gemini-a4fd2166-demo"
      capturedAt="June 12, 2026"
    />
  )
}
