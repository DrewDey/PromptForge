import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { POCKET_COVER_PROMPT_BOARD_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = POCKET_COVER_PROMPT_BOARD_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function PocketCoverPromptBoardChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('pocket-cover-prompt-board-chatgpt-source-run.json')}
      route="/pocket-cover-prompt-board-chatgpt-demo"
      capturedAt="June 10, 2026"
    />
  )
}
