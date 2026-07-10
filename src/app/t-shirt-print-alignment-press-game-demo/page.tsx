import PreparedSourceRunPage from '@/components/PreparedSourceRunPage'
import { buildPreparedSourceRunDetailMetadata } from '@/lib/build-path-metadata'
import { getPreparedShowcaseProjectBySourceRunId } from '@/lib/prepared-showcase-projects'
import { loadSourceRunPackage } from '@/lib/source-run-package'

const route = '/t-shirt-print-alignment-press-game-demo'
const sourceRunId = '94e76d4a-a6e4-4fd1-9de6-9b84ff21483e'
const project = getPreparedShowcaseProjectBySourceRunId(sourceRunId)

if (!project) throw new Error(`Missing prepared showcase project for source run ${sourceRunId}.`)

export const metadata = buildPreparedSourceRunDetailMetadata(project)

export default function TShirtPrintAlignmentPressGameDemoPage() {
  return (
    <PreparedSourceRunPage
      project={project!}
      sourceRunPackage={loadSourceRunPackage('t-shirt-print-alignment-press-chatgpt-medium-source-run.json')}
      route={route}
      capturedAt="June 15, 2026"
    />
  )
}
