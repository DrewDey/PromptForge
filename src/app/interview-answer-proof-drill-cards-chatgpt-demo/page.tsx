import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { INTERVIEW_ANSWER_PROOF_DRILL_CARDS_CHATGPT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = INTERVIEW_ANSWER_PROOF_DRILL_CARDS_CHATGPT_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function InterviewAnswerProofDrillCardsChatgptDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('interview-answer-proof-drill-cards-chatgpt-source-run.json')}
      route="/interview-answer-proof-drill-cards-chatgpt-demo"
      capturedAt="June 13, 2026"
    />
  )
}
