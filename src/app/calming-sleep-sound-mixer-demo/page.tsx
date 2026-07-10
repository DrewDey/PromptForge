import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const route = '/calming-sleep-sound-mixer-demo'
const sourceRunId = 'cf73efd5-2fb6-48fe-a9fd-a1a0df336d18'
const project = getPreparedShowcaseProjectBySourceRunId(sourceRunId)

if (!project) throw new Error(`Missing prepared showcase project for source run ${sourceRunId}.`)

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function CalmingSleepSoundMixerDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project!}
      sourceRunPackage={loadSourceRunPackage('sleep-sound-mixer-chatgpt-56-luna-extra-high-source-run.json')}
      route={route}
      capturedAt="July 10, 2026"
    />
  )
}
