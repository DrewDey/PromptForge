import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { PROMPT_PATTERN_SWAP_WORKSHOP_OPENROUTER_CLAUDE_HAIKU_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = PROMPT_PATTERN_SWAP_WORKSHOP_OPENROUTER_CLAUDE_HAIKU_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function PromptPatternSwapWorkshopOpenrouterClaudeHaikuDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('prompt-pattern-swap-workshop-openrouter-claude-haiku-source-run.json')}
      route="/prompt-pattern-swap-workshop-openrouter-claude-haiku-demo"
      capturedAt="June 13, 2026"
    />
  )
}
