import PreparedModelVariantSourceRunPage, {
  type ModelVariantSearchParams,
} from '@/components/PreparedModelVariantSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'

const route = '/booking-flow-handoff-simulator-demo'
const sourceRunId = '08c8b725-4228-4b24-a6e6-5d7fcf78457c'
const project = getPreparedShowcaseProjectBySourceRunId(sourceRunId)

if (!project) throw new Error(`Missing prepared showcase project for source run ${sourceRunId}.`)

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function BookingFlowHandoffSimulatorDemoPage({
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
