import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { BACKWARDS_WEEK_CAPACITY_PLANNER_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = BACKWARDS_WEEK_CAPACITY_PLANNER_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function BackwardsWeekCapacityPlannerChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('backwards-week-capacity-planner-chatgpt-source-run.json')}
      route="/backwards-week-capacity-planner-chatgpt-demo"
      capturedAt="June 12, 2026"
    />
  )
}
