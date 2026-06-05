import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { WORD_LADDER_SPRINT_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/word-ladder-sprint-chatgpt-source-run.json'

export default function WordLadderSprintDemoPage() {
  return (
    <PreparedSourceRunPage
      project={WORD_LADDER_SPRINT_SHOWCASE_PROJECT}
      sourceRunPackage={sourceRunPackage}
      route="/word-ladder-sprint-demo"
      capturedAt="June 5, 2026"
    />
  )
}
