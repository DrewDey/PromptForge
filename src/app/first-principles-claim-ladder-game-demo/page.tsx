import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const route = '/first-principles-claim-ladder-game-demo'
const sourceRunId = '3216db0c-fd3a-48f0-af70-58b47f34068c'
const project = getPreparedShowcaseProjectBySourceRunId(sourceRunId)

if (!project) throw new Error(`Missing prepared showcase project for source run ${sourceRunId}.`)

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function FirstPrinciplesClaimLadderGameDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project!}
      sourceRunPackage={loadSourceRunPackage('first-principles-claim-ladder-game-chatgpt-gpt55-medium-source-run.json')}
      route={route}
      capturedAt="June 20, 2026"
    />
  )
}
