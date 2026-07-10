import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const route = '/gym-mirror-progress-shot-consistency-studio-demo'
const sourceRunId = '0eea38da-ead0-44e0-b50c-ddc6840cb033'
const project = getPreparedShowcaseProjectBySourceRunId(sourceRunId)

if (!project) throw new Error(`Missing prepared showcase project for source run ${sourceRunId}.`)

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function GymMirrorProgressShotConsistencyStudioDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project!}
      sourceRunPackage={loadSourceRunPackage('gym-mirror-progress-shot-consistency-studio-claude-sonnet46-max-source-run.json')}
      route={route}
      capturedAt="June 17, 2026"
    />
  )
}
