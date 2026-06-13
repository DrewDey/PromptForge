import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { COLLECTIBLE_CARD_SHOT_PLANNER_CLAUDE_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = COLLECTIBLE_CARD_SHOT_PLANNER_CLAUDE_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function CollectibleCardShotPlannerClaudeDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('collectible-card-shot-planner-claude-source-run.json')}
      route="/collectible-card-shot-planner-claude-demo"
      capturedAt="June 12, 2026"
    />
  )
}
