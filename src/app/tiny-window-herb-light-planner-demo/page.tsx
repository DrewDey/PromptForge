import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { TINY_WINDOW_HERB_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

export default function TinyWindowHerbLightPlannerDemoPage() {
  return (
    <PreparedSourceRunPage
      project={TINY_WINDOW_HERB_SHOWCASE_PROJECT}
      sourceRunPackage={loadSourceRunPackage('tiny-window-herb-light-planner-claude-source-run.json')}
      capturedAt="June 6, 2026"
    />
  )
}
