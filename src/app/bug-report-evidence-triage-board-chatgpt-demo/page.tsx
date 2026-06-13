import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { BUG_REPORT_EVIDENCE_TRIAGE_BOARD_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = BUG_REPORT_EVIDENCE_TRIAGE_BOARD_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function BugReportEvidenceTriageBoardChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('bug-report-evidence-triage-board-chatgpt-source-run.json')}
      route="/bug-report-evidence-triage-board-chatgpt-demo"
      capturedAt="June 12, 2026"
    />
  )
}
