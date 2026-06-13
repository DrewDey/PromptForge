import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { POSTER_SHOT_STACK_PLANNER_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = POSTER_SHOT_STACK_PLANNER_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function PosterShotStackPlannerClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('poster-shot-stack-planner-claude-source-run.json')}
      route="/poster-shot-stack-planner-claude-demo"
      capturedAt="June 12, 2026"
    />
  )
}
