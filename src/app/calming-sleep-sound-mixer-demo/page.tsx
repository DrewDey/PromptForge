import PreparedModelVariantSourceRunPage, {
  type ModelVariantSearchParams,
} from '@/components/PreparedModelVariantSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'

const route = '/calming-sleep-sound-mixer-demo'
const sourceRunId = 'cf73efd5-2fb6-48fe-a9fd-a1a0df336d18'
const project = getPreparedShowcaseProjectBySourceRunId(sourceRunId)

if (!project) throw new Error(`Missing prepared showcase project for source run ${sourceRunId}.`)

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default async function CalmingSleepSoundMixerDemoPage({
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
