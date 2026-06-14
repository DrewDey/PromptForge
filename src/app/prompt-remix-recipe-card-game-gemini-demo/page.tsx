import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { PROMPT_REMIX_RECIPE_CARD_GAME_GEMINI_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = PROMPT_REMIX_RECIPE_CARD_GAME_GEMINI_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function PromptRemixRecipeCardGameGeminiDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('prompt-remix-recipe-card-game-gemini-source-run.json')}
      route="/prompt-remix-recipe-card-game-gemini-demo"
      capturedAt="June 13, 2026"
    />
  )
}
