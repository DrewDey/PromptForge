import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { COMPETITOR_CONTENT_GAP_SPRINT_BOARD_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = COMPETITOR_CONTENT_GAP_SPRINT_BOARD_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function CompetitorContentGapSprintBoardChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('competitor-content-gap-sprint-board-chatgpt-source-run.json')}
      route="/competitor-content-gap-sprint-board-chatgpt-demo"
      capturedAt="June 12, 2026"
    />
  )
}
