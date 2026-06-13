import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { SEARCH_RESULT_PROMISE_PROOF_BOARD_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = SEARCH_RESULT_PROMISE_PROOF_BOARD_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function SearchResultPromiseProofBoardChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('search-result-promise-proof-board-chatgpt-source-run.json')}
      route="/search-result-promise-proof-board-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
