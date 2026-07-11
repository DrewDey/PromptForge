import PreparedModelVariantSourceRunPage, {
  type ModelVariantSearchParams,
} from '@/components/PreparedModelVariantSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'

const route = '/t-shirt-print-alignment-press-game-demo'
const sourceRunId = '94e76d4a-a6e4-4fd1-9de6-9b84ff21483e'
const project = getPreparedShowcaseProjectBySourceRunId(sourceRunId)

if (!project) throw new Error(`Missing prepared showcase project for source run ${sourceRunId}.`)

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function TShirtPrintAlignmentPressGameDemoPage({
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
