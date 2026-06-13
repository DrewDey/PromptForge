import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { COMMUNITY_ANSWER_EVIDENCE_BALANCE_OPENROUTER_NEMOTRON_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const project = COMMUNITY_ANSWER_EVIDENCE_BALANCE_OPENROUTER_NEMOTRON_SHOWCASE_PROJECT

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function CommunityAnswerEvidenceBalanceOpenrouterNemotronDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project}
      sourceRunPackage={loadSourceRunPackage('community-answer-evidence-balance-openrouter-nemotron-source-run.json')}
      route="/community-answer-evidence-balance-openrouter-nemotron-demo"
      capturedAt="June 13, 2026"
    />
  )
}
