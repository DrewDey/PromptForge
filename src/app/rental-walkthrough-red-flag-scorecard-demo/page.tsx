import PreparedModelVariantSourceRunPage, {
  type ModelVariantSearchParams,
} from '@/components/PreparedModelVariantSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'

const route = '/rental-walkthrough-red-flag-scorecard-demo'
const sourceRunId = '3137def2-964d-49a8-ad22-3b776870e3fe'
const project = getPreparedShowcaseProjectBySourceRunId(sourceRunId)

if (!project) throw new Error(`Missing prepared showcase project for source run ${sourceRunId}.`)

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function RentalWalkthroughRedFlagScorecardDemoPage({
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
