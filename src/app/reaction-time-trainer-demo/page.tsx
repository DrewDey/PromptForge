import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { REACTION_TRAINER_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/reaction-trainer-gemini-pro-source-run.json'

export default function ReactionTimeTrainerDemoPage() {
  return (
    <PreparedSourceRunPage
      project={REACTION_TRAINER_SHOWCASE_PROJECT}
      sourceRunPackage={sourceRunPackage}
      route="/reaction-time-trainer-demo"
      capturedAt="June 4, 2026"
    />
  )
}
