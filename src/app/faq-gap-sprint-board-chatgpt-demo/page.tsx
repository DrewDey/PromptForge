import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { FAQ_GAP_SPRINT_BOARD_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = FAQ_GAP_SPRINT_BOARD_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function FaqGapSprintBoardChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('faq-gap-sprint-board-chatgpt-source-run.json')}
      route="/faq-gap-sprint-board-chatgpt-demo"
      capturedAt="June 12, 2026"
    />
  )
}
