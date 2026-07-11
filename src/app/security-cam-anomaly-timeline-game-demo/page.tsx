import PreparedModelVariantSourceRunPage, {
  type ModelVariantSearchParams,
} from '@/components/PreparedModelVariantSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'

const route = '/security-cam-anomaly-timeline-game-demo'
const sourceRunId = '2f2bfc9f-019a-4ff3-b51f-3270a7ea9eab'
const project = getPreparedShowcaseProjectBySourceRunId(sourceRunId)

if (!project) throw new Error(`Missing prepared showcase project for source run ${sourceRunId}.`)

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function SecurityCamAnomalyTimelineGameDemoPage({
  searchParams,
}: {
  searchParams: ModelVariantSearchParams
}) {
  return (
    <PreparedModelVariantSourceRunPage
      project={project!}
      route={route}
      searchParams={searchParams}
    />
  )
}
