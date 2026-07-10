import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const route = '/security-cam-anomaly-timeline-game-demo'
const sourceRunId = '2f2bfc9f-019a-4ff3-b51f-3270a7ea9eab'
const project = getPreparedShowcaseProjectBySourceRunId(sourceRunId)

if (!project) throw new Error(`Missing prepared showcase project for source run ${sourceRunId}.`)

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function SecurityCamAnomalyTimelineGameDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project!}
      sourceRunPackage={loadSourceRunPackage('security-cam-anomaly-timeline-chatgpt-extra-high-source-run.json')}
      route={route}
      capturedAt="June 15, 2026"
    />
  )
}
