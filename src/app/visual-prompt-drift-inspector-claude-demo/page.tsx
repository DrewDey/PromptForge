import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { VISUAL_PROMPT_DRIFT_INSPECTOR_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = VISUAL_PROMPT_DRIFT_INSPECTOR_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function VisualPromptDriftInspectorClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('visual-prompt-drift-inspector-claude-source-run.json')}
      route="/visual-prompt-drift-inspector-claude-demo"
      capturedAt="June 12, 2026"
    />
  )
}
