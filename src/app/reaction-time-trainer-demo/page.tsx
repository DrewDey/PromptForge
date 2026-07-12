import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { REACTION_TRAINER_SHOWCASE_PROJECT } from '@/lib/prepared-showcase-projects'
import sourceRunPackage from '../../../seed-runs/reaction-trainer-gemini-pro-source-run.json'

export const metadata = buildPreparedSourceRunDetailMetadata(REACTION_TRAINER_SHOWCASE_PROJECT)

export default function ReactionTimeTrainerDemoPage() {
  return (
    <PreparedSourceRunPage
      project={REACTION_TRAINER_SHOWCASE_PROJECT}
      sourceRunPackage={sourceRunPackage}
      capturedAt="June 4, 2026"
    />
  )
}
