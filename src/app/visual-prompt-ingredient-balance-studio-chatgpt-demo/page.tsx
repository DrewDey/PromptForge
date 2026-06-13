import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { VISUAL_PROMPT_INGREDIENT_BALANCE_STUDIO_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = VISUAL_PROMPT_INGREDIENT_BALANCE_STUDIO_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function VisualPromptIngredientBalanceStudioChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('visual-prompt-ingredient-balance-studio-chatgpt-source-run.json')}
      route="/visual-prompt-ingredient-balance-studio-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
