import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { READER_PROMISE_EVIDENCE_LADDER_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = READER_PROMISE_EVIDENCE_LADDER_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function ReaderPromiseEvidenceLadderChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('reader-promise-evidence-ladder-chatgpt-source-run.json')}
      route="/reader-promise-evidence-ladder-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
