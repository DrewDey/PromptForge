import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const route = '/tiny-festival-set-time-clash-game-demo'
const sourceRunId = '4d02e29c-ff98-4c73-82ca-942430632443'
const project = getPreparedShowcaseProjectBySourceRunId(sourceRunId)

if (!project) throw new Error(`Missing prepared showcase project for source run ${sourceRunId}.`)

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function TinyFestivalSetTimeClashGameDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project!}
      sourceRunPackage={loadSourceRunPackage('tiny-festival-set-time-clash-game-claude-opus48-medium-source-run.json')}
      route={route}
      capturedAt="June 19, 2026"
    />
  )
}
