import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { RECIPE_YIELD_CARD_PACKAGER_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = RECIPE_YIELD_CARD_PACKAGER_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function RecipeYieldCardPackagerGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('recipe-yield-card-packager-gemini-source-run.json')}
      route="/recipe-yield-card-packager-gemini-demo"
      capturedAt="June 12, 2026"
    />
  )
}
